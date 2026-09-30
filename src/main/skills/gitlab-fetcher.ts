import { createHash } from 'node:crypto'
import { type GitLabProjectRef, isGitLabComHost, normalizeGitLabHost } from '@shared/skills/gitlab-url'
import { getLogger } from '../util'

const log = getLogger('skills:gitlab-fetcher')

const USER_AGENT = 'chatbox-app'
const CACHE_TTL_MS = 5 * 60 * 1000

// Recursive tree listing is paginated (100 entries per page on gitlab.com).
// Bound the page walk so a huge monorepo cannot trigger unbounded API calls;
// when the cap is hit the tree is treated as truncated and callers fall back
// to the non-recursive contents strategy.
const TREE_PAGE_SIZE = 100
const MAX_TREE_PAGES = 50
const SKILL_CONTENT_FETCH_BATCH = 8
const SKILL_FILE_DOWNLOAD_BATCH = 8
const MAX_DETECTED_SKILLS = 100
const MAX_FALLBACK_CATEGORY_DIRS = 10

interface GitLabTreeItem {
  id: string
  name: string
  type: 'blob' | 'tree' | 'commit'
  path: string
}

interface GitLabCommitItem {
  id: string
}

export interface DetectedSkill {
  name: string
  path: string
  description?: string
}

export type { GitLabProjectRef }
export { isGitLabHost, parseGitLabProjectUrl } from '@shared/skills/gitlab-url'

/** Everything needed to talk to a GitLab project, plus an optional access token. */
export interface GitLabProjectConfig extends GitLabProjectRef {
  /** Personal/project access token for private projects. */
  token?: string
}

interface CacheEntry<T> {
  data: T
  expiresAt: number
}

const cache = new Map<string, CacheEntry<unknown>>()

/**
 * Credential scope for cache keys.
 *
 * Responses fetched with a token must never be replayed for a request without one —
 * otherwise removing the token from the form keeps "working" until the TTL expires,
 * and data read with credentials leaks to unauthenticated callers. The raw secret is
 * never used as a key (it must not end up in cache keys, logs or heap dumps), only a
 * short digest of it.
 */
function credentialScope(token?: string): string {
  if (!token) return 'anon'
  return `t:${createHash('sha256').update(token).digest('hex').slice(0, 16)}`
}

function cacheKey(url: string, token?: string): string {
  return `${credentialScope(token)}|${url}`
}

function getCached<T>(key: string): T | undefined {
  const entry = cache.get(key)
  if (!entry) return undefined
  if (Date.now() > entry.expiresAt) {
    cache.delete(key)
    return undefined
  }
  return entry.data as T
}

function setCache<T>(key: string, data: T): void {
  cache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS })
}

export function clearCache(): void {
  cache.clear()
}

class GitLabApiError extends Error {
  constructor(
    message: string,
    public statusCode: number
  ) {
    super(message)
    this.name = 'GitLabApiError'
  }
}

// GitLab answers 404 both for a wrong project path and for a private/internal
// project the caller cannot see, so the two cases cannot be told apart by status
// alone. The message therefore names both possibilities and points at the token.
function describeProjectError(status: number, projectPath: string, statusText?: string): GitLabApiError {
  switch (status) {
    case 401:
      return new GitLabApiError(`GitLab authentication failed for ${projectPath}. Check the access token.`, 401)
    case 403:
      return new GitLabApiError(
        `GitLab denied access to ${projectPath}. The token may lack the read_api or read_repository scope.`,
        403
      )
    case 404:
      return new GitLabApiError(
        `Project not found or not accessible: ${projectPath}. Check the project path (it must include subgroups); private projects need an access token.`,
        404
      )
    case 429:
      return new GitLabApiError('GitLab API rate limit exceeded. Try again later.', 429)
    default:
      return new GitLabApiError(`GitLab API error: ${status} ${statusText ?? ''}`.trim(), status)
  }
}

// Statuses that mean "the project is unreachable for this caller". Callers must
// surface these instead of falling back, otherwise a wrong URL or a missing token
// is reported as "no skills found".
function isProjectAccessError(error: unknown): boolean {
  if (!(error instanceof GitLabApiError)) return false
  return error.statusCode === 401 || error.statusCode === 403 || error.statusCode === 404
}

function normalizeHost(host?: string): string {
  return normalizeGitLabHost(host)
}

// Only send the environment token to gitlab.com. Self-hosted instances must pass
// their own token explicitly, otherwise a user's gitlab.com credentials would be
// sent to an unrelated host.
function resolveToken(project: GitLabProjectConfig, host: string): string | undefined {
  if (project.token) return project.token
  if (!isGitLabComHost(host)) return undefined
  return process.env.GITLAB_TOKEN || process.env.CHATBOX_GITLAB_TOKEN || undefined
}

function apiBase(host: string): string {
  return `${host}/api/v4`
}

function encodeProjectId(projectPath: string): string {
  return encodeURIComponent(projectPath.replace(/^\/+|\/+$/g, ''))
}

/**
 * Parse a GitLab project reference from a URL or `group/project` shorthand.
 * Re-exported from the shared parser; see `@shared/skills/gitlab-url`.
 */

async function gitLabFetch<T>(url: string, token?: string): Promise<T> {
  const key = cacheKey(url, token)
  const cached = getCached<T>(key)
  if (cached !== undefined) return cached

  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'application/json',
      ...(token ? { 'PRIVATE-TOKEN': token } : {}),
    },
  })

  if (!response.ok) {
    throw describeProjectError(response.status, url, response.statusText)
  }

  const data = (await response.json()) as T
  setCache(key, data)
  return data
}

interface TreeListing {
  items: GitLabTreeItem[]
  truncated: boolean
}

function getNextPage(response: Response): number | null {
  const next = response.headers?.get?.('x-next-page')
  if (next === null || next === undefined || next === '') return null
  const parsed = Number.parseInt(next, 10)
  return Number.isNaN(parsed) ? null : parsed
}

// Lists the whole repository tree recursively, paging with the `x-next-page`
// header. Returns truncated=true when the page cap is reached so callers can
// degrade to the non-recursive contents strategy.
async function fetchRepoTree(project: GitLabProjectConfig): Promise<TreeListing | null> {
  const host = normalizeHost(project.host)
  const token = resolveToken(project, host)
  const base = `${apiBase(host)}/projects/${encodeProjectId(project.projectPath)}/repository/tree`

  const items: GitLabTreeItem[] = []
  const seen = new Set<string>()
  let page = 1

  while (page <= MAX_TREE_PAGES) {
    const url = `${base}?recursive=true&per_page=${TREE_PAGE_SIZE}&page=${page}&ref=HEAD`
    const key = cacheKey(url, token)
    const cached = getCached<GitLabTreeItem[]>(key)
    let batch: GitLabTreeItem[]
    let nextPage: number | null

    if (cached !== undefined) {
      batch = cached
      nextPage = cached.length === TREE_PAGE_SIZE ? page + 1 : null
    } else {
      const response = await fetch(url, {
        headers: {
          'User-Agent': USER_AGENT,
          Accept: 'application/json',
          ...(token ? { 'PRIVATE-TOKEN': token } : {}),
        },
      })

      if (!response.ok) {
        throw describeProjectError(response.status, project.projectPath, response.statusText)
      }

      const payload = (await response.json()) as GitLabTreeItem[]
      if (!Array.isArray(payload)) {
        log.warn(`Unexpected tree response shape for ${project.projectPath}`)
        return null
      }
      setCache(key, payload)
      batch = payload
      nextPage = getNextPage(response)
    }

    for (const item of batch) {
      if (seen.has(item.path)) continue
      seen.add(item.path)
      items.push(item)
    }

    if (!nextPage) {
      return { items, truncated: false }
    }
    // Guard against a non-advancing pagination header so the walk always terminates.
    if (nextPage <= page) {
      log.warn(`Non-advancing pagination for ${project.projectPath} at page ${page}`)
      return { items, truncated: true }
    }
    page = nextPage
  }

  log.warn(`Tree listing truncated for ${project.projectPath} (page cap ${MAX_TREE_PAGES})`)
  return { items, truncated: true }
}

// Non-recursive directory listing, used by the fallback strategy and by
// getSkillTreeSha when locating a skill subtree entry.
export async function fetchProjectContents(project: GitLabProjectConfig, dirPath = ''): Promise<GitLabTreeItem[]> {
  const host = normalizeHost(project.host)
  const token = resolveToken(project, host)
  const encodedDir = encodeURIComponent(dirPath.replace(/^\/+|\/+$/g, ''))
  const url = `${apiBase(host)}/projects/${encodeProjectId(project.projectPath)}/repository/tree?per_page=${TREE_PAGE_SIZE}&ref=HEAD${
    encodedDir ? `&path=${encodedDir}` : ''
  }`

  try {
    const result = await gitLabFetch<GitLabTreeItem[]>(url, token)
    return Array.isArray(result) ? result : []
  } catch (error) {
    if (error instanceof GitLabApiError && error.statusCode === 404) {
      return []
    }
    throw error
  }
}

// raw file contents can be unreachable while the API works (proxy/firewall setups),
// so surface that case instead of reporting "no skills in repo".
class SkillContentUnavailableError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SkillContentUnavailableError'
  }
}

export async function fetchFileContent(project: GitLabProjectConfig, filePath: string): Promise<string> {
  const host = normalizeHost(project.host)
  const token = resolveToken(project, host)
  // GitLab expects the whole file path URL-encoded, including slashes.
  const encodedFile = encodeURIComponent(filePath.replace(/^\/+/, ''))
  const url = `${apiBase(host)}/projects/${encodeProjectId(project.projectPath)}/repository/files/${encodedFile}/raw?ref=HEAD`

  const key = cacheKey(url, token)
  const cached = getCached<string>(key)
  if (cached !== undefined) return cached

  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      ...(token ? { 'PRIVATE-TOKEN': token } : {}),
    },
  })

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw describeProjectError(response.status, project.projectPath, response.statusText)
    }
    throw new GitLabApiError(`Failed to fetch file: ${filePath}`, response.status)
  }

  const content = await response.text()
  setCache(key, content)
  return content
}

export async function detectSkillsInRepo(
  projectPath: string,
  options?: { host?: string; token?: string }
): Promise<DetectedSkill[]> {
  const project: GitLabProjectConfig = { projectPath, ...options }
  try {
    const detected = await detectSkillsViaTree(project)
    if (detected !== null) return detected
  } catch (error) {
    // Rate limit, auth and unreachable-project errors must not be masked by the
    // contents fallback: it would report "no skills" for a project the caller
    // cannot actually read.
    if (error instanceof GitLabApiError && error.statusCode === 429) throw error
    if (isProjectAccessError(error)) throw error
    if (error instanceof SkillContentUnavailableError) throw error
    log.warn(`Tree-based skill detection failed for ${project.projectPath}, falling back to contents API`, error)
  }
  return detectSkillsViaContents(project)
}

// One recursive listing finds SKILL.md at any depth (e.g. skills/{category}/{name}/SKILL.md).
// Returns null when the tree is truncated/malformed so the caller can fall back.
async function detectSkillsViaTree(project: GitLabProjectConfig): Promise<DetectedSkill[] | null> {
  const result = await fetchRepoTree(project)
  if (!result || result.truncated) return null

  const skillMdPaths = result.items
    .filter((item) => item.type === 'blob' && (item.path === 'SKILL.md' || item.path.endsWith('/SKILL.md')))
    .filter((item) => !item.path.split('/').includes('node_modules'))
    .map((item) => item.path)

  if (skillMdPaths.length > MAX_DETECTED_SKILLS) {
    log.warn(
      `${project.projectPath} has ${skillMdPaths.length} skills, only the first ${MAX_DETECTED_SKILLS} are listed`
    )
  }

  const limitedPaths = skillMdPaths.slice(0, MAX_DETECTED_SKILLS)
  const detected: DetectedSkill[] = []
  let fetchFailures = 0

  for (let i = 0; i < limitedPaths.length; i += SKILL_CONTENT_FETCH_BATCH) {
    const batch = await Promise.all(
      limitedPaths.slice(i, i + SKILL_CONTENT_FETCH_BATCH).map(async (skillMdPath): Promise<DetectedSkill | null> => {
        const skillPath = skillMdPath === 'SKILL.md' ? '' : skillMdPath.slice(0, -'/SKILL.md'.length)
        try {
          const content = await fetchFileContent(project, skillMdPath)
          return {
            name: extractSkillName(content) || skillPath.split('/').pop() || project.projectPath,
            path: skillPath,
            description: extractSkillDescription(content),
          }
        } catch (error) {
          log.warn(`Failed to fetch ${skillMdPath} from ${project.projectPath}`, error)
          fetchFailures++
          return null
        }
      })
    )
    detected.push(...batch.filter((skill): skill is DetectedSkill => skill !== null))
  }

  if (limitedPaths.length > 0 && fetchFailures === limitedPaths.length) {
    throw new SkillContentUnavailableError(
      `Found ${limitedPaths.length} skill(s) in ${project.projectPath} but failed to fetch their contents`
    )
  }
  return detected
}

// Strategy 1: root SKILL.md | 2: skills/{name}/SKILL.md | 3: {dir}/skills/{name}/SKILL.md
async function detectSkillsViaContents(project: GitLabProjectConfig): Promise<DetectedSkill[]> {
  const detected: DetectedSkill[] = []

  try {
    const rootContents = await fetchProjectContents(project)
    const rootSkillMd = rootContents.find((item) => item.name === 'SKILL.md' && item.type === 'blob')
    if (rootSkillMd) {
      const content = await fetchFileContent(project, 'SKILL.md')
      detected.push({
        name: extractSkillName(content) || project.projectPath.split('/').pop() || project.projectPath,
        path: '',
        description: extractSkillDescription(content),
      })
    }
  } catch (error) {
    // An auth/token failure here is a real error, not "this repo has no skills".
    if (isProjectAccessError(error)) throw error
    if (error instanceof SkillContentUnavailableError) throw error
    if (error instanceof GitLabApiError && error.statusCode === 429) throw error
    log.warn(`Failed to check root SKILL.md for ${project.projectPath}`, error)
  }

  try {
    const skillsDirContents = await fetchProjectContents(project, 'skills')
    let drilledCategories = 0
    for (const item of skillsDirContents) {
      if (item.type !== 'tree') continue
      try {
        const subContents = await fetchProjectContents(project, `skills/${item.name}`)
        const hasSkillMd = subContents.some((f) => f.name === 'SKILL.md' && f.type === 'blob')
        if (hasSkillMd) {
          const content = await fetchFileContent(project, `skills/${item.name}/SKILL.md`)
          detected.push({
            name: extractSkillName(content) || item.name,
            path: `skills/${item.name}`,
            description: extractSkillDescription(content),
          })
          continue
        }
        // skills/{category}/{name}/SKILL.md — drill one level, capped to bound API calls
        if (drilledCategories >= MAX_FALLBACK_CATEGORY_DIRS) continue
        drilledCategories++
        for (const sub of subContents) {
          if (sub.type !== 'tree') continue
          try {
            const nestedContents = await fetchProjectContents(project, `skills/${item.name}/${sub.name}`)
            const hasNestedSkillMd = nestedContents.some((f) => f.name === 'SKILL.md' && f.type === 'blob')
            if (hasNestedSkillMd) {
              const content = await fetchFileContent(project, `skills/${item.name}/${sub.name}/SKILL.md`)
              detected.push({
                name: extractSkillName(content) || sub.name,
                path: `skills/${item.name}/${sub.name}`,
                description: extractSkillDescription(content),
              })
            }
          } catch {
            // Inaccessible nested skill dir
          }
        }
      } catch {
        // Inaccessible skill dir
      }
    }
  } catch {
    // No skills/ directory
  }

  if (detected.length === 0) {
    try {
      const rootContents = await fetchProjectContents(project)
      const topDirs = rootContents.filter((item) => item.type === 'tree' && item.name !== 'skills')

      for (const topDir of topDirs.slice(0, 5)) {
        try {
          const nestedSkillsDir = await fetchProjectContents(project, `${topDir.name}/skills`)
          for (const item of nestedSkillsDir) {
            if (item.type !== 'tree') continue
            try {
              const subContents = await fetchProjectContents(project, `${topDir.name}/skills/${item.name}`)
              const hasSkillMd = subContents.some((f) => f.name === 'SKILL.md' && f.type === 'blob')
              if (hasSkillMd) {
                const content = await fetchFileContent(project, `${topDir.name}/skills/${item.name}/SKILL.md`)
                detected.push({
                  name: extractSkillName(content) || item.name,
                  path: `${topDir.name}/skills/${item.name}`,
                  description: extractSkillDescription(content),
                })
              }
            } catch {
              // Skip
            }
          }
        } catch {
          // No nested skills/ directory
        }
      }
    } catch {
      // Root listing already failed earlier, skip
    }
  }

  return detected
}

export async function downloadSkillFiles(
  projectPath: string,
  skillPath: string,
  targetDir: string,
  options?: { host?: string; token?: string }
): Promise<void> {
  const project: GitLabProjectConfig = { projectPath, ...options }
  try {
    const downloaded = await downloadSkillFilesViaTree(project, skillPath, targetDir)
    if (downloaded) return
  } catch (error) {
    if (error instanceof GitLabApiError && (error.statusCode === 401 || error.statusCode === 429)) {
      throw error
    }
    log.warn(
      `Tree-based skill download failed for ${project.projectPath}/${skillPath}, falling back to contents API`,
      error
    )
  }
  await downloadSkillFilesViaContents(project, skillPath, targetDir)
}

async function downloadSkillFilesViaTree(
  project: GitLabProjectConfig,
  skillPath: string,
  targetDir: string
): Promise<boolean> {
  const fs = await import('node:fs')
  const pathModule = await import('node:path')

  fs.mkdirSync(targetDir, { recursive: true })
  const normalizedSkillPath = skillPath.replace(/^\/+|\/+$/g, '')
  const result = await fetchRepoTree(project)
  if (!result || result.truncated) return false

  const prefix = normalizedSkillPath ? `${normalizedSkillPath}/` : ''
  const files = result.items.filter((item) => {
    if (item.type !== 'blob') return false
    if (normalizedSkillPath) return item.path.startsWith(prefix)
    return !item.path.split('/').includes('node_modules')
  })

  if (files.length === 0) return false

  for (let i = 0; i < files.length; i += SKILL_FILE_DOWNLOAD_BATCH) {
    await Promise.all(
      files.slice(i, i + SKILL_FILE_DOWNLOAD_BATCH).map(async (item) => {
        const relativePath = normalizedSkillPath ? item.path.slice(prefix.length) : item.path
        if (!relativePath) return
        const localPath = pathModule.join(targetDir, relativePath)
        const content = await fetchFileContent(project, item.path)
        fs.mkdirSync(pathModule.dirname(localPath), { recursive: true })
        fs.writeFileSync(localPath, content, 'utf-8')
      })
    )
  }

  return true
}

async function downloadSkillFilesViaContents(
  project: GitLabProjectConfig,
  skillPath: string,
  targetDir: string
): Promise<void> {
  const fs = await import('node:fs')
  const pathModule = await import('node:path')

  fs.mkdirSync(targetDir, { recursive: true })

  const contents = await fetchProjectContents(project, skillPath || '')

  for (const item of contents) {
    const relativePath = skillPath ? item.path.slice(skillPath.length + 1) : item.path
    const localPath = pathModule.join(targetDir, relativePath)

    if (item.type === 'blob') {
      const content = await fetchFileContent(project, item.path)
      fs.mkdirSync(pathModule.dirname(localPath), { recursive: true })
      fs.writeFileSync(localPath, content, 'utf-8')
    } else if (item.type === 'tree') {
      await downloadSkillFilesViaContents(project, item.path, pathModule.join(targetDir, relativePath))
    }
  }
}

// Latest commit that touched `repoPath` (or the default branch HEAD when omitted).
// Scoping by path keeps update checks stable: commits elsewhere in the repo or to
// sibling skills don't report a false "update available".
export async function getLatestCommitHash(
  projectPath: string,
  repoPath: string,
  options?: { host?: string; token?: string }
): Promise<string | null> {
  const project: GitLabProjectConfig = { projectPath, ...options }
  const host = normalizeHost(project.host)
  const token = resolveToken(project, host)
  const normalized = repoPath.replace(/^\/+|\/+$/g, '')
  const url = `${apiBase(host)}/projects/${encodeProjectId(project.projectPath)}/repository/commits?per_page=1${
    normalized ? `&path=${encodeURIComponent(normalized)}` : ''
  }`

  try {
    const commits = await gitLabFetch<GitLabCommitItem[]>(url, token)
    if (Array.isArray(commits) && commits.length > 0) {
      return commits[0].id
    }
    return null
  } catch (error) {
    log.error(`Failed to get latest commit hash for ${project.projectPath}/${repoPath}`, error)
    return null
  }
}

// Tree SHA for the skill subtree, matching the GitHub fetcher's per-skill version
// key. GitLab's recursive listing gives the tree object id of a directory, which
// only changes when files under that path change. Returns null for repo-root
// skills (no parent directory to look up) and for truncated trees, so callers
// fall back to the path-scoped commit hash.
export async function getSkillTreeSha(
  projectPath: string,
  skillPath: string,
  options?: { host?: string; token?: string }
): Promise<string | null> {
  const project: GitLabProjectConfig = { projectPath, ...options }
  const normalized = skillPath.replace(/^\/+|\/+$/g, '')
  if (!normalized) return null

  try {
    const parent = normalized.includes('/') ? normalized.slice(0, normalized.lastIndexOf('/')) : ''
    const name = normalized.split('/').pop() || ''
    const entries = await fetchProjectContents(project, parent)
    const match = entries.find((item) => item.type === 'tree' && item.name === name)
    return match?.id ?? null
  } catch (error) {
    log.error(`Failed to get skill tree sha for ${project.projectPath}/${skillPath}`, error)
    return null
  }
}

// Regex: match `name:` line inside YAML frontmatter delimited by ---
function extractSkillName(content: string): string | undefined {
  const match = content.match(/^---\s*\n[\s\S]*?^name:\s*(.+?)\s*$/m)
  return match?.[1]?.replace(/^['"]|['"]$/g, '')
}

function extractSkillDescription(content: string): string | undefined {
  const match = content.match(/^---\s*\n[\s\S]*?^description:\s*(.+?)\s*$/m)
  return match?.[1]?.replace(/^['"]|['"]$/g, '')
}
