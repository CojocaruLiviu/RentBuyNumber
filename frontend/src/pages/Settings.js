import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import ThemeToggle from '../components/ThemeToggle';
import '../App.css';

// Telegram Web App SDK (available globally)
const WebApp = window.Telegram?.WebApp || {};

function Settings() {
  const navigate = useNavigate();
  const { language, changeLanguage, t } = useLanguage();
  const { isBlackWhite, toggleBlackWhite } = useTheme();

  React.useEffect(() => {
    if (WebApp.BackButton) {
      WebApp.BackButton.show();
      WebApp.BackButton.onClick(() => navigate('/'));
    }

    return () => {
      if (WebApp.BackButton) {
        WebApp.BackButton.hide();
      }
    };
  }, [navigate]);

  const languages = [
    { code: 'en', name: 'English', flag: '🇬🇧' },
    { code: 'ro', name: 'Română', flag: '🇷🇴' }
  ];

  return (
    <div className="App">
      <ThemeToggle />
      <h2>{t('settings.title')}</h2>
      <div className="info">
        {t('settings.description')}
      </div>

      <div className="card">
        <h3 style={{ marginBottom: '16px' }}>{t('settings.language')}</h3>
        <label className="label">{t('settings.selectLanguage')}</label>
        <select
          className="select"
          value={language}
          onChange={(e) => changeLanguage(e.target.value)}
        >
          {languages.map((lang) => (
            <option key={lang.code} value={lang.code}>
              {lang.flag} {lang.name}
            </option>
          ))}
        </select>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: '16px' }}>{t('settings.theme')}</h3>
        <button
          className={`btn ${isBlackWhite ? 'btn-secondary' : ''}`}
          onClick={toggleBlackWhite}
          style={{ marginTop: 0 }}
        >
          {isBlackWhite ? t('settings.colorMode') : t('settings.blackWhiteMode')}
        </button>
        <div className="info" style={{ marginTop: '12px' }}>
          {isBlackWhite 
            ? '🌑 ' + t('settings.blackWhiteMode') + ' ' + t('common.success')
            : '🎨 ' + t('settings.colorMode') + ' ' + t('common.success')
          }
        </div>
      </div>

      <button
        className="btn btn-secondary"
        onClick={() => navigate('/')}
        style={{ marginTop: '16px' }}
      >
        ← {t('common.home')}
      </button>
    </div>
  );
}

export default Settings;

