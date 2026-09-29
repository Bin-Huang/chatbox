import { Combobox, type ComboboxProps, Flex, Text, useCombobox } from '@mantine/core'
import type { ModelProvider } from '@shared/types'
import { IconServer } from '@tabler/icons-react'
import { forwardRef, type PropsWithChildren } from 'react'
import { useTranslation } from 'react-i18next'
import type { ImageModelGroup } from '@/hooks/useImageModelGroups'
import { ScalableIcon } from './common/ScalableIcon'
import { ModelIcon } from './icons/ModelIcon'
import ProviderIcon from './icons/ProviderIcon'

function ProviderGroupLabel({ providerId, name, isCustom }: { providerId: string; name: string; isCustom?: boolean }) {
  return (
    <Flex align="center" gap={6} className="px-2 pt-2.5 pb-1">
      {isCustom ? (
        <ScalableIcon icon={IconServer} size={12} className="text-chatbox-tint-gray" />
      ) : (
        <ProviderIcon size={12} provider={providerId} className="opacity-50" />
      )}
      <Text size="xs" fw={500} c="dimmed">
        {name}
      </Text>
    </Flex>
  )
}

export type ImageModelSelectProps = PropsWithChildren<
  {
    modelGroups: ImageModelGroup[]
    onSelect?: (provider: ModelProvider, model: string) => void
  } & ComboboxProps
>

export const ImageModelSelect = forwardRef<HTMLButtonElement, ImageModelSelectProps>(
  ({ modelGroups, onSelect, children, ...comboboxProps }, ref) => {
    const { t } = useTranslation()

    const combobox = useCombobox({
      onDropdownClose: () => {
        combobox.resetSelectedOption()
        combobox.focusTarget()
      },
    })

    const handleOptionSubmit = (val: string) => {
      const { provider, modelId } = JSON.parse(val) as { provider: string; modelId: string }
      onSelect?.(provider as ModelProvider, modelId)
      combobox.closeDropdown()
    }

    return (
      <Combobox
        store={combobox}
        width={280}
        position="top"
        withinPortal={true}
        {...comboboxProps}
        onOptionSubmit={handleOptionSubmit}
      >
        <Combobox.Target targetType="button">
          <button ref={ref} onClick={() => combobox.toggleDropdown()} className="border-none bg-transparent p-0 flex">
            {children}
          </button>
        </Combobox.Target>

        <Combobox.Dropdown className="!rounded-lg !border-[var(--chatbox-border-primary)] !shadow-lg overflow-hidden">
          <Combobox.Options mah={400} style={{ overflowY: 'auto' }} className="p-1">
            {modelGroups.length === 0 ? (
              <Text size="sm" c="dimmed" px="sm" py="xs">
                {t('No models available')}
              </Text>
            ) : (
              modelGroups.map((group) => (
                <div key={group.providerId}>
                  <ProviderGroupLabel providerId={group.providerId} name={group.label} isCustom={group.isCustom} />
                  {group.models.map((model) => (
                    <Combobox.Option
                      key={`${group.providerId}:${model.modelId}`}
                      value={JSON.stringify({ provider: group.providerId, modelId: model.modelId })}
                      className="!rounded-lg flex items-center gap-2"
                    >
                      <ModelIcon providerId={group.providerId} modelId={model.modelId} size={16} />
                      <Text size="sm">{model.displayName}</Text>
                    </Combobox.Option>
                  ))}
                </div>
              ))
            )}
          </Combobox.Options>
        </Combobox.Dropdown>
      </Combobox>
    )
  }
)

ImageModelSelect.displayName = 'ImageModelSelect'

export default ImageModelSelect
