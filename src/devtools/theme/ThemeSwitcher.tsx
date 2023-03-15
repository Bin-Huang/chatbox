import CssBaseline from '@mui/material/CssBaseline';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { createContext, useMemo, useState } from 'react';
import { ThemeMode, fetchThemeDesign } from './index';

export interface ThemeSwitcherAction {
    toggleMode: () => void;
    setMode: (mode: ThemeMode) => void;
}

const ThemeSwitchContext = createContext<ThemeSwitcherAction>(null);

interface ThemeSwitcherProviderProps {
    children: React.ReactNode;
}

export function ThemeSwitcherProvider(props: ThemeSwitcherProviderProps) {
    const [mode, setMode] = useState<ThemeMode>(ThemeMode.Light);

    const modeActions = useMemo<ThemeSwitcherAction>(
        () => ({
            toggleMode() {
                setMode(curMode => (curMode === ThemeMode.Light ? ThemeMode.Dark : ThemeMode.Light));
            },
            setMode,
        }),
        []
    );

    const theme = useMemo(() => createTheme(fetchThemeDesign(mode)), [mode]);

    return (
        <ThemeSwitchContext.Provider value={modeActions}>
            <ThemeProvider theme={theme}>
                <CssBaseline />
                {props.children}
            </ThemeProvider>
        </ThemeSwitchContext.Provider>
    );
}

export default ThemeSwitchContext;
