import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import en from './locales/en/translation.json'
import zhHans from './locales/zh-Hans/translation.json'
import zhHant from './locales/zh-Hant/translation.json'
import jp from './locales/jp/translation.json'

const resources = {
    'zh-Hans': {
        translation: zhHans,
    },
    'zh-Hant': {
        translation: zhHant,
    },
    en: {
        translation: en,
    },
    jp: {
        translation: jp,
    },
}

i18n.use(initReactI18next).init({
    resources,
    fallbackLng: 'en',

    interpolation: {
        escapeValue: false,
    },

    detection: {
        caches: [],
    },
})

export default i18n
