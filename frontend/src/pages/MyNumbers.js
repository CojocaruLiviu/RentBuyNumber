import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/config';
import ThemeToggle from '../components/ThemeToggle';
import '../App.css';

// Telegram Web App SDK (available globally)
const WebApp = window.Telegram?.WebApp || {};

function MyNumbers() {
  const navigate = useNavigate();
  const [rented, setRented] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandingId, setExpandingId] = useState(null);
  const [messages, setMessages] = useState({});
  const [loadingMessages, setLoadingMessages] = useState({});
  const [extendingId, setExtendingId] = useState(null);

  useEffect(() => {
    if (WebApp.BackButton) {
      WebApp.BackButton.show();
      WebApp.BackButton.onClick(() => navigate('/'));
    }
    
    loadNumbers();

    return () => {
      if (WebApp.BackButton) {
        WebApp.BackButton.hide();
      }
    };
  }, [navigate]);

  // Auto-refresh messages for expanded numbers
  useEffect(() => {
    if (!expandingId) return;

    const loadMessagesForRent = async (rentId) => {
      // Use functional updates to avoid stale closures
      setLoadingMessages((prev) => {
        if (prev[rentId]) return prev; // Already loading
        return { ...prev, [rentId]: true };
      });
      
      try {
        const response = await apiClient.get(`/rented/${rentId}/sms`);
        if (!response.data.error) {
          setMessages((prev) => ({ ...prev, [rentId]: response.data.data || [] }));
        }
      } catch (err) {
        // Silently fail on auto-refresh
      } finally {
        setLoadingMessages((prev) => ({ ...prev, [rentId]: false }));
      }
    };

    const interval = setInterval(() => {
      if (expandingId) {
        loadMessagesForRent(expandingId);
      }
    }, 5000); // Refresh every 5 seconds

    return () => clearInterval(interval);
  }, [expandingId]);

  const loadNumbers = async () => {
    setLoading(true);
    try {
      const [rentedResponse] = await Promise.all([
        apiClient.get('/rented')
      ]);

      if (rentedResponse.data.error) {
        setError(rentedResponse.data.error);
      } else {
        setRented(rentedResponse.data.data || rentedResponse.data || []);
      }
    } catch (err) {
      setError('Failed to load numbers');
    } finally {
      setLoading(false);
    }
  };

  const toggleMessages = async (rentId) => {
    if (expandingId === rentId) {
      setExpandingId(null);
      return;
    }

    setExpandingId(rentId);
    setLoadingMessages({ ...loadingMessages, [rentId]: true });

    try {
      const response = await apiClient.get(`/rented/${rentId}/sms`);
      if (response.data.error) {
        setError(response.data.error);
      } else {
        setMessages({ ...messages, [rentId]: response.data.data || [] });
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load messages');
      setMessages({ ...messages, [rentId]: [] });
    } finally {
      setLoadingMessages({ ...loadingMessages, [rentId]: false });
    }
  };

  const handleExtend = async (rentId) => {
    setExtendingId(rentId);
    setError('');

    try {
      const response = await apiClient.post(`/rented/${rentId}/extend`);
      if (response.data.error) {
        setError(response.data.error);
      } else if (response.data.success) {
        // Reload numbers to get updated info
        await loadNumbers();
        alert('Rental extended successfully!');
      } else {
        setError(response.data.message || 'Failed to extend rental');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to extend rental');
    } finally {
      setExtendingId(null);
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
      <h2>📋 My Numbers</h2>

      {error && <div className="error">{error}</div>}

      {rented.length === 0 ? (
        <div className="info">
          No active numbers. Use "Rent Number" or "Activate" to get started.
        </div>
      ) : (
        <>
          <h3 style={{ marginTop: '16px', marginBottom: '12px' }}>🏠 Rented Numbers</h3>
          {rented.map((num, idx) => {
            const isExpanded = expandingId === num.id;
            const numMessages = messages[num.id] || [];
            const isLoadingMessages = loadingMessages[num.id];
            
            return (
              <div key={num.id || idx} className="card" style={{ marginBottom: '16px' }}>
                <p><strong>Number:</strong> +{num.number}</p>
                <p><strong>ID:</strong> {num.id}</p>
                {num.service && <p><strong>Service:</strong> {num.service}</p>}
                {num.hours && <p><strong>Hours:</strong> {num.hours}</p>}
                {num.time && <p><strong>Time:</strong> {num.time}</p>}
                {num.expires && <p><strong>Expires:</strong> {new Date(num.expires).toLocaleString()}</p>}
                
                <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
                  <button 
                    className="btn btn-secondary" 
                    onClick={() => toggleMessages(num.id)}
                    disabled={isLoadingMessages}
                    style={{ flex: 1, minWidth: '120px' }}
                  >
                    {isLoadingMessages ? 'Loading...' : isExpanded ? 'Hide Messages' : 'View Messages'}
                  </button>
                  <button 
                    className="btn" 
                    onClick={() => handleExtend(num.id)}
                    disabled={extendingId === num.id}
                    style={{ flex: 1, minWidth: '120px' }}
                  >
                    {extendingId === num.id ? 'Extending...' : 'Extend Rental'}
                  </button>
                </div>
                
                {isExpanded && (
                  <div style={{ marginTop: '16px', padding: '12px', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
                    <h4 style={{ marginBottom: '12px' }}>📨 SMS Messages</h4>
                    {isLoadingMessages ? (
                      <div className="info">Loading messages...</div>
                    ) : numMessages.length === 0 ? (
                      <div className="info">No messages received yet. Waiting for SMS...</div>
                    ) : (
                      <div>
                        {numMessages.map((msg, msgIdx) => (
                          <div key={msgIdx} style={{ 
                            padding: '8px', 
                            marginBottom: '8px', 
                            backgroundColor: '#fff', 
                            borderRadius: '4px',
                            border: '1px solid #ddd'
                          }}>
                            <p style={{ margin: 0, fontWeight: 'bold' }}>Code: {msg.code || msg.text}</p>
                            {msg.timestamp && (
                              <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#666' }}>
                                {new Date(msg.timestamp).toLocaleString()}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </>
      )}

      <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
        <button className="btn btn-secondary" onClick={loadNumbers} style={{ flex: 1 }}>
          Refresh
        </button>
        <button className="btn btn-secondary" onClick={() => navigate('/')} style={{ flex: 1 }}>
          ← Home
        </button>
      </div>
    </div>
  );
}

export default MyNumbers;

