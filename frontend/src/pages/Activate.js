import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/config';
import ThemeToggle from '../components/ThemeToggle';
import '../App.css';

// Telegram Web App SDK (available globally)
const WebApp = window.Telegram?.WebApp || {};

function Activate() {
  const navigate = useNavigate();
  const [countries, setCountries] = useState([]);
  const [services, setServices] = useState([]);
  const [selectedCountry, setSelectedCountry] = useState('');
  const [selectedService, setSelectedService] = useState('');
  const [priceInfo, setPriceInfo] = useState(null);
  const [loadingPrice, setLoadingPrice] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingCountries, setLoadingCountries] = useState(true);
  const [loadingServices, setLoadingServices] = useState(false);
  const [error, setError] = useState('');
  const [activation, setActivation] = useState(null);
  const [smsCode, setSmsCode] = useState('');
  
  // Search states
  const [serviceSearch, setServiceSearch] = useState('');
  const [countrySearch, setCountrySearch] = useState('');
  const [showServiceDropdown, setShowServiceDropdown] = useState(false);
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);

  useEffect(() => {
    if (WebApp.BackButton) {
      WebApp.BackButton.show();
      WebApp.BackButton.onClick(() => navigate('/'));
    }
    
    loadAllServices();

    return () => {
      if (WebApp.BackButton) {
        WebApp.BackButton.hide();
      }
    };
  }, [navigate]);

  useEffect(() => {
    if (selectedService) {
      loadCountriesForService(selectedService);
      setSelectedCountry('');
      setCountrySearch('');
      setPriceInfo(null);
    } else {
      setCountries([]);
      setCountrySearch('');
    }
  }, [selectedService]);

  useEffect(() => {
    if (selectedCountry && selectedService) {
      loadPrice(selectedCountry, selectedService);
    } else {
      setPriceInfo(null);
    }
  }, [selectedCountry, selectedService]);

  useEffect(() => {
    if (activation?.id) {
      checkSmsCode(activation.id);
    }
  }, [activation]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('[data-dropdown-container]')) {
        setShowServiceDropdown(false);
        setShowCountryDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const loadAllServices = async () => {
    setLoadingServices(true);
    try {
      // Load all services (without country filter)
      const response = await apiClient.get('/services');
      if (response.data.error) {
        setError(response.data.error);
        setServices([]);
      } else {
        const servicesData = response.data.data || response.data || [];
        // Remove duplicates based on service id
        const uniqueServices = servicesData.filter((service, index, self) =>
          index === self.findIndex(s => (s.id || s.name) === (service.id || service.name))
        );
        setServices(uniqueServices);
        if (uniqueServices.length === 0) {
          setError('No services available');
        }
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load services');
      setServices([]);
    } finally {
      setLoadingServices(false);
    }
  };

  const loadCountriesForService = async (service) => {
    if (!service) return;
    
    setLoadingCountries(true);
    setError('');
    
    try {
      // Load countries available for this service using top-countries endpoint
      const response = await apiClient.get(`/top-countries/${service}?freePrice=true`);
      if (response.data.error) {
        setError(response.data.error);
        setCountries([]);
      } else if (response.data.data) {
        // Parse JSON response - format: {countryId: {country: 2, price: 5.0, count: 100, ...}, ...}
        const topCountriesData = response.data.data;
        const countriesList = [];
        
        // Get all countries first to have names
        const allCountriesResponse = await apiClient.get('/countries');
        const allCountries = allCountriesResponse.data.data || allCountriesResponse.data || [];
        
        // Map top countries with country details
        Object.values(topCountriesData).forEach(topCountry => {
          const countryId = topCountry.country?.toString() || Object.keys(topCountriesData).find(
            key => topCountriesData[key] === topCountry
          );
          
          if (countryId) {
            const countryInfo = allCountries.find(c => c.id?.toString() === countryId.toString());
            if (countryInfo) {
              countriesList.push({
                id: countryId,
                name: countryInfo.name || countryInfo.eng || `Country ${countryId}`,
                code: countryInfo.code || countryId,
                price: topCountry.price || topCountry.retail_price || 0,
                count: topCountry.count || 0,
                retailPrice: topCountry.retail_price || 0
              });
            } else {
              // If country not found in all countries, still add it with basic info
              countriesList.push({
                id: countryId,
                name: `Country ${countryId}`,
                code: countryId,
                price: topCountry.price || topCountry.retail_price || 0,
                count: topCountry.count || 0,
                retailPrice: topCountry.retail_price || 0
              });
            }
          }
        });
        
        // Sort by price (ascending)
        countriesList.sort((a, b) => (a.price || 0) - (b.price || 0));
        
        setCountries(countriesList);
        if (countriesList.length === 0) {
          setError('No countries available for this service');
        }
      } else {
        setCountries([]);
        setError('No countries available for this service');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load countries for service');
      setCountries([]);
    } finally {
      setLoadingCountries(false);
    }
  };

  const loadPrice = async (countryId, service) => {
    setLoadingPrice(true);
    setError('');
    try {
      const response = await apiClient.get('/price', {
        params: {
          countryId: countryId,
          service: service
        }
      });

      if (response.data.error) {
        setError(response.data.error);
        setPriceInfo(null);
      } else if (response.data.success) {
        setPriceInfo({
          cost: response.data.cost,
          count: response.data.count,
          physicalCount: response.data.physicalCount
        });
      } else {
        setError('Failed to load price information');
        setPriceInfo(null);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load price');
      setPriceInfo(null);
    } finally {
      setLoadingPrice(false);
    }
  };

  const handleActivate = async () => {
    if (!selectedCountry || !selectedService) {
      setError('Please select country and service');
      return;
    }

    if (!priceInfo) {
      setError('Please wait for price information');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await apiClient.post('/activate', {
        countryId: selectedCountry,
        service: selectedService,
        maxPrice: priceInfo.cost
      });

      if (response.data.error) {
        setError(response.data.error);
      } else if (response.data.success) {
        setActivation({
          id: response.data.id,
          number: response.data.number,
          country: response.data.country,
          service: response.data.service
        });
      } else {
        setError('Unexpected response format');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to activate number');
    } finally {
      setLoading(false);
    }
  };

  const checkSmsCode = async (activationId) => {
    const interval = setInterval(async () => {
      try {
        const response = await apiClient.get(`/sms/${activationId}`);
        if (response.data && response.data.code) {
          setSmsCode(response.data.code);
          clearInterval(interval);
        }
      } catch (err) {
        // Continue checking
      }
    }, 3000);

    // Stop after 5 minutes
    setTimeout(() => clearInterval(interval), 300000);
  };

  return (
    <div className="App">
      <ThemeToggle />
      <h2>🔢 Activate Number</h2>
      <div className="info">
        Get a number for one-time SMS activation. The code will appear automatically when received.
      </div>

      {error && <div className="error">{error}</div>}

      {!activation ? (
        <>
          <label className="label">Select Service</label>
          {loadingServices ? (
            <div className="info">Loading services...</div>
          ) : (
            <div style={{ position: 'relative' }} data-dropdown-container>
              <input
                type="text"
                className="input"
                placeholder="Search service..."
                value={serviceSearch !== null && serviceSearch !== undefined ? serviceSearch : (selectedService ? services.find(s => (s.id || s.name) === selectedService)?.name || selectedService : '')}
                onChange={(e) => {
                  setServiceSearch(e.target.value);
                  setShowServiceDropdown(true);
                  if (!e.target.value) {
                    setSelectedService('');
                    setSelectedCountry('');
                    setCountrySearch('');
                  }
                }}
                onFocus={() => {
                  setShowServiceDropdown(true);
                  if (selectedService) {
                    setServiceSearch('');
                  }
                }}
                disabled={loading || loadingServices}
                style={{ width: '100%' }}
              />
              {showServiceDropdown && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  maxHeight: '200px',
                  overflowY: 'auto',
                  backgroundColor: '#fff',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  zIndex: 1000,
                  marginTop: '4px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                }}>
                  {services
                    .filter(service => {
                      const searchTerm = serviceSearch.toLowerCase();
                      const name = (service.name || service.id || '').toLowerCase();
                      return !searchTerm || name.includes(searchTerm);
                    })
                    .map((service) => (
                      <div
                        key={service.id || service.name}
                        onClick={() => {
                          setSelectedService(service.id || service.name);
                          setServiceSearch('');
                          setShowServiceDropdown(false);
                          setSelectedCountry('');
                          setCountrySearch('');
                        }}
                        style={{
                          padding: '10px',
                          cursor: 'pointer',
                          borderBottom: '1px solid #eee',
                          backgroundColor: selectedService === (service.id || service.name) ? '#f0f0f0' : '#fff'
                        }}
                        onMouseEnter={(e) => e.target.style.backgroundColor = '#f5f5f5'}
                        onMouseLeave={(e) => e.target.style.backgroundColor = selectedService === (service.id || service.name) ? '#f0f0f0' : '#fff'}
                      >
                        {service.name || service.id}
                      </div>
                    ))}
                  {services.filter(service => {
                    const searchTerm = serviceSearch.toLowerCase();
                    const name = (service.name || service.id || '').toLowerCase();
                    return !searchTerm || name.includes(searchTerm);
                  }).length === 0 && (
                    <div style={{ padding: '10px', color: '#666' }}>No services found</div>
                  )}
                </div>
              )}
            </div>
          )}

          {selectedService && (
            <>
              <label className="label">Select Country</label>
              {loadingCountries ? (
                <div className="info">Loading countries...</div>
              ) : (
                <div style={{ position: 'relative' }} data-dropdown-container>
                  <input
                    type="text"
                    className="input"
                    placeholder="Search country..."
                    value={countrySearch !== null && countrySearch !== undefined ? countrySearch : (selectedCountry ? countries.find(c => (c.id || c.code) === selectedCountry)?.name || selectedCountry : '')}
                    onChange={(e) => {
                      setCountrySearch(e.target.value);
                      setShowCountryDropdown(true);
                      if (!e.target.value) {
                        setSelectedCountry('');
                      }
                    }}
                    onFocus={() => {
                      setShowCountryDropdown(true);
                      if (selectedCountry) {
                        setCountrySearch('');
                      }
                    }}
                    disabled={loading || loadingCountries}
                    style={{ width: '100%' }}
                  />
                  {showCountryDropdown && (
                    <div style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      maxHeight: '200px',
                      overflowY: 'auto',
                      backgroundColor: '#fff',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      zIndex: 1000,
                      marginTop: '4px',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                    }}>
                      {countries
                        .filter(country => {
                          const searchTerm = countrySearch.toLowerCase();
                          const name = (country.name || '').toLowerCase();
                          const code = (country.code || '').toLowerCase();
                          return !searchTerm || name.includes(searchTerm) || code.includes(searchTerm);
                        })
                        .map((country) => (
                          <div
                            key={country.id || country.code}
                            onClick={() => {
                              setSelectedCountry(country.id || country.code);
                              setCountrySearch('');
                              setShowCountryDropdown(false);
                            }}
                            style={{
                              padding: '10px',
                              cursor: 'pointer',
                              borderBottom: '1px solid #eee',
                              backgroundColor: selectedCountry === (country.id || country.code) ? '#f0f0f0' : '#fff'
                            }}
                            onMouseEnter={(e) => e.target.style.backgroundColor = '#f5f5f5'}
                            onMouseLeave={(e) => e.target.style.backgroundColor = selectedCountry === (country.id || country.code) ? '#f0f0f0' : '#fff'}
                          >
                            <div style={{ fontWeight: 'bold' }}>
                              {country.name} ({country.code})
                            </div>
                            <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                              {country.price && `${country.price.toFixed(4)} USD`}
                              {country.count !== undefined && ` • ${country.count} available`}
                            </div>
                          </div>
                        ))}
                      {countries.filter(country => {
                        const searchTerm = countrySearch.toLowerCase();
                        const name = (country.name || '').toLowerCase();
                        const code = (country.code || '').toLowerCase();
                        return !searchTerm || name.includes(searchTerm) || code.includes(searchTerm);
                      }).length === 0 && (
                        <div style={{ padding: '10px', color: '#666' }}>No countries found</div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {selectedCountry && selectedService && (
            <>
              {loadingPrice ? (
                <div className="info">Loading price information...</div>
              ) : priceInfo ? (
                <div className="card" style={{ marginTop: '16px', padding: '16px' }}>
                  <h3>💰 Price Information</h3>
                  <p><strong>Cost:</strong> {priceInfo.cost.toFixed(4)} USD</p>
                  <p><strong>Available:</strong> {priceInfo.count} numbers</p>
                  {priceInfo.physicalCount !== undefined && (
                    <p><strong>Physical Count:</strong> {priceInfo.physicalCount}</p>
                  )}
                </div>
              ) : (
                <div className="error" style={{ marginTop: '16px' }}>
                  Failed to load price information
                </div>
              )}
            </>
          )}

          <button 
            className="btn" 
            onClick={handleActivate} 
            disabled={loading || !selectedCountry || !selectedService || !priceInfo || loadingPrice}
          >
            {loading ? 'Activating...' : 'Get Number'}
          </button>

          <button 
            className="btn btn-secondary" 
            onClick={() => navigate('/')}
            style={{ marginTop: '12px' }}
          >
            ← Back to Home
          </button>
        </>
      ) : (
        <div className="card">
          <h3>✅ Number Activated</h3>
          <p><strong>Number:</strong> +{activation.number}</p>
          <p><strong>Service:</strong> {selectedService}</p>
          <p><strong>Activation ID:</strong> {activation.id}</p>
          
          {smsCode ? (
            <div className="success">
              <h3>📨 SMS Code Received!</h3>
              <p style={{ fontSize: '24px', fontWeight: 'bold', textAlign: 'center', marginTop: '12px' }}>
                {smsCode}
              </p>
            </div>
          ) : (
            <div className="info">
              ⏳ Waiting for SMS code... This may take a few minutes.
            </div>
          )}

          <button 
            className="btn btn-secondary" 
            onClick={() => {
              setActivation(null);
              setSmsCode('');
              setSelectedService('');
            }}
            style={{ marginBottom: '12px' }}
          >
            Get Another Number
          </button>

          <button 
            className="btn btn-secondary" 
            onClick={() => navigate('/')}
          >
            ← Back to Home
          </button>
        </div>
      )}
    </div>
  );
}

export default Activate;

