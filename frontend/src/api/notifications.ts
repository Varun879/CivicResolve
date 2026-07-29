import { apiClient } from './client';

export interface Notification {
  id: string;
  title: string;
  message: string;
  referenceId: string;
  isRead: boolean;
  createdAt: string;
}

export const fetchNotifications = async (): Promise<Notification[]> => {
  const response = await apiClient.get('/notifications');
  return response.data;
};

export const markAllNotificationsRead = async (): Promise<void> => {
  await apiClient.post('/notifications/read-all');
};
