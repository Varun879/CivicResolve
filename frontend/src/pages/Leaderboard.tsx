import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchLeaderboard } from '../api/rewards';
import { useAuth } from '../context/AuthContext';

export default function Leaderboard() {
  const [leaders, setLeaders] = useState<any[]>([]);
  const [filterRadius, setFilterRadius] = useState(true);
  const [userCoords, setUserCoords] = useState<{lat: number, lng: number} | null>(null);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    const saved = localStorage.getItem('user_location');
    if (saved) {
      try {
        const coords = JSON.parse(saved);
        setUserCoords(coords);
        loadLeaders(coords.lat, coords.lng, true);
        return;
      } catch (e) {}
    }
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          localStorage.setItem('user_location', JSON.stringify(coords));
          setUserCoords(coords);
          loadLeaders(coords.lat, coords.lng, true);
        },
        () => loadLeaders(undefined, undefined, false)
      );
    } else {
      loadLeaders(undefined, undefined, false);
    }
  }, []);

  const loadLeaders = (lat?: number, lng?: number, filter?: boolean) => {
    const lLat = filter ? (lat ?? userCoords?.lat) : undefined;
    const lLng = filter ? (lng ?? userCoords?.lng) : undefined;
    fetchLeaderboard(lLat, lLng).then(data => {
      const realLeaders = data.filter(l => 
        !l.name?.toLowerCase().includes('test') && 
        !l.name?.toLowerCase().includes('dummy') && 
        !l.name?.toLowerCase().includes('mock') && 
        !l.email?.endsWith('@example.com') && 
        !l.email?.toLowerCase().includes('test')
      );
      setLeaders(realLeaders);
    }).catch(console.error);
  };

  return (
    <div className="p-8 gap-6 flex flex-col w-full max-w-7xl mx-auto">
      <div className="max-w-4xl mx-auto w-full space-y-6">
        <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="font-display-sm text-primary flex items-center gap-2">
              <span>City Leaderboard</span>
              <span className="text-xs bg-primary/10 text-primary px-2.5 py-1 rounded-full font-bold uppercase tracking-wide">Real Citizens Only</span>
            </h1>
            <p className="text-sm text-on-surface-variant mt-1">
              {filterRadius && userCoords ? 'Showing active citizens within 5 km radius of your neighborhood' : '🌍 Showing active citizens across the entire city'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                const next = !filterRadius;
                setFilterRadius(next);
                loadLeaders(userCoords?.lat, userCoords?.lng, next);
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-full font-label-md text-sm transition-all border shadow-sm ${filterRadius ? 'bg-primary text-on-primary border-primary' : 'bg-surface-container border-outline-variant text-on-surface-variant hover:bg-surface-container-high'}`}
            >
              <span className="material-symbols-outlined text-[18px]">location_on</span>
              <span>5 km Radius Filter: {filterRadius ? 'ON' : 'OFF'}</span>
            </button>
            <span className="material-symbols-outlined text-4xl text-primary hidden sm:block" style={{fontVariationSettings: "'FILL' 1"}}>workspace_premium</span>
          </div>
        </header>

        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm">
          <div className="grid grid-cols-12 p-4 bg-surface-container-low font-label-md text-on-surface-variant border-b border-outline-variant">
            <div className="col-span-2 text-center">Rank</div>
            <div className="col-span-5">Citizen</div>
            <div className="col-span-3 text-center">Issues (Reported / Fixed)</div>
            <div className="col-span-2 text-right">Points</div>
          </div>
          <div className="flex flex-col">
            {leaders.length === 0 && <div className="p-8 text-center text-on-surface-variant">No active real citizen leaders in this radius yet. Report issues to earn points and claim #1!</div>}
            {leaders.map((leader, idx) => (
              <div 
                key={leader.id} 
                className={`grid grid-cols-12 p-4 items-center border-b border-outline-variant last:border-0 hover:bg-primary/10 hover:shadow-xs cursor-pointer transition-all duration-150 ${user?.email && leader.name === user.name ? 'bg-primary-container/20 border-l-4 border-l-primary' : ''}`}
              >
                <div className="col-span-2 text-center flex justify-center">
                  {idx === 0 ? <span className="text-2xl">🥇</span> : 
                   idx === 1 ? <span className="text-2xl">🥈</span> : 
                   idx === 2 ? <span className="text-2xl">🥉</span> : 
                   <span className="font-headline-sm text-on-surface-variant">{idx + 1}</span>}
                </div>
                <div className="col-span-5 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-on-primary font-bold shrink-0">
                    {leader.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="overflow-hidden">
                    <h3 className="font-label-lg text-on-surface truncate">{leader.name} {user?.email && leader.name === user.name && '(You)'}</h3>
                    <p className="font-body-sm text-primary">{leader.tier}</p>
                  </div>
                </div>
                <div className="col-span-3 text-center flex items-center justify-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-surface-container-high text-[11px] font-bold text-primary">
                    <span className="material-symbols-outlined text-[14px]">report</span> {leader.issuesReported ?? 0}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-secondary-container text-on-secondary-container text-[11px] font-bold">
                    <span className="material-symbols-outlined text-[14px]">check_circle</span> {leader.issuesResolved ?? 0}
                  </span>
                </div>
                <div className="col-span-2 text-right">
                  <span className="font-headline-md text-primary">{leader.points}</span>
                  <span className="font-label-sm text-on-surface-variant ml-1">pts</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
