import { getDefaultStore } from 'jotai'
import { useEffect } from 'react'
import { settingsAtom } from '../stores/atoms'
import platform from '../packages/platform'

export function useSystemLanguageWhenInit() {
    useEffect(() => {
        setTimeout(() => {
            ;(async () => {
                const store = getDefaultStore()
                const settings = store.get(settingsAtom)
                if (!settings.languageInited) {
                    let locale = await platform.getLocale()
                    settings.language = locale
                }
                settings.languageInited = true
                store.set(settingsAtom, { ...settings })
            })()
        }, 2000)
    }, [])
}
