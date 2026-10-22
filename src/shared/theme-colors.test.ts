import { describe, expect, it } from 'vitest'
import {
  DEFAULT_INTERFACE_COLORS,
  INTERFACE_COLOR_PRESETS,
  isInterfaceBrandColorAllowed,
  renameInterfaceColorPreset,
  resolveInterfaceBrandColor,
  resolveInterfaceBrandColors,
  withColorOpacity,
} from './theme-colors'

describe('INTERFACE_COLOR_PRESETS', () => {
  it('provides the default, Codex Neutral, Claude, and Mist Blue presets', () => {
    expect(INTERFACE_COLOR_PRESETS.map((preset) => ({ id: preset.id, label: preset.label }))).toEqual([
      { id: 'default', label: 'Default' },
      { id: 'codex-neutral', label: 'Codex Neutral' },
      { id: 'claude-classic', label: 'Claude Classic' },
      { id: 'mist-blue', label: 'Mist Blue' },
    ])
  })

  it('uses the application default colors for the default preset', () => {
    expect(INTERFACE_COLOR_PRESETS[0].colors).toEqual(DEFAULT_INTERFACE_COLORS)
  })

  it('provides complete light and dark palettes for every preset', () => {
    for (const preset of INTERFACE_COLOR_PRESETS) {
      expect(preset.colors.light).toEqual({
        backgroundPrimary: expect.stringMatching(/^#[0-9a-f]{6}$/i),
        backgroundSecondary: expect.stringMatching(/^#[0-9a-f]{6}$/i),
        backgroundTertiary: expect.stringMatching(/^#[0-9a-f]{6}$/i),
        brand: expect.stringMatching(/^#[0-9a-f]{6}$/i),
      })
      expect(preset.colors.dark).toEqual({
        backgroundPrimary: expect.stringMatching(/^#[0-9a-f]{6}$/i),
        backgroundSecondary: expect.stringMatching(/^#[0-9a-f]{6}$/i),
        backgroundTertiary: expect.stringMatching(/^#[0-9a-f]{6}$/i),
        brand: expect.stringMatching(/^#[0-9a-f]{6}$/i),
      })
    }
  })

  it('uses a 60% alpha channel for preset badge backgrounds', () => {
    expect(withColorOpacity('#d97757', 0.6)).toBe('#d9775799')
  })
})

describe('interface brand color', () => {
  it('rejects white regardless of letter case', () => {
    expect(isInterfaceBrandColorAllowed('#ffffff')).toBe(false)
    expect(isInterfaceBrandColorAllowed('#FFFFFF')).toBe(false)
  })

  it('replaces white with the default brand color for the active theme', () => {
    expect(resolveInterfaceBrandColor('#ffffff', 'light')).toBe('#228be6')
    expect(resolveInterfaceBrandColor('#FFFFFF', 'dark')).toBe('#228be6')
    expect(resolveInterfaceBrandColor('#123456', 'light')).toBe('#123456')
  })

  it('replaces white brand colors across a complete palette', () => {
    expect(
      resolveInterfaceBrandColors({
        light: { ...INTERFACE_COLOR_PRESETS[0].colors.light, brand: '#ffffff' },
        dark: { ...INTERFACE_COLOR_PRESETS[0].colors.dark, brand: '#FFFFFF' },
      })
    ).toEqual({
      light: { ...INTERFACE_COLOR_PRESETS[0].colors.light, brand: '#228be6' },
      dark: { ...INTERFACE_COLOR_PRESETS[0].colors.dark, brand: '#228be6' },
    })
  })
})

describe('renameInterfaceColorPreset', () => {
  const presets = [
    {
      id: 'custom-1',
      label: 'Custom Preset 1',
      colors: INTERFACE_COLOR_PRESETS[0].colors,
    },
  ]

  it('renames the matching preset and trims the label', () => {
    expect(renameInterfaceColorPreset(presets, 'custom-1', '  My Colors  ')[0].label).toBe('My Colors')
  })

  it('does not accept a blank label', () => {
    expect(renameInterfaceColorPreset(presets, 'custom-1', '   ')).toBe(presets)
  })
})
