import { useAtomValue } from 'jotai'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { languageAtom } from '../stores/atoms'

export function useI18nEffect() {
    const language = useAtomValue(languageAtom)
    const { i18n } = useTranslation()
    useEffect(() => {
        ;(async () => {
            i18n.changeLanguage(language)
        })()
    }, [language])
}
