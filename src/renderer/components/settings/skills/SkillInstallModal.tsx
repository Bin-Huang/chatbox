import { Badge, Button, Checkbox, Flex, Modal, Paper, Stack, Text } from '@mantine/core'
import { IconCheck, IconX } from '@tabler/icons-react'
import { type CSSProperties, type FC, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ScalableIcon } from '@/components/common/ScalableIcon'
import { skillsController } from '@/packages/skills/controller'
import { settingsStore } from '@/stores/settingsStore'

export interface DetectedSkill {
  name: string
  path: string
  description?: string
}

export type RemoteSkillProvider = 'github' | 'gitlab'

interface SkillInstallModalProps {
  opened: boolean
  onClose: () => void
  skills: DetectedSkill[]
  /** Remote host the skills were detected on. Defaults to `github`. */
  provider?: RemoteSkillProvider
  /** GitHub repository owner (required for the `github` provider). */
  repoOwner?: string
  /** GitHub repository name (required for the `github` provider). */
  repoName?: string
  /** GitLab project path, e.g. `group/subgroup/repo` (required for the `gitlab` provider). */
  projectPath?: string
  /** GitLab instance base URL; omitted means gitlab.com. */
  host?: string
  /** Optional GitLab access token for private projects. Never persisted. */
  token?: string
  onInstallComplete: () => void
}

type InstallStatus = {
  state: 'idle' | 'loading' | 'success' | 'error'
  error?: string
}

const statusBadgeStyle = { flex: '0 0 auto', width: 'max-content' } satisfies CSSProperties

/**
 * Install modal shared by every remote git provider. The provider only decides the
 * source label and which installer call is made; selection and status handling are
 * provider-independent.
 */
export const SkillInstallModal: FC<SkillInstallModalProps> = ({
  opened,
  onClose,
  skills,
  provider = 'github',
  repoOwner = '',
  repoName = '',
  projectPath = '',
  host,
  token,
  onInstallComplete,
}) => {
  const { t } = useTranslation()
  const [selectedPaths, setSelectedPaths] = useState<string[]>([])
  const [installStatuses, setInstallStatuses] = useState<Record<string, InstallStatus>>({})
  const [installing, setInstalling] = useState(false)

  useEffect(() => {
    if (!opened) {
      setSelectedPaths([])
      setInstallStatuses({})
      setInstalling(false)
      return
    }

    // A repo may contain many skills — don't pre-select all. Only auto-select
    // when there's a single skill (no ambiguity about what to install).
    setSelectedPaths(skills.length === 1 ? [skills[0].path] : [])
    setInstallStatuses(
      skills.reduce<Record<string, InstallStatus>>((acc, skill) => {
        acc[skill.path] = { state: 'idle' }
        return acc
      }, {})
    )
  }, [opened, skills])

  const selectedSkills = useMemo(() => {
    return skills.filter((skill) => selectedPaths.includes(skill.path))
  }, [selectedPaths, skills])

  const allSelected = skills.length > 0 && selectedPaths.length === skills.length
  const someSelected = selectedPaths.length > 0 && !allSelected

  const toggleSelectAll = () => {
    setSelectedPaths(allSelected ? [] : skills.map((skill) => skill.path))
  }

  const title =
    provider === 'gitlab'
      ? t('Install Skills from {{project}}', { project: projectPath })
      : t('Install Skills from {{owner}}/{{repo}}', { owner: repoOwner, repo: repoName })

  const handleInstallSelected = async () => {
    if (!selectedSkills.length) return

    setInstalling(true)
    const installFailedText = String(t('Install failed'))
    let anyFailed = false

    for (const skill of selectedSkills) {
      setInstallStatuses((prev) => ({
        ...prev,
        [skill.path]: { state: 'loading' },
      }))

      try {
        const result =
          provider === 'gitlab'
            ? await skillsController.installGitLabSkill(projectPath, skill.path, { host, token })
            : await skillsController.installSkill(repoOwner, repoName, skill.path)

        if (result.success) {
          settingsStore.setState((state) => {
            if (state.skills.enabledSkillNames.includes(result.skillName)) {
              return state
            }
            return {
              skills: {
                ...state.skills,
                enabledSkillNames: [...state.skills.enabledSkillNames, result.skillName],
              },
            }
          })
        }

        setInstallStatuses((prev) => ({
          ...prev,
          [skill.path]: result.success
            ? { state: 'success' }
            : { state: 'error', error: result.error ?? installFailedText },
        }))
        if (!result.success) {
          anyFailed = true
        }
      } catch (error) {
        anyFailed = true
        setInstallStatuses((prev) => ({
          ...prev,
          [skill.path]: {
            state: 'error',
            error: error instanceof Error ? error.message : installFailedText,
          },
        }))
      }
    }

    setInstalling(false)
    onInstallComplete()
    if (!anyFailed) {
      onClose()
    }
  }

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={title}
      centered
      size="lg"
      overlayProps={{ backgroundOpacity: 0.35, blur: 7 }}
    >
      <Stack gap="sm">
        {skills.length > 1 && (
          <Flex align="center" justify="space-between" px={4}>
            <Checkbox
              checked={allSelected}
              indeterminate={someSelected}
              onChange={toggleSelectAll}
              disabled={installing}
              label={
                <Text size="xs" fw={500}>
                  {t('Select all')}
                </Text>
              }
            />
            <Text size="xs" c="chatbox-tertiary">
              {t('{{count}} selected', { count: selectedPaths.length })}
            </Text>
          </Flex>
        )}
        {skills.map((skill) => {
          const status = installStatuses[skill.path]?.state ?? 'idle'
          const statusError = installStatuses[skill.path]?.error

          return (
            <Paper key={skill.path} withBorder radius="lg" p="sm">
              <Flex align="flex-start" justify="space-between" gap="sm">
                <Checkbox
                  style={{ flex: '1 1 0', minWidth: 0 }}
                  checked={selectedPaths.includes(skill.path)}
                  onChange={(event) => {
                    const checked = event.currentTarget.checked
                    setSelectedPaths((prev) =>
                      checked ? [...prev, skill.path] : prev.filter((path) => path !== skill.path)
                    )
                  }}
                  label={
                    <Stack gap={2}>
                      <Text size="sm" fw={600}>
                        {skill.name}
                      </Text>
                      {skill.description && (
                        <Text size="xs" c="chatbox-tertiary">
                          {skill.description}
                        </Text>
                      )}
                    </Stack>
                  }
                />
                {status === 'loading' && (
                  <Badge size="xs" style={statusBadgeStyle}>
                    {t('Installing')}
                  </Badge>
                )}
                {status === 'success' && (
                  <Badge
                    size="xs"
                    color="green"
                    leftSection={<ScalableIcon icon={IconCheck} size={12} />}
                    style={statusBadgeStyle}
                  >
                    {t('Installed')}
                  </Badge>
                )}
                {status === 'error' && (
                  <Badge
                    size="xs"
                    color="red"
                    leftSection={<ScalableIcon icon={IconX} size={12} />}
                    style={statusBadgeStyle}
                  >
                    {t('Failed')}
                  </Badge>
                )}
              </Flex>
              {statusError && (
                <Text size="xs" mt="xs" c="chatbox-error">
                  {statusError}
                </Text>
              )}
            </Paper>
          )
        })}

        <Flex justify="flex-end" gap="xs" mt="xs">
          <Button variant="default" onClick={onClose} disabled={installing}>
            {t('Cancel')}
          </Button>
          <Button loading={installing} onClick={handleInstallSelected} disabled={!selectedPaths.length}>
            {t('Install Selected')}
          </Button>
        </Flex>
      </Stack>
    </Modal>
  )
}

export default SkillInstallModal
