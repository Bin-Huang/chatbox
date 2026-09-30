import { parseGitLabProjectUrl } from '@shared/skills/gitlab-url'
import type { MarketplaceSkill, SkillSource } from '@shared/types/skills'
import { app } from 'electron'
import fs from 'fs'
import path from 'path'
import { getStatus, validateWritePath } from '../sandbox/manager'
import { getLogger } from '../util'
import {
  type DetectedSkill,
  detectSkillsInRepo,
  downloadSkillFiles,
  getLatestCommitHash,
  getSkillTreeSha,
} from './github-fetcher'
import {
  detectSkillsInRepo as detectGitLabSkillsInRepo,
  downloadSkillFiles as downloadGitLabSkillFiles,
  getLatestCommitHash as getGitLabLatestCommitHash,
  getSkillTreeSha as getGitLabSkillTreeSha,
} from './gitlab-fetcher'
import { parseSkillFile } from './parser'
import { isValidSkillName } from './validation'

const log = getLogger('skills:installer')

function getSkillsDir(): string {
  return path.join(app.getPath('userData'), 'skills')
}

interface InstallResult {
  success: boolean
  skillName: string
  error?: string
}

interface DeleteResult {
  success: boolean
  error?: string
}

interface UpdateCheckResult {
  hasUpdate: boolean
  currentHash?: string
  latestHash?: string
  error?: string
}

function resolveSkillDir(skillName: string): string | null {
  const skillsDir = path.resolve(getSkillsDir())
  const skillDir = path.resolve(skillsDir, skillName)
  if (!skillDir.startsWith(`${skillsDir}${path.sep}`)) {
    return null
  }
  return skillDir
}

function parseGitHubUrl(source: string): { owner: string; repo: string } | null {
  const trimmed = source.trim()
  const githubMatch = trimmed.match(/github\.com\/([^/\s]+)\/([^/\s]+?)(?:\.git)?(?:[/?#]|$)/i)
  if (githubMatch) {
    return { owner: githubMatch[1], repo: githubMatch[2] }
  }

  const repoMatch = trimmed.match(/^([^/\s]+)\/([^/\s]+?)(?:\.git)?(?:[/?#]|$)/)
  if (repoMatch) {
    return { owner: repoMatch[1], repo: repoMatch[2] }
  }

  return null
}

type RepoTarget =
  | { provider: 'github'; owner: string; repo: string }
  | { provider: 'gitlab'; projectPath: string; host?: string }

// Marketplace sources are bare URLs. A GitLab host must be explicit (gitlab.com or a
// self-hosted hostname containing "gitlab"); the `owner/repo` shorthand stays GitHub-first.
function resolveRepoTarget(source: string): RepoTarget | null {
  const gitlab = parseGitLabProjectUrl(source)
  if (gitlab?.host) {
    return { provider: 'gitlab', projectPath: gitlab.projectPath, host: gitlab.host }
  }

  const github = parseGitHubUrl(source)
  if (github) {
    return { provider: 'github', owner: github.owner, repo: github.repo }
  }

  return null
}

function isGitLabSource(source: SkillSource): boolean {
  if (source.type === 'gitlab') return true
  // Skills installed from GitHub stay on the GitHub API even if the repository name
  // happens to contain "gitlab".
  if (source.type === 'github') return false
  // `host` is only ever recorded for GitLab projects (github installs omit it), so its
  // presence is authoritative — self-hosted instances need not spell "gitlab" in the domain.
  if (source.host) return true
  if (!source.repo) return false
  // Legacy fallback: full URL form such as https://gitlab.com/group/repo
  return /^(?:https?:\/\/)?[^\s/]*gitlab[^\s/]*\//i.test(source.repo)
}

function readSourceJson(skillDir: string): SkillSource | null {
  const sourcePath = path.join(skillDir, 'source.json')
  if (!fs.existsSync(sourcePath)) return null
  try {
    return JSON.parse(fs.readFileSync(sourcePath, 'utf-8')) as SkillSource
  } catch {
    return null
  }
}

function writeSourceJson(skillDir: string, source: SkillSource): void {
  fs.writeFileSync(path.join(skillDir, 'source.json'), JSON.stringify(source, null, 2), 'utf-8')
}

// Shared install pipeline for remote git sources: download into a temp dir, validate
// SKILL.md, move it into place under the skills directory, then record source.json.
async function installFromRemoteSource(
  sourceLabel: string,
  download: (tempDir: string) => Promise<void>,
  buildSource: () => Promise<SkillSource>
): Promise<InstallResult> {
  const skillsDir = getSkillsDir()
  fs.mkdirSync(skillsDir, { recursive: true })

  const tempDir = path.join(skillsDir, `.tmp-${Date.now()}`)

  try {
    await download(tempDir)

    const skillMdPath = path.join(tempDir, 'SKILL.md')
    if (!fs.existsSync(skillMdPath)) {
      return {
        success: false,
        skillName: '',
        error: 'No SKILL.md found in the specified path',
      }
    }

    const parsed = parseSkillFile(skillMdPath)
    if (!parsed) {
      return {
        success: false,
        skillName: '',
        error: 'Invalid SKILL.md: missing required fields (name, description)',
      }
    }

    const skillName = parsed.metadata.name
    const targetDir = path.join(skillsDir, skillName)
    if (fs.existsSync(targetDir)) {
      fs.rmSync(targetDir, { recursive: true, force: true })
    }
    fs.renameSync(tempDir, targetDir)

    writeSourceJson(targetDir, await buildSource())

    log.info(`Installed skill "${skillName}" from ${sourceLabel}`)
    return { success: true, skillName }
  } finally {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true })
    }
  }
}

export async function installSkillFromGitHub(owner: string, repo: string, skillPath: string): Promise<InstallResult> {
  try {
    return await installFromRemoteSource(
      `${owner}/${repo}`,
      (tempDir) => downloadSkillFiles(owner, repo, skillPath, tempDir),
      async () => {
        // Prefer a per-skill subtree SHA so update checks ignore unrelated commits
        // (other skills / files) in the same repo. Fall back to the repo HEAD commit
        // only when the tree is truncated or unavailable.
        const treeSha = await getSkillTreeSha(owner, repo, skillPath)
        const commitHash = treeSha ? null : await getLatestCommitHash(owner, repo, '')
        return {
          type: 'github',
          repo: `${owner}/${repo}`,
          skillPath: skillPath || undefined,
          treeSha: treeSha || undefined,
          commitHash: commitHash || undefined,
          installedAt: new Date().toISOString(),
        }
      }
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    log.error(`Failed to install skill from ${owner}/${repo}`, error)
    return { success: false, skillName: '', error: message }
  }
}

/**
 * Install a skill from a GitLab project (gitlab.com or self-hosted).
 * `projectPath` is the full project path, e.g. `group/subgroup/repo`.
 */
export async function installSkillFromGitLab(
  projectPath: string,
  skillPath: string,
  options?: { host?: string; token?: string }
): Promise<InstallResult> {
  try {
    return await installFromRemoteSource(
      projectPath,
      (tempDir) => downloadGitLabSkillFiles(projectPath, skillPath, tempDir, options),
      async () => {
        // Same version-key strategy as GitHub: subtree SHA when available, otherwise
        // the path-scoped latest commit so sibling skills don't cause false updates.
        const treeSha = await getGitLabSkillTreeSha(projectPath, skillPath, options)
        const commitHash = treeSha ? null : await getGitLabLatestCommitHash(projectPath, skillPath, options)
        return {
          type: 'gitlab',
          repo: projectPath,
          host: options?.host,
          skillPath: skillPath || undefined,
          treeSha: treeSha || undefined,
          commitHash: commitHash || undefined,
          // Kept in source.json inside the skill directory so private projects can still
          // be checked for updates later. Main-process only: discovery.ts strips it
          // before the skill is sent to the renderer.
          token: options?.token || undefined,
          installedAt: new Date().toISOString(),
        }
      }
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    log.error(`Failed to install skill from ${projectPath}`, error)
    return { success: false, skillName: '', error: message }
  }
}

function resolveSkillPath(detected: DetectedSkill[], targetNames: string[]): string {
  if (detected.length === 0) return ''

  for (const targetName of targetNames) {
    const exact = detected.find((s) => s.name === targetName)
    if (exact) return exact.path
  }

  for (const targetName of targetNames) {
    const lowerTarget = targetName.toLowerCase()
    const caseMatch = detected.find((s) => s.name.toLowerCase() === lowerTarget)
    if (caseMatch) return caseMatch.path
  }

  for (const targetName of targetNames) {
    const lowerTarget = targetName.toLowerCase()
    const dirMatch = detected.find((s) => {
      const dirName = s.path.split('/').pop() || ''
      return dirName === targetName || dirName.toLowerCase() === lowerTarget
    })
    if (dirMatch) return dirMatch.path
  }

  const tokenize = (value: string): string[] =>
    value
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter(Boolean)
  const similarity = (left: string, right: string): number => {
    const leftTokens = tokenize(left)
    const rightTokens = tokenize(right)
    if (leftTokens.length === 0 || rightTokens.length === 0) return 0
    const rightSet = new Set(rightTokens)
    const overlap = leftTokens.filter((token) => rightSet.has(token)).length
    return overlap / Math.max(leftTokens.length, rightTokens.length)
  }

  let bestMatch: { path: string; score: number } | null = null
  for (const detectedSkill of detected) {
    const dirName = detectedSkill.path.split('/').pop() || ''
    for (const targetName of targetNames) {
      const score = Math.max(similarity(targetName, detectedSkill.name), similarity(targetName, dirName))
      if (!bestMatch || score > bestMatch.score) {
        bestMatch = { path: detectedSkill.path, score }
      }
    }
  }

  if (bestMatch && bestMatch.score >= 0.6) {
    return bestMatch.path
  }

  if (detected.length === 1) return detected[0].path

  return ''
}

function getMarketplaceSkillCandidates(skill: MarketplaceSkill): string[] {
  const fromId = skill.id.split('/').pop() || ''
  return Array.from(new Set([skill.name, skill.skillId, fromId].filter((value) => value.trim().length > 0)))
}

function getFallbackCandidatePaths(names: string[]): string[] {
  const paths = names.flatMap((name) => [`skills/${name}`, `.claude/skills/${name}`, name])
  return Array.from(new Set(paths))
}

export async function installSkillFromMarketplace(marketplaceSkill: MarketplaceSkill): Promise<InstallResult> {
  try {
    const target = resolveRepoTarget(marketplaceSkill.source)
    if (!target) {
      return {
        success: false,
        skillName: marketplaceSkill.name,
        error: `Invalid source URL: ${marketplaceSkill.source}`,
      }
    }

    const detected =
      target.provider === 'github'
        ? await detectSkillsInRepo(target.owner, target.repo)
        : await detectGitLabSkillsInRepo(target.projectPath, { host: target.host })
    const skillCandidates = getMarketplaceSkillCandidates(marketplaceSkill)
    const resolvedPath = resolveSkillPath(detected, skillCandidates)
    const candidatePaths = Array.from(
      new Set([resolvedPath, ...getFallbackCandidatePaths(skillCandidates)].filter(Boolean))
    )
    candidatePaths.push('')

    let lastResult: InstallResult = {
      success: false,
      skillName: marketplaceSkill.name,
      error: 'No SKILL.md found in the specified path',
    }

    for (const candidatePath of candidatePaths) {
      const result =
        target.provider === 'github'
          ? await installSkillFromGitHub(target.owner, target.repo, candidatePath)
          : await installSkillFromGitLab(target.projectPath, candidatePath, { host: target.host })
      if (result.success) {
        const skillDir = path.join(getSkillsDir(), result.skillName)
        const source = readSourceJson(skillDir)
        if (source) {
          source.type = 'marketplace'
          writeSourceJson(skillDir, source)
        }
        return result
      }

      lastResult = result
      if (!result.error?.includes('No SKILL.md found')) {
        return result
      }
    }

    return lastResult
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    log.error(`Failed to install marketplace skill "${marketplaceSkill.name}"`, error)
    return { success: false, skillName: marketplaceSkill.name, error: message }
  }
}

export async function deleteSkill(skillName: string): Promise<DeleteResult> {
  try {
    if (!skillName || typeof skillName !== 'string' || !isValidSkillName(skillName)) {
      return { success: false, error: 'Invalid skill name' }
    }

    const skillDir = resolveSkillDir(skillName)
    if (!skillDir) {
      return { success: false, error: 'Invalid skill name' }
    }

    if (!fs.existsSync(skillDir)) {
      return { success: false, error: `Skill "${skillName}" not found` }
    }

    fs.rmSync(skillDir, { recursive: true, force: true })
    log.info(`Deleted skill "${skillName}"`)
    return { success: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    log.error(`Failed to delete skill "${skillName}"`, error)
    return { success: false, error: message }
  }
}

export async function checkForUpdates(skillName: string): Promise<UpdateCheckResult> {
  try {
    if (!skillName || !isValidSkillName(skillName)) {
      return { hasUpdate: false, error: 'Invalid skill name' }
    }

    const skillDir = resolveSkillDir(skillName)
    if (!skillDir) {
      return { hasUpdate: false, error: 'Invalid skill name' }
    }

    const source = readSourceJson(skillDir)

    if (!source) {
      return { hasUpdate: false, error: 'No source.json found for this skill' }
    }

    if (!source.repo) {
      return { hasUpdate: false, error: 'Skill has no repository information' }
    }

    if (isGitLabSource(source)) {
      return await checkGitLabForUpdates(source)
    }

    const parsed = parseGitHubUrl(source.repo)
    if (!parsed) {
      return { hasUpdate: false, error: `Invalid repo format: ${source.repo}` }
    }

    // Preferred path: compare the per-skill subtree SHA recorded at install time.
    // This only changes when files under the skill path change, so unrelated
    // commits to the repo (or to sibling skills) don't trigger false updates.
    if (source.treeSha) {
      const latestTreeSha = await getSkillTreeSha(parsed.owner, parsed.repo, source.skillPath || '')
      if (!latestTreeSha) {
        return { hasUpdate: false, error: 'Could not fetch latest skill tree' }
      }
      return {
        hasUpdate: source.treeSha !== latestTreeSha,
        currentHash: source.treeSha,
        latestHash: latestTreeSha,
      }
    }

    // Legacy fallback: skills installed before per-skill tree tracking recorded the
    // repository HEAD commit, so compare against that (still avoids the per-path
    // commits API, at the cost of false positives from unrelated repo commits).
    const latestHash = await getLatestCommitHash(parsed.owner, parsed.repo, '')
    if (!latestHash) {
      return { hasUpdate: false, error: 'Could not fetch latest commit hash' }
    }

    const currentHash = source.commitHash
    return {
      hasUpdate: !!currentHash && currentHash !== latestHash,
      currentHash: currentHash || undefined,
      latestHash,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    log.error(`Failed to check updates for "${skillName}"`, error)
    return { hasUpdate: false, error: message }
  }
}

type UpdateTarget =
  | { provider: 'github'; owner: string; repo: string }
  | { provider: 'gitlab'; projectPath: string; host?: string; token?: string }

// Resolve where to re-pull a skill from, using only what source.json recorded at
// install time. GitLab is detected exactly like update checks do (explicit type,
// recorded host, or a gitlab-looking repo), so both paths stay consistent.
function resolveUpdateTarget(source: SkillSource): UpdateTarget | null {
  if (isGitLabSource(source)) {
    const parsed = parseGitLabProjectUrl(source.repo || '')
    if (!parsed) return null
    return {
      provider: 'gitlab',
      projectPath: parsed.projectPath,
      host: source.host || parsed.host,
      token: source.token,
    }
  }

  const parsed = parseGitHubUrl(source.repo || '')
  if (!parsed) return null
  return { provider: 'github', owner: parsed.owner, repo: parsed.repo }
}

/**
 * Re-download a skill from the repository recorded in its source.json and replace the
 * installed copy. This is the write counterpart of {@link checkForUpdates}: it reuses
 * the stored GitLab token, so private projects update without the user re-entering it.
 *
 * The download happens through the regular install pipeline (temp dir + rename), so a
 * failed or partial fetch leaves the currently installed skill untouched.
 */
export async function updateSkill(skillName: string): Promise<InstallResult> {
  try {
    if (!skillName || typeof skillName !== 'string' || !isValidSkillName(skillName)) {
      return { success: false, skillName, error: 'Invalid skill name' }
    }

    const skillDir = resolveSkillDir(skillName)
    if (!skillDir) {
      return { success: false, skillName, error: 'Invalid skill name' }
    }

    const source = readSourceJson(skillDir)
    if (!source) {
      return { success: false, skillName, error: 'No source.json found for this skill' }
    }
    if (!source.repo) {
      return { success: false, skillName, error: 'Skill has no repository information' }
    }

    const target = resolveUpdateTarget(source)
    if (!target) {
      return { success: false, skillName, error: `Invalid repo format: ${source.repo}` }
    }

    const skillPath = source.skillPath || ''
    const result =
      target.provider === 'github'
        ? await installSkillFromGitHub(target.owner, target.repo, skillPath)
        : await installSkillFromGitLab(target.projectPath, skillPath, {
            host: target.host,
            token: target.token,
          })

    if (!result.success) {
      log.warn(`Update failed for "${skillName}": ${result.error}`)
      return { ...result, skillName: result.skillName || skillName }
    }

    // SKILL.md may have been renamed upstream. The fresh copy landed under the new
    // name, so drop the old directory to avoid leaving two copies of the same skill.
    if (result.skillName !== skillName) {
      const staleDir = resolveSkillDir(skillName)
      if (staleDir && fs.existsSync(staleDir)) {
        fs.rmSync(staleDir, { recursive: true, force: true })
        log.info(`Removed stale skill directory "${skillName}" after rename to "${result.skillName}"`)
      }
    }

    // Marketplace installs are tagged so the UI groups them separately; keep that tag
    // stable across updates instead of letting it fall back to the raw provider type.
    if (source.type === 'marketplace') {
      const installedDir = path.join(getSkillsDir(), result.skillName)
      const installedSource = readSourceJson(installedDir)
      if (installedSource) {
        installedSource.type = 'marketplace'
        writeSourceJson(installedDir, installedSource)
      }
    }

    log.info(`Updated skill "${result.skillName}" from ${source.repo}`)
    return result
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    log.error(`Failed to update skill "${skillName}"`, error)
    return { success: false, skillName, error: message }
  }
}

// GitLab update checks mirror the GitHub ones: prefer the per-skill subtree SHA
// recorded at install time, fall back to the path-scoped latest commit hash.
async function checkGitLabForUpdates(source: SkillSource): Promise<UpdateCheckResult> {
  const parsed = parseGitLabProjectUrl(source.repo || '')
  if (!parsed) {
    return { hasUpdate: false, error: `Invalid repo format: ${source.repo}` }
  }

  const projectPath = parsed.projectPath
  // Reuse the token captured at install time; without it a private project answers 404
  // and the update check degrades to a generic failure.
  const options = { host: source.host || parsed.host, token: source.token }

  if (source.treeSha) {
    const latestTreeSha = await getGitLabSkillTreeSha(projectPath, source.skillPath || '', options)
    if (!latestTreeSha) {
      return {
        hasUpdate: false,
        error: source.token
          ? 'Could not fetch the latest skill tree. The stored access token may have expired or lack the read_api scope.'
          : 'Could not fetch the latest skill tree. This project may be private — reinstall with an access token.',
      }
    }
    return {
      hasUpdate: source.treeSha !== latestTreeSha,
      currentHash: source.treeSha,
      latestHash: latestTreeSha,
    }
  }

  const latestHash = await getGitLabLatestCommitHash(projectPath, source.skillPath || '', options)
  if (!latestHash) {
    return {
      hasUpdate: false,
      error: source.token
        ? 'Could not fetch the latest commit. The stored access token may have expired or lack the read_api scope.'
        : 'Could not fetch the latest commit. This project may be private — reinstall with an access token.',
    }
  }

  return {
    hasUpdate: !!source.commitHash && source.commitHash !== latestHash,
    currentHash: source.commitHash || undefined,
    latestHash,
  }
}

const MAX_SKILL_SIZE_BYTES = 50 * 1024 * 1024 // 50MB

function getDirectorySize(dirPath: string): number {
  let total = 0
  const entries = fs.readdirSync(dirPath, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name)
    if (entry.isDirectory()) {
      total += getDirectorySize(fullPath)
    } else if (entry.isFile()) {
      total += fs.statSync(fullPath).size
    }
    if (total > MAX_SKILL_SIZE_BYTES) return total // Early exit
  }
  return total
}

export async function installSkillFromSandbox(
  sandboxPath: string,
  sessionId?: string,
  sourceInfo?: string
): Promise<InstallResult> {
  try {
    const status = getStatus(sessionId)
    if (!status.workingDirectory) {
      return { success: false, skillName: '', error: 'Sandbox not initialized for this session.' }
    }

    const resolvedPath = path.resolve(status.workingDirectory, sandboxPath)
    const validation = await validateWritePath(resolvedPath, status.workingDirectory)
    if (!validation.valid) {
      return { success: false, skillName: '', error: validation.error || 'Path escapes sandbox directory.' }
    }

    if (!fs.existsSync(resolvedPath) || !fs.statSync(resolvedPath).isDirectory()) {
      return { success: false, skillName: '', error: 'Specified path is not a directory in the sandbox.' }
    }

    const skillMdPath = path.join(resolvedPath, 'SKILL.md')
    if (!fs.existsSync(skillMdPath)) {
      return { success: false, skillName: '', error: 'No SKILL.md found in the specified directory.' }
    }

    const parsed = parseSkillFile(skillMdPath)
    if (!parsed) {
      return { success: false, skillName: '', error: 'Invalid SKILL.md: missing required fields (name, description).' }
    }

    const skillName = parsed.metadata.name
    if (!isValidSkillName(skillName)) {
      return {
        success: false,
        skillName: '',
        error: `Invalid skill name: "${skillName}". Must be lowercase alphanumeric + hyphens, 1-64 chars.`,
      }
    }

    const dirSize = getDirectorySize(resolvedPath)
    if (dirSize > MAX_SKILL_SIZE_BYTES) {
      return {
        success: false,
        skillName,
        error: `Skill package too large (${Math.round(dirSize / 1024 / 1024)}MB, max 50MB).`,
      }
    }

    const skillsDir = getSkillsDir()
    fs.mkdirSync(skillsDir, { recursive: true })
    const targetDir = path.join(skillsDir, skillName)

    if (fs.existsSync(targetDir)) {
      fs.rmSync(targetDir, { recursive: true, force: true })
    }

    await fs.promises.cp(resolvedPath, targetDir, { recursive: true })

    const source: SkillSource = {
      type: 'chat',
      repo: sourceInfo || undefined,
      installedAt: new Date().toISOString(),
    }
    writeSourceJson(targetDir, source)

    log.info(`Installed skill "${skillName}" from sandbox`)
    return { success: true, skillName }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    log.error('Failed to install skill from sandbox', error)
    return { success: false, skillName: '', error: message }
  }
}
