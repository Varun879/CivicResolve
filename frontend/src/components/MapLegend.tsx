import React from 'react';

export default function MapLegend() {
  return (
    <div className="absolute bottom-4 right-4 z-[400] bg-surface p-3 rounded-lg border border-outline-variant shadow-lg text-xs font-medium space-y-2">
      <h5 className="font-bold text-on-surface mb-2 border-b border-outline-variant pb-1">Legend</h5>
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 rounded-full bg-primary shadow-sm"></div>
        <span className="text-on-surface-variant">Standard Issue</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 rounded-full bg-error shadow-sm"></div>
        <span className="text-on-surface-variant">High/Critical</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 rounded-full bg-accent-amber shadow-sm border border-white"></div>
        <span className="text-on-surface-variant">Your Location</span>
      </div>
    </div>
  );
}
