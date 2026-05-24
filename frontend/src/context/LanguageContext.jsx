import React, { createContext, useContext, useState, useEffect } from 'react';
import i18n from '../i18n';

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState(localStorage.getItem('lang') || 'en');

  const applyDirection = (lang) => {
    const dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.dir = dir;
    document.documentElement.lang = lang;
    document.body.classList.toggle('rtl', lang === 'ar');
  };

  useEffect(() => {
    applyDirection(language);
  }, [language]);

  const toggleLanguage = () => {
    const next = language === 'en' ? 'ar' : 'en';
    setLanguage(next);
    localStorage.setItem('lang', next);
    i18n.changeLanguage(next);
    applyDirection(next);
  };

  return (
    <LanguageContext.Provider value={{ language, toggleLanguage, isRTL: language === 'ar' }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
