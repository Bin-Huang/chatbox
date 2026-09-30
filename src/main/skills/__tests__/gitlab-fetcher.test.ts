import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../util', () => ({
  getLogger: () => ({
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  }),
}))

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

import {
  clearCache,
  detectSkillsInRepo,
  downloadSkillFiles,
  fetchFileContent,
  fetchProjectContents,
  getLatestCommitHash,
  getSkillTreeSha,
} from '../gitlab-fetcher'

function makeResponse(body: unknown, status = 200, ok = true, nextPage?: string) {
  return {
    ok,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    headers: {
      get: (name: string) => (name.toLowerCase() === 'x-next-page' ? (nextPage ?? '') : null),
    },
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(typeof body === 'string' ? body : JSON.stringify(body)),
  }
}

function makeTreeItem(itemPath: string, type: 'blob' | 'tree' = 'blob') {
  return { id: `id-${itemPath}`, name: itemPath.split('/').pop() || '', type, path: itemPath }
}

function makeSkillMdContent(skillName: string, description = 'A test skill') {
  return `---\nname: ${skillName}\ndescription: ${description}\n---\n# Instructions\nDo something.`
}

interface MockRepo {
  /** Recursive tree pages, indexed from page 1; pages beyond the array return an empty page. */
  treePages?: Array<{ items: ReturnType<typeof makeTreeItem>[]; nextPage?: string }>
  /** Non-recursive directory listings keyed by directory path ('' = repository root). */
  dirs?: Record<string, ReturnType<typeof makeTreeItem>[]>
  /** Raw file contents keyed by file path. */
  files?: Record<string, string>
}

// Routes mocked responses by parsed URL instead of substring matching: `per_page=100`
// otherwise also matches `page=1`.
function mockRepo({ treePages = [], dirs = {}, files = {} }: MockRepo) {
  mockFetch.mockImplementation((input: string) => {
    const url = new URL(input)

    if (url.pathname.endsWith('/repository/tree')) {
      const page = Number.parseInt(url.searchParams.get('page') || '1', 10)
      if (url.searchParams.get('recursive') === 'true') {
        const treePage = treePages[page - 1]
        if (!treePage) return Promise.resolve(makeResponse([]))
        return Promise.resolve(makeResponse(treePage.items, 200, true, treePage.nextPage))
      }
      const dir = url.searchParams.get('path') || ''
      const items = dirs[dir]
      return Promise.resolve(items ? makeResponse(items) : makeResponse(null, 404, false))
    }

    if (url.pathname.includes('/repository/files/')) {
      const filePath = decodeURIComponent(url.pathname.split('/repository/files/')[1].replace(/\/raw$/, ''))
      const content = files[filePath]
      return Promise.resolve(content !== undefined ? makeResponse(content) : makeResponse(null, 404, false))
    }

    if (url.pathname.endsWith('/repository/commits')) {
      return Promise.resolve(makeResponse([{ id: 'commit-1' }]))
    }

    return Promise.resolve(makeResponse(null, 404, false))
  })
}

const PROJECT = 'group/subgroup/repo'
const ENCODED_PROJECT = encodeURIComponent(PROJECT)

describe('gitlab-fetcher', () => {
  beforeEach(() => {
    mockFetch.mockReset()
    clearCache()
    delete process.env.GITLAB_TOKEN
    delete process.env.CHATBOX_GITLAB_TOKEN
  })

  afterEach(() => {
    clearCache()
  })

  describe('fetchProjectContents', () => {
    it('lists a directory and returns an empty array on 404', async () => {
      mockRepo({ dirs: { skills: [makeTreeItem('skills/demo', 'tree')] } })

      const items = await fetchProjectContents({ projectPath: PROJECT }, 'skills')
      expect(items).toHaveLength(1)
      expect(mockFetch.mock.calls[0][0]).toContain(`/projects/${ENCODED_PROJECT}/repository/tree?per_page=100`)
      expect(mockFetch.mock.calls[0][0]).toContain('path=skills')

      await expect(fetchProjectContents({ projectPath: PROJECT }, 'missing')).resolves.toEqual([])
    })

    it('sends the access token header when provided', async () => {
      mockRepo({})

      await fetchProjectContents({ projectPath: PROJECT, token: 'glpat-secret' })
      expect(mockFetch.mock.calls[0][1]).toEqual(
        expect.objectContaining({ headers: expect.objectContaining({ 'PRIVATE-TOKEN': 'glpat-secret' }) })
      )
    })

    it('does not send the environment token to self-hosted hosts', async () => {
      process.env.GITLAB_TOKEN = 'env-token'
      mockRepo({})

      await fetchProjectContents({ projectPath: PROJECT, host: 'https://gitlab.example.com' })
      const headers = mockFetch.mock.calls[0][1].headers as Record<string, string>
      expect(headers['PRIVATE-TOKEN']).toBeUndefined()
    })

    it('applies the environment token to gitlab.com', async () => {
      process.env.GITLAB_TOKEN = 'env-token'
      mockRepo({})

      await fetchProjectContents({ projectPath: PROJECT })
      const headers = mockFetch.mock.calls[0][1].headers as Record<string, string>
      expect(headers['PRIVATE-TOKEN']).toBe('env-token')
    })

    it('does not cache the environment-token response for anonymous requests', async () => {
      process.env.GITLAB_TOKEN = 'env-token'
      mockRepo({ dirs: { skills: [makeTreeItem('skills/demo', 'tree')] } })

      await fetchProjectContents({ projectPath: PROJECT }, 'skills')
      const callsWithEnvToken = mockFetch.mock.calls.length

      // Credential scope comes from the effective token, so clearing the env var must
      // produce a fresh (unauthenticated) request rather than a cached hit.
      delete process.env.GITLAB_TOKEN
      await fetchProjectContents({ projectPath: PROJECT }, 'skills')
      expect(mockFetch.mock.calls.length).toBeGreaterThan(callsWithEnvToken)
    })

    it('throws a rate limit error on 429', async () => {
      mockFetch.mockResolvedValueOnce(makeResponse(null, 429, false))

      await expect(fetchProjectContents({ projectPath: PROJECT })).rejects.toThrow('rate limit')
    })
  })

  describe('fetchFileContent', () => {
    it('fetches raw file content from the URL-encoded endpoint', async () => {
      mockFetch.mockResolvedValueOnce(makeResponse('# Hello'))

      const content = await fetchFileContent({ projectPath: PROJECT }, 'skills/demo/SKILL.md')
      expect(content).toBe('# Hello')
      expect(mockFetch.mock.calls[0][0]).toBe(
        `https://gitlab.com/api/v4/projects/${ENCODED_PROJECT}/repository/files/${encodeURIComponent(
          'skills/demo/SKILL.md'
        )}/raw?ref=HEAD`
      )
    })

    it('throws on non-ok responses', async () => {
      mockFetch.mockResolvedValueOnce(makeResponse(null, 404, false))

      await expect(fetchFileContent({ projectPath: PROJECT }, 'missing.md')).rejects.toThrow('Failed to fetch file')
    })
  })

  describe('detectSkillsInRepo', () => {
    it('detects a root SKILL.md', async () => {
      mockRepo({
        treePages: [{ items: [makeTreeItem('SKILL.md'), makeTreeItem('README.md')] }],
        files: { 'SKILL.md': makeSkillMdContent('root-skill') },
      })

      const detected = await detectSkillsInRepo(PROJECT)
      expect(detected).toHaveLength(1)
      expect(detected[0]).toMatchObject({ name: 'root-skill', path: '' })
    })

    it('detects skills nested under category directories', async () => {
      mockRepo({
        treePages: [
          {
            items: [
              makeTreeItem('skills/engineering/tdd/SKILL.md'),
              makeTreeItem('skills/productivity/triage/SKILL.md'),
            ],
          },
        ],
        files: {
          'skills/engineering/tdd/SKILL.md': makeSkillMdContent('tdd', 'TDD workflow'),
          'skills/productivity/triage/SKILL.md': makeSkillMdContent('triage', 'Triage issues'),
        },
      })

      const detected = await detectSkillsInRepo(PROJECT)
      expect(detected.map((s) => s.path).sort()).toEqual(['skills/engineering/tdd', 'skills/productivity/triage'])
    })

    it('ignores node_modules and non-blob SKILL.md entries', async () => {
      mockRepo({
        treePages: [
          {
            items: [
              makeTreeItem('node_modules/pkg/SKILL.md'),
              makeTreeItem('skills/weird/SKILL.md', 'tree'),
              makeTreeItem('skills/real/SKILL.md'),
            ],
          },
        ],
        files: { 'skills/real/SKILL.md': makeSkillMdContent('real') },
      })

      const detected = await detectSkillsInRepo(PROJECT)
      expect(detected).toHaveLength(1)
      expect(detected[0].path).toBe('skills/real')
    })

    it('walks paginated tree responses via the x-next-page header', async () => {
      mockRepo({
        treePages: [
          { items: [makeTreeItem('skills/a/SKILL.md')], nextPage: '2' },
          { items: [makeTreeItem('skills/b/SKILL.md')] },
        ],
        files: {
          'skills/a/SKILL.md': makeSkillMdContent('a'),
          'skills/b/SKILL.md': makeSkillMdContent('b'),
        },
      })

      const detected = await detectSkillsInRepo(PROJECT)
      expect(detected.map((s) => s.name).sort()).toEqual(['a', 'b'])
    })

    it('falls back to the contents API when the tree is truncated', async () => {
      mockRepo({
        // Non-advancing pagination marker means the walk cannot continue: truncated.
        treePages: [{ items: [makeTreeItem('unrelated.md')], nextPage: '1' }],
        dirs: {
          '': [makeTreeItem('skills', 'tree')],
          skills: [makeTreeItem('skills/my-tool', 'tree')],
          'skills/my-tool': [makeTreeItem('skills/my-tool/SKILL.md')],
        },
        files: { 'skills/my-tool/SKILL.md': makeSkillMdContent('my-tool') },
      })

      const detected = await detectSkillsInRepo(PROJECT)
      expect(detected).toHaveLength(1)
      expect(detected[0].path).toBe('skills/my-tool')
    })

    it('surfaces a wrong project path instead of reporting no skills', async () => {
      mockFetch.mockImplementation((input: string) => {
        const url = new URL(input)
        if (url.pathname.endsWith('/repository/tree')) {
          return Promise.resolve(makeResponse({ message: '404 Project Not Found' }, 404, false))
        }
        return Promise.resolve(makeResponse(null, 404, false))
      })

      // GitLab answers 404 both for a missing project and for a private one the caller
      // cannot see, so the message must mention the token and not be swallowed by the
      // contents fallback.
      await expect(detectSkillsInRepo('group/private-repo')).rejects.toThrow(
        /Project not found or not accessible: group\/private-repo/
      )
      await expect(detectSkillsInRepo('group/private-repo')).rejects.toThrow(/access token/)
    })

    it('still falls back to the contents API when the tree request fails for a non-access reason', async () => {
      mockFetch.mockImplementation((input: string) => {
        const url = new URL(input)
        if (url.pathname.endsWith('/repository/tree') && url.searchParams.get('recursive') === 'true') {
          return Promise.resolve(makeResponse(null, 500, false))
        }
        if (url.pathname.endsWith('/repository/tree')) {
          return Promise.resolve(makeResponse([makeTreeItem('README.md')]))
        }
        return Promise.resolve(makeResponse(null, 404, false))
      })

      await expect(detectSkillsInRepo(PROJECT)).resolves.toEqual([])
    })

    it('reports a project with a valid tree but no SKILL.md as empty, not as an error', async () => {
      mockRepo({
        treePages: [{ items: [makeTreeItem('README.md'), makeTreeItem('src/index.ts')] }],
        dirs: { '': [makeTreeItem('README.md')] },
      })

      await expect(detectSkillsInRepo(PROJECT)).resolves.toEqual([])
    })

    it('names the token scope when GitLab denies access with 403', async () => {
      mockFetch.mockResolvedValueOnce(makeResponse(null, 403, false))

      await expect(detectSkillsInRepo(PROJECT)).rejects.toThrow(/read_api or read_repository scope/)
    })

    it('names the token when GitLab requires authentication (401)', async () => {
      mockFetch.mockResolvedValueOnce(makeResponse(null, 401, false))

      await expect(detectSkillsInRepo(PROJECT)).rejects.toThrow(/authentication failed/)
    })

    it('does not serve a cached response fetched with a token to a later token-less request', async () => {
      mockRepo({
        treePages: [{ items: [makeTreeItem('SKILL.md')] }],
        files: { 'SKILL.md': makeSkillMdContent('private-skill') },
      })

      await detectSkillsInRepo(PROJECT, { host: 'https://gitlab.example.com', token: 'glpat-secret' })
      const callsAfterAuthenticatedScan = mockFetch.mock.calls.length
      expect(callsAfterAuthenticatedScan).toBeGreaterThan(0)

      // Removing the token must not keep working: the cached (authenticated) response
      // must not be replayed for an anonymous request.
      await detectSkillsInRepo(PROJECT, { host: 'https://gitlab.example.com' })
      expect(mockFetch.mock.calls.length).toBeGreaterThan(callsAfterAuthenticatedScan)
    })

    it('does not reuse a cache entry across different tokens', async () => {
      mockRepo({
        treePages: [{ items: [makeTreeItem('SKILL.md')] }],
        files: { 'SKILL.md': makeSkillMdContent('private-skill') },
      })

      await detectSkillsInRepo(PROJECT, { token: 'glpat-token-a' })
      const callsAfterFirst = mockFetch.mock.calls.length

      await detectSkillsInRepo(PROJECT, { token: 'glpat-token-b' })
      expect(mockFetch.mock.calls.length).toBeGreaterThan(callsAfterFirst)
    })

    it('still caches repeated requests that use the same token', async () => {
      mockRepo({
        treePages: [{ items: [makeTreeItem('SKILL.md')] }],
        files: { 'SKILL.md': makeSkillMdContent('private-skill') },
      })

      await detectSkillsInRepo(PROJECT, { token: 'glpat-token-a' })
      const callsAfterFirst = mockFetch.mock.calls.length

      await detectSkillsInRepo(PROJECT, { token: 'glpat-token-a' })
      expect(mockFetch.mock.calls.length).toBe(callsAfterFirst)
    })

    it('throws when skills are listed but every content fetch fails', async () => {
      mockRepo({
        treePages: [{ items: [makeTreeItem('skills/a/SKILL.md'), makeTreeItem('skills/b/SKILL.md')] }],
      })

      await expect(detectSkillsInRepo(PROJECT)).rejects.toThrow('failed to fetch their contents')
    })

    it('propagates authentication errors instead of falling back', async () => {
      mockFetch.mockResolvedValueOnce(makeResponse(null, 401, false))

      await expect(detectSkillsInRepo(PROJECT)).rejects.toThrow('authentication failed')
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })

    it('returns an empty array when the project has no skills', async () => {
      mockRepo({
        treePages: [{ items: [makeTreeItem('README.md')] }],
        dirs: { '': [makeTreeItem('README.md')] },
      })

      await expect(detectSkillsInRepo(PROJECT)).resolves.toEqual([])
    })
  })

  describe('downloadSkillFiles', () => {
    it('downloads a skill directory with one recursive tree request plus raw file fetches', async () => {
      const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'chatbox-gitlab-skill-test-'))
      mockRepo({
        treePages: [
          {
            items: [
              makeTreeItem('skills/demo/SKILL.md'),
              makeTreeItem('skills/demo/scripts/run.sh'),
              makeTreeItem('skills/other/SKILL.md'),
            ],
          },
        ],
        files: {
          'skills/demo/SKILL.md': makeSkillMdContent('demo'),
          'skills/demo/scripts/run.sh': '#!/bin/sh\necho demo',
        },
      })

      try {
        await downloadSkillFiles(PROJECT, 'skills/demo', targetDir)

        expect(fs.readFileSync(path.join(targetDir, 'SKILL.md'), 'utf-8')).toContain('name: demo')
        expect(fs.readFileSync(path.join(targetDir, 'scripts/run.sh'), 'utf-8')).toContain('echo demo')
        // Only the recursive tree listing is used; no per-directory contents listing.
        const treeCalls = mockFetch.mock.calls.filter(([url]) => String(url).includes('/repository/tree'))
        expect(treeCalls).toHaveLength(1)
        expect(String(treeCalls[0][0])).toContain('recursive=true')
      } finally {
        fs.rmSync(targetDir, { recursive: true, force: true })
      }
    })

    it('falls back to directory listings when the tree is truncated', async () => {
      const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'chatbox-gitlab-skill-test-'))
      mockRepo({
        treePages: [{ items: [makeTreeItem('unrelated.md')], nextPage: '1' }],
        dirs: {
          'skills/demo': [makeTreeItem('skills/demo/SKILL.md'), makeTreeItem('skills/demo/nested', 'tree')],
          'skills/demo/nested': [makeTreeItem('skills/demo/nested/helper.md')],
        },
        files: {
          'skills/demo/SKILL.md': makeSkillMdContent('demo'),
          'skills/demo/nested/helper.md': 'helper',
        },
      })

      try {
        await downloadSkillFiles(PROJECT, 'skills/demo', targetDir)

        expect(fs.readFileSync(path.join(targetDir, 'SKILL.md'), 'utf-8')).toContain('name: demo')
        expect(fs.readFileSync(path.join(targetDir, 'nested/helper.md'), 'utf-8')).toBe('helper')
      } finally {
        fs.rmSync(targetDir, { recursive: true, force: true })
      }
    })
  })

  describe('getLatestCommitHash', () => {
    it('scopes the commits query by path', async () => {
      mockFetch.mockResolvedValueOnce(makeResponse([{ id: 'abc123' }]))

      const hash = await getLatestCommitHash(PROJECT, 'skills/demo')
      expect(hash).toBe('abc123')
      expect(mockFetch.mock.calls[0][0]).toBe(
        `https://gitlab.com/api/v4/projects/${ENCODED_PROJECT}/repository/commits?per_page=1&path=${encodeURIComponent(
          'skills/demo'
        )}`
      )
    })

    it('returns null on empty results and on errors', async () => {
      mockFetch.mockResolvedValueOnce(makeResponse([]))
      await expect(getLatestCommitHash(PROJECT, '')).resolves.toBeNull()

      clearCache()
      mockFetch.mockResolvedValueOnce(makeResponse(null, 500, false))
      await expect(getLatestCommitHash(PROJECT, 'skills/demo')).resolves.toBeNull()
    })
  })

  describe('getSkillTreeSha', () => {
    it('returns the tree entry id of the skill directory', async () => {
      mockRepo({ dirs: { skills: [makeTreeItem('skills/demo', 'tree'), makeTreeItem('skills/other', 'tree')] } })

      const sha = await getSkillTreeSha(PROJECT, 'skills/demo')
      expect(sha).toBe('id-skills/demo')
      expect(mockFetch.mock.calls[0][0]).toContain('path=skills')
    })

    it('looks up the parent directory for deep paths', async () => {
      mockRepo({ dirs: { 'skills/engineering': [makeTreeItem('skills/engineering/tdd', 'tree')] } })

      const sha = await getSkillTreeSha(PROJECT, 'skills/engineering/tdd')
      expect(sha).toBe('id-skills/engineering/tdd')
      expect(mockFetch.mock.calls[0][0]).toContain(`path=${encodeURIComponent('skills/engineering')}`)
    })

    it('returns null for repo-root skills', async () => {
      await expect(getSkillTreeSha(PROJECT, '')).resolves.toBeNull()
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('returns null when the directory entry is missing', async () => {
      mockRepo({ dirs: { skills: [makeTreeItem('skills/other', 'tree')] } })
      await expect(getSkillTreeSha(PROJECT, 'skills/missing')).resolves.toBeNull()
    })
  })
})
