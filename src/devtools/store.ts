import { useState, useEffect } from 'react'
import { Settings } from './types'

const writeStore = (key: string, value: any) => {
    return (window as any).api.invoke('setStoreValue', key, value)
}
const readStore = (key: string) => {
    return (window as any).api.invoke('getStoreValue', key)
}

export default function useStore() {
    const [settings, _setSettings] = useState<Settings>({})
    useEffect(() => {
        readStore('settings').then((settings: Settings) => {
            _setSettings(settings)
        })
    }, [])
    return {
        settings,
        setSettings: (settings: Settings) => {
            writeStore('settings', settings)
            _setSettings(settings)
        },
    }
}
