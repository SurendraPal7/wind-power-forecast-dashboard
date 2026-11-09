import axios from 'axios';

/**
 * Centralized Axios API Client
 * Configures base URL from environment variable VITE_API_BASE_URL.
 * In production, if not explicitly provided, falls back cleanly to '/api/v1' (same-origin reverse proxy)
 * instead of breaking with hardcoded localhost URLs.
 */
const envBaseUrl = import.meta.env.VITE_API_BASE_URL;
let apiBaseUrl = '/api/v1';

if (envBaseUrl && !(import.meta.env.PROD && (envBaseUrl.includes('localhost') || envBaseUrl.includes('127.0.0.1')))) {
  apiBaseUrl = envBaseUrl.endsWith('/api/v1')
    ? envBaseUrl
    : `${envBaseUrl.replace(/\/+$/, '')}/api/v1`;
} else if (import.meta.env.PROD) {
  apiBaseUrl = '/api/v1';
} else {
  apiBaseUrl = '/api/v1';
}

const api = axios.create({
  baseURL: apiBaseUrl,
  timeout: 45000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Request interceptor for logging & instrumentation
api.interceptors.request.use(
  (config) => {
    config.metadata = { startTime: new Date() };
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor with error normalization & friendly messaging
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Extract friendly error message from FastAPI detail or network error
    let message = 'An unexpected error occurred while communicating with the analytics backend.';
    
    if (error.response) {
      const data = error.response.data;
      if (typeof data?.detail === 'string') {
        message = data.detail;
      } else if (Array.isArray(data?.detail)) {
        message = data.detail.map(d => `${d.loc?.join('.') || 'param'}: ${d.msg}`).join(', ');
      } else if (data?.message) {
        message = data.message;
      } else {
        message = `Server returned error HTTP ${error.response.status}: ${error.response.statusText}`;
      }
    } else if (error.request) {
      message = 'Unable to connect to the backend server. Please verify network connectivity or check if the backend service is reachable.';
    } else {
      message = error.message || message;
    }

    // Attach normalized message to error
    error.normalizedMessage = message;
    return Promise.reject(error);
  }
);

/**
 * Helper to execute an async request with automatic retry on transient failure.
 *
 * @param {Function} requestFn - Function returning a promise
 * @param {number} maxRetries - Maximum number of retry attempts (default 2)
 * @param {number} delayMs - Delay in ms between retries (default 1000)
 */
export async function withRetry(requestFn, maxRetries = 2, delayMs = 1000) {
  let lastError;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await requestFn();
    } catch (err) {
      lastError = err;
      // Do not retry on client 4xx validation errors
      if (err.response && err.response.status >= 400 && err.response.status < 500) {
        throw err;
      }
      if (attempt < maxRetries) {
        await new Promise((res) => setTimeout(res, delayMs * Math.pow(1.5, attempt)));
      }
    }
  }
  throw lastError;
}

/**
 * Health check endpoint
 * GET /api/v1/health
 */
export const getHealth = async () => {
  const response = await api.get('/health');
  return response.data;
};

export default api;
