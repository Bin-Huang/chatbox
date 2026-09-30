import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('electron', () => ({
  app: {
    getPath: vi.fn(() => '/mock/userData'),
  },
}))

vi.mock('fs', () => ({
  default: {
    mkdirSync: vi.fn(),
    existsSync: vi.fn(),
    rmSync: vi.fn(),
    renameSync: vi.fn(),
    writeFileSync: vi.fn(),
    readFileSync: vi.fn(),
    statSync: vi.fn(),
    readdirSync: vi.fn(),
    promises: {
      cp: vi.fn().mockResolvedValue(undefined),
    },
  },
}))

vi.mock('../util', () => ({
  getLogger: () => ({
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  }),
}))

vi.mock('./github-fetcher', () => ({
  detectSkillsInRepo: vi.fn(),
  downloadSkillFiles: vi.fn(),
  getLatestCommitHash: vi.fn(),
  getSkillTreeSha: vi.fn(),
}))

vi.mock('./gitlab-fetcher', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./gitlab-fetcher')>()
  return {
    ...actual,
    detectSkillsInRepo: vi.fn(),
    downloadSkillFiles: vi.fn(),
    getLatestCommitHash: vi.fn(),
    getSkillTreeSha: vi.fn(),
  }
})

vi.mock('./parser', () => ({
  parseSkillFile: vi.fn(),
}))

vi.mock('../sandbox/manager', () => ({
  getStatus: vi.fn(),
  validateWritePath: vi.fn(),
}))

import fs from 'fs'
import { getStatus, validateWritePath } from '../sandbox/manager'
import { detectSkillsInRepo, downloadSkillFiles, getLatestCommitHash, getSkillTreeSha } from './github-fetcher'
import {
  detectSkillsInRepo as detectGitLabSkillsInRepo,
  downloadSkillFiles as downloadGitLabSkillFiles,
  getLatestCommitHash as getGitLabLatestCommitHash,
  getSkillTreeSha as getGitLabSkillTreeSha,
} from './gitlab-fetcher'
import {
  checkForUpdates,
  deleteSkill,
  installSkillFromGitHub,
  installSkillFromGitLab,
  installSkillFromMarketplace,
  installSkillFromSandbox,
  updateSkill,
} from './installer'
import { parseSkillFile } from './parser'

const mockedFs = vi.mocked(fs)
const mockedDetect = vi.mocked(detectSkillsInRepo)
const mockedDownload = vi.mocked(downloadSkillFiles)
const mockedGetHash = vi.mocked(getLatestCommitHash)
const mockedGetTreeSha = vi.mocked(getSkillTreeSha)
const mockedGitLabDetect = vi.mocked(detectGitLabSkillsInRepo)
const mockedGitLabDownload = vi.mocked(downloadGitLabSkillFiles)
const mockedGitLabGetHash = vi.mocked(getGitLabLatestCommitHash)
const mockedGitLabGetTreeSha = vi.mocked(getGitLabSkillTreeSha)
const mockedParse = vi.mocked(parseSkillFile)
const mockedGetStatus = vi.mocked(getStatus)
const mockedValidateWritePath = vi.mocked(validateWritePath)

describe('installer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('installSkillFromGitHub', () => {
    it('should install skill successfully', async () => {
      mockedDownload.mockResolvedValue(undefined)
      mockedFs.existsSync.mockImplementation((p) => {
        if (String(p).includes('SKILL.md')) return true
        if (String(p).includes('.tmp-')) return false
        return false
      })
      mockedParse.mockReturnValue({
        metadata: { name: 'my-new-skill', description: 'A new skill' },
        body: '# Instructions',
      })
      mockedGetHash.mockResolvedValue('commit-hash-123')

      const result = await installSkillFromGitHub('owner', 'repo', 'skills/my-new-skill')

      expect(result.success).toBe(true)
      expect(result.skillName).toBe('my-new-skill')
      expect(mockedDownload).toHaveBeenCalled()
      expect(mockedGetHash).toHaveBeenCalledWith('owner', 'repo', '')
      expect(mockedFs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('source.json'),
        expect.stringContaining('"commit-hash-123"'),
        'utf-8'
      )
    })

    it('should record the per-skill tree sha and skip the commit API when available', async () => {
      mockedDownload.mockResolvedValue(undefined)
      mockedFs.existsSync.mockImplementation((p) => {
        if (String(p).includes('SKILL.md')) return true
        if (String(p).includes('.tmp-')) return false
        return false
      })
      mockedParse.mockReturnValue({
        metadata: { name: 'my-new-skill', description: 'A new skill' },
        body: '# Instructions',
      })
      mockedGetTreeSha.mockResolvedValue('tree-sha-abc')

      const result = await installSkillFromGitHub('owner', 'repo', 'skills/my-new-skill')

      expect(result.success).toBe(true)
      expect(mockedGetTreeSha).toHaveBeenCalledWith('owner', 'repo', 'skills/my-new-skill')
      expect(mockedGetHash).not.toHaveBeenCalled()
      expect(mockedFs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('source.json'),
        expect.stringContaining('"tree-sha-abc"'),
        'utf-8'
      )
    })

    it('should fail when SKILL.md is missing', async () => {
      mockedDownload.mockResolvedValue(undefined)
      mockedFs.existsSync.mockReturnValue(false)

      const result = await installSkillFromGitHub('owner', 'repo', 'bad-path')

      expect(result.success).toBe(false)
      expect(result.error).toContain('No SKILL.md found')
    })

    it('should fail when SKILL.md is invalid (parseSkillFile returns null)', async () => {
      mockedDownload.mockResolvedValue(undefined)
      mockedFs.existsSync.mockImplementation((p) => {
        if (String(p).includes('SKILL.md')) return true
        return false
      })
      mockedParse.mockReturnValue(null)

      const result = await installSkillFromGitHub('owner', 'repo', '')

      expect(result.success).toBe(false)
      expect(result.error).toContain('Invalid SKILL.md')
    })
  })

  describe('installSkillFromMarketplace', () => {
    it('should install using detected path when skill name and directory differ by prefix', async () => {
      mockedDetect.mockResolvedValue([
        {
          name: 'react-best-practices',
          path: 'skills/react-best-practices',
          description: 'React guidance',
        },
      ])
      mockedDownload.mockResolvedValue(undefined)
      mockedFs.existsSync.mockImplementation((p) => {
        if (String(p).includes('SKILL.md')) return true
        if (String(p).includes('.tmp-')) return false
        return false
      })
      mockedParse.mockReturnValue({
        metadata: { name: 'react-best-practices', description: 'React guidance' },
        body: '# Instructions',
      })
      mockedGetHash.mockResolvedValue('hash-123')

      const result = await installSkillFromMarketplace({
        id: 'vercel-labs/agent-skills/vercel-react-best-practices',
        skillId: 'vercel-react-best-practices',
        name: 'vercel-react-best-practices',
        installs: 100,
        source: 'vercel-labs/agent-skills',
      })

      expect(result.success).toBe(true)
      expect(mockedDownload).toHaveBeenCalledWith(
        'vercel-labs',
        'agent-skills',
        'skills/react-best-practices',
        expect.any(String)
      )
    })

    it('should try fallback skill paths before root path', async () => {
      mockedDetect.mockResolvedValue([])
      let requestedSkillPath = ''
      mockedDownload.mockImplementation(async (_owner, _repo, skillPath) => {
        requestedSkillPath = skillPath
      })

      mockedFs.existsSync.mockImplementation((p) => {
        const value = String(p)
        if (value.endsWith('SKILL.md')) return requestedSkillPath === 'skills/frontend-design'
        if (value.includes('.tmp-')) return false
        if (value.includes('source.json')) return false
        return false
      })
      mockedParse.mockReturnValue({
        metadata: { name: 'frontend-design', description: 'Frontend design guidance' },
        body: '# Instructions',
      })
      mockedGetHash.mockResolvedValue('hash-456')

      const result = await installSkillFromMarketplace({
        id: 'anthropics/skills/frontend-design',
        skillId: 'frontend-design',
        name: 'frontend-design',
        installs: 100,
        source: 'anthropics/skills',
      })

      expect(result.success).toBe(true)
      const calledPaths = mockedDownload.mock.calls.map(([, , skillPath]) => skillPath)
      expect(calledPaths[0]).toBe('skills/frontend-design')
    })

    it('should install from a GitLab source with the GitLab fetcher', async () => {
      mockedGitLabDetect.mockResolvedValue([{ name: 'gl-skill', path: 'skills/gl-skill', description: 'GitLab skill' }])
      mockedGitLabDownload.mockResolvedValue(undefined)
      mockedFs.existsSync.mockImplementation((p) => {
        const value = String(p)
        if (value.endsWith('SKILL.md')) return true
        if (value.includes('source.json')) return true
        return false
      })
      mockedFs.readFileSync.mockReturnValue(JSON.stringify({ type: 'gitlab', repo: 'group/repo' }) as never)
      mockedParse.mockReturnValue({
        metadata: { name: 'gl-skill', description: 'GitLab skill' },
        body: '# Instructions',
      })
      mockedGitLabGetTreeSha.mockResolvedValue('gl-tree-sha')

      const result = await installSkillFromMarketplace({
        id: 'group/repo/gl-skill',
        skillId: 'gl-skill',
        name: 'gl-skill',
        installs: 5,
        source: 'https://gitlab.com/group/repo',
      })

      expect(result.success).toBe(true)
      expect(mockedGitLabDetect).toHaveBeenCalledWith('group/repo', { host: 'https://gitlab.com' })
      expect(mockedGitLabDownload).toHaveBeenCalledWith('group/repo', 'skills/gl-skill', expect.any(String), {
        host: 'https://gitlab.com',
      })
      // GitHub fetcher must not be used for GitLab sources
      expect(mockedDownload).not.toHaveBeenCalled()
      expect(mockedFs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('source.json'),
        expect.stringContaining('"marketplace"'),
        'utf-8'
      )
    })
  })

  describe('installSkillFromGitLab', () => {
    it('should install a skill and record the per-skill tree sha', async () => {
      mockedGitLabDownload.mockResolvedValue(undefined)
      mockedFs.existsSync.mockImplementation((p) => {
        if (String(p).includes('SKILL.md')) return true
        return false
      })
      mockedParse.mockReturnValue({
        metadata: { name: 'gl-demo', description: 'Demo' },
        body: '# Instructions',
      })
      mockedGitLabGetTreeSha.mockResolvedValue('gl-tree-sha')

      const result = await installSkillFromGitLab('group/subgroup/repo', 'skills/gl-demo', {
        host: 'https://gitlab.example.com',
      })

      expect(result).toEqual({ success: true, skillName: 'gl-demo' })
      expect(mockedGitLabGetTreeSha).toHaveBeenCalledWith('group/subgroup/repo', 'skills/gl-demo', {
        host: 'https://gitlab.example.com',
      })
      expect(mockedGitLabGetHash).not.toHaveBeenCalled()

      const writeCall = mockedFs.writeFileSync.mock.calls.find((call) => String(call[0]).includes('source.json'))
      expect(writeCall).toBeDefined()
      const written = JSON.parse(writeCall![1] as string)
      expect(written).toMatchObject({
        type: 'gitlab',
        repo: 'group/subgroup/repo',
        host: 'https://gitlab.example.com',
        skillPath: 'skills/gl-demo',
        treeSha: 'gl-tree-sha',
      })
      expect(written.installedAt).toBeDefined()
      // No token was supplied, so nothing credential-like is written.
      expect(written.token).toBeUndefined()
    })

    it('should persist the access token so private projects can be updated later', async () => {
      mockedGitLabDownload.mockResolvedValue(undefined)
      mockedFs.existsSync.mockImplementation((p) => String(p).includes('SKILL.md'))
      mockedParse.mockReturnValue({
        metadata: { name: 'gl-private', description: 'Private' },
        body: '# Instructions',
      })
      mockedGitLabGetTreeSha.mockResolvedValue('gl-tree-sha')

      const result = await installSkillFromGitLab('group/private-repo', 'skills/gl-private', {
        host: 'https://gitlab.com',
        token: 'glpat-secret',
      })

      expect(result.success).toBe(true)

      const writeCall = mockedFs.writeFileSync.mock.calls.find((call) => String(call[0]).includes('source.json'))
      const written = JSON.parse(writeCall![1] as string)
      expect(written.token).toBe('glpat-secret')
      expect(written.type).toBe('gitlab')
    })

    it('should fall back to the path-scoped commit hash when no tree sha is available', async () => {
      mockedGitLabDownload.mockResolvedValue(undefined)
      mockedFs.existsSync.mockImplementation((p) => {
        if (String(p).includes('SKILL.md')) return true
        return false
      })
      mockedParse.mockReturnValue({
        metadata: { name: 'gl-demo', description: 'Demo' },
        body: '# Instructions',
      })
      mockedGitLabGetTreeSha.mockResolvedValue(null)
      mockedGitLabGetHash.mockResolvedValue('gl-commit-hash')

      const result = await installSkillFromGitLab('group/repo', 'skills/gl-demo')

      expect(result.success).toBe(true)
      expect(mockedGitLabGetHash).toHaveBeenCalledWith('group/repo', 'skills/gl-demo', undefined)
      expect(mockedFs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('source.json'),
        expect.stringContaining('"gl-commit-hash"'),
        'utf-8'
      )
    })

    it('should fail when SKILL.md is missing', async () => {
      mockedGitLabDownload.mockResolvedValue(undefined)
      mockedFs.existsSync.mockReturnValue(false)

      const result = await installSkillFromGitLab('group/repo', 'bad-path')

      expect(result.success).toBe(false)
      expect(result.error).toContain('No SKILL.md found')
    })

    it('should surface download errors', async () => {
      mockedGitLabDownload.mockRejectedValue(new Error('Project not found: group/repo'))

      const result = await installSkillFromGitLab('group/repo', '')

      expect(result.success).toBe(false)
      expect(result.error).toContain('Project not found')
    })
  })

  describe('updateSkill', () => {
    it('should re-install a GitHub skill from the recorded source', async () => {
      mockedFs.existsSync.mockImplementation((p) => {
        const s = String(p)
        if (s.includes('source.json')) return true
        if (s.includes('SKILL.md')) return true
        return false
      })
      mockedFs.readFileSync.mockReturnValue(
        JSON.stringify({ type: 'github', repo: 'owner/repo', skillPath: 'skills/demo' })
      )
      mockedDownload.mockResolvedValue(undefined)
      mockedParse.mockReturnValue({ metadata: { name: 'demo', description: 'demo' }, body: '# Body' })
      mockedGetTreeSha.mockResolvedValue('tree-sha')

      const result = await updateSkill('demo')

      expect(result).toEqual({ success: true, skillName: 'demo' })
      expect(mockedDownload).toHaveBeenCalledWith('owner', 'repo', 'skills/demo', expect.any(String))
    })

    it('should reuse the stored token when updating a private GitLab skill', async () => {
      mockedFs.existsSync.mockImplementation((p) => {
        const s = String(p)
        if (s.includes('source.json')) return true
        if (s.includes('SKILL.md')) return true
        return false
      })
      mockedFs.readFileSync.mockReturnValue(
        JSON.stringify({
          type: 'gitlab',
          repo: 'group/subgroup/repo',
          host: 'https://gitlab.example.com',
          skillPath: 'skills/demo',
          token: 'glpat-secret',
        })
      )
      mockedGitLabDownload.mockResolvedValue(undefined)
      mockedParse.mockReturnValue({ metadata: { name: 'demo', description: 'demo' }, body: '# Body' })
      mockedGitLabGetTreeSha.mockResolvedValue('gl-tree-sha')

      const result = await updateSkill('demo')

      expect(result).toEqual({ success: true, skillName: 'demo' })
      expect(mockedGitLabDownload).toHaveBeenCalledWith('group/subgroup/repo', 'skills/demo', expect.any(String), {
        host: 'https://gitlab.example.com',
        token: 'glpat-secret',
      })
      // The token is written back so it survives the update.
      const writeCall = mockedFs.writeFileSync.mock.calls.find((call) => String(call[0]).includes('source.json'))
      expect(JSON.parse(writeCall![1] as string).token).toBe('glpat-secret')
    })

    it('should reject an invalid skill name without touching the filesystem', async () => {
      const result = await updateSkill('../outside')

      expect(result.success).toBe(false)
      expect(result.error).toContain('Invalid skill name')
      expect(mockedDownload).not.toHaveBeenCalled()
      expect(mockedGitLabDownload).not.toHaveBeenCalled()
    })

    it('should fail when source.json is missing', async () => {
      mockedFs.existsSync.mockReturnValue(false)

      const result = await updateSkill('orphan')

      expect(result.success).toBe(false)
      expect(result.error).toContain('No source.json')
    })

    it('should fail when the skill has no repository information', async () => {
      mockedFs.existsSync.mockReturnValue(true)
      mockedFs.readFileSync.mockReturnValue(JSON.stringify({ type: 'github' }))

      const result = await updateSkill('demo')

      expect(result.success).toBe(false)
      expect(result.error).toContain('no repository')
    })

    it('should remove the stale directory when the skill was renamed upstream', async () => {
      mockedFs.existsSync.mockImplementation((p) => {
        const s = String(p)
        if (s.includes('SKILL.md')) return true
        if (s.includes('source.json')) return true
        if (s.endsWith('old-skill')) return true
        return false
      })
      mockedFs.readFileSync.mockReturnValue(
        JSON.stringify({ type: 'github', repo: 'owner/repo', skillPath: 'skills/old-skill' })
      )
      mockedDownload.mockResolvedValue(undefined)
      mockedParse.mockReturnValue({ metadata: { name: 'new-skill', description: 'renamed' }, body: '# Body' })
      mockedGetTreeSha.mockResolvedValue('tree-sha')

      const result = await updateSkill('old-skill')

      expect(result).toEqual({ success: true, skillName: 'new-skill' })
      expect(mockedFs.rmSync).toHaveBeenCalledWith(expect.stringContaining('old-skill'), {
        recursive: true,
        force: true,
      })
    })

    it('should keep the marketplace tag after an update', async () => {
      mockedFs.existsSync.mockImplementation((p) => {
        const s = String(p)
        if (s.includes('source.json')) return true
        if (s.includes('SKILL.md')) return true
        return false
      })
      mockedFs.readFileSync.mockReturnValue(
        JSON.stringify({ type: 'marketplace', repo: 'owner/repo', skillPath: 'skills/demo' })
      )
      mockedDownload.mockResolvedValue(undefined)
      mockedParse.mockReturnValue({ metadata: { name: 'demo', description: 'demo' }, body: '# Body' })
      mockedGetTreeSha.mockResolvedValue('tree-sha')

      const result = await updateSkill('demo')

      expect(result.success).toBe(true)
      const marketplaceWrite = mockedFs.writeFileSync.mock.calls.some(
        (call) => String(call[0]).includes('source.json') && String(call[1]).includes('"marketplace"')
      )
      expect(marketplaceWrite).toBe(true)
    })

    it('should keep the installed skill intact when the download fails', async () => {
      mockedFs.existsSync.mockImplementation((p) => {
        const s = String(p)
        if (s.includes('source.json')) return true
        if (s.includes('SKILL.md')) return true
        return false
      })
      mockedFs.readFileSync.mockReturnValue(
        JSON.stringify({ type: 'gitlab', repo: 'group/repo', skillPath: 'skills/demo', token: 'glpat-secret' })
      )
      mockedGitLabDownload.mockRejectedValue(new Error('Project not found or not accessible: group/repo'))

      const result = await updateSkill('demo')

      expect(result.success).toBe(false)
      expect(result.error).toContain('Project not found')
      // Nothing was deleted or moved: the previous copy is still installed.
      expect(mockedFs.rmSync).not.toHaveBeenCalled()
    })
  })

  describe('deleteSkill', () => {
    it('should delete existing skill successfully', async () => {
      mockedFs.existsSync.mockReturnValue(true)

      const result = await deleteSkill('my-custom-skill')

      expect(result.success).toBe(true)
      expect(mockedFs.rmSync).toHaveBeenCalledWith(expect.stringContaining('my-custom-skill'), {
        recursive: true,
        force: true,
      })
    })

    it('should fail if skill directory does not exist', async () => {
      mockedFs.existsSync.mockReturnValue(false)

      const result = await deleteSkill('nonexistent-skill')

      expect(result.success).toBe(false)
      expect(result.error).toContain('not found')
    })

    it('should reject empty skill name', async () => {
      const result = await deleteSkill('')

      expect(result.success).toBe(false)
      expect(result.error).toContain('Invalid skill name')
    })

    it('should reject path traversal skill names', async () => {
      const result = await deleteSkill('../outside')

      expect(result.success).toBe(false)
      expect(result.error).toContain('Invalid skill name')
      expect(mockedFs.rmSync).not.toHaveBeenCalled()
    })
  })

  describe('installSkillFromSandbox', () => {
    const sandboxWorkDir = '/tmp/sandbox/session-1'

    it('should install skill successfully from sandbox (happy path)', async () => {
      mockedGetStatus.mockReturnValue({
        state: 'initialized',
        workingDirectory: sandboxWorkDir,
      } as ReturnType<typeof getStatus>)
      mockedValidateWritePath.mockResolvedValue({ valid: true })
      mockedFs.existsSync.mockImplementation((p) => {
        const s = String(p)
        if (s.includes('SKILL.md')) return true
        // targetDir does not exist yet (no overwrite)
        if (s === '/mock/userData/skills/my-sandbox-skill') return false
        return true
      })
      mockedFs.statSync.mockReturnValue({ isDirectory: () => true } as ReturnType<typeof fs.statSync>)
      mockedParse.mockReturnValue({
        metadata: { name: 'my-sandbox-skill', description: 'A sandbox skill' },
        body: '# Skill instructions',
      })
      mockedFs.readdirSync.mockReturnValue([])

      const result = await installSkillFromSandbox('my-skill-dir', 'session-1')

      expect(result.success).toBe(true)
      expect(result.skillName).toBe('my-sandbox-skill')
      expect(mockedFs.promises.cp).toHaveBeenCalledWith(
        expect.stringContaining('my-skill-dir'),
        expect.stringContaining('my-sandbox-skill'),
        { recursive: true }
      )
      // source.json should be written with type: 'chat'
      expect(mockedFs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('source.json'),
        expect.stringContaining('"chat"'),
        'utf-8'
      )
    })

    it('should fail when sandbox is not initialized (no workingDirectory)', async () => {
      mockedGetStatus.mockReturnValue({
        state: 'idle',
        workingDirectory: undefined,
      } as unknown as ReturnType<typeof getStatus>)

      const result = await installSkillFromSandbox('my-skill-dir', 'session-1')

      expect(result.success).toBe(false)
      expect(result.error).toContain('Sandbox not initialized')
    })

    it('should fail on path traversal attempt', async () => {
      mockedGetStatus.mockReturnValue({
        state: 'initialized',
        workingDirectory: sandboxWorkDir,
      } as ReturnType<typeof getStatus>)
      mockedValidateWritePath.mockResolvedValue({ valid: false, error: 'Invalid path: outside sandbox' })

      const result = await installSkillFromSandbox('../../etc', 'session-1')

      expect(result.success).toBe(false)
      expect(result.error).toContain('outside sandbox')
    })

    it('should fail when SKILL.md is missing', async () => {
      mockedGetStatus.mockReturnValue({
        state: 'initialized',
        workingDirectory: sandboxWorkDir,
      } as ReturnType<typeof getStatus>)
      mockedValidateWritePath.mockResolvedValue({ valid: true })
      mockedFs.existsSync.mockImplementation((p) => {
        if (String(p).includes('SKILL.md')) return false
        return true
      })
      mockedFs.statSync.mockReturnValue({ isDirectory: () => true } as ReturnType<typeof fs.statSync>)

      const result = await installSkillFromSandbox('my-skill-dir', 'session-1')

      expect(result.success).toBe(false)
      expect(result.error).toContain('No SKILL.md found')
    })

    it('should fail when SKILL.md is invalid (parseSkillFile returns null)', async () => {
      mockedGetStatus.mockReturnValue({
        state: 'initialized',
        workingDirectory: sandboxWorkDir,
      } as ReturnType<typeof getStatus>)
      mockedValidateWritePath.mockResolvedValue({ valid: true })
      mockedFs.existsSync.mockImplementation((p) => {
        if (String(p).includes('SKILL.md')) return true
        return true
      })
      mockedFs.statSync.mockReturnValue({ isDirectory: () => true } as ReturnType<typeof fs.statSync>)
      mockedParse.mockReturnValue(null)

      const result = await installSkillFromSandbox('my-skill-dir', 'session-1')

      expect(result.success).toBe(false)
      expect(result.error).toContain('Invalid SKILL.md')
    })

    it('should fail when directory is too large (>50MB)', async () => {
      mockedGetStatus.mockReturnValue({
        state: 'initialized',
        workingDirectory: sandboxWorkDir,
      } as ReturnType<typeof getStatus>)
      mockedValidateWritePath.mockResolvedValue({ valid: true })
      mockedFs.existsSync.mockReturnValue(true)
      mockedFs.statSync.mockImplementation((p) => {
        const s = String(p)
        // For isDirectory check on the resolved path
        if (s.endsWith('my-skill-dir') || s === `${sandboxWorkDir}/my-skill-dir`) {
          return { isDirectory: () => true } as ReturnType<typeof fs.statSync>
        }
        // For file size inside getDirectorySize
        return { isDirectory: () => false, size: 60 * 1024 * 1024 } as unknown as ReturnType<typeof fs.statSync>
      })
      mockedParse.mockReturnValue({
        metadata: { name: 'big-skill', description: 'Too large' },
        body: '# Big',
      })
      // getDirectorySize iterates entries
      mockedFs.readdirSync.mockReturnValue([
        { name: 'huge-file.bin', isDirectory: () => false, isFile: () => true },
      ] as unknown as ReturnType<typeof fs.readdirSync>)

      const result = await installSkillFromSandbox('my-skill-dir', 'session-1')

      expect(result.success).toBe(false)
      expect(result.error).toContain('too large')
    })

    it('should overwrite existing skill (rmSync called before copy)', async () => {
      mockedGetStatus.mockReturnValue({
        state: 'initialized',
        workingDirectory: sandboxWorkDir,
      } as ReturnType<typeof getStatus>)
      mockedValidateWritePath.mockResolvedValue({ valid: true })
      mockedFs.existsSync.mockReturnValue(true)
      mockedFs.statSync.mockReturnValue({ isDirectory: () => true } as ReturnType<typeof fs.statSync>)
      mockedParse.mockReturnValue({
        metadata: { name: 'existing-skill', description: 'Overwrite me' },
        body: '# Instructions',
      })
      mockedFs.readdirSync.mockReturnValue([])

      const result = await installSkillFromSandbox('my-skill-dir', 'session-1')

      expect(result.success).toBe(true)
      // rmSync should be called on the target directory to remove existing skill
      expect(mockedFs.rmSync).toHaveBeenCalledWith(expect.stringContaining('existing-skill'), {
        recursive: true,
        force: true,
      })
      // Then copy should proceed
      expect(mockedFs.promises.cp).toHaveBeenCalled()
    })

    it('should write source.json with type "chat"', async () => {
      mockedGetStatus.mockReturnValue({
        state: 'initialized',
        workingDirectory: sandboxWorkDir,
      } as ReturnType<typeof getStatus>)
      mockedValidateWritePath.mockResolvedValue({ valid: true })
      mockedFs.existsSync.mockImplementation((p) => {
        const s = String(p)
        if (s.includes('SKILL.md')) return true
        if (s.includes('/skills/chat-skill')) return false
        return true
      })
      mockedFs.statSync.mockReturnValue({ isDirectory: () => true } as ReturnType<typeof fs.statSync>)
      mockedParse.mockReturnValue({
        metadata: { name: 'chat-skill', description: 'From chat' },
        body: '# Body',
      })
      mockedFs.readdirSync.mockReturnValue([])

      await installSkillFromSandbox('my-skill-dir', 'session-1', 'https://example.com/skill.tar.gz')

      const writeCall = mockedFs.writeFileSync.mock.calls.find((call) => String(call[0]).includes('source.json'))
      expect(writeCall).toBeDefined()
      const written = JSON.parse(writeCall![1] as string)
      expect(written.type).toBe('chat')
      expect(written.repo).toBe('https://example.com/skill.tar.gz')
      expect(written.installedAt).toBeDefined()
    })
  })

  describe('checkForUpdates', () => {
    it('should reject invalid skill names', async () => {
      const result = await checkForUpdates('../outside')

      expect(result.hasUpdate).toBe(false)
      expect(result.error).toContain('Invalid skill name')
    })

    it('should detect available update when hashes differ', async () => {
      mockedFs.existsSync.mockReturnValue(true)
      mockedFs.readFileSync.mockReturnValue(
        JSON.stringify({
          type: 'github',
          repo: 'owner/repo',
          skillPath: 'skills/test',
          commitHash: 'old-hash-111',
        })
      )
      mockedGetHash.mockResolvedValue('new-hash-222')

      const result = await checkForUpdates('test-skill')

      expect(result.hasUpdate).toBe(true)
      expect(result.currentHash).toBe('old-hash-111')
      expect(result.latestHash).toBe('new-hash-222')
    })

    it('should report no update when hashes match', async () => {
      mockedFs.existsSync.mockReturnValue(true)
      mockedFs.readFileSync.mockReturnValue(
        JSON.stringify({
          type: 'github',
          repo: 'owner/repo',
          commitHash: 'same-hash',
        })
      )
      mockedGetHash.mockResolvedValue('same-hash')

      const result = await checkForUpdates('test-skill')

      expect(result.hasUpdate).toBe(false)
    })

    it('should compare the per-skill tree sha and ignore unrelated repo commits', async () => {
      mockedFs.existsSync.mockReturnValue(true)
      mockedFs.readFileSync.mockReturnValue(
        JSON.stringify({
          type: 'github',
          repo: 'owner/repo',
          skillPath: 'skills/test',
          treeSha: 'tree-old',
        })
      )
      mockedGetTreeSha.mockResolvedValue('tree-new')

      const result = await checkForUpdates('test-skill')

      expect(mockedGetTreeSha).toHaveBeenCalledWith('owner', 'repo', 'skills/test')
      // The commit API (which would false-positive on unrelated commits) is not used.
      expect(mockedGetHash).not.toHaveBeenCalled()
      expect(result.hasUpdate).toBe(true)
      expect(result.currentHash).toBe('tree-old')
      expect(result.latestHash).toBe('tree-new')
    })

    it('should report no update when the tree sha matches', async () => {
      mockedFs.existsSync.mockReturnValue(true)
      mockedFs.readFileSync.mockReturnValue(
        JSON.stringify({
          type: 'github',
          repo: 'owner/repo',
          skillPath: 'skills/test',
          treeSha: 'tree-same',
        })
      )
      mockedGetTreeSha.mockResolvedValue('tree-same')

      const result = await checkForUpdates('test-skill')

      expect(result.hasUpdate).toBe(false)
      expect(mockedGetHash).not.toHaveBeenCalled()
    })

    it('should return error when source.json is missing', async () => {
      mockedFs.existsSync.mockReturnValue(false)
      mockedFs.readFileSync.mockImplementation(() => {
        throw new Error('ENOENT')
      })

      const result = await checkForUpdates('orphan-skill')

      expect(result.hasUpdate).toBe(false)
      expect(result.error).toBeDefined()
    })

    it('should check GitLab skills with the GitLab fetcher and the recorded host', async () => {
      mockedFs.existsSync.mockReturnValue(true)
      mockedFs.readFileSync.mockReturnValue(
        JSON.stringify({
          type: 'gitlab',
          repo: 'group/subgroup/repo',
          host: 'https://gitlab.example.com',
          skillPath: 'skills/gl-demo',
          treeSha: 'gl-tree-old',
        })
      )
      mockedGitLabGetTreeSha.mockResolvedValue('gl-tree-new')

      const result = await checkForUpdates('gl-skill')

      expect(mockedGitLabGetTreeSha).toHaveBeenCalledWith('group/subgroup/repo', 'skills/gl-demo', {
        host: 'https://gitlab.example.com',
        token: undefined,
      })
      expect(mockedGetTreeSha).not.toHaveBeenCalled()
      expect(mockedGitLabGetHash).not.toHaveBeenCalled()
      expect(result.hasUpdate).toBe(true)
      expect(result.currentHash).toBe('gl-tree-old')
      expect(result.latestHash).toBe('gl-tree-new')
    })

    it('should reuse the token stored alongside the skill when checking for updates', async () => {
      mockedFs.existsSync.mockReturnValue(true)
      mockedFs.readFileSync.mockReturnValue(
        JSON.stringify({
          type: 'gitlab',
          repo: 'group/private-repo',
          host: 'https://gitlab.com',
          skillPath: 'skills/gl-private',
          treeSha: 'gl-tree-old',
          token: 'glpat-secret',
        })
      )
      mockedGitLabGetTreeSha.mockResolvedValue('gl-tree-new')

      const result = await checkForUpdates('gl-private-skill')

      expect(mockedGitLabGetTreeSha).toHaveBeenCalledWith('group/private-repo', 'skills/gl-private', {
        host: 'https://gitlab.com',
        token: 'glpat-secret',
      })
      expect(result.hasUpdate).toBe(true)
    })

    it('should explain that a missing token is the likely cause when the tree cannot be fetched', async () => {
      mockedFs.existsSync.mockReturnValue(true)
      mockedFs.readFileSync.mockReturnValue(
        JSON.stringify({
          type: 'gitlab',
          repo: 'group/private-repo',
          host: 'https://gitlab.com',
          skillPath: 'skills/gl-private',
          treeSha: 'gl-tree-old',
        })
      )
      mockedGitLabGetTreeSha.mockResolvedValue(null)

      const result = await checkForUpdates('gl-private-skill')

      expect(result.hasUpdate).toBe(false)
      expect(result.error).toMatch(/private/i)
      expect(result.error).toMatch(/access token/i)
    })

    it('should point at the stored token when it no longer works', async () => {
      mockedFs.existsSync.mockReturnValue(true)
      mockedFs.readFileSync.mockReturnValue(
        JSON.stringify({
          type: 'gitlab',
          repo: 'group/private-repo',
          skillPath: 'skills/gl-private',
          treeSha: 'gl-tree-old',
          token: 'glpat-expired',
        })
      )
      mockedGitLabGetTreeSha.mockResolvedValue(null)

      const result = await checkForUpdates('gl-private-skill')

      expect(result.hasUpdate).toBe(false)
      expect(result.error).toMatch(/access token may have expired/i)
    })

    it('should compare the GitLab path-scoped commit hash for legacy records', async () => {
      mockedFs.existsSync.mockReturnValue(true)
      mockedFs.readFileSync.mockReturnValue(
        JSON.stringify({
          type: 'gitlab',
          repo: 'group/repo',
          skillPath: 'skills/gl-demo',
          commitHash: 'gl-commit-old',
        })
      )
      mockedGitLabGetHash.mockResolvedValue('gl-commit-new')

      const result = await checkForUpdates('gl-skill')

      expect(mockedGitLabGetHash).toHaveBeenCalledWith('group/repo', 'skills/gl-demo', {
        host: undefined,
        token: undefined,
      })
      expect(result.hasUpdate).toBe(true)
      expect(result.currentHash).toBe('gl-commit-old')
      expect(result.latestHash).toBe('gl-commit-new')
    })

    it('should report no GitLab update when the tree sha matches', async () => {
      mockedFs.existsSync.mockReturnValue(true)
      mockedFs.readFileSync.mockReturnValue(
        JSON.stringify({
          type: 'gitlab',
          repo: 'group/repo',
          skillPath: 'skills/gl-demo',
          treeSha: 'gl-tree-same',
        })
      )
      mockedGitLabGetTreeSha.mockResolvedValue('gl-tree-same')

      const result = await checkForUpdates('gl-skill')

      expect(result.hasUpdate).toBe(false)
    })

    it('should route marketplace skills installed from a self-hosted GitLab host', async () => {
      mockedFs.existsSync.mockReturnValue(true)
      mockedFs.readFileSync.mockReturnValue(
        JSON.stringify({
          type: 'marketplace',
          repo: 'group/repo',
          host: 'https://code.example.com',
          skillPath: 'skills/gl-demo',
          treeSha: 'gl-tree-old',
        })
      )
      mockedGitLabGetTreeSha.mockResolvedValue('gl-tree-new')

      const result = await checkForUpdates('gl-skill')

      expect(mockedGitLabGetTreeSha).toHaveBeenCalledWith('group/repo', 'skills/gl-demo', {
        host: 'https://code.example.com',
      })
      expect(mockedGetTreeSha).not.toHaveBeenCalled()
      expect(result.hasUpdate).toBe(true)
    })

    it('should not route GitHub skills to the GitLab fetcher', async () => {
      mockedFs.existsSync.mockReturnValue(true)
      mockedFs.readFileSync.mockReturnValue(
        JSON.stringify({
          type: 'github',
          repo: 'owner/my-gitlab-tools',
          skillPath: 'skills/test',
          commitHash: 'old-hash',
        })
      )
      mockedGetHash.mockResolvedValue('new-hash')

      const result = await checkForUpdates('gh-skill')

      expect(mockedGetHash).toHaveBeenCalledWith('owner', 'my-gitlab-tools', '')
      expect(mockedGitLabGetHash).not.toHaveBeenCalled()
      expect(mockedGitLabGetTreeSha).not.toHaveBeenCalled()
      expect(result.hasUpdate).toBe(true)
    })
  })
})
