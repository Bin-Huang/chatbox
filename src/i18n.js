import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import en from './i18n/locales/en/translation.json'
import zhHans from './i18n/locales/zh-Hans/translation.json'
import zhHant from './i18n/locales/zh-Hant/translation.json'
import jp from './i18n/locales/jp/translation.json'

const resources = {
  'zh-Hans': {
    translation: zhHans,
  },
  'zh-Hant': {
    translation: zhHant,
  },
  'en': {
    translation: en,
  },
	'jp':{
		translation: jp
	}
}

i18n
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',

    interpolation: {
      escapeValue: false,
    },

    detection: {
      caches: []
    }
  })

export default i18n;
