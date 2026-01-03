import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/config';
import ThemeToggle from '../components/ThemeToggle';
import '../App.css';

// Telegram Web App SDK (available globally)
const WebApp = window.Telegram?.WebApp || {};

function Rent() {
  const navigate = useNavigate();
  const [countries, setCountries] = useState([]);
  const [selectedCountry, setSelectedCountry] = useState('');
  const [hours, setHours] = useState('24');
  const [loading, setLoading] = useState(false);
  const [loadingCountries, setLoadingCountries] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (WebApp.BackButton) {
      WebApp.BackButton.show();
      WebApp.BackButton.onClick(() => navigate('/'));
    }
    
    loadCountries();

    return () => {
      if (WebApp.BackButton) {
        WebApp.BackButton.hide();
      }
    };
  }, [navigate]);

  const loadCountries = async () => {
    setLoadingCountries(true);
    try {
      const response = await apiClient.get('/countries');
      if (response.data.error) {
        setError(response.data.error);
      } else {
        const countriesData = response.data.data || response.data || [];
        setCountries(countriesData);
        if (countriesData.length === 0) {
          setError('No countries available');
        }
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load countries');
    } finally {
      setLoadingCountries(false);
    }
  };

  const handleRent = async () => {
    if (!selectedCountry) {
      setError('Please select a country');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await apiClient.post('/rent', {
        countryId: selectedCountry,
        hours: parseInt(hours) || 24
      });

      if (response.data.error) {
        setError(response.data.error);
      } else if (response.data.success) {
        setSuccess(`Number rented successfully! Number: +${response.data.number}`);
        setTimeout(() => navigate('/numbers'), 2000);
      } else {
        setError('Unexpected response format');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to rent number');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="App">
      <ThemeToggle />
      <h2>🏠 Rent Number</h2>
      <div className="info">
        Rent a number for unlimited SMS reception for a specified period (2-1344 hours).
      </div>

      {error && <div className="error">{error}</div>}
      {success && <div className="success">{success}</div>}

      <label className="label">Select Country</label>
      {loadingCountries ? (
        <div className="info">Loading countries...</div>
      ) : (
        <select 
          className="select" 
          value={selectedCountry} 
          onChange={(e) => setSelectedCountry(e.target.value)}
          disabled={loading || loadingCountries}
        >
        <option value="">Choose a country...</option>
        {countries.map((country) => (
          <option key={country.id || country.code} value={country.id || country.code}>
            {country.name} ({country.code})
            {country.price && ` - ${country.price.toFixed(4)} USD`}
            {country.count !== undefined && ` (${country.count} available)`}
          </option>
        ))}
        </select>
      )}

      <label className="label">Rental Period (hours)</label>
      <input
        type="number"
        className="input"
        value={hours}
        onChange={(e) => setHours(e.target.value)}
        min="2"
        max="1344"
        disabled={loading}
      />

      <button 
        className="btn" 
        onClick={handleRent} 
        disabled={loading || !selectedCountry}
      >
        {loading ? 'Renting...' : 'Rent Number'}
      </button>

      <button 
        className="btn btn-secondary" 
        onClick={() => navigate('/')}
        style={{ marginTop: '12px' }}
      >
        ← Back to Home
      </button>
    </div>
  );
}

export default Rent;

