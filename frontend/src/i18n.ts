import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  en: {
    translation: {
      nav: {
        home: 'Home',
        profile: 'Profile',
        logout: 'Log out',
        login: 'Log in',
        register: 'Register',
      },
    },
  },
  fr: {
    translation: {
      nav: {
        home: 'Accueil',
        profile: 'Profil',
        logout: 'Déconnexion',
        login: 'Connexion',
        register: "S'inscrire",
      },
    },
  },
} as const;

try {
  await i18n.use(initReactI18next).init({
    resources,
    lng: 'fr',
    fallbackLng: 'fr',
    interpolation: { escapeValue: false },
  });
} catch (err: unknown) {
  console.error('i18n init failed', err);
}

export default i18n;
