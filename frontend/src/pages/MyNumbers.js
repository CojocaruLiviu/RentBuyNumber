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
  const [myNumbers, setMyNumbers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandingId, setExpandingId] = useState(null);
  const [messages, setMessages] = useState({});
  const [statusInfo, setStatusInfo] = useState({});
  const [loadingMessages, setLoadingMessages] = useState({});
  const [loadingStatus, setLoadingStatus] = useState({});
  const [extendingId, setExtendingId] = useState(null);
  const [cancelling, setCancelling] = useState({});
  const [refreshingAll, setRefreshingAll] = useState(false);

  useEffect(() => {
    if (WebApp.BackButton) {
      WebApp.BackButton.show();
      WebApp.BackButton.onClick(() => navigate('/'));
    }
    
    loadNumbers();
    loadMyNumbers();

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
      // setError('Failed to load numbers');
    } finally {
      setLoading(false);
    }
  };

  const loadMyNumbers = async () => {
    const userId = WebApp.initDataUnsafe?.user?.id || WebApp.initDataUnsafe?.user_id;
    if (!userId) {
      setError('Telegram user ID not available.');
      return;
    }

    try {
      const response = await apiClient.get(`/my-numbers/${userId}`);
      if (response.data.error) {
        setError(response.data.error);
      } else {
        setMyNumbers(response.data.data || []);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load my numbers');
    }
  };

  const handleRefreshAllStatus = async () => {
    const userId = WebApp.initDataUnsafe?.user?.id || WebApp.initDataUnsafe?.user_id;
    if (!userId) {
      setError('Telegram user ID not available.');
      return;
    }

    setRefreshingAll(true);
    setError('');

    try {
      // Reload numbers first
      const response = await apiClient.get(`/my-numbers/${userId}`);
      const updatedNumbers = response.data.data || [];
      setMyNumbers(updatedNumbers);
      
      // Get all numbers with activationId
      const numbersWithActivation = updatedNumbers.filter(num => num.activationId && num.statusNum === 'bought');
      
      // Refresh status for each number
      const statusPromises = numbersWithActivation.map(async (num) => {
        try {
          const statusResponse = await apiClient.get(`/my-numbers/status/${num.activationId}`);
          if (statusResponse.data.success) {
            setStatusInfo(prev => ({ ...prev, [num.id]: statusResponse.data.data }));
          }
        } catch (err) {
          console.error(`Failed to get status for ${num.activationId}:`, err);
        }
      });

      await Promise.all(statusPromises);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to refresh status');
    } finally {
      setRefreshingAll(false);
    }
  };

  const handleRefreshStatus = async (numberId, activationId) => {
    if (!activationId) {
      setError('Activation ID not available for this number.');
      return;
    }

    setLoadingStatus(prev => ({ ...prev, [numberId]: true }));
    setError('');

    try {
      const response = await apiClient.get(`/my-numbers/status/${activationId}`);
      if (response.data.error) {
        setError(response.data.error);
      } else {
        setStatusInfo(prev => ({ ...prev, [numberId]: response.data.data }));
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to get status');
    } finally {
      setLoadingStatus(prev => ({ ...prev, [numberId]: false }));
    }
  };

  const handleCancelNumber = async (numberId, activationId, cost) => {
    const userId = WebApp.initDataUnsafe?.user?.id || WebApp.initDataUnsafe?.user_id;
    if (!userId) {
      setError('Telegram user ID not available.');
      return;
    }

    if (!activationId) {
      setError('Activation ID not available for this number.');
      return;
    }

    if (!cost) {
      setError('Cost information not available for refund.');
      return;
    }

    if (!window.confirm(`Are you sure you want to cancel this number? You will receive a refund of $${cost.toFixed(4)} USD.`)) {
      return;
    }

    setCancelling(prev => ({ ...prev, [numberId]: true }));
    setError('');

    try {
      const response = await apiClient.post(`/cancel/${activationId}`, {
        userId: userId,
        cost: cost
      });

      if (response.data.error) {
        setError(response.data.error);
      } else if (response.data.success) {
        const message = response.data.message || 'Number cancelled successfully';
        if (response.data.refundAmount) {
          alert(`${message}\nRefund: $${response.data.refundAmount.toFixed(4)} USD\nNew Balance: $${response.data.newBalance.toFixed(4)} USD`);
        } else {
          alert(message);
        }
        
        // Reload numbers
        await loadMyNumbers();
      } else {
        setError(response.data.message || 'Failed to cancel number');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to cancel number');
    } finally {
      setCancelling(prev => ({ ...prev, [numberId]: false }));
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

      {/* My Numbers from NumbersList */}
      {myNumbers.length === 0 && rented.length === 0 ? (
        <div className="info">
          No active numbers. Use "Rent Number" or "Activate" to get started.
        </div>
      ) : (
        <>
          {/* My Numbers from Database */}
          {myNumbers.length > 0 && (
            <>
              {myNumbers
                .filter(num => num.statusNum === 'bought')
                .map((num, idx) => {
                  const isExpanded = expandingId === num.id;
                  const numStatus = statusInfo[num.id];
                  const isLoadingStatus = loadingStatus[num.id];
                  const isCancelling = cancelling[num.id];
                  
                  return (
                    <div key={num.id || idx} className="card" style={{ marginBottom: '16px' }}>
                      <p><strong>Number:</strong> +{num.number}</p>
                      <p><strong>Status:</strong> {num.statusNum}</p>
                      {num.activationId && <p><strong>Activation ID:</strong> {num.activationId}</p>}
                      {num.cost && <p><strong>Cost:</strong> ${num.cost.toFixed(4)} USD</p>}
                      {num.dateTime && <p><strong>Date:</strong> {new Date(num.dateTime).toLocaleString()}</p>}
                      
                      {/* Status Information */}
                      {numStatus && (
                        <div style={{ marginTop: '12px', padding: '12px', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
                          <h4 style={{ marginBottom: '8px' }}>📊 Status Information</h4>
                          {numStatus.code ? (
                            <div className="success">
                              <p style={{ fontSize: '20px', fontWeight: 'bold', textAlign: 'center', margin: '8px 0' }}>
                                Code: {numStatus.code}
                              </p>
                            </div>
                          ) : (
                            <pre style={{ 
                              whiteSpace: 'pre-wrap', 
                              wordBreak: 'break-word',
                              fontSize: '12px',
                              backgroundColor: '#fff',
                              padding: '8px',
                              borderRadius: '4px',
                              marginTop: '8px'
                            }}>
                              {JSON.stringify(numStatus, null, 2)}
                            </pre>
                          )}
                        </div>
                      )}
                      
                      <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
                        {num.activationId && (
                          <>
                            <button 
                              className="btn btn-secondary" 
                              onClick={() => handleRefreshStatus(num.id, num.activationId)}
                              disabled={isLoadingStatus}
                              style={{ flex: 1, minWidth: '120px' }}
                            >
                              {isLoadingStatus ? 'Loading...' : '🔄 Refresh Status'}
                            </button>
                            {num.cost && (
                              <button 
                                className="btn" 
                                onClick={() => handleCancelNumber(num.id, num.activationId, num.cost)}
                                disabled={isCancelling}
                                style={{ flex: 1, minWidth: '120px' }}
                              >
                                {isCancelling ? 'Cancelling...' : '❌ Cancel & Refund'}
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
            </>
          )}

          {/* Rented Numbers */}
          {rented.length > 0 && (
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
        </>
      )}

      <div style={{ display: 'flex', gap: '12px', marginTop: '16px', flexWrap: 'wrap' }}>
        <button 
          className="btn" 
          onClick={handleRefreshAllStatus} 
          disabled={refreshingAll}
          style={{ flex: 1, minWidth: '120px' }}
        >
          {refreshingAll ? 'Refreshing...' : '🔄 Refresh All Status'}
        </button>
        <button className="btn btn-secondary" onClick={() => { loadNumbers(); loadMyNumbers(); }} style={{ flex: 1, minWidth: '120px' }}>
          Refresh
        </button>
        <button className="btn btn-secondary" onClick={() => navigate('/')} style={{ flex: 1, minWidth: '120px' }}>
          ← Home
        </button>
      </div>
    </div>
  );
}

export default MyNumbers;

