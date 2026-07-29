import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { useNavigate } from 'react-router-dom';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import type { Complaint } from '../api/complaints';

// Create custom icon matching Citizen portal's NearbyIssues map interface exactly
const createCustomIcon = (category: string, isEscalated?: boolean) => {
  const bgColor = isEscalated ? 'bg-error' : 'bg-primary';
  const iconHtml = `<div class="w-8 h-8 rounded-full ${bgColor} flex items-center justify-center text-on-primary shadow-lg border-2 border-surface"><span class="material-symbols-outlined text-[16px]">${category === 'POTHOLE' ? 'warning' : isEscalated ? 'priority_high' : 'info'}</span></div>`;
  return L.divIcon({
    html: iconHtml,
    className: 'custom-leaflet-icon',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32]
  });
};

// Component to recenter map to fit bounds of all markers
function MapBoundsFitter({ complaints }: { complaints: Complaint[] }) {
  const map = useMap();
  useEffect(() => {
    const points: [number, number][] = complaints
      .filter(c => c.latitude && c.longitude)
      .map(c => [c.latitude, c.longitude]);
    
    if (points.length > 0) {
      const bounds = L.latLngBounds(points);
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
    }
  }, [complaints, map]);
  return null;
}

interface ComplaintMapProps {
  complaints: Complaint[];
  height?: string;
  center?: [number, number];
  zoom?: number;
}

export default function ComplaintMap({ 
  complaints, 
  height = '320px',
  center = [28.6139, 77.2090],
  zoom = 12
}: ComplaintMapProps) {
  const navigate = useNavigate();
  const validComplaints = complaints.filter(c => c.latitude && c.longitude);
  const mapCenter = validComplaints.length > 0 
    ? [validComplaints[0].latitude, validComplaints[0].longitude] as [number, number]
    : center;

  return (
    <div style={{ height, width: '100%', zIndex: 0 }} className="rounded-lg overflow-hidden border border-outline-variant bg-surface-container-lowest shadow-sm">
      <MapContainer center={mapCenter} zoom={zoom} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapBoundsFitter complaints={validComplaints} />
        {validComplaints.map(comp => (
          <Marker key={comp.id} position={[comp.latitude, comp.longitude]} icon={createCustomIcon(comp.category, comp.isEscalated)}>
            <Popup className="civic-popup">
              <div className="flex flex-col gap-2 p-1 min-w-[200px]">
                <div className="flex justify-between items-start">
                  <h4 className="font-label-md text-primary font-bold m-0">{comp.category}</h4>
                  <span className="text-[10px] bg-surface-container-high px-1.5 py-0.5 rounded font-bold">{comp.status}</span>
                </div>
                {comp.isEscalated && (
                  <span className="bg-error/10 text-error font-bold text-[10px] px-1.5 py-0.5 rounded w-fit flex items-center gap-1">
                    ⚠️ SLA Breached / Escalated
                  </span>
                )}
                <p className="font-body-sm m-0 line-clamp-2 text-on-surface-variant">{comp.description}</p>
                <button 
                  onClick={() => navigate(`/complaint/${comp.id}`)}
                  className="mt-2 w-full bg-primary text-on-primary py-1.5 rounded text-xs font-bold hover:opacity-90 transition-opacity cursor-pointer flex items-center justify-center gap-1"
                >
                  <span>View Details</span>
                  <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                </button>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
