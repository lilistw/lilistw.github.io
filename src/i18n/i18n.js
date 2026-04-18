import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import bg from './locales/bg.json';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      bg: { translation: bg }
    },
    lng: 'bg',
    fallbackLng: 'bg',
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;