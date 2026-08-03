import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchComplaints, type Complaint } from '../api/complaints';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import PortalHeader from '../components/PortalHeader';
import MapLegend from '../components/MapLegend';

// Create a custom icon for Leaflet markers using Material Symbols if possible, or standard pins
const createCustomIcon = (category: string) => {
  const iconHtml = `<div class="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-on-primary shadow-lg border-2 border-surface"><span class="material-symbols-outlined text-[16px]">${category === 'POTHOLE' ? 'warning' : 'info'}</span></div>`;
  return L.divIcon({
    html: iconHtml,
    className: 'custom-leaflet-icon',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32]
  });
};

const createUserIcon = () => {
  const iconHtml = `<div class="w-8 h-8 rounded-full bg-accent-amber flex items-center justify-center text-on-primary shadow-lg border-2 border-white animate-pulse"><span class="material-symbols-outlined text-[18px]">my_location</span></div>`;
  return L.divIcon({
    html: iconHtml,
    className: 'custom-leaflet-icon',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32]
  });
};

function getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function deg2rad(deg: number) {
  return deg * (Math.PI / 180);
}

// Component to recenter map to fit bounds of all markers
function MapBoundsFitter({ complaints, userLocation }: { complaints: Complaint[], userLocation: { lat: number; lng: number } | null }) {
  const map = useMap();
  useEffect(() => {
    const points: [number, number][] = complaints.map(c => [c.latitude, c.longitude]);
    if (userLocation) {
      points.push([userLocation.lat, userLocation.lng]);
    }
    if (points.length > 0) {
      const bounds = L.latLngBounds(points);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    }
  }, [complaints, userLocation, map]);
  return null;
}

export default function NearbyIssues() {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [filterRadius, setFilterRadius] = useState<boolean>(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchComplaints().then(setComplaints).catch(console.error);

    // Read stored location
    const stored = localStorage.getItem('user_location');
    if (stored) {
      try { setUserLocation(JSON.parse(stored)); } catch (e) {}
    }

    // Always ask/refresh geolocation on entering map
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords = { lat: position.coords.latitude, lng: position.coords.longitude };
          setUserLocation(coords);
          localStorage.setItem('user_location', JSON.stringify(coords));
        },
        (error) => console.warn("Location permission error:", error.message),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    }

    const handleLocUpdate = (e: any) => {
      if (e.detail) setUserLocation(e.detail);
    };
    window.addEventListener('location_updated', handleLocUpdate);
    return () => window.removeEventListener('location_updated', handleLocUpdate);
  }, []);

  const displayedComplaints = useMemo(() => {
    if (!filterRadius || !userLocation) return complaints;
    return complaints.filter(comp => {
      const dist = getDistanceFromLatLonInKm(userLocation.lat, userLocation.lng, comp.latitude, comp.longitude);
      return dist <= 5.0; // 5 km radius
    });
  }, [complaints, userLocation, filterRadius]);

  const defaultCenter: [number, number] = userLocation ? [userLocation.lat, userLocation.lng] : [40.7128, -74.0060];

  return (
    <div className="flex flex-col h-full w-full">
      <header className="flex justify-between items-center w-full px-8 py-4 bg-surface-container-lowest border-b border-outline-variant shrink-0 flex-wrap gap-4">
        <div>
          <h1 className="font-headline-sm text-primary">Nearby Issues Map</h1>
          <p className="font-body-sm text-on-surface-variant">
            {userLocation 
              ? `Your Location: ${userLocation.lat.toFixed(4)}, ${userLocation.lng.toFixed(4)}` 
              : "Requesting exact location permission..."}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-label-md text-on-surface">5 km Radius Filter:</span>
          <button
            onClick={() => setFilterRadius(!filterRadius)}
            className={`px-4 py-1.5 rounded-full font-label-sm font-bold transition-all shadow-sm ${
              filterRadius ? 'bg-primary text-on-primary' : 'bg-surface-container-high text-on-surface-variant'
            }`}
          >
            {filterRadius ? 'Active (Within 5 km)' : 'Disabled (Show All)'}
          </button>
        </div>
      </header>

      <main className="flex-1 flex p-6 gap-6 h-0">
        <div className="flex-1 bg-surface-container-lowest rounded-xl border border-outline-variant overflow-hidden relative shadow-sm z-0">
           <MapContainer 
             center={defaultCenter} 
             zoom={13} 
             style={{ height: '100%', width: '100%', zIndex: 0 }}
           >
             <TileLayer
               attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
               url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
             />
             <MapBoundsFitter complaints={displayedComplaints} userLocation={userLocation} />
             
             {userLocation && (
               <Marker position={[userLocation.lat, userLocation.lng]} icon={createUserIcon()}>
                 <Popup className="civic-popup">
                   <div className="p-2 text-center">
                     <span className="font-bold text-primary block">You Are Here</span>
                     <span className="text-xs text-on-surface-variant">Showing issues around 5 km radius</span>
                   </div>
                 </Popup>
               </Marker>
             )}

             {displayedComplaints.map(comp => (
               <Marker 
                 key={comp.id} 
                 position={[comp.latitude, comp.longitude]}
                 icon={createCustomIcon(comp.category)}
               >
                 <Popup className="civic-popup">
                   <div className="flex flex-col gap-2 p-1 min-w-[200px]">
                     <div className="flex justify-between items-start">
                        <h4 className="font-label-md text-primary font-bold m-0">{comp.category}</h4>
                        <span className="text-[10px] bg-surface-container-high px-1.5 py-0.5 rounded font-bold">{comp.status}</span>
                     </div>
                     <p className="font-body-sm m-0 line-clamp-2 text-on-surface-variant">{comp.description}</p>
                     <button 
                       onClick={() => navigate(`/citizen/complaint/${comp.id}`)}
                       className="mt-2 w-full bg-primary text-on-primary py-1.5 rounded text-xs font-bold hover:opacity-90"
                     >
                       View Details
                     </button>
                   </div>
                 </Popup>
               </Marker>
             ))}
           </MapContainer>
           {/* Map Legend */}
           <MapLegend />
        </div>
        <div className="w-96 bg-surface-container-lowest rounded-xl border border-outline-variant flex flex-col overflow-hidden shadow-sm shrink-0">
          <div className="p-4 border-b border-outline-variant bg-surface-container-low shrink-0 flex justify-between items-center">
             <h2 className="font-label-lg text-primary">Issues List ({displayedComplaints.length})</h2>
             {filterRadius && <span className="text-[10px] bg-primary/10 text-primary font-bold px-2 py-0.5 rounded">&le; 5 km</span>}
          </div>
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
            {displayedComplaints.length === 0 && (
              <div className="text-on-surface-variant text-center mt-8 text-sm p-4">
                <p className="mb-2">No issues found {filterRadius ? 'within 5 km of your location' : ''}.</p>
                {filterRadius && (
                  <button 
                    onClick={() => setFilterRadius(false)}
                    className="text-primary font-bold underline text-xs hover:opacity-80"
                  >
                    Show all city issues
                  </button>
                )}
              </div>
            )}
            {displayedComplaints.map(comp => {
              const dist = userLocation ? getDistanceFromLatLonInKm(userLocation.lat, userLocation.lng, comp.latitude, comp.longitude) : null;
              return (
                <div key={comp.id} onClick={() => navigate(`/citizen/complaint/${comp.id}`)} className="p-4 border border-outline-variant rounded-lg hover:border-primary hover:bg-primary/5 transition-all duration-200 cursor-pointer shadow-sm hover:shadow-md hover:-translate-y-0.5 group">
                  <div className="flex justify-between items-start mb-2 gap-2">
                    <h4 className="font-label-md text-primary font-bold group-hover:text-primary transition-colors">{comp.category}</h4>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wide shrink-0 ${
                      comp.status === 'RESOLVED' ? 'bg-secondary-container text-on-secondary-container' : 'bg-tertiary-fixed text-on-tertiary-fixed'
                    }`}>
                      {comp.status}
                    </span>
                  </div>
                  <p className="font-body-sm text-on-surface-variant line-clamp-2 mb-2">{comp.description}</p>
                  {dist !== null && (
                    <div className="flex items-center gap-1 text-[11px] font-mono text-primary font-semibold">
                      <span className="material-symbols-outlined text-[14px]">near_me</span>
                      {dist.toFixed(1)} km away
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}
