import React, { useEffect, useState, useMemo } from 'react';
import { fetchCommissionerAnalytics, type CommissionerAnalytics } from '../api/analytics';
import { fetchCommissionerComplaints, type Complaint } from '../api/complaints';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import ComplaintMap from '../components/ComplaintMap';
import ProfileModal from '../components/ProfileModal';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function CommissionerDashboard() {
  const [analytics, setAnalytics] = useState<CommissionerAnalytics | null>(null);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'map' | 'analytics'>('dashboard');
  const [showProfile, setShowProfile] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchCommissionerAnalytics().then(setAnalytics).catch(console.error);
    fetchCommissionerComplaints().then(setComplaints).catch(console.error);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const escalations = complaints.filter(c => c.severity === 'HIGH' || c.severity === 'CRITICAL').slice(0, 5);
  const activeComplaints = complaints.filter(c => c.status !== 'RESOLVED' && c.status !== 'CLOSED');

  // Trend data
  const trendData = useMemo(() => {
    const counts: Record<string, number> = {};
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      counts[dateStr] = 0;
    }
    complaints.forEach(c => {
      if (c.createdAt) {
        const dateStr = new Date(c.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        if (counts[dateStr] !== undefined) {
          counts[dateStr]++;
        }
      }
    });
    return Object.keys(counts).map(key => ({ date: key, count: counts[key] }));
  }, [complaints]);

  // Department performance data
  const deptPerformanceData = useMemo(() => {
    if (!analytics || !analytics.departmentPerformance) return [];
    return Object.entries(analytics.departmentPerformance).map(([dept, rate]) => ({
      department: dept.replace(/_/g, ' '),
      resolutionRate: rate
    }));
  }, [analytics]);

  return (
    <div className="bg-background text-on-background font-body-md min-h-screen flex">
      {/* SideNavBar */}
      <nav className="fixed left-0 top-0 h-screen w-64 flex-col border-r border-outline-variant py-8 bg-surface-container-low hidden md:flex z-40">
        <div className="px-4 mb-8 flex items-center gap-3">
          <img src="/logo.jpg" alt="CivicResolve Logo" className="w-10 h-10 rounded-full object-cover bg-white" />
          <div>
            <h1 className="font-headline-sm text-headline-sm font-bold text-primary">CivicResolve</h1>
            <p className="font-body-sm text-body-sm text-on-surface-variant">Commissioner Portal</p>
          </div>
        </div>
        <ul className="flex-1 px-2 space-y-1">
          <li>
            <button 
              onClick={() => setActiveTab('dashboard')}
              className={`w-full flex items-center gap-4 rounded-xl px-4 py-3 font-label-md text-label-md transition-all cursor-pointer ${activeTab === 'dashboard' ? 'bg-primary text-on-primary font-bold shadow-md' : 'text-on-surface-variant hover:bg-primary/10 hover:text-primary hover:font-semibold hover:translate-x-1 hover:shadow-xs'}`}
            >
              <span className="material-symbols-outlined" style={{fontVariationSettings: activeTab === 'dashboard' ? "'FILL' 1" : "'FILL' 0"}}>dashboard</span>
              Overview
            </button>
          </li>
          <li>
            <button 
              onClick={() => setActiveTab('map')}
              className={`w-full flex items-center gap-4 rounded-xl px-4 py-3 font-label-md text-label-md transition-all cursor-pointer ${activeTab === 'map' ? 'bg-primary text-on-primary font-bold shadow-md' : 'text-on-surface-variant hover:bg-primary/10 hover:text-primary hover:font-semibold hover:translate-x-1 hover:shadow-xs'}`}
            >
              <span className="material-symbols-outlined" style={{fontVariationSettings: activeTab === 'map' ? "'FILL' 1" : "'FILL' 0"}}>map</span>
              City Map
            </button>
          </li>
          <li>
            <button 
              onClick={() => setActiveTab('analytics')}
              className={`w-full flex items-center gap-4 rounded-xl px-4 py-3 font-label-md text-label-md transition-all cursor-pointer ${activeTab === 'analytics' ? 'bg-primary text-on-primary font-bold shadow-md' : 'text-on-surface-variant hover:bg-primary/10 hover:text-primary hover:font-semibold hover:translate-x-1 hover:shadow-xs'}`}
            >
              <span className="material-symbols-outlined" style={{fontVariationSettings: activeTab === 'analytics' ? "'FILL' 1" : "'FILL' 0"}}>analytics</span>
              Analytics
            </button>
          </li>
        </ul>
        <ul className="px-2 space-y-1 mt-auto">
          <li>
            <button onClick={() => setShowProfile(true)} className="w-full flex items-center gap-4 text-on-surface-variant px-4 py-3 font-label-md text-label-md hover:bg-primary/10 hover:text-primary hover:font-semibold hover:translate-x-1 hover:shadow-xs rounded-xl transition-all cursor-pointer">
              <span className="material-symbols-outlined">person_outline</span>
              My Profile & Auth
            </button>
          </li>
          <li>
            <button onClick={handleLogout} className="w-full flex items-center gap-4 text-error px-4 py-3 font-label-md text-label-md hover:bg-error/10 hover:font-semibold hover:translate-x-1 rounded-xl transition-all cursor-pointer">
              <span className="material-symbols-outlined">logout</span>
              Logout
            </button>
          </li>
        </ul>
      </nav>

      {/* Main Content Area */}
      <div className="flex-1 md:ml-64 flex flex-col min-h-screen bg-surface">
        {/* TopAppBar */}
        <header className="flex justify-between items-center w-full px-8 h-16 sticky top-0 z-30 bg-surface-container-lowest border-b border-outline-variant">
          <div className="flex items-center gap-4">
            <img src="/logo.jpg" alt="CivicResolve Logo" className="w-8 h-8 rounded-full object-cover bg-white md:hidden" />
            <span className="font-headline-md text-headline-md font-bold text-primary md:hidden">CivicResolve</span>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setShowProfile(true)}
              className="flex items-center gap-2 px-3 py-1.5 bg-secondary-container/30 hover:bg-secondary-container/50 text-primary rounded-full font-label-md transition-colors shadow-sm"
            >
              <span className="material-symbols-outlined text-[20px]">person</span>
              <span>{user?.email || 'Profile'}</span>
            </button>
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-on-primary font-bold">
              {user?.email.charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        {/* Dashboard Canvas */}
        <main className="flex-1 p-8 overflow-y-auto">
          {activeTab === 'dashboard' && (
            <>
              <div className="mb-8">
                <h2 className="font-headline-lg text-headline-lg text-primary">City-wide Analytics Overview</h2>
                <p className="font-body-md text-body-md text-on-surface-variant">Real-time macro view of municipal operations.</p>
              </div>

              {/* Top-level metrics Bento */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 flex flex-col shadow-sm">
                  <div className="flex justify-between items-start mb-4">
                    <span className="font-label-md text-label-md text-on-surface-variant">Total City Complaints</span>
                    <span className="material-symbols-outlined text-primary">forum</span>
                  </div>
                  <div className="font-display-lg text-display-lg text-primary">{analytics?.totalComplaints || 0}</div>
                </div>

                <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 flex flex-col shadow-sm">
                  <div className="flex justify-between items-start mb-4">
                    <span className="font-label-md text-label-md text-on-surface-variant">Resolved (City-wide)</span>
                    <span className="material-symbols-outlined text-secondary">check_circle</span>
                  </div>
                  <div className="font-display-lg text-display-lg text-primary">{analytics?.resolvedComplaints || 0}</div>
                </div>

                <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 flex flex-col shadow-sm">
                  <div className="flex justify-between items-start mb-4">
                    <span className="font-label-md text-label-md text-on-surface-variant">Avg Resolution Rate</span>
                    <span className="material-symbols-outlined text-primary">trending_up</span>
                  </div>
                  <div className="font-display-lg text-display-lg text-primary">{analytics?.resolutionRate?.toFixed(1) || 0}%</div>
                </div>

                <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 flex flex-col shadow-sm">
                  <div className="flex justify-between items-start mb-4">
                    <span className="font-label-md text-label-md text-on-surface-variant">Avg AI Confidence</span>
                    <span className="material-symbols-outlined text-primary">psychology</span>
                  </div>
                  <div className="font-display-lg text-display-lg text-primary">{(analytics?.avgAiConfidence ? analytics.avgAiConfidence * 100 : 0).toFixed(0)}%</div>
                </div>
              </div>

              {/* Main Visualizations Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 flex flex-col gap-6">
                  <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm">
                    <h3 className="font-headline-md text-headline-md text-primary mb-4 border-b border-outline-variant pb-2">City-wide Recent Issues</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-outline-variant text-on-surface-variant font-label-md text-label-md">
                            <th className="py-2">Department</th>
                            <th className="py-2">Category</th>
                            <th className="py-2">Status</th>
                            <th className="py-2">Severity</th>
                          </tr>
                        </thead>
                        <tbody className="font-body-sm text-body-sm text-on-surface">
                          {complaints.length === 0 && <tr><td colSpan={4} className="py-4 text-center text-on-surface-variant">No recent issues found.</td></tr>}
                          {complaints.slice(0, 10).map(c => (
                            <tr key={c.id} className="border-b border-outline-variant/50 hover:bg-primary/10 hover:shadow-xs cursor-pointer transition-all duration-150">
                              <td className="py-2.5 font-medium text-primary">{c.department}</td>
                              <td className="py-2.5">{c.category}</td>
                              <td className="py-2.5">{c.status}</td>
                              <td className="py-2.5">
                                <span className={`px-2 py-1 rounded text-xs font-bold ${c.severity === 'CRITICAL' ? 'bg-error-container text-on-error-container' : 'bg-surface-container-highest'}`}>{c.severity}</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Right Column: Critical Escalations */}
                <div className="flex flex-col gap-6">
                  <div className="bg-surface-container-lowest border border-outline-variant rounded-xl flex flex-col h-full overflow-hidden shadow-sm">
                    <div className="p-4 border-b border-outline-variant bg-surface-container-low flex justify-between items-center">
                      <h3 className="font-headline-md text-headline-md text-primary">Critical Escalations</h3>
                      <span className="bg-error-container text-on-error-container font-label-sm text-label-sm px-2 py-1 rounded">Action Req</span>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                      {escalations.length === 0 && <p className="text-on-surface-variant font-body-sm text-body-sm">No active escalations.</p>}
                      {escalations.map(esc => (
                        <div key={esc.id} className="border-l-4 border-error pl-3 py-2 rounded-r-lg hover:bg-error/5 transition-colors cursor-pointer group">
                          <div className="flex justify-between items-start">
                            <span className="font-label-md text-label-md text-primary group-hover:text-error transition-colors">{esc.category}</span>
                          </div>
                          <p className="font-body-sm text-body-sm text-on-surface-variant mt-1 line-clamp-2">{esc.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === 'map' && (
            <div className="h-[calc(100vh-120px)] flex flex-col">
              <div className="mb-4">
                <h2 className="font-headline-lg text-headline-lg text-primary">City-wide Map</h2>
                <p className="font-body-md text-body-md text-on-surface-variant">Live geospatial view of all issues across the city.</p>
              </div>
              <div className="flex-1 rounded-xl overflow-hidden shadow-sm">
                <ComplaintMap complaints={activeComplaints} height="100%" />
              </div>
            </div>
          )}

          {activeTab === 'analytics' && (
            <div>
              <div className="mb-8">
                <h2 className="font-headline-lg text-headline-lg text-primary">Advanced Analytics</h2>
                <p className="font-body-md text-body-md text-on-surface-variant">Historical trends and department performance tracking.</p>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm">
                  <h3 className="font-headline-md text-headline-md text-primary mb-6">Issue Volume Trend (Last 7 Days)</h3>
                  <div className="w-full h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={trendData}>
                        <XAxis dataKey="date" stroke="#5d5f65" />
                        <YAxis stroke="#5d5f65" />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#091426', borderColor: '#42474e', color: '#e2e2e6' }}
                          itemStyle={{ color: '#a2c9ff' }}
                        />
                        <Line type="monotone" dataKey="count" stroke="#005ac1" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm">
                  <h3 className="font-headline-md text-headline-md text-primary mb-6">Department Resolution Rates (%)</h3>
                  <div className="w-full h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={deptPerformanceData}>
                        <XAxis dataKey="department" stroke="#5d5f65" tick={{ fontSize: 10 }} />
                        <YAxis stroke="#5d5f65" />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#091426', borderColor: '#42474e', color: '#e2e2e6' }}
                          itemStyle={{ color: '#a2c9ff' }}
                        />
                        <Bar dataKey="resolutionRate" fill="#005ac1" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
      <ProfileModal show={showProfile} onClose={() => setShowProfile(false)} />
    </div>
  );
}
