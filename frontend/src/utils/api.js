import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login/json', data),
  getMe: () => api.get('/auth/me'),
  changePassword: (data) => api.post('/auth/change-password', data),
};

// Portfolio API
export const portfolioAPI = {
  getAll: () => api.get('/portfolio'),
  create: (data) => api.post('/portfolio', data),
  getHoldings: (portfolioId) => api.get(`/portfolio/${portfolioId}/holdings`),
  addHolding: (portfolioId, data) => api.post(`/portfolio/${portfolioId}/holdings`, data),
  updateHolding: (portfolioId, holdingId, data) => 
    api.put(`/portfolio/${portfolioId}/holdings/${holdingId}`, data),
  deleteHolding: (portfolioId, holdingId) => 
    api.delete(`/portfolio/${portfolioId}/holdings/${holdingId}`),
  getPerformance: (portfolioId) => api.get(`/portfolio/${portfolioId}/performance`),
};

// Market API
export const marketAPI = {
  getOverview: () => api.get('/market/overview'),
  getStockQuote: (symbol) => api.get(`/market/stocks/quote/${symbol}`),
  getCryptoQuote: (symbol) => api.get(`/market/crypto/quote/${symbol}`),
  getStockGainers: (limit = 10) => api.get(`/market/stocks/gainers?limit=${limit}`),
  getCryptoGainers: (limit = 10) => api.get(`/market/crypto/gainers?limit=${limit}`),
  getStockHistory: (symbol, period = '1mo') => 
    api.get(`/market/stocks/history/${symbol}?period=${period}`),
  getCryptoHistory: (symbol, days = 30) => 
    api.get(`/market/crypto/history/${symbol}?days=${days}`),
  search: (query, assetType = null) => 
    api.get(`/market/search?query=${query}${assetType ? `&asset_type=${assetType}` : ''}`),
};

// Alerts API
export const alertsAPI = {
  getAll: (activeOnly = true) => api.get(`/alerts?active_only=${activeOnly}`),
  create: (data) => api.post('/alerts', data),
  delete: (alertId) => api.delete(`/alerts/${alertId}`),
  toggle: (alertId) => api.put(`/alerts/${alertId}/toggle`),
  check: () => api.post('/alerts/check'),
};

// WebSocket connection for real-time updates
export const createWebSocket = (onMessage) => {
  const wsUrl = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/api/market/ws`;
  const ws = new WebSocket(wsUrl);
  
  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    onMessage(data);
  };
  
  ws.onerror = (error) => {
    console.error('WebSocket error:', error);
  };
  
  return ws;
};

export default api;
