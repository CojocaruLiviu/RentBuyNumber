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
import apiClient from './api/config';
import './App.css';

// Telegram Web App SDK (available globally via script tag)
const WebApp = window.Telegram?.WebApp || {};

function App() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const initializeApp = async () => {
      if (window.Telegram?.WebApp) {
        WebApp.ready();
        WebApp.expand();
        
        // Set theme colors
        WebApp.setHeaderColor('#2481cc');
        WebApp.setBackgroundColor('#ffffff');

        // Get user ID from Telegram
        const userId = WebApp.initDataUnsafe?.user?.id || WebApp.initDataUnsafe?.user_id;
        
        if (userId) {
          try {
            // First, ensure user exists in database (create if doesn't exist)
            await apiClient.post(`/user/init/${userId}`);
            console.log(`✅ User initialized in database: ${userId}`);
            
            // Then initialize wallet for user
            await apiClient.post(`/wallet/${userId}/init`);
            console.log(`✅ Wallet initialized for user: ${userId}`);
          } catch (error) {
            console.error('❌ Failed to initialize user/wallet:', error);
            // Don't block app if initialization fails
          }
        } else {
          console.warn('⚠️ Telegram user ID not available');
        }
      }
      setReady(true);
    };

    initializeApp();
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

