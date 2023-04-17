import { createTheme, ThemeProvider } from '@mui/material/styles';
import { createContext, useContext, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import useEvent from '../hooks/useEvent';
import useStore from '../store';
import { ThemeMode, fetchThemeDesign, RealThemeMode } from './index';
import * as api from '../api'
import CssBaseline from '@mui/material/CssBaseline';

export interface ThemeSwitcherAction {
    setMode: (mode: ThemeMode) => void;
}

const ThemeSwitchContext = createContext<[ThemeMode, ThemeSwitcherAction]|null>(null);

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
    const { settings } = useStore();
    const [mode, setMode] = useState<ThemeMode>(getThemeModeFromLocal(THEME_MODE, ThemeMode.System));
    // `shouldUseDarkColors` becomes asynchronous after being called by tauri,
    // here need to use a useState to convert `shouldUseDarkColors` to synchronous
    const [realMode, setRealMode] = useState<RealThemeMode>(getThemeModeFromLocal(REAL_THEME_MODE, ThemeMode.Dark));

    // "shouldUseDarkColors" is asynchronous, after calling "changeRealMode", "mode" may have changed (eg: System -> Dark),
    // then "shouldUseDarkColors" should not be used to determine "realMode"
    const changeRealMode = useEvent((scopeMode: ThemeMode, newMode: RealThemeMode) => {
        if (scopeMode !== mode) return;
        setRealMode(newMode);
        localStorage.setItem(REAL_THEME_MODE, newMode.toString());
    });

    function changeMode(newMode: ThemeMode) {
        setMode(newMode);
        localStorage.setItem(THEME_MODE, newMode.toString());
        if (newMode !== ThemeMode.System) {
            changeRealMode(mode, newMode);
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

    const theme = useMemo(() => createTheme(
        fetchThemeDesign(realMode, settings.fontSize)),
        [realMode, settings],
    );

    useLayoutEffect(() => {
        if (mode !== ThemeMode.System) return;
        // watch system theme change
        const handleModeChange = async () => {
            const isDark = await api.shouldUseDarkColors();
            changeRealMode(mode, isDark ? ThemeMode.Dark : ThemeMode.Light);
        };

        handleModeChange();
        const disposePromise =  api.onSystemThemeChange(handleModeChange);
        return () => {
            disposePromise.then((dispose) => dispose());
        }
    }, [mode]);

    useEffect(() => {
        if (settings.theme !== mode) {
            changeMode(settings.theme);
        }
    }, [settings.theme]);

    useLayoutEffect(() => {
        document.querySelector('html')?.setAttribute('data-theme', realMode === ThemeMode.Dark ? 'dark' : 'light');
    }, [realMode]);

    return useMemo(
        () => (
            <ThemeSwitchContext.Provider value={themeSwitcherContext}>
                <ThemeProvider theme={theme}>
                    <CssBaseline />
                    {props.children}
                </ThemeProvider>
            </ThemeSwitchContext.Provider>
        ),
        [themeSwitcherContext, theme, props.children]
    );
}

export function useThemeSwicher() {
    return useContext(ThemeSwitchContext) as any;
}

export default ThemeSwitchContext;
