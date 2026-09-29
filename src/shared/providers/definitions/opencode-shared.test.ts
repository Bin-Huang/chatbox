import type { LanguageModelV3, LanguageModelV3CallOptions } from '@ai-sdk/provider'
import { describe, expect, it, vi } from 'vitest'
import { settings as getDefaultSettings, newConfigs } from '../../defaults'
import type { CallChatCompletionOptions, ModelInterface } from '../../models/types'
import { getModel } from '../../providers'
import type { SessionSettings, Settings } from '../../types'
import { ModelProviderEnum } from '../../types'
import type { ModelDependencies } from '../../types/adapters'
import type { SentryScope } from '../../utils/sentry_adapter'
import CustomClaude from './models/custom-claude'
import CustomGemini from './models/custom-gemini'
import OpenAI from './models/openai'
import OpenAIResponses from './models/openai-responses'
import { OPENCODE_GO_API_HOST } from './opencode-go'
import {
  buildOpenCodeSessionHeaders,
  mergeOpenCodeSessionHeaders,
  OPENCODE_SESSION_HEADER,
  resolveOpenCodeSessionId,
} from './opencode-shared'
import { OPENCODE_ZEN_API_HOST } from './opencode-zen'

const mockScope: SentryScope = {
  setTag: vi.fn(),
  setExtra: vi.fn(),
}

function createDependencies(): ModelDependencies {
  return {
    request: {
      fetchWithOptions: vi.fn(),
      apiRequest: vi.fn(),
    },
    storage: {
      saveImage: vi.fn(),
      getImage: vi.fn(),
    },
    sentry: {
      captureException: vi.fn(),
      withScope: vi.fn((callback: (scope: SentryScope) => void) => callback(mockScope)),
    },
    getRemoteConfig: vi.fn(),
    platformType: 'desktop',
    oauth: {
      refreshCredential: vi.fn(),
      persistCredential: vi.fn(),
      clearCredential: vi.fn(),
    },
  }
}

function createModel(
  provider: ModelProviderEnum.OpenCodeGo | ModelProviderEnum.OpenCodeZen,
  modelId: string,
  dependencies: ModelDependencies = createDependencies(),
  useProxy?: boolean
) {
  const sessionSettings: SessionSettings = {
    provider,
    modelId,
    temperature: 0.7,
    topP: 0.9,
    maxTokens: 2048,
    stream: true,
  }
  const defaultSettings = getDefaultSettings()
  const apiHost = provider === ModelProviderEnum.OpenCodeGo ? OPENCODE_GO_API_HOST : OPENCODE_ZEN_API_HOST
  const globalSettings: Settings = {
    ...defaultSettings,
    providers: {
      ...defaultSettings.providers,
      [provider]: {
        apiKey: 'sk-test',
        apiHost,
        useProxy,
        models: [{ modelId }],
      },
    },
  }
  return getModel(sessionSettings, globalSettings, newConfigs(), dependencies)
}

function exposeRequestHeaders(model: ModelInterface, options?: CallChatCompletionOptions) {
  return (
    model as unknown as { getRequestHeaders(options?: CallChatCompletionOptions): Record<string, string> }
  ).getRequestHeaders(options)
}

function exposeChatModel(model: ModelInterface, options?: CallChatCompletionOptions): LanguageModelV3 {
  return (model as unknown as { getChatModel(options?: CallChatCompletionOptions): LanguageModelV3 }).getChatModel(
    options
  )
}

function headerValue(headers: Record<string, string> | undefined, name: string) {
  if (!headers) return undefined
  const match = Object.entries(headers).find(([key]) => key.toLowerCase() === name.toLowerCase())
  return match?.[1]
}

const generateRequest: LanguageModelV3CallOptions = {
  prompt: [{ role: 'user', content: [{ type: 'text', text: 'Hi' }] }],
}

function jsonReply(body: unknown) {
  return new Response(JSON.stringify(body), {
    headers: { 'content-type': 'application/json' },
  })
}

function chatCompletionsReply() {
  return jsonReply({
    id: 'chatcmpl-test',
    object: 'chat.completion',
    created: 0,
    model: 'glm-5.3',
    choices: [
      {
        index: 0,
        message: { role: 'assistant', content: 'Hello' },
        finish_reason: 'stop',
      },
    ],
    usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
  })
}

function responsesApiReply() {
  return jsonReply({
    id: 'resp_test',
    object: 'response',
    created_at: 0,
    status: 'completed',
    model: 'grok-4.5',
    output: [
      {
        id: 'msg_test',
        type: 'message',
        status: 'completed',
        role: 'assistant',
        content: [{ type: 'output_text', text: 'Hello', annotations: [] }],
      },
    ],
    usage: { input_tokens: 1, output_tokens: 1, total_tokens: 2 },
  })
}

describe('OpenCode session header helpers', () => {
  it('keeps a Chatbox conversation id unchanged', () => {
    expect(resolveOpenCodeSessionId('550e8400-e29b-41d4-a716-446655440000')).toBe(
      '550e8400-e29b-41d4-a716-446655440000'
    )
  })

  it('uses a stable fallback when the conversation id is missing', () => {
    expect(resolveOpenCodeSessionId()).toBe('chatbox')
    expect(resolveOpenCodeSessionId('   ')).toBe('chatbox')
  })

  it('sanitizes and clamps unsafe conversation ids', () => {
    expect(resolveOpenCodeSessionId('sess id/with spaces')).toBe('sess-id-with-spaces')
    expect(resolveOpenCodeSessionId('a'.repeat(200))).toHaveLength(128)
  })

  it('always emits x-opencode-session', () => {
    expect(buildOpenCodeSessionHeaders('session-1')).toEqual({
      [OPENCODE_SESSION_HEADER]: 'session-1',
    })
    expect(mergeOpenCodeSessionHeaders({ 'X-Title': 'Chatbox AI' }, 'session-2')).toEqual({
      'X-Title': 'Chatbox AI',
      [OPENCODE_SESSION_HEADER]: 'session-2',
    })
  })
})

describe('OpenCode request session headers', () => {
  it.each([
    [ModelProviderEnum.OpenCodeGo, 'glm-5.3', OpenAI],
    [ModelProviderEnum.OpenCodeGo, 'grok-4.5', OpenAIResponses],
    [ModelProviderEnum.OpenCodeGo, 'minimax-m3', CustomClaude],
    [ModelProviderEnum.OpenCodeZen, 'gemini-3.7-flash', CustomGemini],
  ] as const)('stamps a per-conversation header on %s %s', (provider, modelId, ModelClass) => {
    const model = createModel(provider, modelId)
    expect(model).toBeInstanceOf(ModelClass)
    expect(exposeRequestHeaders(model, { sessionId: 'conversation-a' })).toEqual(
      expect.objectContaining({ [OPENCODE_SESSION_HEADER]: 'conversation-a' })
    )
    expect(exposeRequestHeaders(model, { sessionId: 'conversation-b' })[OPENCODE_SESSION_HEADER]).toBe('conversation-b')
    expect(exposeRequestHeaders(model, {})[OPENCODE_SESSION_HEADER]).toBe('chatbox')
  })

  it('keeps the Anthropic browser-access header on MiniMax/Qwen', () => {
    const headers = exposeRequestHeaders(createModel(ModelProviderEnum.OpenCodeGo, 'qwen3.8-max'), {
      sessionId: 'session-claude',
    })
    expect(headers).toEqual(
      expect.objectContaining({
        'anthropic-dangerous-direct-browser-access': 'true',
        [OPENCODE_SESSION_HEADER]: 'session-claude',
      })
    )
  })

  it('posts Chat Completions with x-opencode-session', async () => {
    const dependencies = createDependencies()
    const apiRequest = vi.mocked(dependencies.request.apiRequest)
    apiRequest.mockResolvedValueOnce(chatCompletionsReply())

    const model = createModel(ModelProviderEnum.OpenCodeGo, 'glm-5.3', dependencies)
    await exposeChatModel(model, { sessionId: 'session-chat' }).doGenerate(generateRequest)

    expect(headerValue(apiRequest.mock.calls[0]?.[0]?.headers as Record<string, string>, OPENCODE_SESSION_HEADER)).toBe(
      'session-chat'
    )
  })

  it('posts Responses with x-opencode-session', async () => {
    const dependencies = createDependencies()
    const apiRequest = vi.mocked(dependencies.request.apiRequest)
    apiRequest.mockResolvedValueOnce(responsesApiReply())

    const model = createModel(ModelProviderEnum.OpenCodeGo, 'grok-4.5', dependencies)
    await exposeChatModel(model, { sessionId: 'session-responses' }).doGenerate(generateRequest)

    expect(headerValue(apiRequest.mock.calls[0]?.[0]?.headers as Record<string, string>, OPENCODE_SESSION_HEADER)).toBe(
      'session-responses'
    )
  })
})

describe('OpenCode network compatibility', () => {
  const routes = [
    [ModelProviderEnum.OpenCodeGo, 'glm-5.3'],
    [ModelProviderEnum.OpenCodeGo, 'grok-4.5'],
    [ModelProviderEnum.OpenCodeGo, 'minimax-m3'],
    [ModelProviderEnum.OpenCodeZen, 'glm-5.3'],
    [ModelProviderEnum.OpenCodeZen, 'grok-4.5'],
    [ModelProviderEnum.OpenCodeZen, 'claude-sonnet-4-6'],
    [ModelProviderEnum.OpenCodeZen, 'gemini-3.7-flash'],
  ] as const

  it.each(routes)('uses native mobile transport for %s %s streams and catalogs', async (provider, modelId) => {
    for (const useProxy of [undefined, false, true]) {
      const dependencies = createDependencies()
      dependencies.platformType = 'mobile'
      const request = vi.mocked(dependencies.request.apiRequest)
      request.mockResolvedValueOnce(new Response('', { headers: { 'content-type': 'text/event-stream' } }))
      const model = createModel(provider, modelId, dependencies, useProxy)
      const controller = new AbortController()
      const result = await exposeChatModel(model).doStream({ ...generateRequest, abortSignal: controller.signal })
      expect(request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          useProxy: true,
          signal: controller.signal,
          retry: 0,
        })
      )
      await result.stream.cancel()
      request.mockClear()
      request.mockResolvedValueOnce(jsonReply({ data: [{ id: modelId }] }))
      await (model as OpenAI).listModels()
      expect(request).toHaveBeenCalledWith(expect.objectContaining({ method: 'GET', useProxy: true }))
    }
  })

  it.each(['desktop', 'web'] as const)('resolves the %s transport independently of mobile defaults', (platformType) => {
    for (const [provider, modelId] of routes) {
      for (const useProxy of [undefined, false, true]) {
        const dependencies = createDependencies()
        dependencies.platformType = platformType
        const model = createModel(provider, modelId, dependencies, useProxy)
        expect((model as OpenAI).options.useProxy).toBe(useProxy ?? false)
      }
    }
  })
})
