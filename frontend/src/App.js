import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { LanguageProvider } from './contexts/LanguageContext';
import Home from './pages/Home';
import Rent from './pages/Rent';
import Activate from './pages/Activate';
import MyNumbers from './pages/MyNumbers';
import Balance from './pages/Balance';
import Settings from './pages/Settings';
import './App.css';

// Telegram Web App SDK (available globally via script tag)
const WebApp = window.Telegram?.WebApp || {};

function App() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (window.Telegram?.WebApp) {
      WebApp.ready();
      WebApp.expand();
      
      // Set theme colors
      WebApp.setHeaderColor('#2481cc');
      WebApp.setBackgroundColor('#ffffff');
    }
    setReady(true);
  }, []);

  if (!ready) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <LanguageProvider>
      <ThemeProvider>
        <Router>
          <div className="App">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/rent" element={<Rent />} />
              <Route path="/activate" element={<Activate />} />
              <Route path="/numbers" element={<MyNumbers />} />
              <Route path="/balance" element={<Balance />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </Router>
      </ThemeProvider>
    </LanguageProvider>
  );
}

export default App;

