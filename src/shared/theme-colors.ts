export type InterfaceTheme = 'light' | 'dark'

export type InterfaceThemeColors = {
  backgroundPrimary: string
  backgroundSecondary: string
  backgroundTertiary: string
  brand: string
}

export type InterfaceColors = Record<InterfaceTheme, InterfaceThemeColors>

export type InterfaceColorPreset = {
  id: string
  label: string
  colors: InterfaceColors
}

export const DEFAULT_INTERFACE_COLORS: InterfaceColors = {
  light: {
    backgroundPrimary: '#ffffff',
    backgroundSecondary: '#f3f3f3',
    backgroundTertiary: '#dee2e6',
    brand: '#228be6',
  },
  dark: {
    backgroundPrimary: '#242424',
    backgroundSecondary: '#3b3b3b',
    backgroundTertiary: '#424242',
    brand: '#228be6',
  },
}

export const INTERFACE_COLOR_PRESETS = [
  {
    id: 'default',
    label: 'Default',
    colors: DEFAULT_INTERFACE_COLORS,
  },
  {
    id: 'codex-neutral',
    label: 'Codex Neutral',
    colors: {
      light: {
        backgroundPrimary: '#ffffff',
        backgroundSecondary: '#f5f5f5',
        backgroundTertiary: '#e9e9e9',
        brand: '#353535',
      },
      dark: {
        backgroundPrimary: '#181818',
        backgroundSecondary: '#242424',
        backgroundTertiary: '#303030',
        brand: '#b8b8b8',
      },
    },
  },
  {
    id: 'claude-classic',
    label: 'Claude Classic',
    colors: {
      light: {
        backgroundPrimary: '#f7f6f2',
        backgroundSecondary: '#eeede7',
        backgroundTertiary: '#e2e1db',
        brand: '#d97757',
      },
      dark: {
        backgroundPrimary: '#262624',
        backgroundSecondary: '#333330',
        backgroundTertiary: '#41413d',
        brand: '#e89173',
      },
    },
  },
  {
    id: 'mist-blue',
    label: 'Mist Blue',
    colors: {
      light: {
        backgroundPrimary: '#f6f8fa',
        backgroundSecondary: '#eaf0f5',
        backgroundTertiary: '#d9e3ec',
        brand: '#5784aa',
      },
      dark: {
        backgroundPrimary: '#1c252e',
        backgroundSecondary: '#253240',
        backgroundTertiary: '#324252',
        brand: '#7fb3dd',
      },
    },
  },
] satisfies ReadonlyArray<InterfaceColorPreset>

export function getDefaultInterfaceColors(): InterfaceColors {
  return {
    light: { ...DEFAULT_INTERFACE_COLORS.light },
    dark: { ...DEFAULT_INTERFACE_COLORS.dark },
  }
}

export function isInterfaceBrandColorAllowed(color: string): boolean {
  return color.toLowerCase() !== '#ffffff'
}

export function resolveInterfaceBrandColor(color: string, theme: InterfaceTheme): string {
  return isInterfaceBrandColorAllowed(color) ? color : DEFAULT_INTERFACE_COLORS[theme].brand
}

export function resolveInterfaceBrandColors(colors: InterfaceColors): InterfaceColors {
  return {
    light: { ...colors.light, brand: resolveInterfaceBrandColor(colors.light.brand, 'light') },
    dark: { ...colors.dark, brand: resolveInterfaceBrandColor(colors.dark.brand, 'dark') },
  }
}

export function renameInterfaceColorPreset(
  presets: InterfaceColorPreset[],
  presetId: string,
  label: string
): InterfaceColorPreset[] {
  const trimmedLabel = label.trim()
  if (!trimmedLabel) return presets

  return presets.map((preset) => (preset.id === presetId ? { ...preset, label: trimmedLabel } : preset))
}

export function withColorOpacity(color: string, opacity: number): string {
  const alpha = Math.round(Math.min(Math.max(opacity, 0), 1) * 255)
  return `${color}${alpha.toString(16).padStart(2, '0')}`
}
