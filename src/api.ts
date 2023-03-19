import * as api from '@tauri-apps/api'

export const getVersion = async () => {
    return api.app.getVersion()
}

export const openLink = async (url: string) => {
    return api.shell.open(url)
}

export const writeStore = async (key: string, value: any) => {
    const dirExists = await api.fs.exists('', { dir: api.fs.Dir.AppConfig })
    if (!dirExists) {
        await api.fs.createDir('', { dir: api.fs.Dir.AppConfig })
    }
    let configJson = '{}'
    try {
        configJson = await api.fs.readTextFile('config.json', { dir: api.fs.Dir.AppConfig })
    } catch (e) {
        console.log(e)
    }
    const config = JSON.parse(configJson)
    config[key] = value
    await api.fs.writeTextFile('config.json', JSON.stringify(config), { dir: api.fs.Dir.AppConfig })
}

export const readStore = async (key: string) => {
    const dirExists = await api.fs.exists('', { dir: api.fs.Dir.AppConfig })
    if (!dirExists) {
        await api.fs.createDir('', { dir: api.fs.Dir.AppConfig })
    }
    let configJson = '{}'
    try {
        configJson = await api.fs.readTextFile('config.json', { dir: api.fs.Dir.AppConfig })
    } catch (e) {
        console.log(e)
    }
    const config = JSON.parse(configJson)
    return config[key]
}

export const shouldUseDarkColors = async (): Promise<boolean> => {
    const theme = await api.window.appWindow.theme()
    return theme === 'dark'
}

export async function onSystemThemeChange(callback: () => void) {
    return api.window.appWindow.onThemeChanged(callback)
}
