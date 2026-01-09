import React, { createContext, useContext, useState, useEffect } from 'react';

const LanguageContext = createContext();

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
};

const translations = {
  en: {
    // Home
    'home.title': '📱 SMS Number Rental',
    'home.subtitle': 'Rent and activate phone numbers for SMS verificatioon',
    'home.rent': 'Rent Number',
    'home.rentDesc': 'Rent a number for unlimited SMS',
    'home.activate': 'Activate',
    'home.activateDesc': 'Get number for one-time activation',
    'home.myNumbers': 'My Numbers',
    'home.myNumbersDesc': 'View your active numbers',
    'home.balance': 'Balance',
    'home.balanceDesc': 'Check account balance',
    'home.settings': 'Settings',
    'home.settingsDesc': 'App settings and preferences',
    
    // Common
    'common.loading': 'Loading...',
    'common.error': 'Error',
    'common.success': 'Success',
    'common.back': 'Back',
    'common.home': 'Home',
    'common.refresh': 'Refresh',
    'common.select': 'Select',
    'common.search': 'Search',
    
    // Activate
    'activate.title': '🔢 Activate Number',
    'activate.subtitle': 'Get a number for one-time SMS activation. The code will appear automatically when received.',
    'activate.selectService': 'Select Service',
    'activate.selectCountry': 'Select Country',
    'activate.searchService': 'Search service...',
    'activate.searchCountry': 'Search country...',
    'activate.priceInfo': '💰 Price Information',
    'activate.cost': 'Cost',
    'activate.available': 'Available',
    'activate.physicalCount': 'Physical Count',
    'activate.getNumber': 'Get Number',
    'activate.activating': 'Activating...',
    'activate.numberActivated': '✅ Number Activated',
    'activate.number': 'Number',
    'activate.service': 'Service',
    'activate.activationId': 'Activation ID',
    'activate.smsReceived': '📨 SMS Code Received!',
    'activate.waitingSms': '⏳ Waiting for SMS code... This may take a few minutes.',
    'activate.anotherNumber': 'Get Another Number',
    
    // Rent
    'rent.title': '🏠 Rent Number',
    'rent.subtitle': 'Rent a number for unlimited SMS reception for a specified period (2-1344 hours).',
    'rent.selectCountry': 'Select Country',
    'rent.rentalPeriod': 'Rental Period (hours)',
    'rent.rentNumber': 'Rent Number',
    'rent.renting': 'Renting...',
    'rent.success': 'Number rented successfully!',
    
    // My Numbers
    'mynumbers.title': '📋 My Numbers',
    'mynumbers.noNumbers': 'No active numbers. Use "Rent Number" or "Activate" to get started.',
    'mynumbers.rentedNumbers': '🏠 Rented Numbers',
    'mynumbers.number': 'Number',
    'mynumbers.id': 'ID',
    'mynumbers.service': 'Service',
    'mynumbers.hours': 'Hours',
    'mynumbers.time': 'Time',
    'mynumbers.expires': 'Expires',
    'mynumbers.viewMessages': 'View Messages',
    'mynumbers.hideMessages': 'Hide Messages',
    'mynumbers.extendRental': 'Extend Rental',
    'mynumbers.extending': 'Extending...',
    'mynumbers.smsMessages': '📨 SMS Messages',
    'mynumbers.noMessages': 'No messages received yet. Waiting for SMS...',
    'mynumbers.code': 'Code',
    
    // Balance
    'balance.title': '💰 Account Balance',
    'balance.available': 'Available balance',
    'balance.addFunds': '💡 Add funds to your account at hero-sms.com to rent and activate numbers.',
    'balance.refresh': 'Refresh Balance',
    
    // Settings
    'settings.title': '⚙️ Settings',
    'settings.language': 'Language',
    'settings.selectLanguage': 'Select Language',
    'settings.theme': 'Theme',
    'settings.blackWhiteMode': 'Black & White Mode',
    'settings.colorMode': 'Color Mode',
    'settings.description': 'Customize your app experience',
  },
  ro: {
    // Home
    'home.title': '📱 Închiriere Număr SMS',
    'home.subtitle': 'Închiriază și activează numere de telefon pentru verificare SMS',
    'home.rent': 'Închiriază Număr',
    'home.rentDesc': 'Închiriază un număr pentru SMS nelimitat',
    'home.activate': 'Activează',
    'home.activateDesc': 'Obține număr pentru activare unică',
    'home.myNumbers': 'Numerele Mele',
    'home.myNumbersDesc': 'Vezi numerele tale active',
    'home.balance': 'Balanță',
    'home.balanceDesc': 'Verifică balanța contului',
    'home.settings': 'Setări',
    'home.settingsDesc': 'Setări și preferințe aplicație',
    
    // Common
    'common.loading': 'Se încarcă...',
    'common.error': 'Eroare',
    'common.success': 'Succes',
    'common.back': 'Înapoi',
    'common.home': 'Acasă',
    'common.refresh': 'Reîmprospătează',
    'common.select': 'Selectează',
    'common.search': 'Caută',
    
    // Activate
    'activate.title': '🔢 Activează Număr',
    'activate.subtitle': 'Obține un număr pentru activare SMS unică. Codul va apărea automat când este primit.',
    'activate.selectService': 'Selectează Serviciu',
    'activate.selectCountry': 'Selectează Țară',
    'activate.searchService': 'Caută serviciu...',
    'activate.searchCountry': 'Caută țară...',
    'activate.priceInfo': '💰 Informații Preț',
    'activate.cost': 'Cost',
    'activate.available': 'Disponibil',
    'activate.physicalCount': 'Număr Fizic',
    'activate.getNumber': 'Obține Număr',
    'activate.activating': 'Se activează...',
    'activate.numberActivated': '✅ Număr Activat',
    'activate.number': 'Număr',
    'activate.service': 'Serviciu',
    'activate.activationId': 'ID Activare',
    'activate.smsReceived': '📨 Cod SMS Primit!',
    'activate.waitingSms': '⏳ Se așteaptă codul SMS... Poate dura câteva minute.',
    'activate.anotherNumber': 'Obține Alt Număr',
    
    // Rent
    'rent.title': '🏠 Închiriază Număr',
    'rent.subtitle': 'Închiriază un număr pentru recepție SMS nelimitată pentru o perioadă specificată (2-1344 ore).',
    'rent.selectCountry': 'Selectează Țară',
    'rent.rentalPeriod': 'Perioadă Închiriere (ore)',
    'rent.rentNumber': 'Închiriază Număr',
    'rent.renting': 'Se închiriază...',
    'rent.success': 'Număr închiriat cu succes!',
    
    // My Numbers
    'mynumbers.title': '📋 Numerele Mele',
    'mynumbers.noNumbers': 'Nu există numere active. Folosește "Închiriază Număr" sau "Activează" pentru a începe.',
    'mynumbers.rentedNumbers': '🏠 Numere Închiriate',
    'mynumbers.number': 'Număr',
    'mynumbers.id': 'ID',
    'mynumbers.service': 'Serviciu',
    'mynumbers.hours': 'Ore',
    'mynumbers.time': 'Timp',
    'mynumbers.expires': 'Expiră',
    'mynumbers.viewMessages': 'Vezi Mesaje',
    'mynumbers.hideMessages': 'Ascunde Mesaje',
    'mynumbers.extendRental': 'Prelungește Închirierea',
    'mynumbers.extending': 'Se prelungește...',
    'mynumbers.smsMessages': '📨 Mesaje SMS',
    'mynumbers.noMessages': 'Nu au fost primite mesaje încă. Se așteaptă SMS...',
    'mynumbers.code': 'Cod',
    
    // Balance
    'balance.title': '💰 Balanță Cont',
    'balance.available': 'Balanță disponibilă',
    'balance.addFunds': '💡 Adaugă fonduri în contul tău la hero-sms.com pentru a închiria și activa numere.',
    'balance.refresh': 'Reîmprospătează Balanța',
    
    // Settings
    'settings.title': '⚙️ Setări',
    'settings.language': 'Limbă',
    'settings.selectLanguage': 'Selectează Limba',
    'settings.theme': 'Temă',
    'settings.blackWhiteMode': 'Mod Negru & Alb',
    'settings.colorMode': 'Mod Color',
    'settings.description': 'Personalizează experiența aplicației',
  }
};

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState(() => {
    const saved = localStorage.getItem('language');
    return saved || 'en';
  });

  useEffect(() => {
    localStorage.setItem('language', language);
  }, [language]);

  const t = (key) => {
    return translations[language]?.[key] || translations['en'][key] || key;
  };

  const changeLanguage = (lang) => {
    setLanguage(lang);
  };

  return (
    <LanguageContext.Provider value={{ language, changeLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

