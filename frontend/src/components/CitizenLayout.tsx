import { useEffect, useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ProfileModal from './ProfileModal';
import PortalHeader from './PortalHeader';

export default function CitizenLayout() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();

  useEffect(() => {
    loadLayoutData();
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords = { lat: position.coords.latitude, lng: position.coords.longitude };
          localStorage.setItem('user_location', JSON.stringify(coords));
          window.dispatchEvent(new CustomEvent('location_updated', { detail: coords }));
        },
        (error) => console.warn("Location permission error:", error.message),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    }
  }, []);

  const loadLayoutData = async () => {
    try {
      const notifs = await import('../api/notifications').then(m => m.fetchNotifications());
      setNotifications(notifs);
    } catch (e) {
      console.error("Failed to fetch layout data");
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await import('../api/notifications').then(m => m.markAllNotificationsAsRead());
      setNotifications(notifications.map(n => ({ ...n, isRead: true })));
    } catch (e) {}
  };

  const navItems = [
    { name: 'Dashboard', path: '/citizen/dashboard', icon: 'dashboard' },
    { name: 'Leaderboard', path: '/citizen/leaderboard', icon: 'workspace_premium' },
    { name: 'Nearby Issues', path: '/citizen/map', icon: 'map' },
  ];

  return (
    <div className="flex w-full min-h-screen bg-surface text-on-surface">
      {/* SideNavBar */}
      <aside className="fixed left-0 top-0 h-screen w-64 flex-col border-r border-outline-variant py-8 bg-surface-container-low z-40 hidden md:flex shadow-sm">
        <div className="px-6 mb-8 flex items-center gap-4">
          <img src="/logo.jpg" alt="CivicResolve Logo" className="w-12 h-12 rounded-full object-cover bg-white shadow-sm" />
          <div>
            <h1 className="font-headline-sm text-headline-sm font-bold text-primary">CivicResolve</h1>
            <p className="font-label-sm text-label-sm text-on-surface-variant">Citizen Portal</p>
          </div>
        </div>
        <nav className="flex-1 px-4 flex flex-col gap-2 font-label-md text-label-md">
          {navItems.map((item) => {
            const isActive = location.pathname.startsWith(item.path);
            return (
              <a
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`flex items-center gap-4 px-4 py-3 rounded-xl cursor-pointer transition-all duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                  isActive
                    ? 'bg-primary/10 text-primary font-bold border-l-4 border-primary shadow-sm pl-3'
                    : 'text-on-surface-variant hover:bg-primary/10 hover:text-primary hover:font-semibold hover:translate-x-1 hover:shadow-xs font-medium'
                }`}
              >
                <span className="material-symbols-outlined text-[20px]" style={{fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0"}}>
                  {item.icon}
                </span>
                {item.name}
              </a>
            );
          })}
        </nav>
        <div className="px-4 mt-auto flex flex-col gap-4">
          <button
            onClick={() => navigate('/citizen/report')}
            className="w-full bg-primary text-on-primary font-label-md text-label-md py-3 rounded-lg shadow-sm hover:brightness-90 hover:scale-[1.02] hover:shadow-md transition-all duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 cursor-pointer flex items-center justify-center gap-2 font-bold"
          >
            <span className="material-symbols-outlined text-[20px]" style={{fontVariationSettings: "'FILL' 1"}}>add_circle</span>
            Report Issue
          </button>
          <div className="border-t border-outline-variant pt-4 flex flex-col gap-2 font-label-md text-label-md">
            <button
              onClick={() => setShowProfile(true)}
              className="flex items-center gap-4 text-on-surface-variant px-4 py-2 rounded-xl transition-all duration-150 ease-in-out hover:bg-primary/10 hover:text-primary hover:font-semibold hover:translate-x-1 hover:shadow-xs focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 cursor-pointer w-full text-left font-medium"
            >
              <span className="material-symbols-outlined">person</span>
              Profile
            </button>
            <button
              onClick={() => { logout(); navigate('/login'); }}
              className="flex items-center gap-4 text-error px-4 py-2 rounded-xl transition-all duration-150 ease-in-out hover:bg-error/10 hover:translate-x-1 focus:outline-none focus:ring-2 focus:ring-error focus:ring-offset-2 cursor-pointer w-full text-left font-bold"
            >
              <span className="material-symbols-outlined">logout</span>
              Logout
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col md:ml-64 w-full h-screen overflow-hidden">
        {/* TopAppBar */}
        <PortalHeader onProfileClick={() => setShowProfile(true)} showMobileMenuIcon />

        {/* Main Route Content */}
        <div className="flex-1 overflow-y-auto relative bg-surface">
          <Outlet />
        </div>
      </div>

      <ProfileModal show={showProfile} onClose={() => setShowProfile(false)} />
    </div>
  );
}
