import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en/translation.json';
import fr from './locales/fr/translation.json';

try {
  await i18n.use(initReactI18next).init({
    resources: {
      en: { translation: en },
      fr: { translation: fr },
    },
    lng: 'fr',
    fallbackLng: 'fr',
    interpolation: { escapeValue: false },
  });
  const persistLng = (lng: string) => {
    try {
      localStorage.setItem('i18nextLng', lng);
    } catch {
      /* ignore */
    }
  };
  i18n.on('languageChanged', persistLng);
  persistLng(i18n.language);
} catch (err: unknown) {
  console.error('i18n init failed', err);
}

export default i18n;
