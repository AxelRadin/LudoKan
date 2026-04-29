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
} catch (err: unknown) {
  console.error('i18n init failed', err);
}

export default i18n;
