import '@mantine/core/styles.css'
import '@/static/globals.css'
import { MantineProvider } from '@mantine/core'
import { INTERFACE_COLOR_PRESETS } from '@shared/theme-colors'
import { ModelProviderEnum, type ProviderOptions } from '@shared/types'
import { getReasoningProviderOptions } from '@shared/utils/reasoning-control'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { IconArrowUp, IconChevronDown, IconPlus } from '@tabler/icons-react'
import { useEffect, useState } from 'react'
import { AppProviders } from '../AppProviders'
import { INPUT_SURFACE_CLASS_NAME, INPUT_SURFACE_STYLE } from '../InputBox/inputSurface'
import ReasoningControlButton from '../InputBox/ReasoningControlButton'

const meta = {
  title: 'Real Components/Reasoning Control',
  parameters: { layout: 'fullscreen' },
} satisfies Meta

export default meta

export const Light: StoryObj = { render: () => <ReasoningComposerPreview /> }
export const Dark: StoryObj = { render: () => <ReasoningComposerPreview dark /> }
export const Mobile: StoryObj = { render: () => <ReasoningComposerPreview compact /> }

// A focused, interactive preview of the real effort control and shared composer
// surface. The surrounding conversation is sample content, not a second app shell.
export function ReasoningComposerPreview({ dark = false, compact = false }: { dark?: boolean; compact?: boolean }) {
  const [options, setOptions] = useState<ProviderOptions | undefined>({ openai: { reasoningEffort: 'medium' } })
  const model = { modelId: 'gpt-5.1' }
  useEffect(() => {
    const root = document.documentElement
    const previousClass = root.classList.contains('dark')
    const previousScheme = root.getAttribute('data-mantine-color-scheme')
    const previousStyle = root.getAttribute('style')
    const colors = INTERFACE_COLOR_PRESETS.find((preset) => preset.id === 'codex-neutral')?.colors[
      dark ? 'dark' : 'light'
    ]
    if (!colors) return
    root.classList.toggle('dark', dark)
    for (const [key, value] of Object.entries({
      '--chatbox-background-primary': colors.backgroundPrimary,
      '--chatbox-background-secondary': colors.backgroundSecondary,
      '--chatbox-background-tertiary': colors.backgroundTertiary,
      '--chatbox-brand': colors.brand,
    }))
      root.style.setProperty(key, value)
    return () => {
      root.classList.toggle('dark', previousClass)
      if (previousStyle === null) root.removeAttribute('style')
      else root.setAttribute('style', previousStyle)
      if (previousScheme === null) root.removeAttribute('data-mantine-color-scheme')
      else root.setAttribute('data-mantine-color-scheme', previousScheme)
    }
  }, [dark])

  return (
    <MantineProvider forceColorScheme={dark ? 'dark' : 'light'}>
      <AppProviders>
        <main
          className="flex min-h-screen flex-col bg-chatbox-background-primary text-chatbox-tint-primary"
          style={compact ? { maxWidth: 390 } : undefined}
        >
          <header className="flex items-center justify-between border-0 border-b border-solid border-chatbox-border-primary px-6 py-4">
            <span className="text-sm font-semibold">Chatbox</span>
            <span className="text-xs text-chatbox-tint-secondary">Work mode</span>
          </header>
          <section className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-end gap-7 px-5 pb-10 pt-16">
            <div className="self-end rounded-2xl bg-chatbox-background-secondary px-4 py-3 text-sm">
              Help me refine this interface.
            </div>
            <div className="text-sm leading-7">
              <p className="mb-3 font-semibold">A little more room to think.</p>
              <p className="m-0 text-chatbox-tint-secondary">
                A quieter composer, clear controls, and just the right amount of detail. Choose how much thinking your
                next response needs.
              </p>
            </div>
          </section>
          <div className="mx-auto w-full max-w-3xl px-3 pb-5">
            <div className={INPUT_SURFACE_CLASS_NAME} style={INPUT_SURFACE_STYLE}>
              <textarea
                aria-label="Message"
                placeholder="Ask a follow-up…"
                className="min-h-[64px] w-full resize-none border-0 bg-transparent p-1 text-sm text-chatbox-tint-primary outline-none"
              />
              <div className="flex items-center justify-between gap-1">
                <div className="flex items-center gap-1">
                  <IconPlus size={20} className="mx-2 text-chatbox-tint-secondary" />
                  <ReasoningControlButton
                    provider={ModelProviderEnum.OpenAIResponses}
                    model={model}
                    providerOptions={options}
                    iconSize={20}
                    compact={compact}
                    onChange={(level) =>
                      setOptions(getReasoningProviderOptions(ModelProviderEnum.OpenAIResponses, model, level))
                    }
                  />
                </div>
                <div className="flex items-center gap-3 text-xs text-chatbox-tint-secondary">
                  <span className="inline-flex items-center gap-1">
                    GPT-5.1 <IconChevronDown size={12} />
                  </span>
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-chatbox-tint-primary text-chatbox-background-primary">
                    <IconArrowUp size={18} />
                  </span>
                </div>
              </div>
            </div>
            <p className="mb-0 mt-3 text-center text-[11px] text-chatbox-tint-tertiary">
              Sample conversation · interactive thinking control
            </p>
          </div>
        </main>
      </AppProviders>
    </MantineProvider>
  )
}
