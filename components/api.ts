import _api from '@tauri-apps/api'

function api() {
    // 为什么不直接使用 @tauri-apps/api ？
    // v1.2.0 版本存在 bug，在 next.js 服务器端渲染时会报错 window is not defined
    return (window as any).__TAURI__ as typeof _api
}

export function hasWindow() {
    return typeof window === 'object'
}

export const getVersion = async () => {
    if (!hasWindow()) {
        return 'unknown'
    }
    return api().app.getVersion()
}

export const openLink = async (url: string) => {
    if (!hasWindow()) {
        return
    }
    return api().shell.open(url)
}

export const writeStore = async (key: string, value: any) => {
    if (!hasWindow()) {
        return {}
    }
    return {} as any
    // return (window as any).api.invoke('setStoreValue', key, value)
}

export const readStore = (key: string) => {
    return undefined
    // return {} as any
    // return (window as any).api.invoke('getStoreValue', key)
}

export const shouldUseDarkColors = async (): Promise<boolean> => {
    if (!hasWindow()) {
        return false
    }
    const theme = await api().window.appWindow.theme()
    return theme === 'dark'
}

export async function onSystemThemeChange(callback: () => void) {
    return api().window.appWindow.onThemeChanged(callback)
}
