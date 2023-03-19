import * as api from '@tauri-apps/api'

export const getVersion = async () => {
    return api.app.getVersion()
}

export const openLink = async (url: string) => {
    return api.shell.open(url)
}

export const writeStore = async (key: string, value: any) => {
    const config = await readConfig()
    config[key] = value
    await api.fs.writeTextFile('config.json', JSON.stringify(config), { dir: api.fs.Dir.AppConfig })
}

export const readStore = async (key: string) => {
    const config = await readConfig()
    return config[key]
}

async function readConfig() {
    const dirExists = await api.fs.exists('', { dir: api.fs.Dir.AppConfig })
    if (!dirExists) {
        try {
            await api.fs.createDir('', { dir: api.fs.Dir.AppConfig })
        } catch (e) {
            console.log('ensure app config dir', e)
        }
    }

    const configExists = await api.fs.exists('config.json', { dir: api.fs.Dir.AppConfig })
    if (!configExists) {
        try {
            // 从旧版本迁移
            const oldConfig = await api.fs.readTextFile('chatbox/config.json', { dir: api.fs.Dir.LocalData })
            await api.fs.writeTextFile('config.json', oldConfig, { dir: api.fs.Dir.AppConfig })
        } catch (e) {
            console.log(e)
            await api.fs.writeTextFile('config.json', '{}', { dir: api.fs.Dir.AppConfig })
        }
    }

    const configJson = await api.fs.readTextFile('config.json', { dir: api.fs.Dir.AppConfig })
    return JSON.parse(configJson)
}

export const shouldUseDarkColors = async (): Promise<boolean> => {
    const theme = await api.window.appWindow.theme()
    return theme === 'dark'
}

export async function onSystemThemeChange(callback: () => void) {
    return api.window.appWindow.onThemeChanged(callback)
}
