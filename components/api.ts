import api from '@tauri-apps/api'

const isClient = typeof window !== 'undefined'

export const getVersion = async () => {
    if (!isClient) {
        return 'unknown'
    }
    return "unknown"
    // return api.app.getVersion()
}

export const writeStore = async (key: string, value: any) => {
    if (!isClient) {
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
export const openLink = (link: string) => {
    return {} as any
    // return (window as any).api.invoke('openLink', link)
}

export const shouldUseDarkColors = async (): Promise<boolean> => {
    return false
    // return api.invoke('shouldUseDarkColors');
}

export function onSystemThemeChange(callback: () => void) {
    return () => {}
    // return api.on('native-theme-updated', callback);
}
