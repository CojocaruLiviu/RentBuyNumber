import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import ThemeToggle from '../components/ThemeToggle';
import './Home.css';

// Telegram Web App SDK (available globally)
const WebApp = window.Telegram?.WebApp || {};

function Home() {
  const navigate = useNavigate();
  const { t } = useLanguage();

  React.useEffect(() => {
    if (WebApp.BackButton) {
      WebApp.BackButton.hide();
    }
    if (WebApp.MainButton) {
      WebApp.MainButton.hide();
    }
  }, []);

  return (
    <div className="home">
      <ThemeToggle />
      <div className="header">
        <h1>{t('home.title')}</h1>
        <p>{t('home.subtitle')}</p>
      </div>

      <div className="menu-grid">
        {/* <div className="menu-card" onClick={() => navigate('/rent')}>
          <div className="menu-icon">🏠</div>
          <h3>{t('home.rent')}</h3>
          <p>{t('home.rentDesc')}</p>
        </div> */}

        <div className="menu-card" onClick={() => navigate('/activate')}>
          <div className="menu-icon">🔢</div>
          <h3>{t('home.activate')}</h3>
          <p>{t('home.activateDesc')}</p>
        </div>

        <div className="menu-card" onClick={() => navigate('/numbers')}>
          <div className="menu-icon">📋</div>
          <h3>{t('home.myNumbers')}</h3>
          <p>{t('home.myNumbersDesc')}</p>
        </div>

        <div className="menu-card" onClick={() => navigate('/balance')}>
          <div className="menu-icon">💰</div>
          <h3>{t('home.balance')}</h3>
          <p>{t('home.balanceDesc')}</p>
        </div>

        <div className="menu-card" onClick={() => navigate('/settings')}>
          <div className="menu-icon">⚙️</div>
          <h3>{t('home.settings')}</h3>
          <p>{t('home.settingsDesc')}</p>
        </div>
      </div>
    </div>
  );
}

export default Home;

