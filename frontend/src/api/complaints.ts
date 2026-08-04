import { apiClient } from './client';

export interface Complaint {
  id: string;
  title: string;
  description: string;
  category: string;
  severity: string;
  priorityBand: string;
  status: string;
  latitude: number;
  longitude: number;
  imageUrl?: string;
  imageBase64?: string;
  aiConfidenceScore?: number;
  createdAt: string;
  publicId?: string;
  slaDeadline?: string;
  reopenCount?: number;
  supportCount?: number;
  priority?: string;
  department?: string;
  assignedOfficerId?: string;
  assignedOfficerName?: string;
  assignedOfficerPhone?: string;
  assignedOfficerDepartment?: string;
  distanceToOfficerKm?: number;
  resolutionImageUrl?: string;
  resolutionImageBase64?: string;
  resolutionLatitude?: number;
  resolutionLongitude?: number;
  isEscalated?: boolean;
  superiorOfficerName?: string;
  superiorOfficerRole?: string;
  escalatedAt?: string;
}

export interface AiAnalysisResult {
  category: string;
  priority: string;
  severity: string;
  justification: string;
  notes: string;
  confidence: number;
}

export const fetchComplaints = async (): Promise<Complaint[]> => {
  const response = await apiClient.get('/complaints');
  return response.data;
};

export const fetchNearbyComplaints = async (lat: number, lng: number, radiusKm = 5.0): Promise<Complaint[]> => {
  const response = await apiClient.get(`/complaints/nearby?lat=${lat}&lng=${lng}&radiusKm=${radiusKm}`);
  return response.data;
};

export const fetchComplaintById = async (id: string): Promise<Complaint> => {
  const response = await apiClient.get(`/complaints/${id}?t=${new Date().getTime()}`);
  return response.data;
};

export const createComplaint = async (data: Partial<Complaint>) => {
  const response = await apiClient.post('/complaints', data);
  return response.data;
};

export const analyzeImage = async (data: Partial<Complaint>): Promise<AiAnalysisResult> => {
  const response = await apiClient.post('/ai/analyze', data);
  return response.data;
};

export const officerUpdateComplaintStatus = async (id: string, status: string, resolutionData?: { resolutionImageBase64?: string; resolutionLatitude?: number; resolutionLongitude?: number }) => {
  const response = await apiClient.patch(`/officer/complaints/${id}/status`, { status, ...resolutionData });
  return response.data;
};

export const citizenVerifyComplaintStatus = async (id: string, data: { status: string; rating?: number; reason?: string }) => {
  const response = await apiClient.patch(`/complaints/${id}/status`, data);
  return response.data;
};

export const fetchOfficerAssignments = async (): Promise<Complaint[]> => {
  const response = await apiClient.get('/officer/assignments');
  return response.data;
};

export const fetchDeptHeadComplaints = async (): Promise<Complaint[]> => {
  const response = await apiClient.get('/complaints/depthead');
  return response.data;
};

export const fetchCommissionerComplaints = async (): Promise<Complaint[]> => {
  const response = await apiClient.get('/complaints/commissioner');
  return response.data;
};

export const upvoteComplaint = async (id: string): Promise<Complaint> => {
  const response = await apiClient.post(`/complaints/${id}/upvote`);
  return response.data;
};

export const addComment = async (id: string, content: string): Promise<any> => {
  const response = await apiClient.post(`/complaints/${id}/comments`, { content });
  return response.data;
};

export const fetchComments = async (id: string): Promise<any[]> => {
  const response = await apiClient.get(`/complaints/${id}/comments`);
  return response.data;
};

export const manualEscalateComplaint = async (id: string): Promise<Complaint> => {
  const response = await apiClient.post(`/complaints/${id}/escalate`);
  return response.data;
};
