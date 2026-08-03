import React from 'react';
import { type Complaint } from '../api/complaints';

interface OfficialComplaintModalProps {
  show: boolean;
  onClose: () => void;
  complaint: Complaint | null;
}

export default function OfficialComplaintModal({ show, onClose, complaint }: OfficialComplaintModalProps) {
  if (!show || !complaint) return null;

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div 
        className="bg-surface border border-outline-variant rounded-2xl max-w-2xl w-full p-6 shadow-2xl flex flex-col gap-6 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-start border-b border-outline-variant pb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={`font-label-sm text-label-sm px-2 py-1 rounded-sm uppercase tracking-wide ${complaint.severity === 'HIGH' ? 'bg-error/20 text-error' : complaint.severity === 'MEDIUM' ? 'bg-amber-500/20 text-amber-700' : 'bg-green-500/20 text-green-700'}`}>
                {complaint.severity}
              </span>
              <span className="bg-surface-container-high text-on-surface-variant font-label-sm text-label-sm px-2 py-1 rounded-sm">
                {complaint.category}
              </span>
              {complaint.isEscalated && (
                <span className="bg-error text-white font-label-sm text-label-sm px-2 py-1 rounded-sm ml-2 animate-pulse">
                  ESCALATED
                </span>
              )}
            </div>
            <h2 className="font-headline-md text-lg font-bold text-primary">{complaint.title || `${complaint.category} Issue`}</h2>
            <p className="text-on-surface-variant text-xs mt-1 font-mono">ID: {complaint.id}</p>
          </div>
          <button onClick={onClose} className="text-on-surface-variant hover:text-on-surface text-xl font-bold cursor-pointer">
            ✕
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <div className="text-label-sm font-label-sm text-on-surface-variant uppercase tracking-wider mb-1">Description</div>
              <p className="font-body-md text-body-md text-on-surface-variant p-3 bg-surface-container-low rounded-lg border border-outline-variant">
                {complaint.description || "No description provided."}
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-surface-container-low rounded-lg p-3 border border-outline-variant">
                <div className="text-[10px] text-on-surface-variant uppercase tracking-wider mb-1">Status</div>
                <div className="font-bold text-primary">{complaint.status}</div>
              </div>
              <div className="bg-surface-container-low rounded-lg p-3 border border-outline-variant">
                <div className="text-[10px] text-on-surface-variant uppercase tracking-wider mb-1">Reported On</div>
                <div className="font-bold text-primary text-sm">{formatDate(complaint.createdAt)}</div>
              </div>
            </div>

            <div className="bg-surface-container-low rounded-lg p-3 border border-outline-variant">
              <div className="text-[10px] text-on-surface-variant uppercase tracking-wider mb-1">Assigned Officer</div>
              {complaint.assignedOfficerName ? (
                <div>
                  <div className="font-bold text-primary">{complaint.assignedOfficerName}</div>
                  <div className="text-xs text-on-surface-variant">{complaint.assignedOfficerPhone || 'No phone'} | {complaint.assignedOfficerDepartment}</div>
                </div>
              ) : (
                <div className="text-on-surface-variant italic text-sm">Unassigned</div>
              )}
            </div>

            <div className="bg-surface-container-low rounded-lg p-3 border border-outline-variant">
              <div className="text-[10px] text-on-surface-variant uppercase tracking-wider mb-1">AI Confidence Score</div>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-xl">psychology</span>
                <span className="font-bold text-primary">{complaint.aiConfidenceScore ? (complaint.aiConfidenceScore * 100).toFixed(1) + '%' : 'N/A'}</span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <div className="text-label-sm font-label-sm text-on-surface-variant uppercase tracking-wider mb-1">Reported Evidence</div>
              <div className="relative w-full h-48 rounded-lg overflow-hidden border border-outline-variant bg-surface-container-low flex items-center justify-center">
                {complaint.imageBase64 ? (
                  <img src={complaint.imageBase64.startsWith('data:') ? complaint.imageBase64 : `data:image/jpeg;base64,${complaint.imageBase64}`} alt="Evidence" className="w-full h-full object-cover" />
                ) : (
                  <span className="material-symbols-outlined text-4xl text-on-surface-variant/50">image_not_supported</span>
                )}
              </div>
            </div>

            {complaint.status === 'RESOLVED' || complaint.status === 'CLOSED' ? (
              <div>
                <div className="text-label-sm font-label-sm text-on-surface-variant uppercase tracking-wider mb-1 text-green-500">Resolution Evidence</div>
                <div className="relative w-full h-48 rounded-lg overflow-hidden border border-green-500/30 bg-green-500/5 flex items-center justify-center">
                  {complaint.resolutionImageUrl || complaint.imageBase64 ? ( 
                    <img src={complaint.resolutionImageUrl || `data:image/jpeg;base64,${complaint.imageBase64}`} alt="Resolution" className="w-full h-full object-cover" />
                  ) : (
                    <span className="material-symbols-outlined text-4xl text-green-500/50">image_not_supported</span>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 text-sm text-on-surface-variant flex items-start gap-2">
                <span className="material-symbols-outlined text-primary text-lg">info</span>
                <span>Issue is currently active and pending resolution.</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
