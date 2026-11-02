import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ? `${import.meta.env.VITE_API_BASE_URL}/api/v1` : '/api/v1',
  timeout: 45000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const getHealth = async () => {
  const response = await api.get('/health');
  return response.data;
};

export const getFilters = async () => {
  const response = await api.get('/filters');
  return response.data;
};

export const getDashboardSummary = async (params = {}) => {
  const response = await api.get('/dashboard/summary', { params });
  return response.data;
};

export const getDashboardComparison = async (params = {}) => {
  const response = await api.get('/dashboard/comparison', { params });
  return response.data;
};

export const getDashboardAccuracy = async (params = {}) => {
  const response = await api.get('/dashboard/accuracy', { params });
  return response.data;
};

export const getDashboardDaily = async (params = {}) => {
  const response = await api.get('/dashboard/daily', { params });
  return response.data;
};

export const getActualGeneration = async (params = {}) => {
  const response = await api.get('/actual-generation', { params });
  return response.data;
};

export const getForecastGeneration = async (params = {}) => {
  const response = await api.get('/forecast-generation', { params });
  return response.data;
};

export const getForecastHistory = async (params = {}) => {
  const response = await api.get('/forecast-history', { params });
  return response.data;
};

export default api;
