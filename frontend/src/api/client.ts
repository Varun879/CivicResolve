import axios from 'axios';

export const API_BASE_URL = `${import.meta.env.VITE_API_URL || 'http://localhost:8080'}/api/v1`;

// Connect to real backend running in docker or locally
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use(
  (config) => {
    const savedUser = sessionStorage.getItem('civic_user');
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        if (parsed.token) {
          config.headers.Authorization = `Bearer ${parsed.token}`;
        }
      } catch (e) {
        // ignore
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      sessionStorage.removeItem('civic_user');
      localStorage.removeItem('civic_user');
      if (window.location.pathname !== '/login' && window.location.pathname !== '/') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);
