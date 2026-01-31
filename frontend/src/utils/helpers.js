/**
 * Format number as currency
 */
export const formatCurrency = (value, decimals = 2) => {
  if (value === null || value === undefined) return '-';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
};

/**
 * Format number with commas
 */
export const formatNumber = (value, decimals = 0) => {
  if (value === null || value === undefined) return '-';
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
};

/**
 * Format percentage
 */
export const formatPercent = (value, decimals = 2) => {
  if (value === null || value === undefined) return '-';
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(decimals)}%`;
};

/**
 * Format large numbers (K, M, B, T)
 */
export const formatCompact = (value) => {
  if (value === null || value === undefined) return '-';
  
  const absValue = Math.abs(value);
  if (absValue >= 1e12) return (value / 1e12).toFixed(2) + 'T';
  if (absValue >= 1e9) return (value / 1e9).toFixed(2) + 'B';
  if (absValue >= 1e6) return (value / 1e6).toFixed(2) + 'M';
  if (absValue >= 1e3) return (value / 1e3).toFixed(2) + 'K';
  return value.toFixed(2);
};

/**
 * Get color class based on value
 */
export const getChangeColor = (value) => {
  if (value > 0) return 'text-success-400';
  if (value < 0) return 'text-danger-400';
  return 'text-gray-400';
};

/**
 * Get background color class based on value
 */
export const getChangeBgColor = (value) => {
  if (value > 0) return 'bg-success-500/20';
  if (value < 0) return 'bg-danger-500/20';
  return 'bg-gray-500/20';
};

/**
 * Format date
 */
export const formatDate = (dateString) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

/**
 * Format date and time
 */
export const formatDateTime = (dateString) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

/**
 * Calculate time ago
 */
export const timeAgo = (dateString) => {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);
  
  const intervals = {
    year: 31536000,
    month: 2592000,
    week: 604800,
    day: 86400,
    hour: 3600,
    minute: 60
  };
  
  for (const [unit, secondsInUnit] of Object.entries(intervals)) {
    const interval = Math.floor(seconds / secondsInUnit);
    if (interval >= 1) {
      return `${interval} ${unit}${interval > 1 ? 's' : ''} ago`;
    }
  }
  
  return 'Just now';
};

/**
 * Debounce function
 */
export const debounce = (func, wait) => {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
};

/**
 * Get crypto icon URL
 */
export const getCryptoIcon = (symbol) => {
  return `https://cryptoicons.org/api/icon/${symbol.toLowerCase()}/50`;
};

/**
 * Validate email
 */
export const isValidEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};
