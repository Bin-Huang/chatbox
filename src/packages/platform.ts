import { ElectronIPC } from 'src/shared/electron-types'
import { Config, Settings } from 'src/shared/types'
import { getOS } from './navigator'
import { parseLocale } from '@/i18n/parser'
import Exporter from './exporter'

export class DesktopPlatform {
    public ipc: ElectronIPC
    constructor(ipc: ElectronIPC) {
        this.ipc = ipc
    }

    public exporter = new Exporter()

    public async getVersion() {
        return this.ipc.invoke('getVersion')
    }
    public async getPlatform() {
        return this.ipc.invoke('getPlatform')
    }
    public async shouldUseDarkColors(): Promise<boolean> {
        return await this.ipc.invoke('shouldUseDarkColors')
    }
    public onSystemThemeChange(callback: () => void): () => void {
        return this.ipc.onSystemThemeChange(callback)
    }
    public onWindowShow(callback: () => void): () => void {
        return this.ipc.onWindowShow(callback)
    }
    public async openLink(url: string): Promise<void> {
        return this.ipc.invoke('openLink', url)
    }
    public async getInstanceName(): Promise<string> {
        const hostname = await this.ipc.invoke('getHostname')
        return `${hostname} / ${getOS()}`
    }
    public async getLocale() {
        const locale = await this.ipc.invoke('getLocale')
        return parseLocale(locale)
    }
    public async ensureShortcutConfig(config: { disableQuickToggleShortcut: boolean }): Promise<void> {
        return this.ipc.invoke('ensureShortcutConfig', JSON.stringify(config))
    }
    public async ensureProxyConfig(config: { proxy?: string }): Promise<void> {
        return this.ipc.invoke('ensureProxy', JSON.stringify(config))
    }
    public async relaunch(): Promise<void> {
        return this.ipc.invoke('relaunch')
    }

    public async getConfig(): Promise<Config> {
        return this.ipc.invoke('getConfig')
    }
    public async getSettings(): Promise<Settings> {
        return this.ipc.invoke('getSettings')
    }

    public async setStoreValue(key: string, value: any) {
        const valueJson = JSON.stringify(value)
        return this.ipc.invoke('setStoreValue', key, valueJson)
    }
    public async getStoreValue(key: string) {
        return this.ipc.invoke('getStoreValue', key)
    }
    public delStoreValue(key: string) {
        return this.ipc.invoke('delStoreValue', key)
    }
    public async getAllStoreValues(): Promise<{ [key: string]: any }> {
        const json = await this.ipc.invoke('getAllStoreValues')
        return JSON.parse(json)
    }
    public async setAllStoreValues(data: { [key: string]: any }) {
        await this.ipc.invoke('setAllStoreValues', JSON.stringify(data))
    }

    public initTracking(): void {
        this.trackingEvent('user_engagement', {})
    }
    public trackingEvent(name: string, params: { [key: string]: string }) {
        const dataJson = JSON.stringify({ name, params })
        this.ipc.invoke('analysticTrackingEvent', dataJson)
    }

    public async shouldShowAboutDialogWhenStartUp(): Promise<boolean> {
        return this.ipc.invoke('shouldShowAboutDialogWhenStartUp')
    }

    public async appLog(level: string, message: string) {
        return this.ipc.invoke('appLog', JSON.stringify({ level, message }))
    }
}

export class BrowserPlatform {
    public exporter = new Exporter()

    public async getVersion(): Promise<string> {
        return '1.0.0'
    }

    public async getPlatform(): Promise<string> {
        return getOS()
    }

    public async shouldUseDarkColors(): Promise<boolean> {
        return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
    }

    public onSystemThemeChange(callback: () => void): () => void {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
        const handler = () => callback()
        mediaQuery.addListener(handler)
        return () => mediaQuery.removeListener(handler)
    }

    public onWindowShow(callback: () => void): () => void {
        window.addEventListener('focus', callback)
        return () => window.removeEventListener('focus', callback)
    }

    public async openLink(url: string): Promise<void> {
        window.open(url, '_blank')
    }

    public async getInstanceName(): Promise<string> {
        const hostname = window.location.hostname
        return `${hostname} / ${getOS()}`
    }

    public async getLocale(): Promise<string> {
        const locale = navigator.language || 'en-US'
        return parseLocale(locale)
    }

    public async ensureShortcutConfig(): Promise<void> {
        // Browser platforms typically don't support custom shortcuts
        return Promise.resolve()
    }

    public async ensureProxyConfig(): Promise<void> {
        // Browser proxy settings are typically managed by the browser itself
        return Promise.resolve()
    }

    public async relaunch(): Promise<void> {
        window.location.reload()
    }

    public async getConfig(): Promise<Config> {
        const configStr = localStorage.getItem('lumina-config')
        return configStr ? JSON.parse(configStr) : {}
    }

    public async getSettings(): Promise<Settings> {
        const settingsStr = localStorage.getItem('lumina-settings')
        return settingsStr ? JSON.parse(settingsStr) : {}
    }

    public async setStoreValue(key: string, value: any): Promise<void> {
        localStorage.setItem(key, JSON.stringify(value))
    }

    public async getStoreValue(key: string): Promise<any> {
        const value = localStorage.getItem(key)
        return value ? JSON.parse(value) : null
    }

    public delStoreValue(key: string): void {
        localStorage.removeItem(key)
    }

    public async getAllStoreValues(): Promise<{ [key: string]: any }> {
        const values: { [key: string]: any } = {}
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i)
            if (key) {
                values[key] = JSON.parse(localStorage.getItem(key) || '{}')
            }
        }
        return values
    }

    public async setAllStoreValues(data: { [key: string]: any }): Promise<void> {
        Object.entries(data).forEach(([key, value]) => {
            localStorage.setItem(key, JSON.stringify(value))
        })
    }

    public initTracking(): void {
        this.trackingEvent('user_engagement', {})
    }

    public trackingEvent(name: string, params: { [key: string]: string }): void {
        // In a real-world scenario, you'd integrate with a web analytics service like Google Analytics
        console.log('Tracking Event:', name, params)
    }

    public async shouldShowAboutDialogWhenStartUp(): Promise<boolean> {
        const showDialog = localStorage.getItem('show-about-dialog')
        return showDialog !== 'false'
    }

    public async appLog(level: string, message: string): Promise<void> {
        // Browser equivalent of logging
        switch (level) {
            case 'error':
                console.error(message)
                break
            case 'warn':
                console.warn(message)
                break
            case 'info':
                console.info(message)
                break
            default:
                console.log(message)
        }
    }
}

export default new BrowserPlatform()
