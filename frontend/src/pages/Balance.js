import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/config';
import ThemeToggle from '../components/ThemeToggle';
import '../App.css';

// Telegram Web App SDK (available globally)
const WebApp = window.Telegram?.WebApp || {};

function Balance() {
  const navigate = useNavigate();
  const [balance, setBalance] = useState(null);
  const [currency, setCurrency] = useState('USD');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (WebApp.BackButton) {
      WebApp.BackButton.show();
      WebApp.BackButton.onClick(() => navigate('/'));
    }
    
    loadBalance();

    return () => {
      if (WebApp.BackButton) {
        WebApp.BackButton.hide();
      }
    };
  }, [navigate]);

  const loadBalance = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await apiClient.get('/balance');
      if (response.data.error) {
        // Handle Cloudflare protection
        if (response.data.cloudflare) {
          setError(
            `🛡️ Cloudflare Protection Active\n\n` +
            `${response.data.error}\n\n` +
            `💡 This is a temporary protection. Please try again in a few moments.\n` +
            `The API may need a few seconds to process your request.`
          );
        } else {
          setError(response.data.error);
        }
        setBalance(null);
      } else {
        setBalance(response.data.balance);
        setCurrency(response.data.currency || 'USD');
      }
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Failed to load balance';
      if (err.response?.data?.cloudflare) {
        setError(
          `🛡️ Cloudflare Protection Active\n\n` +
          `The API is temporarily protected. Please try again in a few moments.`
        );
      } else {
        setError(errorMsg);
      }
      setBalance(null);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="App">
        <div className="loading">
          <div className="spinner"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="App">
      <ThemeToggle />
      <h2>💰 Account Balance</h2>

      {error && <div className="error">{error}</div>}

      {balance !== null && (
        <div className="card">
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>💰</div>
            <div style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '8px' }}>
              {typeof balance === 'number' ? balance.toFixed(2) : balance} {currency}
            </div>
            <p style={{ color: 'var(--tg-theme-hint-color, #666666)' }}>
              Available balance
            </p>
          </div>
        </div>
      )}

      <div className="info">
        💡 Add funds to your account at hero-sms.com to rent and activate numbers.
      </div>

      <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
        <button className="btn" onClick={loadBalance} style={{ flex: 1 }}>
          Refresh Balance
        </button>
        <button className="btn btn-secondary" onClick={() => navigate('/')} style={{ flex: 1 }}>
          ← Home
        </button>
      </div>
    </div>
  );
}

export default Balance;

