import { PaletteMode } from '@mui/material';
import { ThemeOptions } from '@mui/material/styles';

export enum ThemeMode {
    Dark,
    Light,
    // TODO: impl
    // System,
}

const ThemeModeMapPaletteMode: Record<ThemeMode, PaletteMode> = {
    [ThemeMode.Dark]: 'dark',
    [ThemeMode.Light]: 'light',
};

export function fetchThemeDesign(mode: ThemeMode): ThemeOptions {
    return {
        palette: {
            mode: ThemeModeMapPaletteMode[mode],
        },
    };
}
