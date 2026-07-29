import { apiClient } from './client';

export const fetchProfile = async (): Promise<any> => {
  const response = await apiClient.get('/users/me');
  return response.data;
};

export const updateProfile = async (data: { name?: string; phone?: string }): Promise<any> => {
  const response = await apiClient.put('/users/me', data);
  return response.data;
};

export const requestEmailOtp = async (newEmail: string): Promise<any> => {
  const response = await apiClient.post('/users/me/email/request-otp', { newEmail });
  return response.data;
};

export const verifyEmailOtp = async (newEmail: string, otp: string): Promise<any> => {
  const response = await apiClient.post('/users/me/email/verify-otp', { newEmail, otp });
  return response.data; // returns new AuthResponse
};

export const verifyFirebasePhoneToken = async (firebaseToken: string): Promise<any> => {
  const response = await apiClient.post('/users/me/phone/verify-firebase', { firebaseToken });
  return response.data; // returns success message and updated phone
};
