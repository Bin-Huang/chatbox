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

export function fetchThemeDesign(mode: RealThemeMode, fontSize: number): ThemeOptions {
    return {
        palette: {
            mode: ThemeModeMapPaletteMode[mode],
            ...(mode === ThemeMode.Light
                ? {
                }
                : {
                    background: {
                        default: 'rgb(40, 40, 40)',
                        paper: 'rgb(40, 40, 40)',
                    },
                }),

        },
        typography: {
            // In Chinese and Japanese the characters are usually larger,
            // so a smaller fontsize may be appropriate.
            fontSize,
        },
    };
}
