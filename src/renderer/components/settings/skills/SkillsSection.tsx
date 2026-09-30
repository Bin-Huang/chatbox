import { ActionIcon, Badge, Box, Button, Flex, Loader, Paper, SimpleGrid, Switch, Text, TextInput } from '@mantine/core'
import { parseGitLabProjectUrl } from '@shared/skills/gitlab-url'
import { DEFAULT_ENABLED_BUILTIN_SKILL_NAMES, type SkillInfo } from '@shared/types/skills'
import {
  IconBrandGithub,
  IconBrandGitlab,
  IconDots,
  IconFolderOpen,
  IconPlus,
  IconRefresh,
  IconSearch,
  IconTrash,
  IconWand,
  IconX,
} from '@tabler/icons-react'
import { type FC, useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import ActionMenu, { type ActionMenuItemProps } from '@/components/ActionMenu'
import { ScalableIcon } from '@/components/common/ScalableIcon'
import { AppTooltip as Tooltip } from '@/components/ui/tooltip'
import { useSkillTranslation } from '@/hooks/useSkillTranslation'
import { notifySkillsChanged, skillsController } from '@/packages/skills/controller'
import { toastError } from '@/packages/toast'
import { settingsStore, useSettingsStore } from '@/stores/settingsStore'
import RemoteSkillInstallModal, { type DetectedSkill, type RemoteSkillProvider } from './SkillInstallModal'
import SkillsSpotlight, { skillsSpotlight } from './SkillsSpotlight'

const SkillCard: FC<{
  skill: SkillInfo
  translatedName?: string
  enabled: boolean
  onToggle: (name: string, enabled: boolean) => void
  actionItems?: ActionMenuItemProps[]
}> = ({ skill, translatedName, enabled, onToggle, actionItems }) => {
  const [menuOpened, setMenuOpened] = useState(false)

  return (
    <Paper
      shadow="xs"
      radius="lg"
      withBorder
      p="sm"
      className="transition-all duration-150 hover:shadow-md"
      style={{ opacity: enabled ? 1 : 0.72 }}
    >
      <Flex justify="space-between" align="flex-start" gap={8}>
        <Box style={{ minWidth: 0, flex: 1 }}>
          <Text size="sm" fw={600} lineClamp={1}>
            {skill.name}
          </Text>
          {translatedName && (
            <Text size="xs" c="chatbox-tertiary" lineClamp={1} mt={2}>
              {translatedName}
            </Text>
          )}
        </Box>

        <Flex align="center" gap={4} style={{ flexShrink: 0 }}>
          {actionItems && actionItems.length > 0 && (
            <ActionMenu
              type="desktop"
              items={actionItems}
              position="bottom-start"
              opened={menuOpened}
              onChange={(opened) => setMenuOpened(opened)}
            >
              <ActionIcon
                variant="transparent"
                size="sm"
                color="chatbox-tertiary"
                onClick={(event) => {
                  event.stopPropagation()
                  event.preventDefault()
                }}
              >
                <ScalableIcon icon={IconDots} size={14} />
              </ActionIcon>
            </ActionMenu>
          )}
          <Switch size="xs" checked={enabled} onChange={(e) => onToggle(skill.name, e.currentTarget.checked)} />
        </Flex>
      </Flex>

      <Tooltip label={skill.description} multiline withArrow w={420} openDelay={400}>
        <Text size="xs" mt={8} c="chatbox-tertiary" lineClamp={2} className="cursor-help leading-relaxed">
          {skill.description}
        </Text>
      </Tooltip>

      {(skill.source?.repo || (skill.source?.type && skill.source.type !== 'local')) && (
        <Flex mt={8} gap={6} wrap="wrap">
          {skill.source?.repo ? (
            <Badge size="xs" variant="light" color="gray" radius="lg">
              {skill.source.repo}
            </Badge>
          ) : skill.source?.type && skill.source.type !== 'local' ? (
            <Badge size="xs" variant="light" color="gray" radius="lg">
              {skill.source.type}
            </Badge>
          ) : null}
        </Flex>
      )}
    </Paper>
  )
}

const SectionHeader: FC<{
  title: string
  subtitle?: string
  count?: number
  right?: React.ReactNode
  className?: string
}> = ({ title, subtitle, count, right, className }) => (
  <Flex justify="space-between" align="center" gap={8} className={className}>
    <Flex align="center" gap={8} style={{ minWidth: 0 }} wrap="wrap">
      <Text size="sm" fw={600}>
        {title}
      </Text>
      {subtitle && (
        <Text size="xs" c="chatbox-tertiary" ff="monospace" style={{ wordBreak: 'break-all' }}>
          {subtitle}
        </Text>
      )}
      {count != null && (
        <Badge size="xs" variant="light" color="gray" radius="lg">
          {count}
        </Badge>
      )}
    </Flex>
    {right && (
      <Flex align="center" gap="xs" style={{ flexShrink: 0 }}>
        {right}
      </Flex>
    )}
  </Flex>
)

const EmptyState: FC<{ onAddClick: () => void; onOpenFolder: () => void }> = ({ onAddClick, onOpenFolder }) => {
  const { t } = useTranslation()

  return (
    <Paper radius="lg" p="xl" className="border border-dashed border-chatbox-border-primary">
      <Flex direction="column" align="center" gap={12} py="md">
        <Box className="rounded-full p-3 bg-chatbox-background-gray-secondary">
          <ScalableIcon icon={IconWand} size={24} className="text-chatbox-tint-tertiary" />
        </Box>
        <Box className="text-center">
          <Text size="sm" fw={500}>
            {t('No custom skills yet')}
          </Text>
          <Text size="xs" c="chatbox-tertiary" mt={4}>
            {t('Add skills from the marketplace or install from a GitHub repository.')}
          </Text>
        </Box>
        <Flex gap="xs" mt={4}>
          <Button
            variant="light"
            size="xs"
            leftSection={<ScalableIcon icon={IconSearch} size={14} />}
            onClick={onAddClick}
          >
            {t('Browse Skills')}
          </Button>
          <Button
            variant="subtle"
            size="xs"
            leftSection={<ScalableIcon icon={IconFolderOpen} size={14} />}
            onClick={onOpenFolder}
          >
            {t('Open Skills Folder')}
          </Button>
        </Flex>
      </Flex>
    </Paper>
  )
}

export const SkillsSection: FC = () => {
  const { t } = useTranslation()
  const [skills, setSkills] = useState<SkillInfo[]>([])
  const [loading, setLoading] = useState(false)
  const [githubUrl, setGithubUrl] = useState('')
  const [scanning, setScanning] = useState(false)
  const [gitlabUrl, setGitlabUrl] = useState('')
  const [gitlabToken, setGitlabToken] = useState('')
  const [scanningGitlab, setScanningGitlab] = useState(false)
  const [detectedSkills, setDetectedSkills] = useState<DetectedSkill[]>([])
  const [installModalOpen, setInstallModalOpen] = useState(false)
  const [installProvider, setInstallProvider] = useState<RemoteSkillProvider>('github')
  const [repoInfo, setRepoInfo] = useState({ owner: '', repo: '' })
  // GitLab project reference captured at scan time, reused for each install in the modal.
  const [gitlabProject, setGitlabProject] = useState<{ projectPath: string; host?: string }>({
    projectPath: '',
  })
  const [showGithubInput, setShowGithubInput] = useState(false)
  const [showGitlabInput, setShowGitlabInput] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const skillSettings = useSettingsStore((state) => state.skills)
  const { translatedSkills, getTranslatedName, isTranslating, translationEnabled, toggleTranslation } =
    useSkillTranslation(skills)

  const fetchSkills = useCallback(async () => {
    setLoading(true)
    try {
      const discovered = await skillsController.discoverSkills()
      const defaultEnabledBuiltinSkillNames = discovered
        .filter(
          (skill) =>
            skill.isBuiltin &&
            DEFAULT_ENABLED_BUILTIN_SKILL_NAMES.includes(
              skill.name as (typeof DEFAULT_ENABLED_BUILTIN_SKILL_NAMES)[number]
            )
        )
        .map((skill) => skill.name)
      const discoveredNames = new Set(discovered.map((skill) => skill.name))
      const currentSkillSettings = settingsStore.getState().skills
      const appliedDefaultBuiltinSkillNames =
        currentSkillSettings.appliedDefaultBuiltinSkillNames ??
        (currentSkillSettings.builtinDefaultsInitialized ? ['chatbox-product-info'] : [])
      const newlyAddedDefaultSkillNames = defaultEnabledBuiltinSkillNames.filter(
        (name) => !appliedDefaultBuiltinSkillNames.includes(name)
      )
      const enabledSkillNames = [
        ...new Set([
          ...currentSkillSettings.enabledSkillNames,
          ...(currentSkillSettings.builtinDefaultsInitialized
            ? newlyAddedDefaultSkillNames
            : defaultEnabledBuiltinSkillNames),
        ]),
      ]
      const enabledNameSet = new Set(enabledSkillNames)
      const originalIndexByName = new Map(discovered.map((skill, index) => [skill.name, index]))
      const sortedDiscovered = [...discovered].sort((a, b) => {
        const aEnabled = enabledNameSet.has(a.name)
        const bEnabled = enabledNameSet.has(b.name)
        if (aEnabled !== bEnabled) {
          return aEnabled ? -1 : 1
        }
        return (originalIndexByName.get(a.name) ?? 0) - (originalIndexByName.get(b.name) ?? 0)
      })
      setSkills(sortedDiscovered)
      settingsStore.setState((state) => {
        const appliedDefaultBuiltinSkillNames =
          state.skills.appliedDefaultBuiltinSkillNames ??
          (state.skills.builtinDefaultsInitialized ? ['chatbox-product-info'] : [])
        const newlyAddedDefaultSkillNames = defaultEnabledBuiltinSkillNames.filter(
          (name) => !appliedDefaultBuiltinSkillNames.includes(name)
        )
        const enabledSkillNames = (
          state.skills.builtinDefaultsInitialized
            ? [...new Set([...state.skills.enabledSkillNames, ...newlyAddedDefaultSkillNames])]
            : [...new Set([...state.skills.enabledSkillNames, ...defaultEnabledBuiltinSkillNames])]
        ).filter((name) => discoveredNames.has(name))
        const nextAppliedDefaultBuiltinSkillNames = [
          ...new Set([...appliedDefaultBuiltinSkillNames, ...defaultEnabledBuiltinSkillNames]),
        ]
        if (
          state.skills.builtinDefaultsInitialized &&
          enabledSkillNames.length === state.skills.enabledSkillNames.length &&
          enabledSkillNames.every((name, index) => name === state.skills.enabledSkillNames[index]) &&
          nextAppliedDefaultBuiltinSkillNames.length === appliedDefaultBuiltinSkillNames.length &&
          nextAppliedDefaultBuiltinSkillNames.every((name, index) => name === appliedDefaultBuiltinSkillNames[index])
        ) {
          return state
        }
        return {
          skills: {
            ...state.skills,
            enabledSkillNames,
            builtinDefaultsInitialized: true,
            appliedDefaultBuiltinSkillNames: nextAppliedDefaultBuiltinSkillNames,
          },
        }
      })
      notifySkillsChanged()
    } catch (err) {
      console.error('Failed to discover skills:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSkills()
  }, [fetchSkills])

  const originalSkillByPath = useMemo(() => {
    return new Map(skills.filter((skill) => !skill.isBuiltin).map((skill) => [skill.path, skill]))
  }, [skills])

  const normalizedQuery = searchQuery.trim().toLowerCase()
  const matchesQuery = useCallback(
    (skill: SkillInfo) => {
      if (!normalizedQuery) return true
      return [skill.name, skill.description, getTranslatedName(skill), skill.source?.repo]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(normalizedQuery))
    },
    [normalizedQuery, getTranslatedName]
  )

  const filteredSkills = useMemo(() => translatedSkills.filter(matchesQuery), [translatedSkills, matchesQuery])

  const builtinSkills = filteredSkills.filter((skill) => skill.isBuiltin)
  const userSkills = filteredSkills.filter(
    (skill) => !skill.isBuiltin && skill.source?.type !== 'claude-code' && skill.source?.type !== 'agents'
  )
  const claudeCodeSkills = filteredSkills.filter((skill) => skill.source?.type === 'claude-code')
  const agentSkills = filteredSkills.filter((skill) => skill.source?.type === 'agents')

  const getOriginalUserSkill = useCallback(
    (skill: SkillInfo) => {
      return originalSkillByPath.get(skill.path) ?? skill
    },
    [originalSkillByPath]
  )

  const handleUserToggle = useCallback((name: string, enabled: boolean) => {
    settingsStore.setState((state) => {
      const current = state.skills.enabledSkillNames
      if (enabled) {
        if (current.includes(name)) return state
        return { skills: { ...state.skills, enabledSkillNames: [...current, name] } }
      }
      return { skills: { ...state.skills, enabledSkillNames: current.filter((n) => n !== name) } }
    })
  }, [])

  const handleOpenFolder = useCallback(async () => {
    try {
      await skillsController.openSkillsDirectory()
    } catch (err) {
      console.error('Failed to open skills directory:', err)
    }
  }, [])

  const parseGitHubRepo = useCallback((url: string): { owner: string; repo: string } | null => {
    const trimmed = url.trim()
    const match = trimmed.match(/^(?:https?:\/\/)?(?:www\.)?github\.com\/([\w.-]+)\/([\w.-]+?)(?:\.git)?(?:\/|$)/i)
    if (!match) return null
    return { owner: match[1], repo: match[2] }
  }, [])

  const handleScanRepo = useCallback(async () => {
    const parsed = parseGitHubRepo(githubUrl)
    if (!parsed) {
      toastError(t('Please enter a valid GitHub repository URL'))
      return
    }

    setScanning(true)
    try {
      const discovered = await skillsController.scanRepo(parsed.owner, parsed.repo)
      setDetectedSkills(discovered)
      setRepoInfo(parsed)
      setInstallProvider('github')

      if (!discovered.length) {
        toastError(t('No skills found in this repository'))
        return
      }

      setInstallModalOpen(true)
    } catch (error) {
      toastError(error instanceof Error ? error.message : t('Failed to scan repository'))
    } finally {
      setScanning(false)
    }
  }, [githubUrl, parseGitHubRepo, t])

  const handleScanGitLabRepo = useCallback(async () => {
    const parsed = parseGitLabProjectUrl(gitlabUrl)
    if (!parsed) {
      toastError(t('Please enter a valid GitLab project URL'))
      return
    }

    setScanningGitlab(true)
    try {
      const token = gitlabToken.trim() || undefined
      const discovered = await skillsController.scanGitLabRepo(parsed.projectPath, { host: parsed.host, token })
      setDetectedSkills(discovered)
      setGitlabProject({ projectPath: parsed.projectPath, host: parsed.host })
      setInstallProvider('gitlab')

      if (!discovered.length) {
        // The project was reachable (no API error) but contains no SKILL.md, which
        // is a different situation from a missing token or a wrong project path.
        toastError(
          t(
            'No skills found in this project. Add a SKILL.md file at the root or inside a skills/ folder to make it installable.'
          )
        )
        return
      }

      setInstallModalOpen(true)
    } catch (error) {
      // Access failures (wrong path, private project without a token, rate limit)
      // arrive with a specific message from the main process — show it as-is.
      toastError(error instanceof Error ? error.message : t('Failed to scan repository'))
    } finally {
      setScanningGitlab(false)
    }
  }, [gitlabUrl, gitlabToken, t])

  const handleDeleteSkill = useCallback(
    async (name: string) => {
      try {
        const result = await skillsController.deleteSkill(name)
        if (!result.success) {
          toastError(result.error ?? t('Failed to delete skill'))
          return
        }

        settingsStore.setState((state) => ({
          skills: {
            ...state.skills,
            enabledSkillNames: state.skills.enabledSkillNames.filter((skillName) => skillName !== name),
          },
        }))

        toast.success(t('Skill deleted'))
        await fetchSkills()
      } catch (error) {
        toastError(error instanceof Error ? error.message : t('Failed to delete skill'))
      }
    },
    [fetchSkills, t]
  )

  const handleUpdateSkill = useCallback(
    async (name: string) => {
      try {
        const result = await skillsController.updateSkill(name)
        if (!result.success) {
          toastError(result.error ?? t('Failed to update skill'))
          return
        }

        toast.success(t('Skill updated'))
        await fetchSkills()
      } catch (error) {
        toastError(error instanceof Error ? error.message : t('Failed to update skill'))
      }
    },
    [fetchSkills, t]
  )

  const handleCheckUpdate = useCallback(
    async (name: string) => {
      try {
        const result = await skillsController.checkForUpdate(name)
        if (result.error) {
          toastError(result.error)
          return
        }

        if (result.hasUpdate) {
          // Offer the update inline instead of only announcing it: the stored GitLab
          // token lets the re-download happen without re-entering credentials.
          toast.success(t('Update available for {{name}}', { name }), {
            action: {
              label: t('Update'),
              onClick: () => {
                void handleUpdateSkill(name)
              },
            },
          })
          return
        }

        toast.info(t('No updates for {{name}}', { name }))
      } catch (error) {
        toastError(error instanceof Error ? error.message : t('Failed to check for updates'))
      }
    },
    [handleUpdateSkill, t]
  )

  return (
    <>
      <Flex justify="space-between" align="center" mb="lg" wrap="wrap" gap="xs">
        <Flex align="center" gap="xs">
          <Button
            variant="light"
            size="xs"
            leftSection={<ScalableIcon icon={IconPlus} size={14} />}
            onClick={skillsSpotlight.open}
          >
            {t('Add Skills')}
          </Button>
          <Button
            variant="subtle"
            size="xs"
            color="gray"
            leftSection={<ScalableIcon icon={IconBrandGithub} size={14} />}
            onClick={() => setShowGithubInput((v) => !v)}
          >
            {t('Install from GitHub')}
          </Button>
          <Button
            variant="subtle"
            size="xs"
            color="gray"
            leftSection={<ScalableIcon icon={IconBrandGitlab} size={14} />}
            onClick={() => setShowGitlabInput((v) => !v)}
          >
            {t('Install from GitLab')}
          </Button>
        </Flex>

        <Flex align="center" gap="xs">
          {isTranslating && <Loader size="xs" />}
          <Switch size="xs" label={t('Translate')} checked={translationEnabled} onChange={() => toggleTranslation()} />
        </Flex>
      </Flex>

      {showGithubInput && (
        <Paper radius="lg" withBorder p="sm" mb="lg" className="bg-chatbox-background-gray-secondary/30">
          <Flex align="center" gap={8} mb={8}>
            <ScalableIcon icon={IconBrandGithub} size={16} className="text-chatbox-tint-tertiary" />
            <Text size="xs" fw={500}>
              {t('Install from GitHub Repository')}
            </Text>
          </Flex>
          <Flex gap="xs">
            <TextInput
              size="xs"
              value={githubUrl}
              placeholder="https://github.com/owner/repo"
              onChange={(event) => setGithubUrl(event.currentTarget.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  void handleScanRepo()
                }
              }}
              flex={1}
            />
            <Button size="xs" loading={scanning} onClick={() => void handleScanRepo()}>
              {t('Scan')}
            </Button>
          </Flex>
        </Paper>
      )}

      {showGitlabInput && (
        <Paper radius="lg" withBorder p="sm" mb="lg" className="bg-chatbox-background-gray-secondary/30">
          <Flex align="center" gap={8} mb={8}>
            <ScalableIcon icon={IconBrandGitlab} size={16} className="text-chatbox-tint-tertiary" />
            <Text size="xs" fw={500}>
              {t('Install from GitLab Repository')}
            </Text>
          </Flex>
          <Flex gap="xs" wrap="wrap">
            <TextInput
              size="xs"
              value={gitlabUrl}
              placeholder="https://gitlab.com/group/subgroup/repo"
              onChange={(event) => setGitlabUrl(event.currentTarget.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  void handleScanGitLabRepo()
                }
              }}
              flex={1}
              style={{ minWidth: 220 }}
            />
            <TextInput
              size="xs"
              type="password"
              value={gitlabToken}
              placeholder={String(t('Access token (optional)'))}
              onChange={(event) => setGitlabToken(event.currentTarget.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  void handleScanGitLabRepo()
                }
              }}
              w={200}
            />
            <Button size="xs" loading={scanningGitlab} onClick={() => void handleScanGitLabRepo()}>
              {t('Scan')}
            </Button>
          </Flex>
          <Text size="xs" c="chatbox-tertiary" mt={6}>
            {t(
              'Works with gitlab.com and self-hosted GitLab. Accepted forms: https://gitlab.com/group/subgroup/repo, gitlab.example.com/group/repo, or group/subgroup/repo (gitlab.com). The token is saved with the skill so it can be updated later — prefer a project access token with read_api scope.'
            )}
          </Text>
        </Paper>
      )}

      {skills.length > 0 && (
        <TextInput
          size="xs"
          mb="lg"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.currentTarget.value)}
          placeholder={String(t('Search skills...'))}
          leftSection={<ScalableIcon icon={IconSearch} size={14} />}
          rightSection={
            searchQuery ? (
              <ActionIcon variant="subtle" size="sm" color="gray" onClick={() => setSearchQuery('')}>
                <ScalableIcon icon={IconX} size={14} />
              </ActionIcon>
            ) : null
          }
        />
      )}

      {builtinSkills.length > 0 && (
        <>
          <SectionHeader title={t('Built-in Skills')} count={builtinSkills.length} className="mb-3" />
          <SimpleGrid type="container" cols={{ base: 1, '450px': 2, '800px': 3, '1200px': 4 }} mb="xl">
            {builtinSkills.map((skill) => (
              <SkillCard
                key={skill.path}
                skill={skill}
                translatedName={getTranslatedName(skill)}
                enabled={skillSettings.enabledSkillNames.includes(skill.name)}
                onToggle={handleUserToggle}
              />
            ))}
          </SimpleGrid>
        </>
      )}

      <SectionHeader
        title={t('Installed Skills')}
        count={userSkills.length}
        className="mb-3"
        right={
          <>
            <Tooltip label={t('Open Skills Folder')} withArrow openDelay={300}>
              <ActionIcon variant="subtle" size="sm" color="gray" onClick={() => void handleOpenFolder()}>
                <ScalableIcon icon={IconFolderOpen} size={16} />
              </ActionIcon>
            </Tooltip>
            <Button
              variant="subtle"
              size="xs"
              leftSection={<ScalableIcon icon={IconRefresh} size={14} />}
              loading={loading}
              onClick={fetchSkills}
            >
              {t('Refresh')}
            </Button>
          </>
        }
      />

      {userSkills.length === 0 ? (
        normalizedQuery ? (
          <Text size="xs" c="chatbox-tertiary" py="sm">
            {t('No skills match "{{query}}"', { query: searchQuery.trim() })}
          </Text>
        ) : (
          <EmptyState onAddClick={skillsSpotlight.open} onOpenFolder={() => void handleOpenFolder()} />
        )
      ) : (
        <SimpleGrid type="container" cols={{ base: 1, '450px': 2, '800px': 3, '1200px': 4 }}>
          {userSkills.map((skill) => {
            const originalSkill = getOriginalUserSkill(skill)
            const actionItems: ActionMenuItemProps[] = [
              {
                text: t('Check Update'),
                icon: IconRefresh,
                onClick: () => {
                  void handleCheckUpdate(originalSkill.name)
                },
              },
              // Re-pull from the recorded repository. Only meaningful when the skill
              // knows its source (installed from GitHub/GitLab or the marketplace).
              ...(skill.source?.repo
                ? [
                    {
                      text: t('Update'),
                      icon: IconRefresh,
                      onClick: () => {
                        void handleUpdateSkill(originalSkill.name)
                      },
                    } satisfies ActionMenuItemProps,
                  ]
                : []),
              {
                text: t('Delete'),
                icon: IconTrash,
                color: 'red',
                doubleCheck: {
                  text: String(t('Confirm Delete?')),
                  color: 'red',
                },
                onClick: () => {
                  void handleDeleteSkill(originalSkill.name)
                },
              },
            ]

            return (
              <SkillCard
                key={originalSkill.path}
                skill={skill}
                translatedName={getTranslatedName(skill)}
                enabled={skillSettings.enabledSkillNames.includes(originalSkill.name)}
                onToggle={(name, enabled) => handleUserToggle(originalSkill.name || name, enabled)}
                actionItems={actionItems}
              />
            )
          })}
        </SimpleGrid>
      )}

      {claudeCodeSkills.length > 0 && (
        <>
          <SectionHeader
            title={t('Claude Code Skills')}
            subtitle="~/.claude/skills"
            count={claudeCodeSkills.length}
            className="mt-6 mb-3"
          />
          <SimpleGrid type="container" cols={{ base: 1, '450px': 2, '800px': 3, '1200px': 4 }}>
            {claudeCodeSkills.map((skill) => {
              const originalSkill = getOriginalUserSkill(skill)
              return (
                <SkillCard
                  key={originalSkill.path}
                  skill={skill}
                  translatedName={getTranslatedName(skill)}
                  enabled={skillSettings.enabledSkillNames.includes(originalSkill.name)}
                  onToggle={(name, enabled) => handleUserToggle(originalSkill.name || name, enabled)}
                />
              )
            })}
          </SimpleGrid>
        </>
      )}

      {agentSkills.length > 0 && (
        <>
          <SectionHeader
            title={t('Local Agent Skills')}
            subtitle="~/.agents/skills"
            count={agentSkills.length}
            className="mt-6 mb-3"
          />
          <SimpleGrid type="container" cols={{ base: 1, '450px': 2, '800px': 3, '1200px': 4 }}>
            {agentSkills.map((skill) => {
              const originalSkill = getOriginalUserSkill(skill)
              return (
                <SkillCard
                  key={originalSkill.path}
                  skill={skill}
                  translatedName={getTranslatedName(skill)}
                  enabled={skillSettings.enabledSkillNames.includes(originalSkill.name)}
                  onToggle={(name, enabled) => handleUserToggle(originalSkill.name || name, enabled)}
                />
              )
            })}
          </SimpleGrid>
        </>
      )}

      <RemoteSkillInstallModal
        opened={installModalOpen}
        onClose={() => setInstallModalOpen(false)}
        skills={detectedSkills}
        provider={installProvider}
        repoOwner={repoInfo.owner}
        repoName={repoInfo.repo}
        projectPath={gitlabProject.projectPath}
        host={gitlabProject.host}
        token={gitlabToken.trim() || undefined}
        onInstallComplete={() => {
          void fetchSkills()
        }}
      />

      <SkillsSpotlight installedSkills={skills.filter((s) => !s.isBuiltin)} onInstallComplete={fetchSkills} />
    </>
  )
}
