import { useEffect, useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ProfileModal from './ProfileModal';

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
      await import('../api/notifications').then(m => m.markAllNotificationsRead());
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
        <header className="flex justify-between items-center w-full px-8 h-16 sticky top-0 z-50 bg-surface-container-lowest border-b border-outline-variant flex-shrink-0 shadow-xs">
          <div className="flex items-center gap-2">
            <span className="font-headline-sm text-primary font-bold">Citizen Engagement Portal</span>
          </div>
          <div className="flex items-center gap-4 text-on-surface-variant relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 rounded-full hover:bg-primary/10 hover:text-primary hover:scale-[1.05] transition-all duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 cursor-pointer"
              title="Notifications"
            >
              <span className="material-symbols-outlined">notifications</span>
              {notifications.filter(n => !n.isRead).length > 0 && (
                <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-error rounded-full border border-surface-container-lowest animate-pulse"></span>
              )}
            </button>
            {showNotifications && (
              <div className="absolute top-12 right-0 w-80 bg-surface-container-lowest border border-outline-variant rounded-xl shadow-lg z-50 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
                <div className="p-4 border-b border-outline-variant flex justify-between items-center bg-surface-container-low">
                  <h3 className="font-label-lg text-primary font-bold">Notifications</h3>
                  <button onClick={handleMarkAllRead} className="text-[10px] uppercase font-bold text-primary hover:underline focus:outline-none focus:ring-1 focus:ring-primary rounded px-1">Mark all read</button>
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {notifications.length === 0 && <div className="p-6 text-center text-sm text-on-surface-variant">No new notifications.</div>}
                  {notifications.map(n => (
                    <div key={n.id} className={`p-4 border-b border-outline-variant last:border-0 hover:bg-surface-container-low transition-colors cursor-pointer ${!n.isRead ? 'bg-primary/5 font-medium' : ''}`} onClick={() => {
                        if (n.referenceId) navigate(`/citizen/complaint/${n.referenceId}`);
                        setShowNotifications(false);
                    }}>
                      <h4 className="font-label-md text-on-surface mb-1 flex items-center justify-between">
                        {n.title}
                        {!n.isRead && <span className="w-2 h-2 rounded-full bg-primary inline-block"></span>}
                      </h4>
                      <p className="font-body-sm text-on-surface-variant text-xs">{n.message}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </header>

        {/* Main Route Content */}
        <div className="flex-1 overflow-y-auto relative bg-surface">
          <Outlet />
        </div>
      </div>

      <ProfileModal show={showProfile} onClose={() => setShowProfile(false)} />
    </div>
  );
}
