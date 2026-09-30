import { Box, Group, Paper, Stack, Text } from '@mantine/core'
import { spotlight } from '@mantine/spotlight'
import {
  type BuiltinProviderBaseInfo,
  ModelProviderEnum,
  ModelProviderType,
  type ProviderBaseInfo,
  type ProviderInfo,
} from '@shared/types'
import type { SkillInfo } from '@shared/types/skills'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createMemoryHistory, createRootRoute, createRoute, createRouter, RouterProvider } from '@tanstack/react-router'
import { createContext, type ReactNode, useContext, useEffect } from 'react'
import { DocumentParserSettings } from '@/components/settings/DocumentParserSettings'
import { BuiltinServersSection } from '@/components/settings/mcp/BuiltinServersSection'
import { ConfigModal } from '@/components/settings/mcp/ConfigModal'
import CustomServersSection from '@/components/settings/mcp/CustomServersSection'
import ServerRegistrySpotlight from '@/components/settings/mcp/ServerRegistrySpotlight'
import { AddProviderModal } from '@/components/settings/provider/AddProviderModal'
import { ImportProviderModal } from '@/components/settings/provider/ImportProviderModal'
import { ProviderList } from '@/components/settings/provider/ProviderList'
import ProviderSpotlight, { providerSpotlight } from '@/components/settings/provider/ProviderSpotlight'
import { ProviderIconImage } from '@/components/settings/provider/providerIcons'
import GitHubInstallModal, { type DetectedSkill } from '@/components/settings/skills/GitHubInstallModal'
import SkillInstallModal from '@/components/settings/skills/SkillInstallModal'
import { SkillsSection } from '@/components/settings/skills/SkillsSection'
import SkillsSpotlight, { skillsSpotlight } from '@/components/settings/skills/SkillsSpotlight'
import type { MCPServerConfig } from '@/packages/mcp/types'
import platform from '@/platform'
import { settingsStore } from '@/stores/settingsStore'

const providerModels = [
  {
    modelId: 'story-fast-model',
    nickname: 'Story Fast',
    labels: ['recommended'],
    capabilities: ['tool_use', 'vision'],
    contextWindow: 128000,
  },
]

const providers: ProviderBaseInfo[] = [
  {
    id: ModelProviderEnum.ChatboxAI,
    name: 'Chatbox AI',
    type: ModelProviderType.ChatboxAI,
  },
  {
    id: ModelProviderEnum.OpenAI,
    name: 'OpenAI',
    type: ModelProviderType.OpenAI,
  },
  {
    id: ModelProviderEnum.Claude,
    name: 'Claude',
    type: ModelProviderType.Claude,
  },
  {
    id: ModelProviderEnum.Gemini,
    name: 'Gemini',
    type: ModelProviderType.Gemini,
  },
  {
    id: 'custom-story-provider',
    name: 'Internal Gateway',
    type: ModelProviderType.OpenAI,
    isCustom: true,
  },
]

const builtinProviders = providers.filter((provider): provider is BuiltinProviderBaseInfo => !provider.isCustom)

const importedProvider: ProviderInfo = {
  id: 'custom-story-import',
  name: 'Imported Gateway',
  type: ModelProviderType.OpenAI,
  isCustom: true,
  apiHost: 'https://gateway.example.com',
  apiPath: '/v1/chat/completions',
  apiKey: 'sk-story-preview-key',
  models: providerModels,
}

const existingProvider: ProviderInfo = {
  ...importedProvider,
  name: 'Existing Gateway',
}

const httpMcpServer: MCPServerConfig = {
  id: 'story-http-mcp',
  name: 'Docs Search',
  enabled: true,
  transport: {
    type: 'http',
    url: 'https://mcp.example.com/sse',
    headers: {
      Authorization: 'Bearer story-token',
    },
  },
}

const stdioMcpServer: MCPServerConfig = {
  id: 'story-stdio-mcp',
  name: 'Local Git Tools',
  enabled: false,
  transport: {
    type: 'stdio',
    command: 'uvx',
    args: ['mcp-server-git'],
    env: {
      GIT_AUTHOR_NAME: 'Storybook',
    },
  },
}

const detectedSkills: DetectedSkill[] = [
  {
    name: 'repo-code-review',
    path: 'skills/repo-code-review',
    description: 'Review pull requests and summarize risk before merge.',
  },
  {
    name: 'release-notes',
    path: 'skills/release-notes',
    description: 'Generate release notes from local commits and issue labels.',
  },
]

const installedSkills: SkillInfo[] = [
  {
    name: 'chatbox-product-info',
    description: 'Answer questions about Chatbox product features and plans.',
    path: '/builtin/chatbox-product-info/SKILL.md',
    isBuiltin: true,
    source: { type: 'builtin' },
  },
  {
    name: 'repo-code-review',
    description: 'Review changed files and produce concrete risk findings.',
    path: '/Users/themez/.codex/skills/repo-code-review/SKILL.md',
    isBuiltin: false,
    source: { type: 'github', repo: 'themez/repo-code-review' },
  },
  {
    name: 'claude-imported-workflow',
    description: 'A Claude Code compatible workflow discovered from the local skills folder.',
    path: '/Users/themez/.claude/skills/claude-imported-workflow/SKILL.md',
    isBuiltin: false,
    source: { type: 'claude-code', repo: 'local-claude-code' },
  },
]

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      staleTime: Number.POSITIVE_INFINITY,
      gcTime: Number.POSITIVE_INFINITY,
    },
  },
})

const meta: Meta = {
  title: 'Real Components/Settings Management',
  decorators: [
    (Story) => (
      <QueryClientProvider client={queryClient}>
        <StoryRouter>
          <SeedSettingsManagement />
          <Box p="lg" bg="var(--chatbox-background-primary)" style={{ minHeight: 680 }}>
            <Story />
          </Box>
        </StoryRouter>
      </QueryClientProvider>
    ),
  ],
}

export default meta

export const DocumentParserSettingsStates: StoryObj = {
  name: 'Document parser desktop mineru and token states',
  parameters: {
    uiInventoryTargets: ['src/renderer/components/settings/DocumentParserSettings'],
  },
  render: () => (
    <SettingsSurface
      title="DocumentParserSettings"
      description="Actual parser selector with desktop MinerU token and connection check affordance."
    >
      <DocumentParserSettings />
    </SettingsSurface>
  ),
}

export const ProviderListStates: StoryObj = {
  name: 'Provider list activated featured custom and add states',
  parameters: {
    uiInventoryTargets: ['src/renderer/components/settings/provider/ProviderList'],
  },
  render: () => (
    <SettingsSurface
      title="ProviderList"
      description="Actual settings provider navigation list with active, configured, custom, featured, and add states."
    >
      <ProviderList providers={providers} onAddProvider={() => undefined} />
    </SettingsSurface>
  ),
}

export const ProviderIconStates: StoryObj = {
  name: 'Provider icon image aliases and fallback states',
  parameters: {
    uiInventoryTargets: ['src/renderer/components/settings/provider/providerIcons'],
  },
  render: () => (
    <Stack gap="lg">
      <SurfaceLabel
        title="ProviderIconImage"
        description="Actual provider icon loader for bundled provider PNG assets, aliases, and fallback icon rendering."
      />
      <Paper withBorder radius="md" p="md">
        <Group gap="lg">
          {[
            ModelProviderEnum.OpenAI,
            ModelProviderEnum.Claude,
            ModelProviderEnum.Gemini,
            ModelProviderEnum.QwenPortal,
            'custom-story-provider',
          ].map((providerId) => (
            <Stack key={providerId} align="center" gap="xs">
              <ProviderIconImage providerId={providerId} size={40} />
              <Text size="xs" c="dimmed">
                {providerId}
              </Text>
            </Stack>
          ))}
        </Group>
      </Paper>
    </Stack>
  ),
}

export const AddProviderModalStates: StoryObj = {
  name: 'Add provider modal name and API mode states',
  parameters: {
    uiInventoryTargets: ['src/renderer/components/settings/provider/AddProviderModal'],
  },
  render: () => (
    <SettingsSurface
      title="AddProviderModal"
      description="Actual add-provider modal with provider name validation and API compatibility mode selector."
    >
      <AddProviderModal opened onClose={() => undefined} />
    </SettingsSurface>
  ),
}

export const ImportProviderModalStates: StoryObj = {
  name: 'Import provider modal overwrite and model preview states',
  parameters: {
    uiInventoryTargets: ['src/renderer/components/settings/provider/ImportProviderModal'],
  },
  render: () => (
    <SettingsSurface
      title="ImportProviderModal"
      description="Actual provider import review modal with overwrite warning, API fields, model list, cancel, and save actions."
    >
      <ImportProviderModal
        opened
        onClose={() => undefined}
        importedConfig={importedProvider}
        existingProvider={existingProvider}
      />
    </SettingsSurface>
  ),
}

export const ProviderSpotlightStates: StoryObj = {
  name: 'Provider spotlight quick actions popular and more providers',
  parameters: {
    uiInventoryTargets: ['src/renderer/components/settings/provider/ProviderSpotlight'],
  },
  render: () => (
    <SettingsSurface
      title="ProviderSpotlight"
      description="Actual provider command palette with quick actions, popular providers, more providers, and import state."
    >
      <OpenProviderSpotlight />
      <ProviderSpotlight
        allSystemProviders={builtinProviders}
        onSelectProvider={() => undefined}
        onAddCustomProvider={() => undefined}
        onImportProvider={() => undefined}
        isImporting={false}
      />
    </SettingsSurface>
  ),
}

export const BuiltinMcpServersStates: StoryObj = {
  name: 'Builtin MCP server premium accessible states',
  parameters: {
    uiInventoryTargets: ['src/renderer/components/settings/mcp/BuiltinServersSection'],
  },
  render: () => (
    <SettingsSurface
      title="BuiltinServersSection"
      description="Actual Chatbox built-in MCP server cards with enabled and disabled switch states."
    >
      <BuiltinServersSection />
    </SettingsSurface>
  ),
}

export const CustomMcpServersStates: StoryObj = {
  name: 'Custom MCP server cards add edit and install states',
  parameters: {
    uiInventoryTargets: ['src/renderer/components/settings/mcp/CustomServersSection'],
  },
  render: () => (
    <SettingsSurface
      title="CustomServersSection"
      description="Actual custom MCP grid with add-server tile, existing server cards, and install-config modal state."
    >
      <CustomServersSection installConfig={stdioMcpServer} />
    </SettingsSurface>
  ),
}

export const McpConfigModalStates: StoryObj = {
  name: 'MCP config modal http edit form states',
  parameters: {
    uiInventoryTargets: ['src/renderer/components/settings/mcp/ConfigModal'],
  },
  render: () => (
    <SettingsSurface
      title="ConfigModal"
      description="Actual MCP server editor modal with name, transport type, URL/header fields, delete, test, and save actions."
    >
      <ConfigModal
        mode="edit"
        config={httpMcpServer}
        onClose={() => undefined}
        onSave={() => undefined}
        onDelete={() => undefined}
      />
    </SettingsSurface>
  ),
}

export const McpRegistrySpotlightStates: StoryObj = {
  name: 'MCP registry spotlight custom import official and community states',
  parameters: {
    uiInventoryTargets: ['src/renderer/components/settings/mcp/ServerRegistrySpotlight'],
  },
  render: () => (
    <SettingsSurface
      title="ServerRegistrySpotlight"
      description="Actual MCP server registry spotlight with custom add, JSON import, official, and community entries."
    >
      <OpenDefaultSpotlight />
      <ServerRegistrySpotlight triggerAddServer={() => undefined} triggerImportJson={() => undefined} />
    </SettingsSurface>
  ),
}

export const SkillsSectionStates: StoryObj = {
  name: 'Skills section builtin user claude and GitHub install entry states',
  parameters: {
    uiInventoryTargets: ['src/renderer/components/settings/skills/SkillsSection'],
  },
  render: () => (
    <SettingsSurface
      title="SkillsSection"
      description="Actual skills management section with built-in, user, Claude Code, marketplace, GitHub install, refresh, and translation controls."
    >
      <SkillsSection />
    </SettingsSurface>
  ),
}

export const SkillsSpotlightStates: StoryObj = {
  name: 'Skills spotlight popular installed and replacement states',
  parameters: {
    uiInventoryTargets: ['src/renderer/components/settings/skills/SkillsSpotlight'],
  },
  render: () => (
    <SettingsSurface
      title="SkillsSpotlight"
      description="Actual skills marketplace spotlight with popular skills, installed badges, replacement badges, and search input."
    >
      <OpenSkillsSpotlight />
      <SkillsSpotlight
        installedSkills={installedSkills.filter((skill) => !skill.isBuiltin)}
        onInstallComplete={() => undefined}
      />
    </SettingsSurface>
  ),
}

export const GitHubInstallModalStates: StoryObj = {
  name: 'GitHub install modal detected skill selection states',
  parameters: {
    uiInventoryTargets: ['src/renderer/components/settings/skills/GitHubInstallModal'],
  },
  render: () => (
    <SettingsSurface
      title="GitHubInstallModal"
      description="Actual install-from-GitHub modal with detected skills, checkboxes, install status badges, cancel, and install action."
    >
      <GitHubInstallModal
        opened
        onClose={() => undefined}
        skills={detectedSkills}
        repoOwner="themez"
        repoName="chatbox-skills"
        onInstallComplete={() => undefined}
      />
    </SettingsSurface>
  ),
}

export const GitLabInstallModalStates: StoryObj = {
  name: 'GitLab install modal detected skill selection states',
  parameters: {
    uiInventoryTargets: ['src/renderer/components/settings/skills/SkillInstallModal'],
  },
  render: () => (
    <SettingsSurface
      title="SkillInstallModal (GitLab)"
      description="Install-from-GitLab modal for a self-hosted project: detected skills, checkboxes, install status badges, cancel, and install action."
    >
      <SkillInstallModal
        opened
        onClose={() => undefined}
        skills={detectedSkills}
        provider="gitlab"
        projectPath="team/subgroup/chatbox-skills"
        host="https://gitlab.com"
        onInstallComplete={() => undefined}
      />
    </SettingsSurface>
  ),
}

function SeedSettingsManagement() {
  settingsStore.setState((state) => ({
    ...state,
    language: 'en',
    languageInited: true,
    licenseKey: 'settings-management-story-license',
    licenseActivationMethod: 'manual',
    licenseInstances: {
      'settings-management-story-license': 'settings-management-story-instance',
    },
    providers: [
      {
        id: ModelProviderEnum.OpenAI,
        name: 'OpenAI',
        type: ModelProviderType.OpenAI,
        models: providerModels,
      },
      {
        id: ModelProviderEnum.Claude,
        name: 'Claude',
        type: ModelProviderType.Claude,
        models: providerModels,
      },
    ],
    customProviders: [
      {
        id: 'custom-story-provider',
        name: 'Internal Gateway',
        type: ModelProviderType.OpenAI,
        isCustom: true,
        models: providerModels,
      },
    ],
    extension: {
      ...state.extension,
      documentParser: {
        type: 'mineru',
        mineru: { apiToken: 'mineru-story-token' },
      },
    },
    mcp: {
      ...state.mcp,
      enabledBuiltinServers: ['fetch'],
      servers: [httpMcpServer, stdioMcpServer],
    },
    skills: {
      enabledSkillNames: ['chatbox-product-info', 'repo-code-review', 'claude-imported-workflow'],
      translationEnabled: false,
      builtinDefaultsInitialized: true,
    },
  }))

  const mutablePlatform = platform as typeof platform & {
    type: string
    getKnowledgeBaseController?: () => { testMineruConnection: (token: string) => Promise<{ success: boolean }> }
  }
  mutablePlatform.type = 'desktop'
  mutablePlatform.getKnowledgeBaseController = () => ({
    testMineruConnection: async () => ({ success: true }),
  })

  const win = window as typeof window & {
    electronAPI?: {
      invoke: (channel: string, ...args: unknown[]) => Promise<unknown>
    }
  }
  win.electronAPI = {
    ...win.electronAPI,
    invoke: (channel: string) => {
      if (channel === 'skills:discover') {
        return Promise.resolve(installedSkills)
      }
      if (channel === 'skills:get-directory') {
        return Promise.resolve('/Users/themez/.codex/skills')
      }
      if (channel === 'skills:scan-repo') {
        return Promise.resolve(detectedSkills)
      }
      if (channel === 'skills:scan-gitlab-repo') {
        return Promise.resolve(detectedSkills)
      }
      if (channel === 'skills:install' || channel === 'skills:install-marketplace') {
        return Promise.resolve({ success: true, skillName: 'repo-code-review' })
      }
      if (channel === 'skills:install-gitlab') {
        return Promise.resolve({ success: true, skillName: 'repo-code-review' })
      }
      if (channel === 'skills:delete') {
        return Promise.resolve({ success: true })
      }
      if (channel === 'skills:check-update') {
        return Promise.resolve({ hasUpdate: true, currentHash: 'abc', latestHash: 'def' })
      }
      if (channel === 'skills:update') {
        return Promise.resolve({ success: true, skillName: 'repo-code-review' })
      }
      return Promise.resolve(null)
    },
  }

  return null
}

function OpenProviderSpotlight() {
  useEffect(() => {
    const timer = window.setTimeout(() => providerSpotlight.open(), 200)
    return () => window.clearTimeout(timer)
  }, [])
  return null
}

function OpenDefaultSpotlight() {
  useEffect(() => {
    const timer = window.setTimeout(() => spotlight.open(), 200)
    return () => window.clearTimeout(timer)
  }, [])
  return null
}

function OpenSkillsSpotlight() {
  useEffect(() => {
    const timer = window.setTimeout(() => skillsSpotlight.open(), 200)
    return () => window.clearTimeout(timer)
  }, [])
  return null
}

const storyRootRoute = createRootRoute({
  component: () => <StoryRouteSlot />,
})
const storyRoute = createRoute({
  getParentRoute: () => storyRootRoute,
  path: '/',
  component: () => <StoryRouteSlot />,
})
const storyRouter = createRouter({
  routeTree: storyRootRoute.addChildren([storyRoute]),
  history: createMemoryHistory({ initialEntries: ['/settings/provider/openai'] }),
})
const StoryRouteContext = createContext<ReactNode>(null)

function StoryRouter({ children }: { children: ReactNode }) {
  return (
    <StoryRouteContext.Provider value={children}>
      <RouterProvider router={storyRouter} />
    </StoryRouteContext.Provider>
  )
}

function StoryRouteSlot() {
  return <>{useContext(StoryRouteContext)}</>
}

function SettingsSurface({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <Stack gap="lg" maw={1020}>
      <SurfaceLabel title={title} description={description} />
      <Paper withBorder radius="md" p="md">
        {children}
      </Paper>
    </Stack>
  )
}

function SurfaceLabel({ title, description }: { title: string; description: string }) {
  return (
    <Stack gap={2}>
      <Text fw={700}>{title}</Text>
      <Text size="sm" c="dimmed">
        {description}
      </Text>
    </Stack>
  )
}
