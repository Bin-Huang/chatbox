import { Popover, UnstyledButton } from '@mantine/core'
import { TestId } from '@shared/automation/testids'
import type { ProviderModelInfo, ProviderOptions } from '@shared/types'
import {
  getReasoningControlCapabilities,
  getReasoningControlLevel,
  getReasoningControlOptions,
  type ReasoningControlDisabledReason,
  type ReasoningControlLevel,
  type ReasoningControlOption,
} from '@shared/utils/reasoning-control'
import { IconAdjustmentsHorizontal, IconChevronDown } from '@tabler/icons-react'
import { type CSSProperties, useId, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AppTooltip as Tooltip } from '@/components/ui/tooltip'
import classes from './ReasoningControlButton.module.css'

interface ReasoningControlButtonProps {
  provider?: string
  model?: ProviderModelInfo | null
  providerOptions?: ProviderOptions
  iconSize: number
  compact?: boolean
  onChange: (level: ReasoningControlLevel) => void
}

export default function ReasoningControlButton({
  provider,
  model,
  providerOptions,
  iconSize,
  compact = false,
  onChange,
}: ReasoningControlButtonProps) {
  const { t } = useTranslation()
  const [opened, setOpened] = useState(false)
  const descriptionId = useId()
  const capabilities = useMemo(() => getReasoningControlCapabilities(provider, model), [provider, model])
  const level = useMemo(
    () => getReasoningControlLevel(provider, model, providerOptions),
    [provider, model, providerOptions]
  )
  const options = useMemo(() => getReasoningControlOptions(provider, model), [provider, model])

  if (!capabilities.supported && !capabilities.disabledReason) return null

  if (capabilities.disabledReason) {
    return (
      <Tooltip label={getDisabledReasonLabel(capabilities.disabledReason, t)} position="top" withArrow>
        <span className="inline-flex">
          <UnstyledButton
            data-testid={TestId.reasoning.trigger}
            className={classes.trigger}
            disabled
            aria-label={getDisabledReasonLabel(capabilities.disabledReason, t)}
          >
            <IconAdjustmentsHorizontal size={iconSize} strokeWidth={1.8} aria-hidden />
          </UnstyledButton>
        </span>
      </Tooltip>
    )
  }

  const selectedIndex = Math.max(
    0,
    options.findIndex((item) => item.level === level)
  )
  const levelLabel = getOptionLabel(options[selectedIndex], t)
  const progress = (selectedIndex / Math.max(1, options.length - 1)) * 100
  const description =
    level === 'default'
      ? t("Uses the model's default thinking settings.")
      : level === 'off'
        ? t('Thinking is turned off for this model.')
        : t('More thinking can improve complex answers, but may take longer and use more tokens.')

  return (
    <Popover
      opened={opened}
      onChange={setOpened}
      position="top-start"
      offset={10}
      width={300}
      trapFocus
      returnFocus
      transitionProps={{ transition: 'fade-up', duration: 120 }}
    >
      <Popover.Target>
        <UnstyledButton
          data-testid={TestId.reasoning.trigger}
          className={classes.trigger}
          aria-label={t('Thinking: {{level}}', { level: levelLabel })}
          aria-haspopup="dialog"
          aria-expanded={opened}
          onClick={() => setOpened((value) => !value)}
        >
          <IconAdjustmentsHorizontal size={iconSize} strokeWidth={1.8} aria-hidden />
          {!compact && <span className={classes.triggerLabel}>{levelLabel}</span>}
          {!compact && <IconChevronDown size={12} aria-hidden />}
        </UnstyledButton>
      </Popover.Target>
      <Popover.Dropdown
        data-testid={TestId.reasoning.menu}
        className={classes.panel}
        aria-label={t('Thinking Effort') || undefined}
      >
        <div className={classes.heading}>
          <span>{t('Thinking Effort')}</span>
          <span className={classes.value} aria-live="polite">
            {levelLabel}
          </span>
        </div>
        <div className={classes.sliderContainer}>
          <input
            className={classes.slider}
            type="range"
            min={0}
            max={options.length - 1}
            step={1}
            value={selectedIndex}
            style={{ '--reasoning-progress': `${progress}%` } as CSSProperties}
            aria-label={t('Thinking Effort') || undefined}
            aria-valuetext={levelLabel}
            aria-describedby={descriptionId}
            onChange={(event) => {
              const option = options[Number(event.currentTarget.value)]
              if (option) onChange(option.level)
            }}
          />
          <div className={classes.ticks} aria-hidden>
            {options.map((item) => (
              <span key={item.level} />
            ))}
          </div>
        </div>
        <div className={classes.labels}>
          {options.map((item) => (
            <UnstyledButton
              type="button"
              key={item.level}
              data-testid={TestId.reasoning.level(item.level)}
              className={classes.level}
              aria-pressed={item.level === level}
              onClick={() => onChange(item.level)}
            >
              {getOptionLabel(item, t)}
            </UnstyledButton>
          ))}
        </div>
        <p id={descriptionId} className={classes.description}>
          {description}
        </p>
      </Popover.Dropdown>
    </Popover>
  )
}

// Literal t() calls so i18next-parser (which only scans src/renderer) can extract the keys
function getDisabledReasonLabel(reason: ReasoningControlDisabledReason, t: (key: string) => string): string {
  switch (reason) {
    case 'requires-anthropic-api-style':
      return t(
        'Thinking controls are disabled because this Claude model is not exposed through the Anthropic API style.'
      )
    case 'requires-google-api-style':
      return t('Thinking controls are disabled because this Gemini model is not exposed through the Google API style.')
    case 'requires-openai-api-style':
      return t('Thinking controls are disabled because this GPT model is not exposed through an OpenAI API style.')
    case 'requires-deepseek-api-style':
      return t(
        'Thinking controls are disabled because this DeepSeek model is not exposed through the DeepSeek API style.'
      )
    case 'requires-qwen-api-style':
      return t('Thinking controls are disabled because this Qwen model is not exposed through the Qwen API style.')
    case 'requires-xai-api-style':
      return t('Thinking controls are disabled because this Grok model is not exposed through the xAI API style.')
  }
}

function getOptionLabel(option: ReasoningControlOption, t: (key: string) => string): string {
  if (option.label === 'on') return t('On')
  return getLevelLabel(option.level, t)
}

function getLevelLabel(level: ReasoningControlLevel, t: (key: string) => string): string {
  switch (level) {
    case 'default':
      return t('Default')
    case 'off':
      return t('Off')
    case 'low':
      return t('Low')
    case 'medium':
      return t('Medium')
    case 'high':
      return t('High')
  }
}
