import React from 'react';
import NotificationDropdown from './NotificationDropdown';
import { useAuth } from '../context/AuthContext';

interface PortalHeaderProps {
  onProfileClick: () => void;
  showMobileMenuIcon?: boolean;
}

export default function PortalHeader({ onProfileClick, showMobileMenuIcon }: PortalHeaderProps) {
  const { user } = useAuth();
  
  const displayName = user?.name && user.name.trim() !== '' ? user.name : (user?.email || 'User');
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <header className="flex justify-between items-center w-full px-8 h-16 sticky top-0 z-30 bg-surface-container-lowest border-b border-outline-variant">
      <div className="flex items-center gap-4">
        {showMobileMenuIcon && (
          <>
            <img src="/logo.jpg" alt="CivicResolve Logo" className="w-8 h-8 rounded-full object-cover bg-white md:hidden" />
            <span className="font-headline-md text-headline-md font-bold text-primary md:hidden">CivicResolve</span>
          </>
        )}
      </div>
      <div className="flex items-center gap-4">
        <NotificationDropdown />
        <button 
          onClick={onProfileClick}
          className="flex items-center gap-2 px-3 py-1.5 bg-secondary-container/30 hover:bg-secondary-container/50 text-primary rounded-full font-label-md transition-colors shadow-sm cursor-pointer"
        >
          <span className="material-symbols-outlined text-[20px]">person</span>
          <span>{displayName}</span>
        </button>
        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-on-primary font-bold shadow-sm">
          {initial}
        </div>
      </div>
    </header>
  );
}
