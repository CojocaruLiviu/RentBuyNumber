import axios from 'axios';

// Determine API URL based on environment
const getApiUrl = () => {
  // Always use REACT_APP_API_URL environment variable
  const apiUrl = process.env.REACT_APP_API_URL;
  
  if (!apiUrl) {
    console.warn('REACT_APP_API_URL is not set. API requests may fail.');
    return '/api'; // Fallback to relative URL
  }
  
  // Ensure the URL ends with /api if it doesn't already
  if (apiUrl.endsWith('/api')) {
    return apiUrl;
  } else if (apiUrl.endsWith('/')) {
    return `${apiUrl}api`;
  } else {
    return `${apiUrl}/api`;
  }
};

// Create axios instance with minimal headers
const apiClient = axios.create({
  baseURL: getApiUrl(),
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
  // Don't send unnecessary headers
  withCredentials: false,
});

// Request interceptor to log requests (optional)
apiClient.interceptors.request.use(
  (config) => {
    // Remove any large headers that might cause 431 error
    delete config.headers['X-Requested-With'];
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 431) {
      console.error('Request Header Fields Too Large. Try clearing cookies or using a different browser.');
    }
    return Promise.reject(error);
  }
);

export default apiClient;

