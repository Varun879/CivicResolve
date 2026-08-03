import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchComplaints, fetchNearbyComplaints, type Complaint } from '../api/complaints';
import { fetchUserRewards, type RewardData } from '../api/rewards';
import EmptyState from '../components/EmptyState';

const formatDate = (dateString?: string) => {
  if (!dateString) return 'Not Available';
  return new Date(dateString).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

const formatEnum = (value?: string) => {
  if (!value) return 'Not Available';
  return value.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
};

export default function CitizenDashboard() {
  const [myComplaints, setMyComplaints] = useState<Complaint[]>([]);
  const [nearbyComplaints, setNearbyComplaints] = useState<Complaint[]>([]);
  const [rewards, setRewards] = useState<RewardData | null>(null);
  const [activeTab, setActiveTab] = useState<'my_reports' | 'nearby_5km'>('my_reports');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'RESOLVED'>('ALL');
  const [visibleCount, setVisibleCount] = useState(5);
  const [coords, setCoords] = useState<{lat: number, lng: number} | null>(null);
  const [locationStatus, setLocationStatus] = useState<'requesting' | 'granted' | 'denied'>('requesting');
  const [neighborhood, setNeighborhood] = useState<string>('Local Municipal Zone');
  const [isRefreshingLoc, setIsRefreshingLoc] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadDashboardData();
    requestLocation(false);
  }, []);

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      const [comps, rws] = await Promise.all([
        fetchComplaints(),
        fetchUserRewards()
      ]);
      setMyComplaints(comps);
      setRewards(rws);
    } catch (e) {
      console.error("Failed to fetch dashboard data");
    } finally {
      setIsLoading(false);
    }
  };

  const requestLocation = (showToast = true) => {
    if (showToast) setIsRefreshingLoc(true);
    setLocationStatus('requesting');
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setCoords(loc);
          setLocationStatus('granted');
          localStorage.setItem('user_location', JSON.stringify(loc));
          fetchNearbyComplaints(loc.lat, loc.lng, 5.0).then(setNearbyComplaints).catch(console.error);
          
          // Try lightweight reverse geocode for exact neighborhood name across all address levels
          fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${loc.lat}&lon=${loc.lng}&zoom=16&addressdetails=1`, {
            headers: { 'Accept-Language': 'en' }
          })
            .then(r => r.json())
            .then(d => {
              if (d && d.address) {
                const place = d.address.suburb || 
                              d.address.neighbourhood || 
                              d.address.residential || 
                              d.address.locality || 
                              d.address.quarter || 
                              d.address.city_district || 
                              d.address.district || 
                              d.address.village || 
                              d.address.town || 
                              d.address.city || 
                              d.address.county || 
                              d.address.state_district || 
                              (d.display_name ? d.display_name.split(',')[0].trim() : "Municipal Zone");
                setNeighborhood(place);
              } else if (d && d.display_name) {
                setNeighborhood(d.display_name.split(',')[0].trim());
              }
            })
            .catch(() => setNeighborhood("Municipal Zone"));

          if (showToast) {
            setIsRefreshingLoc(false);
            setToastMsg('Exact GPS location refreshed and verified!');
            setTimeout(() => setToastMsg(null), 3500);
          }
        },
        (err) => {
          console.warn("Location permission denied or unavailable:", err);
          setLocationStatus('denied');
          if (showToast) {
            setIsRefreshingLoc(false);
            setToastMsg('⚠️ Location access denied. Using municipal defaults.');
            setTimeout(() => setToastMsg(null), 3500);
          }
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      setLocationStatus('denied');
      if (showToast) setIsRefreshingLoc(false);
    }
  };

  return (
    <div className="p-8 gap-6 flex flex-col w-full max-w-7xl mx-auto relative">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-ink-primary text-surface px-5 py-3 rounded-xl shadow-2xl font-label-md text-sm font-bold flex items-center gap-3 animate-in fade-in slide-in-from-bottom-5 duration-200 border border-border-default/20">
          <span>{toastMsg}</span>
        </div>
      )}

      {/* 1. VISUAL HIERARCHY: Reduced hero height (~30% tighter padding), secondary CTA */}
      <section className="bg-surface border border-border-default rounded-xl py-5 px-8 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden shadow-sm">
        <div className="absolute right-0 top-0 w-1/2 h-full bg-gradient-to-l from-brand-primary/10 to-transparent pointer-events-none rounded-r-xl"></div>
        <div className="flex flex-col gap-2 z-10 max-w-2xl">
          <h2 className="font-display-lg text-display-md md:text-display-lg text-ink-primary tracking-tight font-bold">Your City, Your Voice.</h2>
          <p className="font-body-md text-sm md:text-body-lg text-ink-secondary leading-relaxed">Report issues in seconds. Keep your neighborhood safe, clean, and functioning efficiently by logging civic concerns directly to city planning teams.</p>
          <div className="mt-3 flex items-center gap-3 flex-wrap">
            <button
              onClick={() => navigate('/citizen/leaderboard')}
              className="bg-surface border border-brand-primary text-brand-primary px-6 py-2.5 rounded-lg font-label-md text-sm font-bold flex items-center gap-2 hover:bg-brand-primary/10 hover:brightness-90 hover:scale-[1.02] shadow-sm hover:shadow-md transition-all duration-150 ease-in-out focus:ring-2 focus:ring-brand-primary focus:ring-offset-2 focus:outline-none cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">emoji_events</span>
              View Community Leaderboard
            </button>
            <button
              onClick={() => navigate('/citizen/map')}
              className="bg-page border border-border-default text-ink-secondary px-5 py-2.5 rounded-lg font-label-md text-sm font-bold flex items-center gap-2 hover:bg-surface hover:text-ink-primary hover:scale-[1.02] shadow-xs hover:shadow-sm transition-all duration-150 ease-in-out focus:ring-2 focus:ring-ink-secondary focus:ring-offset-2 focus:outline-none cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">explore</span>
              Explore Nearby Map
            </button>
          </div>
        </div>
      </section>

      {/* 2. GPS STATUS BANNER: Neighborhood name, coordinate tooltip, WCAG AA contrast, loading spinner */}
      <div className="p-6 rounded-2xl border border-blue-400/30 shadow-xl transition-all duration-200 ease-in-out bg-gradient-to-r from-ink-primary via-[#1E3A5F] to-brand-primary text-white flex flex-col sm:flex-row items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-white shrink-0 shadow-inner backdrop-blur-sm">
            <span className="material-symbols-outlined text-3xl text-cyan-300">
              {locationStatus === 'granted' ? 'my_location' : 'location_off'}
            </span>
          </div>
          <div>
            <h4 className="font-headline-md text-base md:text-lg font-bold text-white flex items-center gap-2 flex-wrap">
              {locationStatus === 'granted' ? (
                <>
                  <span>Active District: <strong className="text-cyan-300 font-black tracking-wide underline decoration-cyan-300/80 underline-offset-4">{neighborhood}</strong> (5 km Radius)</span>
                  <span className="relative group inline-flex items-center gap-1 cursor-help font-bold text-xs bg-cyan-400 text-ink-primary px-2.5 py-0.5 rounded-md shadow-sm font-mono">
                    GPS Info ⓘ
                    <span className="absolute bottom-full left-0 mb-2 w-64 p-3 bg-surface text-ink-primary text-xs rounded-lg shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 z-50 pointer-events-none font-mono border border-border-default">
                      Exact Lat: {coords?.lat.toFixed(5)}<br/>
                      Exact Lng: {coords?.lng.toFixed(5)}<br/>
                      Verified by Municipal Geocoder
                    </span>
                  </span>
                </>
              ) : '⚠️ Location Permission Required'}
            </h4>
            <p className="font-body-sm text-sm text-blue-100 mt-1 font-normal max-w-2xl leading-relaxed">
              {locationStatus === 'granted'
                ? 'Showing local field officer jurisdiction and nearby community reports strictly in your area.'
                : 'To display nearby community issues in their exact place and assign local field officers, please enable GPS location access.'}
            </p>
          </div>
        </div>
        <button
          onClick={() => requestLocation(true)}
          disabled={isRefreshingLoc}
          className="px-6 py-3 rounded-xl font-label-md text-sm font-extrabold transition-all duration-200 ease-in-out shadow-lg whitespace-nowrap flex items-center justify-center gap-2 bg-white text-ink-primary hover:bg-cyan-50 hover:scale-[1.03] hover:shadow-xl focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-ink-primary focus:outline-none cursor-pointer shrink-0"
        >
          {isRefreshingLoc ? (
            <>
              <span className="material-symbols-outlined animate-spin text-base text-brand-primary">refresh</span>
              <span>Locating...</span>
            </>
          ) : (
            <>
              <span className="material-symbols-outlined text-base text-brand-primary">my_location</span>
              <span>{locationStatus === 'granted' ? 'Refresh Exact Location' : 'Allow Location Permission'}</span>
            </>
          )}
        </button>
      </div>

      {/* Bento Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-1">
        {/* Left Column (Main Focus) */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          {/* Reports Section with Tabs */}
          <section className="bg-surface border border-border-default rounded-xl p-6 shadow-sm">
            {/* 3. TABS: Strengthened active underline (color + thickness), animated transition, distinct hover state */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 border-b border-border-default pb-0 gap-4">
              <div className="flex items-center gap-6 overflow-x-auto w-full sm:w-auto">
                <button
                  onClick={() => { setActiveTab('my_reports'); setVisibleCount(5); }}
                  className={`font-headline-md text-sm md:text-base pb-3 border-b-4 transition-all duration-150 ease-in-out flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:ring-offset-2 rounded-t-lg px-2 cursor-pointer whitespace-nowrap ${
                    activeTab === 'my_reports'
                      ? 'text-brand-primary border-brand-primary font-bold shadow-xs'
                      : 'text-ink-secondary border-transparent hover:text-brand-primary hover:border-brand-primary/50 hover:bg-brand-primary/10 font-medium'
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]" aria-hidden="true">person_pin</span>
                  My Recent Reports ({myComplaints.length})
                </button>
                <button
                  onClick={() => { setActiveTab('nearby_5km'); setVisibleCount(5); }}
                  className={`font-headline-md text-sm md:text-base pb-3 border-b-4 transition-all duration-150 ease-in-out flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:ring-offset-2 rounded-t-lg px-2 cursor-pointer whitespace-nowrap ${
                    activeTab === 'nearby_5km'
                      ? 'text-brand-primary border-brand-primary font-bold shadow-xs'
                      : 'text-ink-secondary border-transparent hover:text-brand-primary hover:border-brand-primary/50 hover:bg-brand-primary/10 font-medium'
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px] text-brand-primary" aria-hidden="true">location_on</span>
                  Nearby Issues ({nearbyComplaints.length})
                </button>
              </div>
              <div className="pb-3 flex-shrink-0">
                <select 
                  value={statusFilter}
                  onChange={(e) => { setStatusFilter(e.target.value as any); setVisibleCount(5); }}
                  className="bg-surface border border-border-default rounded-md px-3 py-1.5 text-sm font-label-md text-ink-primary focus:outline-none focus:ring-2 focus:ring-brand-primary cursor-pointer shadow-sm"
                  aria-label="Filter complaints by status"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="ACTIVE">Active (In Progress)</option>
                  <option value="RESOLVED">Resolved / Closed</option>
                </select>
              </div>
            </div>

            {/* 6. LOADING STATES: Skeleton loaders */}
            {isLoading ? (
              <div className="flex flex-col gap-4 animate-pulse">
                {[1, 2, 3].map(i => (
                  <div key={i} className="flex items-center gap-4 p-4 border border-border-default bg-surface rounded-lg">
                    <div className="w-16 h-16 rounded bg-page flex-shrink-0 border border-border-default/50"></div>
                    <div className="flex-1 space-y-2 py-1">
                      <div className="h-4 bg-page rounded w-1/3"></div>
                      <div className="h-3 bg-page rounded w-3/4"></div>
                      <div className="h-3 bg-page rounded w-1/4"></div>
                    </div>
                    <div className="w-20 h-9 bg-page rounded"></div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {/* Dynamic List Render with Filtering */}
                {(() => {
                  const baseList = activeTab === 'my_reports' ? myComplaints : nearbyComplaints;
                  
                  if (baseList.length === 0) {
                    return (
                      <div className="h-64 mt-4">
                        <EmptyState 
                          title={activeTab === 'my_reports' ? 'No reports submitted yet' : 'No nearby issues found'} 
                          icon="campaign" 
                          body={activeTab === 'my_reports'
                            ? 'You have not logged any civic issues yet. Be the first to speak up and improve your neighborhood!'
                            : 'There are currently no active community concerns reported within 5 km of your GPS location.'}
                          action={activeTab === 'my_reports' ? (
                            <button
                              onClick={() => navigate('/citizen/report')}
                              className="mt-2 bg-brand-primary text-white px-6 py-2.5 rounded-lg font-label-md text-sm font-bold flex items-center gap-2 hover:brightness-90 hover:scale-[1.02] shadow-sm hover:shadow-md transition-all duration-150 ease-in-out focus:ring-2 focus:ring-brand-primary focus:ring-offset-2 focus:outline-none cursor-pointer"
                            >
                              <span className="material-symbols-outlined text-[18px]" aria-hidden="true">add_circle</span>
                              Report Your First Issue
                            </button>
                          ) : undefined}
                        />
                      </div>
                    );
                  }

                  const filteredList = baseList.filter(comp => {
                    if (statusFilter === 'ACTIVE') return comp.status !== 'RESOLVED' && comp.status !== 'CLOSED';
                    if (statusFilter === 'RESOLVED') return comp.status === 'RESOLVED' || comp.status === 'CLOSED';
                    return true;
                  });

                  if (filteredList.length === 0) {
                    return (
                      <div className="h-40 mt-4">
                        <EmptyState title="No reports match the selected filter." icon="filter_list_off" />
                      </div>
                    );
                  }

                  const slicedList = filteredList.slice(0, visibleCount);

                  return (
                    <>
                      {slicedList.map(comp => {
                        const slaDate = comp.slaDeadline ? new Date(comp.slaDeadline) : null;
                    const isOverdue = slaDate ? slaDate.getTime() < Date.now() : false;
                    const totalSlaTime = slaDate ? (slaDate.getTime() - new Date(comp.createdAt).getTime()) : 1;
                    const timePassed = slaDate ? (Date.now() - new Date(comp.createdAt).getTime()) : 0;
                    let slaProgress = slaDate ? Math.min(100, Math.max(0, (timePassed / totalSlaTime) * 100)) : 0;
                    const daysLeft = slaDate ? Math.ceil((slaDate.getTime() - Date.now()) / (1000 * 3600 * 24)) : 0;
                    
                    let priorityColor = "bg-accent-amber";
                    if (comp.status === 'RESOLVED' || comp.status === 'CLOSED') priorityColor = "bg-accent-green";
                    else if (isOverdue) priorityColor = "bg-accent-red";

                    let ribbonColor = "bg-accent-green";
                    if (slaProgress > 75) ribbonColor = "bg-accent-red";
                    else if (slaProgress > 50) ribbonColor = "bg-accent-amber";
                    if (comp.status === 'RESOLVED' || comp.status === 'CLOSED') ribbonColor = "bg-accent-green";

                    return (
                    <div key={comp.id} className="relative flex items-center gap-4 p-4 border border-border-default bg-surface rounded-lg hover:border-brand-primary hover:bg-brand-primary/5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-150 ease-in-out group shadow-sm overflow-hidden pl-5 cursor-pointer" onClick={() => navigate(`/citizen/complaint/${comp.id}`)}>
                      {/* Priority Tab */}
                      <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${priorityColor}`}></div>
                      
                      {/* SLA Ribbon */}
                      {comp.status !== 'RESOLVED' && comp.status !== 'CLOSED' && (
                        <div className="absolute top-0 left-1.5 right-0 h-1 bg-border-default opacity-30">
                          <div className={`h-full ${ribbonColor}`} style={{ width: `${slaProgress}%` }}></div>
                        </div>
                      )}

                      <div className="w-16 h-16 rounded border border-border-default bg-page flex items-center justify-center text-2xl flex-shrink-0 overflow-hidden mt-1 shadow-xs">
                        {comp.imageBase64 ? (
                          <img src={comp.imageBase64.startsWith('data:') ? comp.imageBase64 : `data:image/jpeg;base64,${comp.imageBase64}`} alt="Complaint thumbnail" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200" />
                        ) : (
                          <span className="material-symbols-outlined text-ink-secondary/50 text-[32px]" aria-hidden="true">image_not_supported</span>
                        )}
                      </div>
                      <div className="flex-1 overflow-hidden mt-1">
                        <div className="flex items-center gap-3 mb-1 flex-wrap">
                          <span className="font-mono text-[13px] text-ink-secondary font-medium">{comp.publicId || 'ID Not Available'}</span>
                          <h4 className="font-headline-md text-label-md text-ink-primary truncate font-bold group-hover:text-brand-primary transition-colors">{formatEnum(comp.category)}</h4>
                          
                          {/* Stamped Chip */}
                          <span className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-[11px] font-bold uppercase tracking-wide ${
                            (comp.status === 'RESOLVED' || comp.status === 'CLOSED') ? 'border-accent-green text-accent-green bg-accent-green/10' : 'border-accent-amber text-accent-amber bg-accent-amber/10'
                          }`}>
                            <span className="material-symbols-outlined text-[12px]" style={{fontVariationSettings: "'FILL' 1"}} aria-hidden="true">
                              {(comp.status === 'RESOLVED' || comp.status === 'CLOSED') ? 'check_circle' : 'pending'}
                            </span>
                            {formatEnum(comp.status)}
                          </span>
                          {activeTab === 'nearby_5km' && comp.distanceToOfficerKm !== undefined && (
                            <span className="text-xs bg-brand-primary/10 text-brand-primary font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 border border-brand-primary/30 shadow-xs">
                              <span className="material-symbols-outlined text-[12px]" aria-hidden="true">location_on</span>
                              {comp.distanceToOfficerKm.toFixed(1)} km away
                            </span>
                          )}
                        </div>
                        <p className="font-body-sm text-body-sm text-ink-secondary truncate mb-1.5">{comp.description || 'No description provided.'}</p>
                        <div className="flex items-center gap-4 flex-wrap font-mono text-[11px] text-ink-secondary">
                          <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px]" aria-hidden="true">calendar_today</span>{formatDate(comp.createdAt)}</span>
                          <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px]" aria-hidden="true">engineering</span>{comp.assignedOfficerName ? `Assigned: ${comp.assignedOfficerName}` : 'Unassigned'}</span>
                          {slaDate && comp.status !== 'RESOLVED' && comp.status !== 'CLOSED' && (
                            <span className={`flex items-center gap-1 ${isOverdue ? 'text-accent-red font-bold animate-pulse' : ''}`}>
                              <span className="material-symbols-outlined text-[14px]" aria-hidden="true">{isOverdue ? 'warning' : 'schedule'}</span>
                              {isOverdue ? 'Overdue' : `${daysLeft} days left`}
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        className="bg-surface border border-brand-primary px-4 py-2 rounded-md font-label-md text-sm font-bold text-brand-primary opacity-90 sm:opacity-0 group-hover:opacity-100 hover:brightness-90 hover:scale-[1.02] hover:bg-brand-primary/10 transition-all duration-150 ease-in-out focus:ring-2 focus:ring-brand-primary focus:ring-offset-2 focus:outline-none focus:opacity-100 shadow-sm hover:shadow-md whitespace-nowrap cursor-pointer"
                        aria-label="Track Issue"
                      >
                        Track Issue →
                      </button>
                    </div>
                    )
                  })}
                  {visibleCount < filteredList.length && (
                    <button 
                      onClick={() => setVisibleCount(v => v + 5)} 
                      className="w-full py-3 mt-2 text-brand-primary font-bold hover:bg-brand-primary/10 rounded-lg transition-colors border border-brand-primary/20 bg-surface focus:outline-none focus:ring-2 focus:ring-brand-primary focus:ring-offset-2 cursor-pointer shadow-sm"
                    >
                      Load More Issues ({filteredList.length - visibleCount} remaining)
                    </button>
                  )}
                  </>
                  );
                })()}
              </div>
            )}
          </section>
        </div>

        {/* Right Column (Contextual & Stats) */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          {/* 5. IMPACT SUMMARY CARD: Horizontal progress bar to Silver, stats row */}
          <section className="bg-surface border border-border-default rounded-xl p-6 shadow-sm">
            <div className="border-b border-border-default pb-4 mb-6 flex justify-between items-center">
              <h3 className="font-headline-md text-headline-md text-ink-primary font-bold">Impact Summary</h3>
              <span className="text-xs text-brand-primary font-bold bg-brand-primary/10 px-2.5 py-1 rounded-full border border-brand-primary/20">Live Status</span>
            </div>
            
            {isLoading ? (
              <div className="flex flex-col items-center justify-center p-6 bg-page rounded-lg mb-2 border border-border-default border-dashed animate-pulse space-y-4">
                <div className="w-16 h-16 rounded-full bg-border-default"></div>
                <div className="h-6 bg-border-default rounded w-1/3"></div>
                <div className="h-4 bg-border-default rounded w-1/2"></div>
                <div className="w-full h-3 bg-border-default rounded-full mt-2"></div>
                <div className="grid grid-cols-3 gap-2 w-full mt-4 pt-4 border-t border-border-default">
                  <div className="h-12 bg-border-default rounded"></div>
                  <div className="h-12 bg-border-default rounded"></div>
                  <div className="h-12 bg-border-default rounded"></div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-6 bg-page rounded-lg mb-2 border border-border-default border-dashed transition-all duration-200">
                <div className="w-16 h-16 rounded-full bg-brand-primary/10 text-brand-primary flex items-center justify-center mb-3 shadow-inner">
                  <span className="material-symbols-outlined text-[32px]" style={{fontVariationSettings: "'FILL' 1"}}>shield</span>
                </div>
                <h4 className="font-headline-md text-headline-md text-ink-primary mb-1 font-bold">{rewards?.tier || 'Bronze Tier'}</h4>
                <p className="font-body-sm text-body-sm text-ink-secondary text-center">
                  {rewards?.isTopContributor 
                    ? '🏆 Top 10% Contributor' 
                    : rewards ? `${rewards.pointsToNextTier} pts needed for ${rewards.nextTier}` : '100 pts needed for Silver'}
                </p>

                {/* 4. HOVER / INTERACTION STATES: Civic Points badge tooltip */}
                <div className="relative group cursor-pointer mt-3">
                  <div className="bg-surface px-5 py-2 rounded-full border border-border-default shadow-sm flex items-center gap-2 hover:border-brand-primary/50 hover:bg-page transition-all duration-150 ease-in-out">
                    <span className="font-mono text-lg font-bold text-brand-primary">{rewards?.points || 0}</span>
                    <span className="font-label-sm text-xs text-ink-secondary uppercase tracking-wide font-bold flex items-center gap-1">
                      Civic Points ⓘ
                    </span>
                  </div>
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-ink-primary text-surface text-xs rounded-lg shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 pointer-events-none">
                    <p className="font-bold border-b border-surface/20 pb-1 mb-1.5 flex justify-between">
                      <span>📊 Points Breakdown</span>
                      <span className="text-accent-green">Active</span>
                    </p>
                    <div className="flex justify-between mb-1"><span>Current Tier:</span> <span className="font-bold text-accent-green">{rewards?.tier || 'Bronze'}</span></div>
                    <div className="flex justify-between mb-1"><span>Total Points:</span> <span className="font-mono font-bold">{rewards?.points || 0} pts</span></div>
                    <div className="flex justify-between"><span>Next Target:</span> <span className="font-mono">{rewards ? `${rewards.pointsToNextTier} pts to ${rewards.nextTier}` : '100 pts to Silver'}</span></div>
                  </div>
                </div>

                {/* 5. IMPACT SUMMARY CARD: Horizontal progress bar showing points progress to Silver */}
                <div className="w-full mt-5 mb-1">
                  <div className="flex justify-between text-xs font-mono font-bold text-ink-secondary mb-1.5">
                    <span>{rewards?.points || 0} pts</span>
                    <span>{rewards?.nextTier || 'Silver'} ({rewards ? (rewards.points || 0) + (rewards.pointsToNextTier || 100) : 100} pts)</span>
                  </div>
                  <div className="w-full h-2.5 bg-border-default/60 rounded-full overflow-hidden shadow-inner">
                    <div 
                      className="h-full bg-gradient-to-r from-brand-primary to-accent-green rounded-full transition-all duration-500 ease-out"
                      style={{ width: `${Math.min(100, Math.max(0, ((rewards?.points || 0) / ((rewards?.points || 0) + (rewards?.pointsToNextTier || 100))) * 100))}%` }}
                    ></div>
                  </div>
                  <p className="text-[11px] text-center text-ink-secondary mt-2">
                    Earn <strong className="text-brand-primary">+{rewards?.pointsToNextTier || 100} pts</strong> by reporting or voting on civic issues!
                  </p>
                </div>

                {/* 5. IMPACT SUMMARY CARD: Compact stats row (Reports Filed, Issues Resolved, Community Rank) */}
                <div className="grid grid-cols-3 gap-2 w-full mt-4 pt-4 border-t border-border-default/80 text-center">
                  <div className="p-2 rounded-lg bg-surface border border-border-default/50 shadow-xs hover:border-brand-primary/40 transition-all duration-150">
                    <div className="font-mono font-bold text-lg text-ink-primary">{myComplaints.length}</div>
                    <div className="text-[10px] uppercase font-bold text-ink-secondary tracking-tight mt-0.5">Filed</div>
                  </div>
                  <div className="p-2 rounded-lg bg-surface border border-border-default/50 shadow-xs hover:border-accent-green/40 transition-all duration-150">
                    <div className="font-mono font-bold text-lg text-accent-green">
                      {myComplaints.filter(c => c.status === 'RESOLVED').length}
                    </div>
                    <div className="text-[10px] uppercase font-bold text-ink-secondary tracking-tight mt-0.5">Resolved</div>
                  </div>
                  <div className="p-2 rounded-lg bg-surface border border-border-default/50 shadow-xs hover:border-brand-primary/40 transition-all duration-150">
                    <div className="font-mono font-bold text-lg text-brand-primary">#{rewards?.rank || 1}</div>
                    <div className="text-[10px] uppercase font-bold text-ink-secondary tracking-tight mt-0.5">Rank</div>
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
