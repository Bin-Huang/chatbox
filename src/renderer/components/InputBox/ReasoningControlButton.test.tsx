// @vitest-environment jsdom

import { MantineProvider } from '@mantine/core'
import { TestId } from '@shared/automation/testids'
import { ModelProviderEnum, type ProviderModelInfo, type ProviderOptions } from '@shared/types'
import { getReasoningProviderOptions } from '@shared/utils/reasoning-control'
import { useState } from 'react'
import { describe, expect, test, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@/test-utils'
import ReasoningControlButton from './ReasoningControlButton'

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(() => false),
  })),
})

vi.mock('react-i18next', () => ({
  initReactI18next: { type: '3rdParty', init: vi.fn() },
  useTranslation: () => ({
    t: (key: string, values?: { level?: string }) => (values?.level ? key.replace('{{level}}', values.level) : key),
  }),
}))

function Fixture({
  model = { modelId: 'gpt-5.1' },
  compact = false,
  provider = ModelProviderEnum.OpenAIResponses,
}: {
  model?: ProviderModelInfo
  compact?: boolean
  provider?: ModelProviderEnum
}) {
  const [providerOptions, setProviderOptions] = useState<ProviderOptions | undefined>()
  return (
    <MantineProvider>
      <ReasoningControlButton
        provider={provider}
        model={model}
        providerOptions={providerOptions}
        iconSize={22}
        compact={compact}
        onChange={(level) => setProviderOptions(getReasoningProviderOptions(provider, model, level))}
      />
    </MantineProvider>
  )
}

function openPicker() {
  fireEvent.click(screen.getByTestId(TestId.reasoning.trigger))
  return screen.findByRole('slider', { name: 'Thinking Effort' })
}

describe('ReasoningControlButton', () => {
  test('keeps the displayed label, slider value and saved provider options in sync', async () => {
    render(<Fixture />)
    const slider = await openPicker()
    expect(slider.getAttribute('aria-valuetext')).toBe('Default')
    fireEvent.change(slider, { target: { value: '3' } })
    expect(screen.getByRole('button', { name: 'Thinking: Medium' }).textContent).toBe('Medium')
    expect(slider.getAttribute('aria-valuetext')).toBe('Medium')
    fireEvent.click(screen.getByTestId(TestId.reasoning.level('high')))
    expect(slider.getAttribute('aria-valuetext')).toBe('High')
    expect((slider as HTMLInputElement).value).toBe('4')
    fireEvent.click(screen.getByTestId(TestId.reasoning.level('default')))
    expect(slider.getAttribute('aria-valuetext')).toBe('Default')
    expect(screen.getByText("Uses the model's default thinking settings.")).toBeTruthy()
  })

  test('only offers supported Astra levels, without an off option', async () => {
    render(<Fixture model={{ modelId: 'gpt-6-astra' }} />)
    const slider = await openPicker()
    expect(slider.getAttribute('max')).toBe('3')
    expect(screen.queryByTestId(TestId.reasoning.level('off'))).toBeNull()
    fireEvent.change(slider, { target: { value: '3' } })
    expect(screen.getByRole('button', { name: 'Thinking: High' })).toBeTruthy()
  })

  test('preserves explicit off independently of the provider default', async () => {
    render(<Fixture />)
    const slider = await openPicker()
    fireEvent.change(slider, { target: { value: '1' } })
    expect(slider.getAttribute('aria-valuetext')).toBe('Off')
    expect(screen.getByText('Thinking is turned off for this model.')).toBeTruthy()
    fireEvent.click(screen.getByTestId(TestId.reasoning.level('default')))
    expect(slider.getAttribute('aria-valuetext')).toBe('Default')
  })

  test('keeps an accessible name in the compact mobile toolbar', async () => {
    render(<Fixture compact />)
    expect(screen.getByRole('button', { name: 'Thinking: Default' }).textContent).toBe('')
    const slider = await openPicker()
    fireEvent.change(slider, { target: { value: '2' } })
    expect(screen.getByRole('button', { name: 'Thinking: Low' })).toBeTruthy()
  })

  test('reflects the new model when the model changes while the picker is open', async () => {
    const view = render(<Fixture />)
    const slider = await openPicker()
    fireEvent.change(slider, { target: { value: '4' } })
    view.rerender(<Fixture model={{ modelId: 'gpt-6-astra' }} />)
    await waitFor(() => expect(slider.getAttribute('max')).toBe('3'))
    expect(slider.getAttribute('aria-valuetext')).toBe('High')
    expect((slider as HTMLInputElement).value).toBe('3')
  })

  test('uses On rather than a fictitious effort scale for toggle-only models', async () => {
    render(<Fixture provider={ModelProviderEnum.DeepSeek} model={{ modelId: 'deepseek-reasoner' }} />)
    const slider = await openPicker()
    expect(slider.getAttribute('max')).toBe('2')
    fireEvent.change(slider, { target: { value: '2' } })
    expect(slider.getAttribute('aria-valuetext')).toBe('On')
    expect(screen.getByRole('button', { name: 'Thinking: On' })).toBeTruthy()
    expect(screen.queryByTestId(TestId.reasoning.level('low'))).toBeNull()
  })

  test('does not render controls for unsupported models', () => {
    render(<Fixture model={{ modelId: 'gpt-4o' }} />)
    expect(screen.queryByTestId(TestId.reasoning.trigger)).toBeNull()
  })

  test('disables controls for an incompatible API style', () => {
    render(
      <MantineProvider>
        <ReasoningControlButton
          provider={ModelProviderEnum.OpenAI}
          model={{ modelId: 'claude-sonnet-4' }}
          iconSize={22}
          onChange={vi.fn()}
        />
      </MantineProvider>
    )
    expect((screen.getByTestId(TestId.reasoning.trigger) as HTMLButtonElement).disabled).toBe(true)
  })
})
