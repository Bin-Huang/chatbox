import { Language } from '../../shared/types'

export const languageNameMap = {
    en: 'English',
    'zh-Hans': '简体中文',
    'zh-Hant': '繁體中文',
    ja: '日本語',
    ko: '한국어',
    ru: 'Русский', // Russian
    de: 'Deutsch', // German
    fr: 'Français', // French
    tr: 'Türkçe',
}

export const languages = Array.from(Object.keys(languageNameMap)) as Language[]
