export { discoverSkills } from './discovery'
export type { DetectedSkill } from './github-fetcher'
export { detectSkillsInRepo, downloadSkillFiles, fetchFileContent, getLatestCommitHash } from './github-fetcher'
export type { GitLabProjectRef } from './gitlab-fetcher'
export {
  detectSkillsInRepo as detectGitLabSkillsInRepo,
  isGitLabHost,
  parseGitLabProjectUrl,
} from './gitlab-fetcher'
export {
  checkForUpdates,
  deleteSkill,
  installSkillFromGitHub,
  installSkillFromGitLab,
  installSkillFromMarketplace,
} from './installer'
export { registerSkillsHandlers } from './ipc-handlers'
export { parseSkillFile } from './parser'
