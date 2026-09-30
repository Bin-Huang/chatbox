/**
 * Shared GitLab URL parsing used by both the main-process fetcher and the renderer
 * install form, so the two never disagree about what a project reference means.
 */

export const DEFAULT_GITLAB_HOST = 'https://gitlab.com'

export interface GitLabProjectRef {
  /** Project full path, e.g. `group/subgroup/repo`. */
  projectPath: string
  /** GitLab instance base URL, e.g. `https://gitlab.example.com`. Absent for gitlab.com. */
  host?: string
}

/**
 * Normalizes a host or base URL to a scheme-prefixed, slash-free form.
 * An explicit scheme in the input always wins; `scheme` only applies when the input
 * has none, so a plain-`http` intranet instance is not silently upgraded to https.
 */
export function normalizeGitLabHost(host?: string, scheme: 'http' | 'https' = 'https'): string {
  const raw = (host || DEFAULT_GITLAB_HOST).trim().replace(/\/+$/, '')
  if (!raw) return DEFAULT_GITLAB_HOST
  if (/^https?:\/\//i.test(raw)) return raw
  return `${scheme}://${raw}`
}

/** True when the URL host looks like a GitLab instance (gitlab.com or a self-hosted hostname). */
export function isGitLabHost(host: string | undefined): boolean {
  if (!host) return false
  return /gitlab/i.test(host)
}

/** True when the normalized host is gitlab.com (the only host that receives the environment token). */
export function isGitLabComHost(host: string): boolean {
  return /^https?:\/\/(www\.)?gitlab\.com$/i.test(host)
}

/**
 * Parse a GitLab project reference from a URL or `group/project` shorthand.
 * Returns null for non-GitLab hosts so callers can fall back to GitHub parsing.
 *
 * A host segment is required to contain "gitlab" (gitlab.com or a self-hosted
 * hostname). Single-label intranet hosts without a scheme (e.g. `gitlabsake/...`)
 * are treated as a project path, because a bare first segment is indistinguishable
 * from a top-level group name (`gitlab-org/gitlab-runner`). Prefix the URL with
 * `http://` or `https://` to make the host explicit.
 */
export function parseGitLabProjectUrl(source: string): GitLabProjectRef | null {
  const trimmed = source.trim()
  if (!trimmed) return null

  const schemeMatch = trimmed.match(/^(https?):\/\//i)
  const scheme = schemeMatch ? (schemeMatch[1].toLowerCase() as 'http' | 'https') : undefined

  const withoutScheme = trimmed.replace(/^https?:\/\//i, '')
  const withoutQuery = withoutScheme.split(/[?#]/)[0]
  const segments = withoutQuery.split('/').filter(Boolean)
  if (segments.length < 2) return null

  // A `group/project` shorthand has no host segment. It is only recognized as a host
  // when the input carried a scheme or the first segment looks like a domain.
  const hasHost = Boolean(scheme) || segments[0].includes('.')
  let host: string | undefined
  let pathSegments = segments
  if (hasHost) {
    if (!isGitLabHost(segments[0])) return null
    host = normalizeGitLabHost(segments[0], scheme)
    pathSegments = segments.slice(1)
  }

  // Drop GitLab web route suffixes such as `/-/tree/<ref>/<path>`.
  const dashIndex = pathSegments.indexOf('-')
  if (dashIndex !== -1) pathSegments = pathSegments.slice(0, dashIndex)

  const projectPath = pathSegments.join('/').replace(/\.git$/i, '')
  if (!projectPath) return null

  return host ? { host, projectPath } : { projectPath }
}
