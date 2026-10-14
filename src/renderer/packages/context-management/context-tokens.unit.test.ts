/**
 * @vitest-environment jsdom
 */
import type { CompactionPoint, Message, Session } from '@shared/types'
import type { MessageRoleEnum } from '@shared/types/session'
import { describe, expect, it, vi } from 'vitest'

// Mock modules that have problematic import chains (router, etc.)
vi.mock('@/stores/queryClient', () => ({
  default: {
    setQueryDefaults: vi.fn(),
    setQueryData: vi.fn(),
    getQueryData: vi.fn(),
  },
  queryClient: {
    setQueryDefaults: vi.fn(),
    setQueryData: vi.fn(),
    getQueryData: vi.fn(),
  },
}))

vi.mock('@/packages/token-estimation/hooks/useTokenEstimation', () => ({
  useTokenEstimation: vi.fn(() => ({
    contextTokens: 0,
    currentInputTokens: 0,
    totalTokens: 0,
    isCalculating: false,
    pendingTasks: 0,
  })),
}))

vi.mock('@/packages/token-estimation', () => ({
  getTokenizerType: vi.fn(() => 'default'),
}))

import {
  type ContextTokensCacheKeyParams,
  getContextMessagesForTokenEstimation,
  getContextTokensCacheKey,
  getLatestCompactionBoundaryId,
} from './context-tokens'
import { sumCachedTokensFromMessages } from '../token'

function createMessage(id: string, role: (typeof MessageRoleEnum)[keyof typeof MessageRoleEnum], text = ''): Message {
  return {
    id,
    role,
    contentParts: text ? [{ type: 'text', text }] : [],
  }
}

function createTestSession(overrides?: Partial<Session>): Session {
  return {
    id: 'test-session',
    name: 'Test Session',
    messages: [createMessage('msg-1', 'user', 'Hello'), createMessage('msg-2', 'assistant', 'Hi there')],
    compactionPoints: [],
    settings: {},
    ...overrides,
  } as Session
}

describe('getContextMessagesForTokenEstimation', () => {
  it('applies maxContextMessageCount', () => {
    const session = createTestSession({
      messages: [
        createMessage('msg-1', 'user', 'First'),
        createMessage('msg-2', 'assistant', 'Second'),
        createMessage('msg-3', 'user', 'Third'),
        createMessage('msg-4', 'assistant', 'Fourth'),
        createMessage('msg-5', 'user', 'Fifth'),
      ],
    })

    const result = getContextMessagesForTokenEstimation(session, { settings: { maxContextMessageCount: 3 } })

    // Should return only the last 3 messages
    expect(result.length).toBe(3)
    expect(result.map((m) => m.id)).toEqual(['msg-3', 'msg-4', 'msg-5'])
  })

  it('filters error messages', () => {
    const session = createTestSession({
      messages: [
        createMessage('msg-1', 'user', 'Hello'),
        createMessage('msg-2', 'assistant', 'Hi'),
        { ...createMessage('msg-3', 'assistant', 'Error response'), error: 'API error' },
        { ...createMessage('msg-4', 'assistant', 'Error code'), errorCode: 400 },
        createMessage('msg-5', 'user', 'Another message'),
      ],
    })

    const result = getContextMessagesForTokenEstimation(session, {})

    // Verify: error messages are filtered
    expect(result.map((m) => m.id)).toEqual(['msg-1', 'msg-2', 'msg-5'])
    expect(result.find((m) => m.id === 'msg-3')).toBeUndefined()
    expect(result.find((m) => m.id === 'msg-4')).toBeUndefined()
  })

  it('respects compaction points', () => {
    const session = createTestSession({
      messages: [
        createMessage('msg-1', 'user', 'Old message 1'),
        createMessage('msg-2', 'assistant', 'Old response 1'),
        createMessage('msg-3', 'user', 'New message 1'),
        createMessage('msg-4', 'assistant', 'New response 1'),
      ],
      compactionPoints: [
        {
          summaryMessageId: 'summary-1',
          boundaryMessageId: 'msg-2',
          createdAt: Date.now(),
        },
      ],
    })

    const result = getContextMessagesForTokenEstimation(session, {})

    // Should include messages after the compaction boundary
    expect(result.map((m) => m.id)).toContain('msg-3')
    expect(result.map((m) => m.id)).toContain('msg-4')
  })

  it('filters generating messages', () => {
    const session = createTestSession({
      messages: [
        createMessage('msg-1', 'user', 'Hello'),
        createMessage('msg-2', 'assistant', 'Hi'),
        { ...createMessage('msg-3', 'assistant', 'Generating...'), generating: true },
      ],
    })

    const result = getContextMessagesForTokenEstimation(session, {})

    // Verify: generating messages are filtered
    expect(result.map((m) => m.id)).toEqual(['msg-1', 'msg-2'])
    expect(result.find((m) => m.id === 'msg-3')).toBeUndefined()
  })
})

describe('getContextTokensCacheKey', () => {
  it('generates consistent keys', () => {
    const params: ContextTokensCacheKeyParams = {
      sessionId: 'test-session',
      maxContextMessageCount: 100,
      latestContextMessageId: 'msg-5',
      latestCompactionBoundaryId: null,
      tokenizerType: 'default',
    }

    const key1 = getContextTokensCacheKey(params)
    const key2 = getContextTokensCacheKey(params)

    expect(key1).toEqual(key2)
    expect(key1[0]).toBe('context-tokens')
  })

  it('generates different keys when params differ', () => {
    const baseParams: ContextTokensCacheKeyParams = {
      sessionId: 'test-session',
      maxContextMessageCount: 100,
      latestContextMessageId: 'msg-5',
      latestCompactionBoundaryId: null,
      tokenizerType: 'default',
    }

    const key1 = getContextTokensCacheKey(baseParams)
    const key2 = getContextTokensCacheKey({ ...baseParams, sessionId: 'different-session' })
    const key3 = getContextTokensCacheKey({ ...baseParams, tokenizerType: 'deepseek' })
    const key4 = getContextTokensCacheKey({ ...baseParams, maxContextMessageCount: 50 })

    expect(key1).not.toEqual(key2)
    expect(key1).not.toEqual(key3)
    expect(key1).not.toEqual(key4)
  })

  it('includes all parameters in the key', () => {
    const params: ContextTokensCacheKeyParams = {
      sessionId: 'session-123',
      maxContextMessageCount: 50,
      latestContextMessageId: 'msg-999',
      latestCompactionBoundaryId: 'boundary-456',
      tokenizerType: 'deepseek',
    }

    const key = getContextTokensCacheKey(params)

    expect(key).toContain('context-tokens')
    expect(key).toContain('session-123')
    expect(key).toContain(50)
    expect(key).toContain('msg-999')
    expect(key).toContain('boundary-456')
    expect(key).toContain('deepseek')
  })
})

describe('getLatestCompactionBoundaryId', () => {
  it('does not mutate input array', () => {
    const compactionPoints: CompactionPoint[] = [
      { summaryMessageId: 'summary-1', boundaryMessageId: 'msg-1', createdAt: 1000 },
      { summaryMessageId: 'summary-3', boundaryMessageId: 'msg-3', createdAt: 3000 },
      { summaryMessageId: 'summary-2', boundaryMessageId: 'msg-2', createdAt: 2000 },
    ]

    // Freeze the array to detect mutations
    Object.freeze(compactionPoints)
    for (const p of compactionPoints) {
      Object.freeze(p)
    }

    const result = getLatestCompactionBoundaryId(compactionPoints)

    // Should return the one with highest createdAt
    expect(result).toBe('msg-3')

    // Original array should not be sorted (still in original order)
    expect(compactionPoints[0].boundaryMessageId).toBe('msg-1')
    expect(compactionPoints[1].boundaryMessageId).toBe('msg-3')
    expect(compactionPoints[2].boundaryMessageId).toBe('msg-2')
  })

  it('returns null for empty array', () => {
    const result = getLatestCompactionBoundaryId([])

    expect(result).toBeNull()
  })

  it('returns null for undefined', () => {
    const result = getLatestCompactionBoundaryId(undefined)

    expect(result).toBeNull()
  })

  it('returns the latest compaction boundary ID', () => {
    const compactionPoints: CompactionPoint[] = [
      { summaryMessageId: 'summary-1', boundaryMessageId: 'msg-1', createdAt: 1000 },
      { summaryMessageId: 'summary-2', boundaryMessageId: 'msg-2', createdAt: 2000 },
      { summaryMessageId: 'summary-3', boundaryMessageId: 'msg-3', createdAt: 3000 },
    ]

    const result = getLatestCompactionBoundaryId(compactionPoints)

    expect(result).toBe('msg-3')
  })

  it('handles single compaction point', () => {
    const compactionPoints: CompactionPoint[] = [
      { summaryMessageId: 'summary-1', boundaryMessageId: 'msg-1', createdAt: 1000 },
    ]

    const result = getLatestCompactionBoundaryId(compactionPoints)

    expect(result).toBe('msg-1')
  })

  it('returns correct boundary when timestamps are equal', () => {
    const compactionPoints: CompactionPoint[] = [
      { summaryMessageId: 'summary-1', boundaryMessageId: 'msg-1', createdAt: 1000 },
      { summaryMessageId: 'summary-2', boundaryMessageId: 'msg-2', createdAt: 1000 },
    ]

    const result = getLatestCompactionBoundaryId(compactionPoints)

    // Should return the first one encountered with the highest timestamp
    expect(result).toBe('msg-1')
  })
})

describe('sumCachedTokensFromMessages with RAG attachments', () => {
  it('ignores session-retrieval files even if tokenCountMap contains values', () => {
    const messages: Message[] = [
      {
        ...createMessage('msg-1', 'user', 'Hello'),
        files: [
          {
            id: 'file-rag',
            name: 'gur-kb.json',
            size: 18000000,
            ragMode: 'session-retrieval',
            storageKey: 'key-1',
            tokenCountMap: {
              default: 4500000,
              deepseek: 4500000,
            },
          },
        ],
      },
    ]

    const tokens = sumCachedTokensFromMessages(messages)
    // Should NOT include the 4.5M tokens from the RAG attachment
    expect(tokens).toBeLessThan(100)
  })
})

