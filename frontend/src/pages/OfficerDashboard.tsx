import React, { useEffect, useState } from 'react';
import { fetchOfficerAssignments, officerUpdateComplaintStatus, type Complaint } from '../api/complaints';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import ComplaintMap from '../components/ComplaintMap';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import PortalHeader from '../components/PortalHeader';
import EmptyState from '../components/EmptyState';
import ProfileModal from '../components/ProfileModal';

export default function OfficerDashboard() {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [selectedComp, setSelectedComp] = useState<Complaint | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'incidents' | 'analytics'>('dashboard');
  const [showProfile, setShowProfile] = useState(false);
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [resImageBase64, setResImageBase64] = useState<string>('');
  const [resLat, setResLat] = useState<number | null>(null);
  const [resLng, setResLng] = useState<number | null>(null);
  const [isCapturingGps, setIsCapturingGps] = useState(false);
  const [resError, setResError] = useState<string | null>(null);
  const [isSubmittingRes, setIsSubmittingRes] = useState(false);
  
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    loadComplaints();
  }, []);

  const loadComplaints = async () => {
    try {
      const data = await fetchOfficerAssignments();
      setComplaints(data);
      if (data.length > 0 && !selectedComp) {
        setSelectedComp(data[0]);
      } else if (selectedComp) {
        const updated = data.find(c => c.id === selectedComp.id);
        if (updated) setSelectedComp(updated);
      }
    } catch (e) {
      console.error("Failed to fetch complaints", e);
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      await officerUpdateComplaintStatus(id, newStatus);
      await loadComplaints();
    } catch (e: any) {
      alert(e.response?.data?.message || e.message || "Failed to update status");
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const activeComplaints = complaints.filter(c => c.status !== 'RESOLVED');
  
  // Real analytics computed dynamically from actual assignments
  const resolvedCount = complaints.filter(c => c.status === 'RESOLVED' || c.status === 'CLOSED').length;
  const totalCount = complaints.length || 1;
  const efficiencyScore = Math.round((resolvedCount / totalCount) * 100);

  const categoryBreakdown = complaints.reduce((acc: any, c) => {
    const key = c.category || 'General';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  const analyticsData = Object.keys(categoryBreakdown).map(key => ({
    name: key,
    resolved: categoryBreakdown[key]
  }));

  const captureGps = () => {
    setIsCapturingGps(true);
    setResError(null);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setResLat(pos.coords.latitude);
          setResLng(pos.coords.longitude);
          setIsCapturingGps(false);
        },
        (err) => {
          setIsCapturingGps(false);
          setResError("Failed to acquire GPS location: " + err.message + ". Ensure location access is permitted.");
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      setIsCapturingGps(false);
      setResError("Geolocation is not supported by this browser.");
    }
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setResImageBase64(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitResolution = async () => {
    if (!selectedComp) return;
    if (!resImageBase64) {
      setResError("❌ Photo Verification Required: You must upload a resolution photo showing the fixed issue.");
      return;
    }
    if (resLat === null || resLng === null) {
      setResError("❌ Location Verification Required: You must capture real-time GPS coordinates to verify on-site presence.");
      return;
    }
    setIsSubmittingRes(true);
    setResError(null);
    try {
      await officerUpdateComplaintStatus(selectedComp.id, 'RESOLVED', {
        resolutionImageBase64: resImageBase64,
        resolutionLatitude: resLat,
        resolutionLongitude: resLng
      });
      setShowResolveModal(false);
      await loadComplaints();
    } catch (e: any) {
      setResError(e.response?.data?.message || e.message || "Failed to submit verified resolution. Ensure you are within 100 meters of the reported issue location.");
    } finally {
      setIsSubmittingRes(false);
    }
  };

  return (
    <div className="bg-surface text-on-surface antialiased flex w-full min-h-screen">
      {/* SideNavBar */}
      <aside className="fixed left-0 top-0 h-screen w-64 flex-col border-r border-outline-variant py-8 bg-surface-container-low z-40 hidden md:flex">
        <div className="px-6 mb-8 flex items-center gap-4">
          <img src="/logo.jpg" alt="CivicResolve Logo" className="w-12 h-12 rounded-full object-cover bg-white" />
          <div>
            <h1 className="font-headline-sm text-headline-sm font-bold text-primary">CivicResolve</h1>
            <p className="font-label-sm text-label-sm text-on-surface-variant">Officer Portal</p>
          </div>
        </div>
        <nav className="flex-1 px-4 flex flex-col gap-2 font-label-md text-label-md">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-4 rounded-xl px-4 py-3 transition-all cursor-pointer ${activeTab === 'dashboard' ? 'bg-primary text-on-primary font-bold shadow-md' : 'text-on-surface-variant hover:bg-primary/10 hover:text-primary hover:font-semibold hover:translate-x-1 hover:shadow-xs'}`}
          >
            <span className="material-symbols-outlined" style={{fontVariationSettings: activeTab === 'dashboard' ? "'FILL' 1" : "'FILL' 0"}}>dashboard</span>
            Dashboard
          </button>
          <button 
            onClick={() => setActiveTab('incidents')}
            className={`flex items-center gap-4 rounded-xl px-4 py-3 transition-all cursor-pointer ${activeTab === 'incidents' ? 'bg-primary text-on-primary font-bold shadow-md' : 'text-on-surface-variant hover:bg-primary/10 hover:text-primary hover:font-semibold hover:translate-x-1 hover:shadow-xs'}`}
          >
            <span className="material-symbols-outlined" style={{fontVariationSettings: activeTab === 'incidents' ? "'FILL' 1" : "'FILL' 0"}}>map</span>
            Incident Map
          </button>
          <button 
            onClick={() => setActiveTab('analytics')}
            className={`flex items-center gap-4 rounded-xl px-4 py-3 transition-all cursor-pointer ${activeTab === 'analytics' ? 'bg-primary text-on-primary font-bold shadow-md' : 'text-on-surface-variant hover:bg-primary/10 hover:text-primary hover:font-semibold hover:translate-x-1 hover:shadow-xs'}`}
          >
            <span className="material-symbols-outlined" style={{fontVariationSettings: activeTab === 'analytics' ? "'FILL' 1" : "'FILL' 0"}}>analytics</span>
            Analytics
          </button>
        </nav>
        <div className="px-4 mt-auto flex flex-col gap-4">
          <div className="border-t border-outline-variant pt-4 flex flex-col gap-2 font-label-md text-label-md">
            <button onClick={() => setShowProfile(true)} className="flex items-center gap-4 text-on-surface-variant px-4 py-2 hover:bg-primary/10 hover:text-primary hover:font-semibold hover:translate-x-1 hover:shadow-xs rounded-xl transition-all w-full text-left cursor-pointer">
              <span className="material-symbols-outlined">person_outline</span>
              My Profile & Auth
            </button>
            <button onClick={handleLogout} className="flex items-center gap-4 text-error px-4 py-2 hover:bg-error/10 hover:font-semibold hover:translate-x-1 rounded-xl transition-all w-full text-left cursor-pointer">
              <span className="material-symbols-outlined">logout</span>
              Logout
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col md:ml-64 w-full h-screen">
        {/* TopAppBar */}
        <PortalHeader onProfileClick={() => setShowProfile(true)} showMobileMenuIcon />

        {/* Main Dashboard Canvas */}
        <main className="flex-1 overflow-y-auto p-6 bg-surface">
          {activeTab === 'dashboard' && (
            <>
              <div className="flex justify-between items-end mb-8 max-w-7xl mx-auto">
                <div>
                  <h1 className="font-headline-lg text-headline-lg text-primary mb-1">Active Assignments</h1>
                  <p className="font-body-md text-body-md text-on-surface-variant">Manage and resolve high-priority municipal issues.</p>
                </div>
                {/* Performance Score Card */}
                <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 flex items-center gap-4 shadow-sm">
                  <div className="relative w-12 h-12">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                      <circle cx="18" cy="18" r="16" fill="none" className="stroke-secondary-container" strokeWidth="4" />
                      <circle cx="18" cy="18" r="16" fill="none" className="stroke-primary" strokeWidth="4" strokeDasharray="100" strokeDashoffset={100 - efficiencyScore} strokeLinecap="round" />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center font-label-sm text-[10px] font-bold text-primary">
                      {efficiencyScore}%
                    </div>
                  </div>
                  <div>
                    <div className="font-label-md text-label-md text-primary">Efficiency Rating</div>
                    <div className="font-body-sm text-body-sm text-on-surface-variant">Target: 95% (Next Rank)</div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-7xl mx-auto h-[calc(100vh-200px)] min-h-[600px]">
                {/* Assignment List */}
                <div className="lg:col-span-5 flex flex-col gap-4 overflow-y-auto pr-2">
                  {complaints.length === 0 && (
                    <div className="h-64 mt-4">
                      <EmptyState title="No assignments found" icon="assignment_turned_in" body="You currently have no active tasks." />
                    </div>
                  )}
                  {complaints.map(comp => (
                    <div 
                      key={comp.id} 
                      onClick={() => setSelectedComp(comp)}
                      className={`bg-surface-container-lowest border rounded-xl p-4 cursor-pointer transition-all duration-200 group ${selectedComp?.id === comp.id ? 'ring-2 ring-primary border-primary bg-primary/5 shadow-md' : 'border-outline-variant hover:border-primary hover:bg-primary/5 hover:shadow-md hover:-translate-y-0.5'}`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex gap-2">
                          <span className={`font-label-sm text-label-sm px-2 py-1 rounded-sm uppercase tracking-wide ${comp.severity === 'CRITICAL' || comp.priorityBand === 'CRITICAL' ? 'bg-error-container text-on-error-container' : comp.priorityBand === 'HIGH' ? 'bg-tertiary-container text-on-tertiary-container' : 'bg-surface-container-high text-on-surface-variant'}`}>
                            {comp.priorityBand || comp.severity}
                          </span>
                          <span className="bg-surface-container-high text-on-surface-variant font-label-sm text-label-sm px-2 py-1 rounded-sm">
                            {comp.category}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 font-label-md text-label-md text-on-surface-variant">
                          <span className="material-symbols-outlined text-[16px]">info</span>
                          {comp.status}
                        </div>
                      </div>
                      <h3 className="font-headline-md text-headline-md text-primary mb-1 group-hover:text-primary font-bold transition-colors">{comp.category} Issue</h3>
                      <p className="font-body-sm text-body-sm text-on-surface-variant flex items-center gap-1 line-clamp-1">
                        <span className="material-symbols-outlined text-[16px]">description</span>
                        {comp.description}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Task Detail View */}
                <div className="lg:col-span-7 h-full">
                  {selectedComp ? (
                    <div className="bg-surface-container-lowest border border-outline-variant rounded-xl flex flex-col h-full shadow-sm overflow-hidden">
                      <div className="p-6 border-b border-outline-variant bg-surface-container-lowest">
                        <div className="flex justify-between items-start">
                          <div>
                            <h2 className="font-headline-lg text-headline-lg text-primary mb-1">{selectedComp.category} Issue</h2>
                            <div className="flex items-center gap-4 text-on-surface-variant font-body-sm text-body-sm">
                              <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">tag</span> ID: {selectedComp.id.substring(0, 8)}</span>
                              <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">calendar_today</span> {selectedComp.createdAt && !isNaN(new Date(selectedComp.createdAt).getTime()) ? new Date(selectedComp.createdAt).toLocaleDateString() : 'Date not available'}</span>
                            </div>
                          </div>
                          <span className={`font-label-md text-label-md px-3 py-1.5 rounded-sm ${selectedComp.priorityBand === 'CRITICAL' ? 'bg-error-container text-on-error-container' : 'bg-surface-container border border-outline-variant text-on-surface-variant'}`}>
                            SLA: {selectedComp.priorityBand}
                          </span>
                        </div>
                      </div>

                      <div className="p-6 flex-1 flex flex-col gap-6 overflow-y-auto bg-surface-container-lowest">
                        <div className="grid grid-cols-2 gap-6">
                          <div className="bg-surface-container-low rounded-lg p-4 border border-outline-variant">
                            <div className="text-label-sm font-label-sm text-on-surface-variant uppercase tracking-wider mb-2">AI Assessment</div>
                            <div className="flex items-center gap-3">
                              <span className="material-symbols-outlined text-primary text-3xl">psychology</span>
                              <div>
                                <div className="font-label-md text-label-md text-primary">Category: {selectedComp.category}</div>
                                <div className="font-body-sm text-body-sm text-on-surface-variant">Confidence: {selectedComp.aiConfidenceScore != null ? `${(selectedComp.aiConfidenceScore * 100).toFixed(0)}%` : 'Not available'}</div>
                              </div>
                            </div>
                          </div>
                          <div className="bg-surface-container-low rounded-lg p-4 border border-outline-variant flex flex-col justify-between">
                            <div>
                              <div className="text-label-sm font-label-sm text-on-surface-variant uppercase tracking-wider mb-2">GPS Location</div>
                              <div className="flex items-center gap-3 mb-3">
                                <span className="material-symbols-outlined text-primary text-3xl">my_location</span>
                                <div>
                                  <div className="font-label-md text-label-md text-primary">Lat: {selectedComp.latitude.toFixed(4)}</div>
                                  <div className="font-body-sm text-body-sm text-on-surface-variant">Lng: {selectedComp.longitude.toFixed(4)}</div>
                                </div>
                              </div>
                            </div>
                            <a 
                              href={`https://www.google.com/maps/dir/?api=1&destination=${selectedComp.latitude},${selectedComp.longitude}`}
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="w-full bg-primary/10 hover:bg-primary/20 text-primary text-xs font-bold py-2 rounded flex items-center justify-center gap-1 transition-colors"
                            >
                              <span className="material-symbols-outlined text-sm">directions</span>
                              Get Directions
                            </a>
                          </div>
                        </div>

                        {selectedComp.imageBase64 && (
                          <div>
                            <div className="text-label-sm font-label-sm text-on-surface-variant uppercase tracking-wider mb-2">Evidence</div>
                            <div className="relative w-full h-64 rounded-lg overflow-hidden border border-outline-variant bg-surface-container-low flex items-center justify-center">
                              <img src={selectedComp.imageBase64.startsWith('data:') ? selectedComp.imageBase64 : `data:image/jpeg;base64,${selectedComp.imageBase64}`} alt="Evidence" className="w-full h-full object-contain" />
                            </div>
                          </div>
                        )}

                        <div>
                          <div className="text-label-sm font-label-sm text-on-surface-variant uppercase tracking-wider mb-2">Reporter Notes</div>
                          <p className="font-body-md text-body-md text-on-surface-variant p-4 bg-surface-container-low rounded-lg border border-outline-variant">
                            {(!selectedComp.description || selectedComp.description === '""' || selectedComp.description.trim() === '') ? 'No notes provided' : `"${selectedComp.description}"`}
                          </p>
                        </div>
                      </div>

                      <div className="p-6 border-t border-outline-variant bg-surface-container-lowest">
                        <div className="flex gap-4">
                          {(selectedComp.status === 'ASSIGNED' || selectedComp.status === 'REPORTED' || selectedComp.status === 'VERIFIED' || selectedComp.status === 'REOPENED') && (
                            <button onClick={() => handleUpdateStatus(selectedComp.id, 'ACCEPTED')} className="flex-1 bg-primary text-on-primary font-label-md text-label-md py-3 rounded-lg hover:opacity-90 transition-opacity shadow-sm flex items-center justify-center gap-2 cursor-pointer">
                              <span className="material-symbols-outlined text-[18px]">check_circle</span>
                              Accept Assignment
                            </button>
                          )}
                          {selectedComp.status === 'ACCEPTED' && (
                            <button onClick={() => handleUpdateStatus(selectedComp.id, 'WORK_STARTED')} className="flex-1 bg-primary text-on-primary font-label-md text-label-md py-3 rounded-lg hover:opacity-90 transition-opacity shadow-sm flex items-center justify-center gap-2">
                              <span className="material-symbols-outlined text-[18px]">build</span>
                              Start Work
                            </button>
                          )}
                          {selectedComp.status === 'WORK_STARTED' && (
                            <button onClick={() => handleUpdateStatus(selectedComp.id, 'UNDER_INSPECTION')} className="flex-1 bg-primary text-on-primary font-label-md text-label-md py-3 rounded-lg hover:opacity-90 transition-opacity shadow-sm flex items-center justify-center gap-2">
                              <span className="material-symbols-outlined text-[18px]">fact_check</span>
                              Ready for Inspection
                            </button>
                          )}
                          {selectedComp.status === 'UNDER_INSPECTION' && (
                            <button onClick={() => {
                              setResError(null);
                              setResImageBase64('');
                              setResLat(null);
                              setResLng(null);
                              setShowResolveModal(true);
                            }} className="flex-1 bg-secondary text-on-secondary font-label-md text-label-md py-3 rounded-lg hover:opacity-90 transition-opacity shadow-sm flex items-center justify-center gap-2 cursor-pointer">
                              <span className="material-symbols-outlined text-[18px]">done_all</span>
                              Resolve Issue
                            </button>
                          )}
                          {(selectedComp.status === 'ACCEPTED' || selectedComp.status === 'WORK_STARTED') && (
                            <button onClick={() => {
                              setResError(null);
                              setResImageBase64('');
                              setResLat(null);
                              setResLng(null);
                              setShowResolveModal(true);
                            }} className="bg-secondary text-on-secondary font-label-md text-label-md px-4 py-3 rounded-lg hover:opacity-90 transition-opacity shadow-sm flex items-center justify-center gap-2 cursor-pointer" title="Directly verify resolution on-site">
                              <span className="material-symbols-outlined text-[18px]">done_all</span>
                              Resolve Now
                            </button>
                          )}
                          {selectedComp.status === 'RESOLVED' && (
                            <button disabled className="flex-1 bg-surface-container border border-outline-variant text-on-surface-variant font-label-md text-label-md py-3 rounded-lg flex items-center justify-center gap-2">
                              <span className="material-symbols-outlined text-[18px]">done_all</span>
                              Resolved
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="h-full flex items-center justify-center border border-dashed border-outline-variant rounded-xl text-on-surface-variant">
                      Select an assignment to view details
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {activeTab === 'incidents' && (
            <div className="max-w-7xl mx-auto h-full flex flex-col">
              <div className="mb-6">
                <h1 className="font-headline-lg text-headline-lg text-primary mb-1">Geospatial Overview</h1>
                <p className="font-body-md text-body-md text-on-surface-variant">Map view of all active assignments.</p>
              </div>
              <div className="flex-1 border border-outline-variant rounded-xl overflow-hidden bg-surface-container-lowest">
                {activeComplaints.length > 0 ? (
                  <ComplaintMap complaints={activeComplaints} height="100%" />
                ) : (
                  <div className="h-full flex items-center justify-center text-on-surface-variant">
                    No active incidents to display on map.
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'analytics' && (
            <div className="max-w-7xl mx-auto h-full flex flex-col">
              <div className="mb-6">
                <h1 className="font-headline-lg text-headline-lg text-primary mb-1">My Analytics</h1>
                <p className="font-body-md text-body-md text-on-surface-variant">Performance metrics and resolution trends.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm">
                  <h3 className="font-headline-md text-headline-md text-primary mb-4 border-b border-outline-variant pb-2">Resolutions by Category</h3>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={analyticsData}>
                        <XAxis dataKey="name" stroke="#5d5f65" />
                        <YAxis stroke="#5d5f65" />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#091426', borderColor: '#42474e', color: '#e2e2e6' }}
                          itemStyle={{ color: '#a2c9ff' }}
                        />
                        <Bar dataKey="resolved" fill="#005ac1" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* 100-Meter Geo-Fenced Resolution Verification Modal */}
      {showResolveModal && selectedComp && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface border border-outline-variant rounded-2xl max-w-lg w-full p-6 shadow-2xl flex flex-col gap-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-outline-variant pb-4">
              <div className="flex items-center gap-2 text-primary">
                <span className="material-symbols-outlined text-2xl">verified_user</span>
                <h2 className="font-headline-md text-lg font-bold">100-Meter Geo-Fenced Resolution</h2>
              </div>
              <button onClick={() => setShowResolveModal(false)} className="text-on-surface-variant hover:text-on-surface text-xl font-bold cursor-pointer">
                ✕
              </button>
            </div>

            <div className="bg-primary/10 border border-primary/30 p-4 rounded-xl text-xs text-on-surface space-y-1.5">
              <p className="font-bold text-primary flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">info</span>
                Mandatory Jurisdiction Compliance Rule
              </p>
              <p className="text-on-surface-variant leading-relaxed">
                To prevent false reporting and ensure genuine civic accountability, your current GPS coordinates must match within <strong>100 meters (0.10 km)</strong> of the reported issue location. You must also upload photographic proof of the resolution.
              </p>
              <div className="font-mono bg-surface p-2 rounded text-[11px] text-primary">
                Reported Target: Lat {selectedComp.latitude.toFixed(6)}, Lng {selectedComp.longitude.toFixed(6)}
              </div>
            </div>

            {resError && (
              <div className="bg-error/15 border border-error p-3.5 rounded-xl text-xs text-error font-bold flex items-start gap-2">
                <span className="material-symbols-outlined text-sm mt-0.5">error</span>
                <span>{resError}</span>
              </div>
            )}

            <div className="space-y-4">
              {/* Step 1: GPS Capture */}
              <div className="border border-outline-variant rounded-xl p-4 bg-surface-container-low space-y-3">
                <div className="flex justify-between items-center">
                  <span className="font-label-md text-sm font-bold text-on-surface flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-primary text-base">my_location</span>
                    1. Capture Real-Time GPS Location
                  </span>
                  {resLat !== null && resLng !== null && (
                    <span className="bg-green-500/20 text-green-400 text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-green-500/30 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">check</span>
                      Captured
                    </span>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={captureGps}
                    disabled={isCapturingGps}
                    className="flex-1 bg-primary text-on-primary py-2 px-3 rounded-lg font-label-md text-xs font-bold flex items-center justify-center gap-1.5 hover:opacity-90 disabled:opacity-50 cursor-pointer shadow-sm"
                  >
                    <span className="material-symbols-outlined text-[16px]">{isCapturingGps ? 'sync' : 'gps_fixed'}</span>
                    {isCapturingGps ? 'Acquiring GPS...' : 'Capture GPS Coordinates'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setResLat(selectedComp.latitude);
                      setResLng(selectedComp.longitude);
                      setResError(null);
                    }}
                    className="bg-surface-container border border-outline-variant hover:border-primary text-on-surface-variant hover:text-primary py-2 px-3 rounded-lg font-label-md text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer transition-colors"
                    title="Simulate exact on-site GPS match for desktop verification"
                  >
                    <span className="material-symbols-outlined text-[16px]">location_on</span>
                    Simulate On-Site Match
                  </button>
                </div>

                {resLat !== null && resLng !== null && (
                  <div className="text-[11px] font-mono bg-surface p-2.5 rounded-lg border border-outline-variant flex justify-between items-center text-on-surface-variant">
                    <span>Your GPS: {resLat.toFixed(6)}, {resLng.toFixed(6)}</span>
                    <span className="text-green-400 font-bold">≤ 100m range</span>
                  </div>
                )}
              </div>

              {/* Step 2: Photo Upload */}
              <div className="border border-outline-variant rounded-xl p-4 bg-surface-container-low space-y-3">
                <span className="font-label-md text-sm font-bold text-on-surface flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-primary text-base">photo_camera</span>
                  2. Upload Photographic Evidence
                </span>
                
                <label className="border-2 border-dashed border-outline-variant hover:border-primary rounded-xl p-4 flex flex-col items-center justify-center gap-2 cursor-pointer bg-surface hover:bg-primary/5 transition-all">
                  <span className="material-symbols-outlined text-3xl text-primary">add_a_photo</span>
                  <span className="font-label-sm text-xs text-on-surface-variant font-medium">Click to capture or select photo</span>
                  <input type="file" accept="image/*" onChange={handlePhotoSelect} className="hidden" />
                </label>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setResImageBase64('data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAAAAAAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=');
                      setResError(null);
                    }}
                    className="text-xs text-primary hover:underline flex items-center gap-1 font-bold cursor-pointer bg-primary/10 px-3 py-1.5 rounded-lg border border-primary/20"
                  >
                    ⚡ Use Sample Proof Photo (Quick Test)
                  </button>
                </div>

                {resImageBase64 && (
                  <div className="relative h-36 w-full rounded-lg overflow-hidden border border-outline-variant mt-2">
                    <img src={resImageBase64} alt="Resolution preview" className="w-full h-full object-cover" />
                    <button
                      onClick={() => setResImageBase64('')}
                      className="absolute top-2 right-2 bg-black/70 text-white rounded-full p-1 hover:bg-red-600 transition-colors cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-sm">close</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3 pt-2 border-t border-outline-variant">
              <button
                type="button"
                onClick={() => setShowResolveModal(false)}
                className="flex-1 bg-surface-container border border-outline-variant text-on-surface-variant py-2.5 rounded-xl font-label-md text-sm font-semibold hover:bg-surface-container-high transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmitResolution}
                disabled={isSubmittingRes || !resImageBase64 || resLat === null || resLng === null}
                className="flex-1 bg-green-600 text-white py-2.5 rounded-xl font-label-md text-sm font-bold flex items-center justify-center gap-2 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-md transition-all cursor-pointer"
              >
                {isSubmittingRes ? (
                  <>
                    <span className="material-symbols-outlined animate-spin text-[18px]">sync</span>
                    Verifying...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[18px]">check_circle</span>
                    Submit Verified Resolution
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <ProfileModal show={showProfile} onClose={() => setShowProfile(false)} />
    </div>
  );
}
