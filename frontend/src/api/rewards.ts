import { apiClient } from './client';

export interface RewardData {
  points: number;
  tier: string; 
  pointsToNextTier: number;
  nextTier: string;
  isTopContributor: boolean;
  rank: number;
}

export const fetchUserRewards = async (): Promise<RewardData> => {
  const response = await apiClient.get('/rewards/me');
  return response.data;
};

export const fetchLeaderboard = async (lat?: number, lng?: number): Promise<any[]> => {
  const params = (lat !== undefined && lng !== undefined) ? `?lat=${lat}&lng=${lng}` : '';
  const response = await apiClient.get(`/rewards/leaderboard${params}`);
  return response.data;
};
