import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchComplaintById, citizenVerifyComplaintStatus, upvoteComplaint, fetchComments, addComment, manualEscalateComplaint, type Complaint } from '../api/complaints';
import { useAuth } from '../context/AuthContext';

function CommentsSection({ complaintId }: { complaintId: string }) {
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');

  useEffect(() => {
    fetchComments(complaintId).then(setComments).catch(console.error);
  }, [complaintId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    try {
      const added = await addComment(complaintId, newComment);
      setComments([added, ...comments]);
      setNewComment('');
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input 
          type="text" 
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Add a comment..." 
          className="flex-1 bg-surface-container border border-outline-variant rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <button type="submit" className="bg-primary text-on-primary px-4 py-2 rounded-full font-label-md hover:opacity-90 transition-opacity">Post</button>
      </form>
      <div className="space-y-3 mt-4">
        {comments.map((c) => (
          <div key={c.id} className="bg-surface-container-lowest p-3 rounded-lg border border-outline-variant">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-label-md text-primary">{c.authorName}</span>
              <span className="font-label-sm text-on-surface-variant text-[10px]">{new Date(c.createdAt).toLocaleString()}</span>
            </div>
            <p className="font-body-sm text-on-surface">{c.content}</p>
          </div>
        ))}
        {comments.length === 0 && <p className="text-on-surface-variant text-sm italic">No comments yet.</p>}
      </div>
    </div>
  );
}

export default function ComplaintDetail() {
  const { id } = useParams<{ id: string }>();
  const [complaint, setComplaint] = useState<Complaint | null>(null);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (id) {
      const load = () => fetchComplaintById(id).then(setComplaint).catch(console.error);
      load();
      
      const sseUrl = `${import.meta.env.VITE_API_URL || 'http://localhost:8080'}/api/v1/sse/subscribe/${id}`;
      const eventSource = new EventSource(sseUrl);
      
      eventSource.addEventListener('COMPLAINT_UPDATE', () => {
        load();
      });

      return () => {
        eventSource.close();
      };
    }
  }, [id]);

  if (!complaint) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="p-8 gap-6 flex flex-col w-full max-w-7xl mx-auto">
      <div className="max-w-2xl mx-auto space-y-6 w-full">
        <header className="flex items-center gap-4 mb-8">
          <button onClick={() => navigate(-1)} className="text-2xl text-on-surface-variant hover:text-primary transition-colors">❮</button>
          <h1 className="font-display-sm text-primary">Report Details</h1>
        </header>

        {complaint.imageUrl && (
          <img src={complaint.imageUrl} alt="Complaint" className="w-full h-64 object-cover rounded-xl shadow-sm border border-outline-variant" />
        )}

        <div className="bg-surface-container-lowest p-8 rounded-xl border border-outline-variant shadow-sm">
          <div className="flex justify-between items-start mb-6 border-b border-outline-variant pb-4">
            <div>
              <span className="font-label-sm text-on-surface-variant bg-surface-container-high px-2 py-1 rounded-full mb-2 inline-block">{complaint.publicId}</span>
              <h2 className="font-headline-md text-primary">{complaint.category}</h2>
            </div>
            <span className={`px-3 py-1 rounded font-bold uppercase tracking-wider text-xs ${complaint.status === 'RESOLVED' ? 'bg-secondary-container text-on-secondary-container' : 'bg-tertiary-fixed text-on-tertiary-fixed'}`}>
              {complaint.status}
            </span>
          </div>
          
          <p className="font-body-md text-on-surface-variant mb-6 whitespace-pre-wrap">{complaint.description}</p>
          
          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="bg-surface-container p-4 rounded-lg border border-outline-variant">
              <span className="font-label-sm text-on-surface-variant block mb-1">Category</span>
              <span className="font-label-md text-on-surface">{complaint.category}</span>
            </div>
            <div className="bg-surface-container p-4 rounded-lg border border-outline-variant">
              <span className="font-label-sm text-on-surface-variant block mb-1">Priority</span>
              <span className="font-label-md text-on-surface">{complaint.priority}</span>
            </div>
          </div>

          {/* Officer Assignment & Real-Time Tracking */}
          <div className="bg-surface-container-low p-6 rounded-xl border border-outline-variant mb-8 space-y-4 shadow-sm">
            <div className="flex items-center justify-between border-b border-outline-variant pb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">engineering</span>
                <h3 className="font-headline-sm text-primary">Assigned Field Officer & Tracking</h3>
              </div>
              {complaint.isEscalated && (
                <span className="bg-error text-on-error text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1 animate-pulse shadow-sm">
                  <span className="material-symbols-outlined text-[14px]">warning</span> ESCALATED TO SUPERIOR
                </span>
              )}
            </div>

            {complaint.assignedOfficerName ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div>
                  <span className="font-label-sm text-on-surface-variant block">Responsible Officer</span>
                  <span className="font-label-lg text-on-surface font-bold">{complaint.assignedOfficerName}</span>
                  {complaint.assignedOfficerDepartment && (
                    <span className="text-xs text-primary block">{complaint.assignedOfficerDepartment} Dept</span>
                  )}
                </div>
                <div>
                  <span className="font-label-sm text-on-surface-variant block">Proximity & Jurisdiction</span>
                  <span className="font-label-md text-on-surface flex items-center gap-1 font-semibold">
                    <span className="material-symbols-outlined text-[18px] text-green-600">location_on</span>
                    {complaint.distanceToOfficerKm ? `${complaint.distanceToOfficerKm.toFixed(2)} km away` : 'Within 5.00 km jurisdiction'}
                  </span>
                  <span className="text-xs text-on-surface-variant block">Assigned under municipal jurisdiction match</span>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-amber-600 font-label-md py-2">
                <span className="material-symbols-outlined animate-spin">sync</span>
                <span>Assigning nearest responsible field officer within municipal jurisdiction...</span>
              </div>
            )}

            {complaint.slaDeadline && (
              <div className="bg-surface-container p-3.5 rounded-lg flex items-center justify-between border border-outline-variant/60">
                <div className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-amber-500 text-[22px]">schedule</span>
                  <div>
                    <span className="font-label-sm text-on-surface-variant block">Resolution Timeline (SLA Deadline)</span>
                    <span className="font-label-md text-on-surface font-bold">{new Date(complaint.slaDeadline).toLocaleString()}</span>
                  </div>
                </div>
                {complaint.isEscalated ? (
                  <div className="text-right">
                    <span className="text-xs font-bold text-error block">Breached Timeline! Escalated</span>
                    <span className="text-xs text-on-surface-variant">Superior: {complaint.superiorOfficerName || 'Senior Municipal Commissioner'}</span>
                  </div>
                ) : (
                  <span className="text-xs font-bold text-accent-green bg-accent-green/10 px-2.5 py-1 rounded border border-accent-green/20">On Schedule</span>
                )}
              </div>
            )}
          </div>

          {/* Resolution Verification Photo & GPS */}
          {complaint.resolutionImageUrl && (
            <div className="bg-surface border-2 border-accent-green/40 p-6 rounded-xl mb-8 space-y-4 shadow-md">
              <div className="flex items-center gap-2 text-ink-primary font-bold font-headline-sm">
                <span className="material-symbols-outlined text-accent-green text-2xl">verified</span>
                <h3>On-Site Resolution Verified (≤ 10 Meters)</h3>
              </div>
              <p className="font-body-sm text-ink-secondary">
                The responsible field officer uploaded photographic evidence upon solving the issue. The GPS latitude & longitude of this resolution match your reported location within the mandatory <strong>10-meter (0.01 km)</strong> jurisdiction tolerance!
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                <img src={complaint.resolutionImageUrl} alt="Resolution Proof" className="w-full h-48 object-cover rounded-lg border border-accent-green/30 shadow-sm" />
                <div className="space-y-2 bg-surface p-4 rounded-lg border border-outline-variant">
                  <div className="text-sm">
                    <span className="font-bold text-ink-primary block">GPS Verification Status:</span>
                    <span className="text-accent-green font-bold flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px]">check_circle</span>
                      Exact 10m Location Match Verified
                    </span>
                  </div>
                  {complaint.resolutionLatitude && complaint.resolutionLongitude && (
                    <div className="text-xs text-on-surface-variant font-mono bg-surface-container p-2 rounded">
                      Lat: {complaint.resolutionLatitude.toFixed(6)}, Lng: {complaint.resolutionLongitude.toFixed(6)}
                    </div>
                  )}
                  <div className="text-xs text-on-surface-variant">
                    Prevents false practices by strictly enforcing on-site 10-meter GPS validation!
                  </div>
                </div>
              </div>
            </div>
          )}

          <h3 className="font-headline-sm text-primary mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">timeline</span>
            Real-Time Progress Tracking
          </h3>
          <div className="border-l-2 border-primary/30 ml-3 pl-6 space-y-6 mb-8 relative">
            {/* Step 6: Closed */}
            <div className="relative">
              <div className={`absolute w-4 h-4 rounded-full -left-[1.95rem] top-0.5 border-2 border-surface-container-lowest ${complaint.status === 'CLOSED' ? 'bg-green-600 ring-4 ring-green-600/20' : 'bg-surface-container-high border-outline-variant'}`}></div>
              <p className={`font-label-md ${complaint.status === 'CLOSED' ? 'text-green-600 font-bold' : 'text-on-surface-variant'}`}>CLOSED (Verified by Citizen)</p>
              <p className="font-label-sm text-on-surface-variant">Issue confirmed resolved and closed by reporter</p>
            </div>

            {/* Step 5: Work Done (Resolved) */}
            <div className="relative">
              <div className={`absolute w-4 h-4 rounded-full -left-[1.95rem] top-0.5 border-2 border-surface-container-lowest ${(complaint.status === 'RESOLVED' || complaint.status === 'CLOSED') ? 'bg-primary ring-4 ring-primary/20' : 'bg-surface-container-high border-outline-variant'}`}></div>
              <p className={`font-label-md ${(complaint.status === 'RESOLVED' || complaint.status === 'CLOSED') ? 'text-primary font-bold' : 'text-on-surface-variant'}`}>WORK DONE (On-Site Resolved)</p>
              <p className="font-label-sm text-on-surface-variant">
                {(complaint.status === 'RESOLVED' || complaint.status === 'CLOSED') 
                  ? 'Field officer completed work on-site; verified by uploaded photo & GPS coordinates matching ≤ 10m' 
                  : 'Pending on-site resolution & 10-meter photo verification'}
              </p>
            </div>

            {/* Step 4: In Progress */}
            <div className="relative">
              <div className={`absolute w-4 h-4 rounded-full -left-[1.95rem] top-0.5 border-2 border-surface-container-lowest ${(complaint.status === 'WORK_STARTED' || complaint.status === 'UNDER_INSPECTION' || complaint.status === 'RESOLVED' || complaint.status === 'CLOSED') ? 'bg-primary ring-4 ring-primary/20' : 'bg-surface-container-high border-outline-variant'}`}></div>
              <p className={`font-label-md ${(complaint.status === 'WORK_STARTED' || complaint.status === 'UNDER_INSPECTION' || complaint.status === 'RESOLVED' || complaint.status === 'CLOSED') ? 'text-primary font-bold' : 'text-on-surface-variant'}`}>IN PROGRESS (Work Started)</p>
              <p className="font-label-sm text-on-surface-variant">
                {(complaint.status === 'WORK_STARTED' || complaint.status === 'UNDER_INSPECTION' || complaint.status === 'RESOLVED' || complaint.status === 'CLOSED') 
                  ? 'Officer is actively resolving the civic issue on-site' 
                  : 'Awaiting officer arrival and commencement of work'}
              </p>
            </div>

            {/* Step 3: Accepted */}
            <div className="relative">
              <div className={`absolute w-4 h-4 rounded-full -left-[1.95rem] top-0.5 border-2 border-surface-container-lowest ${(complaint.status === 'ACCEPTED' || complaint.status === 'WORK_STARTED' || complaint.status === 'UNDER_INSPECTION' || complaint.status === 'RESOLVED' || complaint.status === 'CLOSED') ? 'bg-primary ring-4 ring-primary/20' : 'bg-surface-container-high border-outline-variant'}`}></div>
              <p className={`font-label-md ${(complaint.status === 'ACCEPTED' || complaint.status === 'WORK_STARTED' || complaint.status === 'UNDER_INSPECTION' || complaint.status === 'RESOLVED' || complaint.status === 'CLOSED') ? 'text-primary font-bold' : 'text-on-surface-variant'}`}>ACCEPTED (Officer Acknowledged)</p>
              <p className="font-label-sm text-on-surface-variant">
                {(complaint.status === 'ACCEPTED' || complaint.status === 'WORK_STARTED' || complaint.status === 'UNDER_INSPECTION' || complaint.status === 'RESOLVED' || complaint.status === 'CLOSED') 
                  ? `Officer accepted assignment under municipal jurisdiction` 
                  : 'Waiting for assigned officer to accept the task'}
              </p>
            </div>

            {/* Step 2: Appointed */}
            <div className="relative">
              <div className={`absolute w-4 h-4 rounded-full -left-[1.95rem] top-0.5 border-2 border-surface-container-lowest ${(complaint.assignedOfficerName || complaint.status !== 'REPORTED') ? 'bg-primary ring-4 ring-primary/20' : 'bg-surface-container-high border-outline-variant'}`}></div>
              <p className={`font-label-md ${(complaint.assignedOfficerName || complaint.status !== 'REPORTED') ? 'text-primary font-bold' : 'text-on-surface-variant'}`}>APPOINTED (Assigned to Officer)</p>
              <p className="font-label-sm text-on-surface-variant">
                {complaint.assignedOfficerName 
                  ? `Responsible field officer appointed: ${complaint.assignedOfficerName} (${complaint.assignedOfficerDepartment || 'Municipal'} Dept)` 
                  : 'Assigning nearest responsible field officer within municipal jurisdiction...'}
              </p>
            </div>

            {/* Step 1: Reported */}
            <div className="relative">
              <div className="absolute w-4 h-4 bg-primary rounded-full -left-[1.95rem] top-0.5 border-2 border-surface-container-lowest ring-4 ring-primary/20"></div>
              <p className="font-label-md text-primary font-bold">REPORTED</p>
              <p className="font-label-sm text-on-surface-variant">Issue logged with verified GPS location on {new Date(complaint.createdAt).toLocaleString()}</p>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-4 mt-6 pt-4 border-t border-outline-variant">
            <button onClick={async () => {
              try {
                const updated = await upvoteComplaint(complaint.id);
                setComplaint({ ...complaint, supportCount: updated.supportCount });
              } catch (e: any) {
                alert(e.response?.data?.message || 'Error upvoting');
              }
            }} className="flex items-center gap-2 bg-surface-container-low border border-outline-variant px-5 py-2.5 rounded-full hover:bg-primary/15 hover:border-primary hover:shadow-md transition-all duration-200 group shadow-sm cursor-pointer">
              <span className="material-symbols-outlined text-[20px] text-primary group-hover:scale-110 transition-transform">thumb_up</span>
              <span className="font-label-md text-on-surface group-hover:text-primary font-bold transition-colors">Support ({complaint.supportCount || 1})</span>
            </button>

            {!complaint.isEscalated && (
              <button onClick={async () => {
                try {
                  const updated = await manualEscalateComplaint(complaint.id);
                  setComplaint(updated);
                  alert('⚡ SLA deadline simulated as expired! This issue has been escalated and is now visible in Higher Official (Dept Head / Commissioner) dashboards.');
                } catch (e: any) {
                  alert('Failed to escalate: ' + (e.response?.data?.message || e.message));
                }
              }} className="flex items-center gap-2 bg-error-container/20 border border-error/40 px-5 py-2.5 rounded-full hover:bg-error/15 hover:border-error hover:shadow-md transition-all duration-200 group shadow-sm cursor-pointer">
                <span className="material-symbols-outlined text-[20px] text-error group-hover:scale-110 transition-transform">priority_high</span>
                <span className="font-label-md text-error font-bold transition-colors">⚡ Simulate SLA Breach & Escalate to Higher Officials</span>
              </button>
            )}
            {complaint.isEscalated && (
              <span className="bg-error/15 text-error font-bold text-xs px-4 py-2 rounded-full border border-error/30 flex items-center gap-1 shadow-xs">
                ⚠️ Escalated to Higher Officials (SLA Breached)
              </span>
            )}
          </div>

          <div className="mt-8 border-t border-outline-variant pt-6">
            <h3 className="font-headline-sm text-primary mb-4">Discussion</h3>
            <CommentsSection complaintId={complaint.id} />
          </div>
          
          {user?.role === 'CITIZEN' && complaint.status === 'RESOLVED' && (
            <div className="mt-8 p-6 bg-surface-container-lowest rounded-xl border border-primary/30 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 bg-primary h-full"></div>
              <h3 className="font-headline-sm text-primary mb-2">Officer marked this as resolved.</h3>
              <p className="font-body-sm text-on-surface-variant mb-6">Please verify if the issue is actually fixed.</p>
              
              <div className="flex flex-col gap-4">
                {/* Confirm Fixed Section */}
                <div className="p-4 border border-outline-variant rounded-lg bg-surface-container-low">
                  <h4 className="font-label-lg mb-2 text-on-surface">Confirm Fixed</h4>
                  <div className="flex gap-2 items-center mb-4">
                    <span className="font-label-sm text-on-surface-variant">Rate:</span>
                    {[1, 2, 3, 4, 5].map(star => (
                      <button key={star} onClick={() => {
                        citizenVerifyComplaintStatus(complaint.id, { status: 'CLOSED', rating: star }).then(() => navigate('/citizen/dashboard'));
                      }} className="text-2xl hover:scale-110 transition-transform">
                        ⭐
                      </button>
                    ))}
                  </div>
                </div>

                {/* Not Fixed Section */}
                <div className="p-4 border border-error/30 rounded-lg bg-error-container/10">
                  <h4 className="font-label-lg mb-2 text-error">Not Fixed</h4>
                  <textarea 
                    id="reopen-reason"
                    className="w-full bg-surface-container border border-outline-variant rounded p-3 text-sm mb-3 focus:outline-none focus:ring-1 focus:ring-error" 
                    placeholder="Briefly explain why this isn't fixed..." 
                    rows={2}
                  ></textarea>
                  <button onClick={async () => {
                    const reason = (document.getElementById('reopen-reason') as HTMLTextAreaElement).value;
                    if (!reason) return alert('Please provide a reason.');
                    await citizenVerifyComplaintStatus(complaint.id, { status: 'REOPENED', reason });
                    navigate('/citizen/dashboard');
                  }} className="w-full py-2 bg-error text-on-error rounded font-label-md hover:opacity-90">
                    Reopen Issue
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
