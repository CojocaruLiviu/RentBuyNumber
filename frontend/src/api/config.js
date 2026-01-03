import axios from 'axios';

// Determine API URL based on environment
const getApiUrl = () => {
  // In production, use relative URL
  if (process.env.NODE_ENV === 'production') {
    return '/api';
  }
  
  // In development, use full URL to avoid proxy issues
  // Or use environment variable if set
  return process.env.REACT_APP_API_URL || 'http://localhost:3000/api';
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

