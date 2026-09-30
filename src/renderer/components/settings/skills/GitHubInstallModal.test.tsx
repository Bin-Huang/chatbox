// @vitest-environment jsdom

import { MantineProvider } from '@mantine/core'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@/test-utils'

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn(
    (query: string): MediaQueryList => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(() => false),
    })
  ),
})

const mocks = vi.hoisted(() => ({
  installSkill: vi.fn(),
  installGitLabSkill: vi.fn(),
  translations: {} as Record<string, string>,
}))

vi.mock('react-i18next', () => ({
  initReactI18next: { type: '3rdParty', init: vi.fn() },
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => {
      const template = mocks.translations[key] ?? key
      if (!options) return template
      return template.replace(/\{\{(\w+)\}\}/g, (_match, name: string) => String(options[name] ?? ''))
    },
  }),
}))

vi.mock('@/packages/skills/controller', () => ({
  skillsController: {
    installSkill: mocks.installSkill,
    installGitLabSkill: mocks.installGitLabSkill,
  },
}))

import GitHubInstallModal from './GitHubInstallModal'
import SkillInstallModal from './SkillInstallModal'

function renderModal() {
  render(
    <MantineProvider>
      <GitHubInstallModal
        opened
        onClose={vi.fn()}
        skills={[{ name: 'skill-name', path: 'skills/skill-name' }]}
        repoOwner="owner"
        repoName="repo"
        onInstallComplete={vi.fn()}
      />
    </MantineProvider>
  )
}

describe('GitHubInstallModal install status badges', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })
  test.each([
    ['English', 'Installing', 'Install Selected'],
    ['简体中文', '正在安装', '安装已选'],
  ])('keeps the %s installing label visible without shrinking', (_language, installing, installSelected) => {
    mocks.translations = {
      Installing: installing,
      'Install Selected': installSelected,
    }
    mocks.installSkill.mockReturnValue(new Promise(() => {}))

    renderModal()
    fireEvent.click(screen.getByRole('button', { name: installSelected }))

    const badge = screen.getByText(installing).parentElement
    expect(badge?.getAttribute('style')).toContain('flex: 0 0 auto')
    expect(badge?.getAttribute('style')).toContain('width: max-content')
  })
})

describe('SkillInstallModal providers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })
  function renderGitLabModal() {
    render(
      <MantineProvider>
        <SkillInstallModal
          opened
          onClose={vi.fn()}
          skills={[{ name: 'gl-demo', path: 'skills/gl-demo' }]}
          provider="gitlab"
          projectPath="group/subgroup/repo"
          host="https://gitlab.com"
          token="glpat-secret"
          onInstallComplete={vi.fn()}
        />
      </MantineProvider>
    )
  }

  test('installs a GitLab skill through the GitLab controller with the scanned project and token', async () => {
    mocks.translations = {}
    mocks.installGitLabSkill.mockResolvedValue({ success: true, skillName: 'gl-demo' })

    renderGitLabModal()

    expect(screen.getByText('Install Skills from group/subgroup/repo')).toBeDefined()

    fireEvent.click(screen.getByRole('button', { name: 'Install Selected' }))

    await waitFor(() => {
      expect(mocks.installGitLabSkill).toHaveBeenCalledWith('group/subgroup/repo', 'skills/gl-demo', {
        host: 'https://gitlab.com',
        token: 'glpat-secret',
      })
    })
    // The GitHub installer must not be used for a GitLab project.
    expect(mocks.installSkill).not.toHaveBeenCalled()
  })
})
