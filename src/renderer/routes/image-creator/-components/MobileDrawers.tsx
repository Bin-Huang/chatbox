import { ActionIcon, Box, Flex, ScrollArea, Stack, Text, UnstyledButton } from '@mantine/core'
import type { ImageGeneration } from '@shared/types'
import { IconPlus, IconServer } from '@tabler/icons-react'
import { useTranslation } from 'react-i18next'
import { Drawer } from 'vaul'
import { ScalableIcon } from '@/components/common/ScalableIcon'
import { ModelIcon } from '@/components/icons/ModelIcon'
import ProviderIcon from '@/components/icons/ProviderIcon'
import { HistoryListContent } from './HistoryPanel'

/* ============================================
   Mobile History Drawer
   ============================================ */

export interface MobileHistoryDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  historyCache: ImageGeneration[]
  historyLoading: boolean
  currentRecordId: string | null
  getModelDisplayName: (record: ImageGeneration) => string
  hasNextPage: boolean
  isFetchingNextPage: boolean
  onItemClick: (record: ImageGeneration) => void
  onLoadMore: () => void
  onNewCreation: () => void
  onDelete: (id: string) => void
}

export function MobileHistoryDrawer({
  open,
  onOpenChange,
  historyCache,
  historyLoading,
  currentRecordId,
  getModelDisplayName,
  hasNextPage,
  isFetchingNextPage,
  onItemClick,
  onLoadMore,
  onNewCreation,
  onDelete,
}: MobileHistoryDrawerProps) {
  const { t } = useTranslation()

  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange} noBodyStyles>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-chatbox-background-mask-overlay" />
        <Drawer.Content className="flex flex-col rounded-t-xl h-[70vh] fixed bottom-0 left-0 right-0 outline-none bg-[var(--chatbox-background-primary)]">
          <Drawer.Handle />
          <Flex
            align="center"
            justify="space-between"
            px="md"
            py="sm"
            className="border-b border-[var(--chatbox-border-primary)]"
          >
            <Drawer.Title asChild>
              <Text size="xs" fw={600} c="dimmed" tt="uppercase" style={{ letterSpacing: 0.5 }}>
                {t('History')}
              </Text>
            </Drawer.Title>
            <ActionIcon
              variant="subtle"
              color="gray"
              size="sm"
              onClick={() => {
                onNewCreation()
                onOpenChange(false)
              }}
            >
              <IconPlus size={16} />
            </ActionIcon>
          </Flex>

          <Box flex={1}>
            <HistoryListContent
              historyCache={historyCache}
              historyLoading={historyLoading}
              currentRecordId={currentRecordId}
              getModelDisplayName={getModelDisplayName}
              hasNextPage={hasNextPage}
              isFetchingNextPage={isFetchingNextPage}
              isMobile
              onItemClick={(record) => {
                onItemClick(record)
                onOpenChange(false)
              }}
              onLoadMore={onLoadMore}
              onDelete={onDelete}
            />
          </Box>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  )
}

/* ============================================
   Mobile Model Drawer
   ============================================ */

export interface MobileModelDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  modelGroups: {
    label: string
    providerId: string
    isCustom?: boolean
    models: { modelId: string; displayName: string }[]
  }[]
  selectedProvider: string
  selectedModel: string
  onSelect: (provider: string, model: string) => void
}

export function MobileModelDrawer({
  open,
  onOpenChange,
  modelGroups,
  selectedProvider,
  selectedModel,
  onSelect,
}: MobileModelDrawerProps) {
  const { t } = useTranslation()

  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange} noBodyStyles>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-chatbox-background-mask-overlay" />
        <Drawer.Content className="flex flex-col rounded-t-xl max-h-[70vh] fixed bottom-0 left-0 right-0 outline-none bg-[var(--chatbox-background-primary)]">
          <Drawer.Handle />
          <Flex
            align="center"
            justify="space-between"
            px="md"
            py="sm"
            className="border-b border-[var(--chatbox-border-primary)]"
          >
            <Drawer.Title asChild>
              <Text size="xs" fw={600} c="dimmed" tt="uppercase" style={{ letterSpacing: 0.5 }}>
                {t('Select Model')}
              </Text>
            </Drawer.Title>
          </Flex>

          <ScrollArea flex={1} type="auto" offsetScrollbars>
            <Stack gap="md" p="xs" pb="xl">
              {modelGroups.map((group, groupIndex) => (
                <Stack key={group.providerId} gap={2}>
                  <Flex align="center" gap={6} px="sm">
                    {group.isCustom ? (
                      <ScalableIcon icon={IconServer} size={14} className="text-chatbox-tint-gray" />
                    ) : (
                      <ProviderIcon size={14} provider={group.providerId} className="opacity-50" />
                    )}
                    <Text size="xs" fw={500} c="dimmed">
                      {group.label}
                    </Text>
                  </Flex>
                  {group.models.map((model) => {
                    const isSelected = selectedProvider === group.providerId && selectedModel === model.modelId
                    return (
                      <UnstyledButton
                        key={`${group.providerId}:${model.modelId}`}
                        onClick={() => {
                          onSelect(group.providerId, model.modelId)
                          onOpenChange(false)
                        }}
                        className={`
                          w-full px-4 py-3 rounded-lg transition-colors
                          ${isSelected ? 'bg-[var(--chatbox-background-brand-secondary)]' : 'hover:bg-[var(--chatbox-background-secondary)]'}
                        `}
                      >
                        <Flex align="center" gap={10}>
                          <ModelIcon providerId={group.providerId} modelId={model.modelId} size={20} />
                          <Text size="sm" fw={isSelected ? 600 : 400}>
                            {model.displayName}
                          </Text>
                        </Flex>
                      </UnstyledButton>
                    )
                  })}
                  {groupIndex < modelGroups.length - 1 && (
                    <div className="h-px bg-[var(--chatbox-border-primary)] mx-2 mt-2" />
                  )}
                </Stack>
              ))}
            </Stack>
          </ScrollArea>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  )
}

/* ============================================
   Mobile Ratio Drawer
   ============================================ */

export interface MobileRatioDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  options: string[]
  selectedRatio: string
  onSelect: (ratio: string) => void
}

export function MobileRatioDrawer({ open, onOpenChange, options, selectedRatio, onSelect }: MobileRatioDrawerProps) {
  const { t } = useTranslation()

  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange} noBodyStyles>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-chatbox-background-mask-overlay" />
        <Drawer.Content className="flex flex-col rounded-t-xl fixed bottom-0 left-0 right-0 outline-none bg-[var(--chatbox-background-primary)]">
          <Drawer.Handle />
          <Flex
            align="center"
            justify="space-between"
            px="md"
            py="sm"
            className="border-b border-[var(--chatbox-border-primary)]"
          >
            <Drawer.Title asChild>
              <Text size="xs" fw={600} c="dimmed" tt="uppercase" style={{ letterSpacing: 0.5 }}>
                {t('Aspect Ratio')}
              </Text>
            </Drawer.Title>
          </Flex>

          <Stack gap={2} p="xs" pb="xl">
            {options.map((ratio) => (
              <UnstyledButton
                key={ratio}
                onClick={() => {
                  onSelect(ratio)
                  onOpenChange(false)
                }}
                className={`
                  w-full px-4 py-3 rounded-lg transition-colors
                  ${selectedRatio === ratio ? 'bg-[var(--chatbox-background-brand-secondary)]' : 'hover:bg-[var(--chatbox-background-secondary)]'}
                `}
              >
                <Text size="sm" fw={selectedRatio === ratio ? 600 : 400} ta="center">
                  {ratio}
                </Text>
              </UnstyledButton>
            ))}
          </Stack>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  )
}
