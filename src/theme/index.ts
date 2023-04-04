import { PaletteMode } from '@mui/material';
import { ThemeOptions } from '@mui/material/styles';

export enum ThemeMode {
    Dark,
    Light,
    System,
}

export type RealThemeMode = Exclude<ThemeMode, ThemeMode.System>;

const ThemeModeMapPaletteMode: Record<RealThemeMode, PaletteMode> = {
    [ThemeMode.Dark]: 'dark',
    [ThemeMode.Light]: 'light',
};

export function fetchThemeDesign(mode: RealThemeMode): ThemeOptions {
    return {
        palette: {
            mode: ThemeModeMapPaletteMode[mode],
        },
        typography: {
            // In Chinese and Japanese the characters are usually larger,
            // so a smaller fontsize may be appropriate.
            fontSize: 12,
        },
    };
}
