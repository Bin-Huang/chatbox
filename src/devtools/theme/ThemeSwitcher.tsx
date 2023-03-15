import CssBaseline from '@mui/material/CssBaseline';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { createContext, useContext, useMemo, useState } from 'react';
import { ThemeMode, fetchThemeDesign } from './index';

export interface ThemeSwitcherAction {
    toggleMode: () => void;
    setMode: (mode: ThemeMode) => void;
}

const ThemeSwitchContext = createContext<[ThemeMode, ThemeSwitcherAction]>(null);

interface ThemeSwitcherProviderProps {
    children: React.ReactNode;
}

export function ThemeSwitcherProvider(props: ThemeSwitcherProviderProps) {
    const [mode, setMode] = useState<ThemeMode>(ThemeMode.Light);

    const themeSwitcherContext = useMemo<[ThemeMode, ThemeSwitcherAction]>(
        () => [
            mode,
            {
                toggleMode() {
                    setMode(curMode => (curMode === ThemeMode.Light ? ThemeMode.Dark : ThemeMode.Light));
                },
                setMode,
            },
        ],
        [mode]
    );

    const theme = useMemo(() => createTheme(fetchThemeDesign(mode)), [mode]);

    return (
        <ThemeSwitchContext.Provider value={themeSwitcherContext}>
            <ThemeProvider theme={theme}>
                <CssBaseline />
                {props.children}
            </ThemeProvider>
        </ThemeSwitchContext.Provider>
    );
}

export function useThemeSwicher() {
    return useContext(ThemeSwitchContext);
}

export default ThemeSwitchContext;
