import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { fetchAdminAnalytics, type AdminAnalytics } from '../api/analytics';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import ProfileModal from '../components/ProfileModal';

export default function AdminDashboard() {
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
  const [showProfile, setShowProfile] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchAdminAnalytics().then(setAnalytics).catch(console.error);
  }, []);

  return (
    <div className="min-h-screen bg-bgBase p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">System Administration</h1>
            <p className="text-textSecondary">Technical Overview</p>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setShowProfile(true)}
              className="flex items-center gap-2 px-3 py-1.5 bg-secondary-container/30 hover:bg-secondary-container/50 text-primary rounded-full font-label-md transition-colors shadow-sm"
            >
              <span className="material-symbols-outlined text-[20px]">person</span>
              <span>{user?.email || 'Profile'}</span>
            </button>
            <button onClick={() => { logout(); navigate('/login'); }} className="text-accentPrimary font-bold">Logout</button>
          </div>
        </header>

        {analytics ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6 bg-bgElevated border border-border-default rounded-xl shadow-sm hover:shadow-md hover:border-primary transition-all duration-200 group">
                <h3 className="text-textSecondary text-sm uppercase tracking-wider mb-2 group-hover:text-primary transition-colors">System Status</h3>
                <div className="flex items-center gap-3 mt-4">
                  <div className={`w-4 h-4 rounded-full ${analytics.systemStatus === 'HEALTHY' ? 'bg-statusClosed' : 'bg-priorityHigh'} animate-pulse`}></div>
                  <p className="text-2xl font-bold text-textPrimary">{analytics.systemStatus}</p>
                </div>
              </motion.div>
              
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-6 bg-bgElevated border border-border-default rounded-xl shadow-sm hover:shadow-md hover:border-primary transition-all duration-200 group">
                <h3 className="text-textSecondary text-sm uppercase tracking-wider mb-2 group-hover:text-primary transition-colors">Registered Users</h3>
                <p className="text-4xl font-bold text-textPrimary">{analytics.totalUsers}</p>
              </motion.div>
              
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card p-6 bg-bgElevated border border-border-default rounded-xl shadow-sm hover:shadow-md hover:border-primary transition-all duration-200 group">
                <h3 className="text-textSecondary text-sm uppercase tracking-wider mb-2 group-hover:text-primary transition-colors">Database Records</h3>
                <p className="text-4xl font-bold text-textPrimary">{analytics.totalComplaints} Complaints</p>
              </motion.div>
            </div>

            <div className="mt-12">
              <h2 className="text-2xl font-bold mb-4 text-textPrimary">Admin God-Mode Access</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <button onClick={() => navigate('/citizen/dashboard')} className="p-5 bg-surface-container rounded-xl border border-outline-variant hover:border-primary hover:bg-primary/5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 text-left group cursor-pointer">
                  <span className="material-symbols-outlined mb-2 text-primary group-hover:scale-110 transition-transform">person</span>
                  <h3 className="font-bold text-textPrimary group-hover:text-primary transition-colors">Citizen Portal</h3>
                  <p className="text-sm text-textSecondary">File new complaints</p>
                </button>
                <button onClick={() => navigate('/officer/dashboard')} className="p-5 bg-surface-container rounded-xl border border-outline-variant hover:border-primary hover:bg-primary/5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 text-left group cursor-pointer">
                  <span className="material-symbols-outlined mb-2 text-primary group-hover:scale-110 transition-transform">engineering</span>
                  <h3 className="font-bold text-textPrimary group-hover:text-primary transition-colors">Field Officer View</h3>
                  <p className="text-sm text-textSecondary">Resolve assignments</p>
                </button>
                <button onClick={() => navigate('/depthead/dashboard')} className="p-5 bg-surface-container rounded-xl border border-outline-variant hover:border-primary hover:bg-primary/5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 text-left group cursor-pointer">
                  <span className="material-symbols-outlined mb-2 text-primary group-hover:scale-110 transition-transform">account_balance</span>
                  <h3 className="font-bold text-textPrimary group-hover:text-primary transition-colors">Dept Head View</h3>
                  <p className="text-sm text-textSecondary">Manage department</p>
                </button>
                <button onClick={() => navigate('/commissioner/dashboard')} className="p-5 bg-surface-container rounded-xl border border-outline-variant hover:border-primary hover:bg-primary/5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 text-left group cursor-pointer">
                  <span className="material-symbols-outlined mb-2 text-primary group-hover:scale-110 transition-transform">monitoring</span>
                  <h3 className="font-bold text-textPrimary group-hover:text-primary transition-colors">Commissioner View</h3>
                  <p className="text-sm text-textSecondary">City-wide overview</p>
                </button>
              </div>
            </div>
          </>
        ) : (
          <p>Loading analytics...</p>
        )}
      </div>
      <ProfileModal show={showProfile} onClose={() => setShowProfile(false)} />
    </div>
  );
}
