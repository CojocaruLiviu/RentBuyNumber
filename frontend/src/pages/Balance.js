import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/config';
import ThemeToggle from '../components/ThemeToggle';
import '../App.css';

// Telegram Web App SDK (available globally)
const WebApp = window.Telegram?.WebApp || {};

function Balance() {
  const navigate = useNavigate();
  const [wallet, setWallet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (WebApp.BackButton) {
      WebApp.BackButton.show();
      WebApp.BackButton.onClick(() => navigate('/'));
    }
    
    loadWallet();

    return () => {
      if (WebApp.BackButton) {
        WebApp.BackButton.hide();
      }
    };
  }, [navigate]);

  const loadWallet = async () => {
    setLoading(true);
    setError('');
    
    // Get user ID from Telegram
    const userId = WebApp.initDataUnsafe?.user?.id || WebApp.initDataUnsafe?.user_id;
    
    if (!userId) {
      setError('Telegram user ID not available. Please open this app from Telegram.');
      setLoading(false);
      return;
    }

    try {
      const response = await apiClient.get(`/wallet/${userId}`);
      if (response.data.error) {
        setError(response.data.error);
        setWallet(null);
      } else {
        setWallet(response.data.wallet);
      }
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Failed to load wallet';
      setError(errorMsg);
      setWallet(null);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text, label) => {
    if (!text) return;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }

      if (window.Telegram?.WebApp?.showAlert) {
        window.Telegram.WebApp.showAlert(`${label} copied to clipboard`);
      } else {
        console.log(`${label} copied:`, text);
      }
    } catch (err) {
      console.error('Failed to copy:', err);
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
      <h2>💰 My Wallet</h2>

      {error && <div className="error">{error}</div>}

      {wallet && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Helper: parse coin info safely */}
          {(() => {
            const getCoin = (key) => {
              const value = wallet[key];
              if (!value) {
                return { address: 'N/A', balance: 0 };
              }
              if (typeof value === 'string' || typeof value === 'number') {
                return { address: 'N/A', balance: parseFloat(value || 0) };
              }
              return {
                address: value.address || 'N/A',
                balance: parseFloat(value.balance || 0),
              };
            };

            const btc = getCoin('btc');
            const eth = getCoin('eth');
            const usdt = getCoin('usdt');

            return (
              <>
                <div className="card">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ fontSize: '32px' }}>₿</div>
                        <div>
                          <div style={{ fontWeight: 'bold', fontSize: '18px' }}>Bitcoin</div>
                          <div style={{ color: 'var(--tg-theme-hint-color, #666666)', fontSize: '14px' }}>BTC</div>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '20px', fontWeight: 'bold' }}>
                          {btc.balance.toFixed(8)}
                        </div>
                      </div>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--tg-theme-hint-color, #666666)', wordBreak: 'break-all', marginTop: '4px' }}>
                      <div>Address: {btc.address}</div>
                      <button
                        className="btn btn-secondary"
                        style={{ marginTop: '4px', padding: '4px 8px', fontSize: '11px' }}
                        onClick={() => copyToClipboard(btc.address, 'BTC address')}
                      >
                        Copy address
                      </button>
                    </div>
                  </div>
                </div>

                <div className="card">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ fontSize: '32px' }}>Ξ</div>
                        <div>
                          <div style={{ fontWeight: 'bold', fontSize: '18px' }}>Ethereum</div>
                          <div style={{ color: 'var(--tg-theme-hint-color, #666666)', fontSize: '14px' }}>ETH</div>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '20px', fontWeight: 'bold' }}>
                          {eth.balance.toFixed(8)}
                        </div>
                      </div>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--tg-theme-hint-color, #666666)', wordBreak: 'break-all', marginTop: '4px' }}>
                      <div>Address: {eth.address}</div>
                      <button
                        className="btn btn-secondary"
                        style={{ marginTop: '4px', padding: '4px 8px', fontSize: '11px' }}
                        onClick={() => copyToClipboard(eth.address, 'ETH address')}
                      >
                        Copy address
                      </button>
                    </div>
                  </div>
                </div>

                <div className="card">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ fontSize: '32px' }}>💵</div>
                        <div>
                          <div style={{ fontWeight: 'bold', fontSize: '18px' }}>Tether</div>
                          <div style={{ color: 'var(--tg-theme-hint-color, #666666)', fontSize: '14px' }}>USDT</div>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '20px', fontWeight: 'bold' }}>
                          {usdt.balance.toFixed(2)}
                        </div>
                      </div>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--tg-theme-hint-color, #666666)', wordBreak: 'break-all', marginTop: '4px' }}>
                      <div>Address: {usdt.address}</div>
                      <button
                        className="btn btn-secondary"
                        style={{ marginTop: '4px', padding: '4px 8px', fontSize: '11px' }}
                        onClick={() => copyToClipboard(usdt.address, 'USDT address')}
                      >
                        Copy address
                      </button>
                    </div>
                  </div>
                </div>
              </>
            );
          })()}
        </div>
      )}

      <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
        <button className="btn" onClick={loadWallet} style={{ flex: 1 }}>
          🔄 Refresh
        </button>
        <button className="btn btn-secondary" onClick={() => navigate('/')} style={{ flex: 1 }}>
          ← Home
        </button>
      </div>
    </div>
  );
}

export default Balance;

