// The install modal was generalized to support every remote git provider
// (see `SkillInstallModal`). This module keeps the previous GitHub-named entry
// points working for existing imports, stories and tests.
export type { DetectedSkill, RemoteSkillProvider } from './SkillInstallModal'
export { default, SkillInstallModal as GitHubInstallModal } from './SkillInstallModal'
