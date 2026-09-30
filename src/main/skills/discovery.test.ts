import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('fs', () => ({
  default: {
    existsSync: vi.fn(),
    mkdirSync: vi.fn(),
    readdirSync: vi.fn(),
    readFileSync: vi.fn(),
  },
}))

vi.mock('../util', () => ({
  getLogger: () => ({
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  }),
}))

vi.mock('./parser', () => ({
  parseSkillFile: vi.fn(),
}))

import fs from 'fs'
import { discoverSkills } from './discovery'
import { parseSkillFile } from './parser'

const mockedFs = vi.mocked(fs)
const mockedParse = vi.mocked(parseSkillFile)

describe('discoverSkills', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedFs.existsSync.mockReturnValue(true)
  })

  it('should read source.json when it exists', () => {
    const sourceJson = JSON.stringify({
      type: 'marketplace',
      repo: 'anthropics/skills',
      commitHash: 'abc123',
      installedAt: '2026-01-01T00:00:00Z',
    })

    mockedFs.readdirSync.mockReturnValue([{ name: 'my-skill', isDirectory: () => true }] as never)
    mockedFs.existsSync.mockImplementation((p) => {
      const s = String(p)
      if (s.endsWith('SKILL.md')) return true
      if (s.endsWith('source.json')) return true
      return true
    })
    mockedFs.readFileSync.mockReturnValue(sourceJson)
    mockedParse.mockReturnValue({
      metadata: { name: 'my-skill', description: 'A skill' },
      body: '# Instructions',
    })

    const skills = discoverSkills('/mock/skills')

    expect(skills).toHaveLength(1)
    expect(skills[0].source).toEqual({
      type: 'marketplace',
      repo: 'anthropics/skills',
      commitHash: 'abc123',
      installedAt: '2026-01-01T00:00:00Z',
    })
  })

  it('should strip the stored GitLab token so it never reaches the renderer', () => {
    const sourceJson = JSON.stringify({
      type: 'gitlab',
      repo: 'group/subgroup/repo',
      host: 'https://gitlab.example.com',
      skillPath: 'skills/demo',
      treeSha: 'tree-sha',
      token: 'glpat-secret',
      installedAt: '2026-01-01T00:00:00Z',
    })

    mockedFs.readdirSync.mockReturnValue([{ name: 'gl-skill', isDirectory: () => true }] as never)
    mockedFs.existsSync.mockReturnValue(true)
    mockedFs.readFileSync.mockReturnValue(sourceJson)
    mockedParse.mockReturnValue({
      metadata: { name: 'gl-skill', description: 'A private skill' },
      body: '# Instructions',
    })

    const skills = discoverSkills('/mock/skills')

    expect(skills).toHaveLength(1)
    // Everything except the credential is preserved...
    expect(skills[0].source).toEqual({
      type: 'gitlab',
      repo: 'group/subgroup/repo',
      host: 'https://gitlab.example.com',
      skillPath: 'skills/demo',
      treeSha: 'tree-sha',
      installedAt: '2026-01-01T00:00:00Z',
    })
    // ...and the token itself is gone from the object handed to the renderer.
    expect(skills[0].source).not.toHaveProperty('token')
    expect(JSON.stringify(skills)).not.toContain('glpat-secret')
  })

  it('should return undefined source when source.json does not exist', () => {
    mockedFs.readdirSync.mockReturnValue([{ name: 'local-skill', isDirectory: () => true }] as never)
    mockedFs.existsSync.mockImplementation((p) => {
      const s = String(p)
      if (s.endsWith('SKILL.md')) return true
      if (s.endsWith('source.json')) return false
      return true
    })
    mockedParse.mockReturnValue({
      metadata: { name: 'local-skill', description: 'A local skill' },
      body: '# Body',
    })

    const skills = discoverSkills('/mock/skills')

    expect(skills).toHaveLength(1)
    expect(skills[0].source).toBeUndefined()
  })

  it('should handle invalid source.json gracefully', () => {
    mockedFs.readdirSync.mockReturnValue([{ name: 'bad-source', isDirectory: () => true }] as never)
    mockedFs.existsSync.mockImplementation((p) => {
      const s = String(p)
      if (s.endsWith('SKILL.md')) return true
      if (s.endsWith('source.json')) return true
      return true
    })
    mockedFs.readFileSync.mockImplementation((p) => {
      if (String(p).endsWith('source.json')) throw new Error('invalid json')
      return ''
    })
    mockedParse.mockReturnValue({
      metadata: { name: 'bad-source', description: 'Bad source' },
      body: '# Body',
    })

    const skills = discoverSkills('/mock/skills')

    expect(skills).toHaveLength(1)
    expect(skills[0].source).toBeUndefined()
  })

  it('should deduplicate skills by name, keeping first occurrence', () => {
    mockedFs.readdirSync.mockReturnValue([
      { name: 'skill-a', isDirectory: () => true },
      { name: 'skill-b', isDirectory: () => true },
    ] as never)
    mockedFs.existsSync.mockImplementation((p) => {
      const s = String(p)
      if (s.endsWith('SKILL.md')) return true
      if (s.endsWith('source.json')) return false
      return true
    })
    mockedParse.mockReturnValue({
      metadata: { name: 'same-name', description: 'Duplicate' },
      body: '# Body',
    })

    const skills = discoverSkills('/mock/skills')

    expect(skills).toHaveLength(1)
    expect(skills[0].path).toContain('skill-a')
  })
})
