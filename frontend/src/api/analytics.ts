import { apiClient } from './client';

export interface DeptHeadAnalytics {
  department: string;
  totalComplaints: number;
  resolvedComplaints: number;
  resolutionRate: number;
}

export interface CommissionerAnalytics {
  cityWideTotal: number;
  cityWideResolved: number;
  cityHealthScore: number;
  totalComplaints?: number;
  resolvedComplaints?: number;
  resolutionRate?: number;
  avgAiConfidence?: number;
  departmentPerformance?: Record<string, number>;
}

export interface AdminAnalytics {
  totalUsers: number;
  totalComplaints: number;
  systemStatus: string;
}

export const fetchDeptHeadAnalytics = async (): Promise<DeptHeadAnalytics> => {
  const response = await apiClient.get('/analytics/depthead');
  return response.data;
};

export const fetchCommissionerAnalytics = async (): Promise<CommissionerAnalytics> => {
  const response = await apiClient.get('/analytics/commissioner');
  return response.data;
};

export const fetchAdminAnalytics = async (): Promise<AdminAnalytics> => {
  const response = await apiClient.get('/analytics/admin');
  return response.data;
};
