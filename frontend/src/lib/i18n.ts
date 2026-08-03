import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  en: {
    translation: {
      "Welcome": "Welcome to CivicResolve",
      "Report_Issue": "Report an Issue",
      "Dashboard": "Dashboard",
      "Profile": "Profile",
    }
  },
  hi: {
    translation: {
      "Welcome": "सिविकरिज़ॉल्व में आपका स्वागत है",
      "Report_Issue": "समस्या की रिपोर्ट करें",
      "Dashboard": "डैशबोर्ड",
      "Profile": "प्रोफ़ाइल",
    }
  },
  te: {
    translation: {
      "Welcome": "సివిక్ రిజాల్వ్ కు స్వాగతం",
      "Report_Issue": "సమస్యను నివేదించండి",
      "Dashboard": "డ్యాష్‌బోర్డ్",
      "Profile": "ప్రొఫైల్",
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: "en", // default language
    fallbackLng: "en",
    interpolation: {
      escapeValue: false // react already safes from xss
    }
  });

export default i18n;
