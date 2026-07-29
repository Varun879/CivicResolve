import { apiClient } from '../api/client';

export interface AuthResponse {
  token: string;
  email: string;
  role: string;
}

export interface ComplaintResponse {
  id: string;
  category: string;
  description: string;
  status: string;
  severity: string;
  priorityBand: string;
  latitude: number;
  longitude: number;
  supportCount: number;
  createdAt: string;
}

export const CivicApiService = {
  // --- AUTH ---
  login: async (email: string, password: string): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>('/auth/login', { email, password });
    if (response.data.token) {
      localStorage.setItem('civic_jwt', response.data.token);
    }
    return response.data;
  },

  logout: () => {
    localStorage.removeItem('civic_jwt');
  },

  // --- COMPLAINTS (CITIZEN) ---
  createComplaint: async (data: any): Promise<ComplaintResponse> => {
    const response = await apiClient.post<ComplaintResponse>('/complaints', data);
    return response.data;
  },

  getMyComplaints: async (): Promise<ComplaintResponse[]> => {
    const response = await apiClient.get<ComplaintResponse[]>('/complaints');
    return response.data;
  },

  // --- OFFICER ---
  getAssignments: async (): Promise<ComplaintResponse[]> => {
    const response = await apiClient.get<ComplaintResponse[]>('/officer/assignments');
    return response.data;
  },

  updateStatus: async (id: string, status: string): Promise<ComplaintResponse> => {
    const response = await apiClient.patch<ComplaintResponse>(`/officer/complaints/${id}/status?status=${status}`);
    return response.data;
  }
};
