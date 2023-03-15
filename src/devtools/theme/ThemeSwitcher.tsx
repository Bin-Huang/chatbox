import CssBaseline from '@mui/material/CssBaseline';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { createContext, useContext, useLayoutEffect, useMemo, useState } from 'react';
import { shouldUseDarkColors } from '../store';
import { ThemeMode, fetchThemeDesign, RealThemeMode } from './index';

export interface ThemeSwitcherAction {
    setMode: (mode: ThemeMode) => void;
}

const ThemeSwitchContext = createContext<[ThemeMode, ThemeSwitcherAction]>(null);

interface ThemeSwitcherProviderProps {
    children: React.ReactNode;
}

const REAL_THEME_MODE = 'REAL_THEME_MODE;';
const THEME_MODE = 'THEME_MODE';

function getThemeModeFromLocal<T>(key: string, defaultValue: T) {
    const localMode = localStorage.getItem(key);
    if (localMode) {
        return Number(localMode);
    } else {
        return defaultValue;
    }
}

export function ThemeSwitcherProvider(props: ThemeSwitcherProviderProps) {
    const [mode, setMode] = useState<ThemeMode>(getThemeModeFromLocal(THEME_MODE, ThemeMode.System));
    // `shouldUseDarkColors` becomes asynchronous after being called by electron,
    // here need to use a useState to convert `shouldUseDarkColors` to synchronous
    const [realMode, setRealMode] = useState<RealThemeMode>(getThemeModeFromLocal(REAL_THEME_MODE, ThemeMode.Dark));

    function changeRealMode(mode: RealThemeMode) {
        setRealMode(mode);
        localStorage.setItem(REAL_THEME_MODE, mode.toString());
    }
    function changeMode(mode: ThemeMode) {
        setMode(mode);
        localStorage.setItem(THEME_MODE, mode.toString());
        if (mode !== ThemeMode.System) {
            changeRealMode(mode);
        }
    }

    const themeSwitcherContext = useMemo<[ThemeMode, ThemeSwitcherAction]>(
        () => [
            mode,
            {
                setMode: changeMode,
            },
        ],
        [mode]
    );

    const theme = useMemo(() => createTheme(fetchThemeDesign(realMode)), [realMode]);

    useLayoutEffect(() => {
        if (mode !== ThemeMode.System) return;
        // watch system theme change
        const handleModeChange = async () => {
            changeRealMode((await shouldUseDarkColors()) ? ThemeMode.Dark : ThemeMode.Light);
        };

        handleModeChange();
        const dispose = api.onSystemThemeChange(handleModeChange);
        return () => dispose()
    }, [mode]);

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
