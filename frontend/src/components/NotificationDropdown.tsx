import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchNotifications, markAllNotificationsAsRead, type Notification } from '../api/notifications';

export default function NotificationDropdown() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const loadNotifications = async () => {
    try {
      const data = await fetchNotifications();
      setNotifications(data);
    } catch (e) {
      console.error('Failed to load notifications', e);
    }
  };

  useEffect(() => {
    loadNotifications();
    // In a real app with SSE, we could listen for new notifications here too
    const interval = setInterval(loadNotifications, 30000); // Poll every 30s as fallback
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsAsRead();
      setNotifications(notifications.map(n => ({ ...n, isRead: true })));
    } catch (e) {
      console.error('Failed to mark notifications as read', e);
    }
  };

  const handleNotificationClick = (notif: Notification) => {
    if (notif.referenceId) {
      navigate(`/citizen/complaint/${notif.referenceId}`);
      setIsOpen(false);
    }
  };

  const formatTimeAgo = (dateStr: string) => {
    const seconds = Math.floor((new Date().getTime() - new Date(dateStr).getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-full hover:bg-black/5 transition-colors focus:outline-none"
      >
        <span className="material-symbols-outlined text-ink-secondary text-[24px]">notifications</span>
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 bg-brand-primary text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center shadow-sm">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-surface rounded-xl shadow-2xl border border-border-default z-50 overflow-hidden flex flex-col">
          <div className="p-4 border-b border-border-default flex justify-between items-center bg-page">
            <h3 className="font-headline-md text-label-lg font-bold text-ink-primary">Notifications</h3>
            {unreadCount > 0 && (
              <button 
                onClick={handleMarkAllRead}
                className="text-xs font-label-md text-brand-primary hover:underline"
              >
                Mark all as read
              </button>
            )}
          </div>
          
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-ink-secondary text-sm">
                No notifications yet.
              </div>
            ) : (
              <div className="flex flex-col">
                {notifications.map(notif => (
                  <div 
                    key={notif.id} 
                    onClick={() => handleNotificationClick(notif)}
                    className={`p-4 border-b border-border-default/50 hover:bg-page cursor-pointer transition-colors ${!notif.isRead ? 'bg-page/50' : ''}`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <h4 className="font-label-md text-sm font-bold text-ink-primary">{notif.title}</h4>
                      <span className="text-[10px] text-ink-secondary font-mono">{formatTimeAgo(notif.createdAt)}</span>
                    </div>
                    <p className="text-xs text-ink-secondary line-clamp-2">{notif.message}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
