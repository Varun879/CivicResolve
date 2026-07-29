import axios from 'axios';

// Connect to real backend running in docker or locally
export const apiClient = axios.create({
  baseURL: 'http://localhost:8080/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('civic_token') || sessionStorage.getItem('civic_token') || localStorage.getItem('civic_jwt') || sessionStorage.getItem('civic_jwt');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
