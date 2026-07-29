import { apiClient } from './client';

export const login = async (email: string, password: string) => {
  const response = await apiClient.post('/auth/login', { email, password });
  return response.data;
};

export const register = async (data: any) => {
  const response = await apiClient.post('/auth/register', data);
  return response.data;
};

export const googleLogin = async (idToken: string, role?: string, location?: string, department?: string) => {
  const response = await apiClient.post('/auth/google', { idToken, role, location, department });
  // This might return 202 ACCEPTED with 'NEEDS_ROLE'
  if (response.status === 202 && response.data === 'NEEDS_ROLE') {
    return { needsRole: true };
  }
  return response.data;
};

export const requestSignupOtp = async (email: string) => {
  const response = await apiClient.post('/auth/request-otp', { email });
  return response.data;
};
