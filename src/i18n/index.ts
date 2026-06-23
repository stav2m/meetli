import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import he from './locales/he.json';

const STORAGE_KEY = 'meetli-language';

function getInitialLanguage(): string {
  const stored = localStorage.getItem(STORAGE_KEY);

  if (stored === 'en' || stored === 'he') {
    return stored;
  }

  const browserLang = navigator.language.toLowerCase();

  if (browserLang.startsWith('he')) {
    return 'he';
  }

  return 'en';
}

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    he: { translation: he },
  },
  lng: getInitialLanguage(),
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
});

i18n.on('languageChanged', (lng) => {
  localStorage.setItem(STORAGE_KEY, lng);
  document.documentElement.lang = lng;
  document.documentElement.dir = lng === 'he' ? 'rtl' : 'ltr';
});

document.documentElement.lang = i18n.language;
document.documentElement.dir = i18n.language === 'he' ? 'rtl' : 'ltr';

export default i18n;
