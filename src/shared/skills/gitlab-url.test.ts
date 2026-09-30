import { describe, expect, it } from 'vitest'
import {
  DEFAULT_GITLAB_HOST,
  isGitLabComHost,
  isGitLabHost,
  normalizeGitLabHost,
  parseGitLabProjectUrl,
} from './gitlab-url'

describe('gitlab-url', () => {
  describe('parseGitLabProjectUrl', () => {
    it('parses a single-label intranet host when a scheme is given', () => {
      expect(parseGitLabProjectUrl('http://gitlabsake/sake/ai/skills')).toEqual({
        host: 'http://gitlabsake',
        projectPath: 'sake/ai/skills',
      })
    })

    it('keeps an explicit http scheme instead of upgrading to https', () => {
      expect(parseGitLabProjectUrl('http://gitlab.intranet/team/repo')?.host).toBe('http://gitlab.intranet')
      expect(parseGitLabProjectUrl('https://gitlab.intranet/team/repo')?.host).toBe('https://gitlab.intranet')
    })

    it('treats a scheme-less single-label first segment as a group, not a host', () => {
      // `gitlabsake/...` could be a host, but a bare first segment is indistinguishable
      // from a top-level group such as `gitlab-org/gitlab-runner`, so it stays a path.
      expect(parseGitLabProjectUrl('gitlabsake/sake/ai/skills')).toEqual({
        projectPath: 'gitlabsake/sake/ai/skills',
      })
    })

    it('parses gitlab.com URLs with nested groups', () => {
      expect(parseGitLabProjectUrl('https://gitlab.com/group/subgroup/repo')).toEqual({
        host: 'https://gitlab.com',
        projectPath: 'group/subgroup/repo',
      })
    })

    it('parses self-hosted hosts and adds the missing scheme', () => {
      expect(parseGitLabProjectUrl('https://gitlab.example.com/team/repo')).toEqual({
        host: 'https://gitlab.example.com',
        projectPath: 'team/repo',
      })
      expect(parseGitLabProjectUrl('gitlab.example.com/team/repo')).toEqual({
        host: 'https://gitlab.example.com',
        projectPath: 'team/repo',
      })
    })

    it('strips .git suffixes', () => {
      expect(parseGitLabProjectUrl('https://gitlab.com/group/repo.git')).toEqual({
        host: 'https://gitlab.com',
        projectPath: 'group/repo',
      })
    })

    it('drops web route suffixes such as /-/tree/<ref>/<path>', () => {
      expect(parseGitLabProjectUrl('https://gitlab.com/group/repo/-/tree/main/skills/demo')).toEqual({
        host: 'https://gitlab.com',
        projectPath: 'group/repo',
      })
    })

    it('ignores query strings and fragments', () => {
      expect(parseGitLabProjectUrl('https://gitlab.com/group/repo?ref=main#readme')).toEqual({
        host: 'https://gitlab.com',
        projectPath: 'group/repo',
      })
    })

    it('returns projectPath only for shorthand input', () => {
      expect(parseGitLabProjectUrl('group/subgroup/repo')).toEqual({ projectPath: 'group/subgroup/repo' })
    })

    it('returns null for non-GitLab hosts', () => {
      expect(parseGitLabProjectUrl('https://github.com/owner/repo')).toBeNull()
      expect(parseGitLabProjectUrl('https://example.com/owner/repo')).toBeNull()
    })

    it('returns null for single-segment or empty input', () => {
      expect(parseGitLabProjectUrl('')).toBeNull()
      expect(parseGitLabProjectUrl('repo')).toBeNull()
    })
  })

  describe('host helpers', () => {
    it('detects GitLab hosts', () => {
      expect(isGitLabHost('gitlab.com')).toBe(true)
      expect(isGitLabHost('gitlab.example.com')).toBe(true)
      expect(isGitLabHost('github.com')).toBe(false)
      expect(isGitLabHost(undefined)).toBe(false)
    })

    it('normalizes hosts and defaults to gitlab.com', () => {
      expect(normalizeGitLabHost()).toBe(DEFAULT_GITLAB_HOST)
      expect(normalizeGitLabHost('')).toBe(DEFAULT_GITLAB_HOST)
      expect(normalizeGitLabHost('gitlab.example.com/')).toBe('https://gitlab.example.com')
      expect(normalizeGitLabHost('https://gitlab.example.com')).toBe('https://gitlab.example.com')
    })

    it('honors the requested default scheme for schemeless hosts', () => {
      expect(normalizeGitLabHost('gitlabsake', 'http')).toBe('http://gitlabsake')
      expect(normalizeGitLabHost('gitlabsake')).toBe('https://gitlabsake')
      // An explicit scheme in the input still wins over the default.
      expect(normalizeGitLabHost('http://gitlab.example.com', 'https')).toBe('http://gitlab.example.com')
    })

    it('recognizes only gitlab.com as the environment-token host', () => {
      expect(isGitLabComHost('https://gitlab.com')).toBe(true)
      expect(isGitLabComHost('https://www.gitlab.com')).toBe(true)
      expect(isGitLabComHost('https://gitlab.example.com')).toBe(false)
    })
  })
})
