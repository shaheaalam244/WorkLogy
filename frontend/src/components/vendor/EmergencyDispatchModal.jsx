import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  AlertTriangle, 
  MapPin, 
  Clock, 
  CheckCircle2, 
  X, 
  ShieldCheck, 
  ArrowRight,
  Flame,
  Volume2,
  VolumeX
} from 'lucide-react';
import { useSocketContext } from '../../context/SocketContext';
import { jobAPI } from '../../api/job.api';
import { getServiceImage, handleImageFallback, FALLBACK_SERVICE_IMAGE } from '../../constants/serviceImages';
import { getDisplayName } from '../../utils/formatters';

export { getDisplayName };

// Simple Web Audio API synthesized alert chime
const playDispatchChime = () => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    const now = ctx.currentTime;
    
    // Two-tone urgent chime (880Hz -> 1046Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(880, now);
    osc1.frequency.exponentialRampToValueAtTime(1046, now + 0.15);
    gain1.gain.setValueAtTime(0.3, now);
    gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.35);
  } catch (e) {
    // Audio context may be restricted by browser autoplay policy before user interaction
  }
};

export default function EmergencyDispatchModal() {
  const { socket } = useSocketContext();
  const navigate = useNavigate();

  const [activeLeads, setActiveLeads] = useState([]);
  const [currentLeadIndex, setCurrentLeadIndex] = useState(0);
  const [claiming, setClaiming] = useState(false);
  const [claimStatus, setClaimStatus] = useState(null); // { type: 'success' | 'conflict' | 'error', message: string }
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [timeLeftSeconds, setTimeLeftSeconds] = useState(90);

  const activeLead = activeLeads[currentLeadIndex] || null;
  const timerRef = useRef(null);

  // Track dismissed and claimed lead IDs to prevent duplicate popups upon re-renders or page refreshes
  const dismissedLeadIds = useRef(new Set());

  // Load previously dismissed lead IDs from session storage on mount
  useEffect(() => {
    try {
      const stored = JSON.parse(sessionStorage.getItem('worklogy_dismissed_emergency_leads') || '[]');
      if (Array.isArray(stored)) {
        stored.forEach((id) => dismissedLeadIds.current.add(id.toString()));
      }
    } catch {}
  }, []);

  const markLeadDismissed = (leadId) => {
    if (!leadId) return;
    const idStr = leadId.toString();
    dismissedLeadIds.current.add(idStr);
    try {
      const existing = JSON.parse(sessionStorage.getItem('worklogy_dismissed_emergency_leads') || '[]');
      if (!existing.includes(idStr)) {
        existing.push(idStr);
        sessionStorage.setItem('worklogy_dismissed_emergency_leads', JSON.stringify(existing.slice(-50)));
      }
    } catch {}
  };

  // Socket event listeners for real-time dispatch & atomic assignments ONLY
  // The popup will NEVER open on page load, login, or polling. It strictly requires a new real-time event.
  useEffect(() => {
    if (!socket) return;

    const handleEmergencyLead = (newLead) => {
      if (!newLead) return;
      const leadId = (newLead.jobId || newLead._id)?.toString();
      if (!leadId) return;

      // 1. Guard against previously dismissed or claimed requests
      if (dismissedLeadIds.current.has(leadId)) {
        return;
      }

      // 2. Reject stale or old requests (e.g. older than 90s)
      if (newLead.createdAt) {
        const elapsedSecs = (Date.now() - new Date(newLead.createdAt).getTime()) / 1000;
        if (elapsedSecs > 90) {
          return;
        }
      }

      // 3. Reject leads that are already assigned or closed
      if (newLead.status && !['open', 'dispatching'].includes(newLead.status)) {
        return;
      }

      setActiveLeads((prev) => {
        // Prevent duplicate popup for the exact same lead
        const exists = prev.some((l) => (l.jobId || l._id)?.toString() === leadId);
        if (exists) return prev;
        return [newLead, ...prev];
      });

      if (soundEnabled) {
        playDispatchChime();
      }
    };

    const handleJobTaken = (data) => {
      const takenJobId = (data?.jobId || data?.job || data?._id)?.toString();
      if (!takenJobId) return;

      markLeadDismissed(takenJobId);

      setActiveLeads((prev) => {
        const matching = prev.find((l) => (l.jobId || l._id)?.toString() === takenJobId);
        if (matching) {
          const isCancelled = data?.reason === 'cancelled' || data?.status === 'cancelled';
          setClaimStatus({
            type: 'conflict',
            message: isCancelled 
              ? 'This emergency request was cancelled by the customer.'
              : 'This job has already been accepted by another professional.'
          });
          // Auto remove after 2.5 seconds
          setTimeout(() => {
            setActiveLeads((curr) => curr.filter((l) => (l.jobId || l._id)?.toString() !== takenJobId));
            setClaimStatus(null);
          }, 2500);
        }
        return prev.filter((l) => (l.jobId || l._id)?.toString() !== takenJobId);
      });
    };

    const handleJobCancelled = (data) => {
      const cancelledJobId = (data?.jobId || data?.id || data?._id)?.toString();
      if (!cancelledJobId) return;

      markLeadDismissed(cancelledJobId);

      setActiveLeads((prev) => {
        const matching = prev.find((l) => (l.jobId || l._id)?.toString() === cancelledJobId);
        if (matching) {
          setClaimStatus({
            type: 'conflict',
            message: 'This emergency request was cancelled by the customer.'
          });
          setTimeout(() => {
            setActiveLeads((curr) => curr.filter((l) => (l.jobId || l._id)?.toString() !== cancelledJobId));
            setClaimStatus(null);
          }, 2500);
        }
        return prev.filter((l) => (l.jobId || l._id)?.toString() !== cancelledJobId);
      });
    };

    socket.on('emergency_job_lead', handleEmergencyLead);
    socket.on('job_taken', handleJobTaken);
    socket.on('job_assigned', handleJobTaken);
    socket.on('job_cancelled', handleJobCancelled);
    socket.on('job_deleted', handleJobCancelled);

    return () => {
      socket.off('emergency_job_lead', handleEmergencyLead);
      socket.off('job_taken', handleJobTaken);
      socket.off('job_assigned', handleJobTaken);
      socket.off('job_cancelled', handleJobCancelled);
      socket.off('job_deleted', handleJobCancelled);
    };
  }, [socket, soundEnabled]);


  // 3. Countdown timer for current lead
  useEffect(() => {
    if (!activeLead) return;

    // Calculate time left from createdAt if available, default to 90s
    let initialSecs = 90;
    if (activeLead.createdAt) {
      const elapsed = Math.floor((Date.now() - new Date(activeLead.createdAt).getTime()) / 1000);
      initialSecs = Math.max(0, 90 - elapsed);
    }
    setTimeLeftSeconds(initialSecs);

    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      setTimeLeftSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          // Dismiss expired lead
          handleDecline(activeLead.jobId || activeLead._id, true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [activeLead?.jobId, activeLead?._id]);

  // 4. Handle 1-Click Accept (Atomic server-side verification)
  const handleAccept = async () => {
    if (!activeLead || claiming) return;

    const jobId = activeLead.jobId || activeLead._id;
    try {
      setClaiming(true);
      setClaimStatus(null);

      const res = await jobAPI.claimInstant(jobId, {
        finalPrice: activeLead.budget?.amount || activeLead.callOutFee || 500,
        pricingType: 'fixed',
        estimatedDuration: 'Immediate response (within 30-45 mins)'
      });

      if (res?.success) {
        markLeadDismissed(jobId);
        setClaimStatus({
          type: 'success',
          message: 'Assignment confirmed! Redirecting to customer directions...'
        });

        // Remove from list
        setActiveLeads((prev) => prev.filter((l) => (l.jobId || l._id) !== jobId));

        // Navigate to job management view
        setTimeout(() => {
          if (res.booking?._id) {
            navigate(`/vendor/manage-job/${res.booking._id}`);
          } else {
            navigate('/vendor/active-jobs');
          }
        }, 1200);
      } else {
        setClaimStatus({
          type: 'error',
          message: res?.message || 'Could not claim job. Please try again.'
        });
      }
    } catch (err) {
      const status = err.response?.status;
      const msg = err.response?.data?.message || err.message;

      if (status === 409) {
        // Concurrency race: customer cancelled or another vendor accepted first
        markLeadDismissed(jobId);
        setClaimStatus({
          type: 'conflict',
          message: msg || 'This request has already been cancelled or is no longer available.'
        });
        setTimeout(() => {
          setActiveLeads((prev) => prev.filter((l) => (l.jobId || l._id) !== jobId));
          setClaimStatus(null);
        }, 3000);
      } else {
        setClaimStatus({
          type: 'error',
          message: msg || 'Unable to accept this request right now.'
        });
      }
    } finally {
      setClaiming(false);
    }
  };

  // 5. Handle Decline
  const handleDecline = async (jobId, isAutoExpire = false) => {
    markLeadDismissed(jobId);
    try {
      if (!isAutoExpire) {
        await jobAPI.decline(jobId);
      }
    } catch (e) {
      // Graceful
    } finally {
      setActiveLeads((prev) => prev.filter((l) => (l.jobId || l._id) !== jobId));
      setClaimStatus(null);
      if (currentLeadIndex > 0) {
        setCurrentLeadIndex((c) => Math.max(0, c - 1));
      }
    }
  };

  if (!activeLead) return null;

  const leadId = activeLead.jobId || activeLead._id;
  const rawCategory = 
    activeLead.category || 
    activeLead.serviceCategory || 
    activeLead.service || 
    activeLead.categoryName;
  const categoryName = getDisplayName(rawCategory) || 'Emergency Maintenance';

  const locality = typeof activeLead.location === 'object' && activeLead.location !== null
    ? (getDisplayName(activeLead.location.locality) || getDisplayName(activeLead.location.city) || 'Lucknow Metro')
    : (getDisplayName(activeLead.location) || 'Lucknow Metro');

  const leadTitle = getDisplayName(activeLead.title);
  const leadDesc = typeof activeLead.description === 'string'
    ? activeLead.description.trim()
    : getDisplayName(activeLead.description);
  const problemText = leadDesc || leadTitle || 'Emergency repair required immediately';

  const progressPercent = Math.max(0, Math.min(100, (timeLeftSeconds / 90) * 100));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border-2 border-rose-500 overflow-hidden relative flex flex-col animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="emergency-dispatch-title"
      >
        {/* Urgent Animated Top Bar */}
        <div className="bg-gradient-to-r from-rose-600 via-red-600 to-rose-700 text-white px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-3.5 w-3.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-white" />
            </span>
            <span id="emergency-dispatch-title" className="text-xs sm:text-sm font-black tracking-wider uppercase">
              🚨 Urgent Emergency Dispatch
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="text-white/80 hover:text-white p-1 rounded-lg transition"
              title={soundEnabled ? 'Mute alert chime' : 'Enable alert chime'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
            {activeLeads.length > 1 && (
              <span className="text-[11px] font-bold bg-white/20 px-2 py-0.5 rounded-full">
                {currentLeadIndex + 1} of {activeLeads.length}
              </span>
            )}
            <button
              onClick={() => handleDecline(leadId)}
              className="text-white/80 hover:text-white p-1 rounded-lg transition"
              title="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Expiry Countdown Progress Bar */}
        <div className="w-full bg-rose-100 h-1.5 overflow-hidden">
          <div 
            className="h-full bg-rose-600 transition-all duration-1000 ease-linear"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Service Visual Preview */}
        <div className="relative aspect-video w-full bg-slate-100 overflow-hidden border-b border-rose-100">
          <img
            src={getServiceImage(categoryName, problemText)}
            alt={categoryName}
            className="w-full h-full object-cover"
            onError={(e) => handleImageFallback(e, FALLBACK_SERVICE_IMAGE)}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
          <div className="absolute bottom-3 left-4">
            <span className="px-2.5 py-1 rounded-full bg-white/95 text-rose-800 text-[11px] font-bold uppercase tracking-wider shadow-2xs backdrop-blur-xs flex items-center gap-1">
              <Flame className="w-3.5 h-3.5 text-rose-600 shrink-0" />
              <span>{categoryName}</span>
            </span>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 space-y-4">
          {/* Header Row: Category & Timer */}
          <div className="flex items-center justify-between gap-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold uppercase tracking-wider">
              <Flame className="w-3.5 h-3.5 text-rose-600" />
              <span>{categoryName}</span>
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold">
              <Clock className="w-3.5 h-3.5 text-amber-600 animate-spin" style={{ animationDuration: '6s' }} />
              <span>{timeLeftSeconds}s remaining to accept</span>
            </div>
          </div>

          {/* Problem Description Callout */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1.5">
              Customer Problem
            </span>
            <p className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
              "{problemText}"
            </p>
          </div>

          {/* Service Area & Dispatch Rules */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200/80">
              <MapPin className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-slate-700 block">Service Area</span>
                <span className="text-slate-900 font-bold">{locality}</span>
                <p className="text-[10px] text-slate-500 mt-0.5">Exact house address revealed once accepted</p>
              </div>
            </div>

            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200/80">
              <ShieldCheck className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-slate-700 block">Dispatch Rule</span>
                <span className="text-slate-900 font-bold">First to Accept Wins</span>
                <p className="text-[10px] text-slate-500 mt-0.5">Instant booking without bidding delay</p>
              </div>
            </div>
          </div>

          {/* Status / Race Feedback Banner */}
          {claimStatus && (
            <div 
              className={`p-3.5 rounded-2xl text-xs flex items-center gap-2.5 font-medium ${
                claimStatus.type === 'conflict'
                  ? 'bg-amber-100 border border-amber-300 text-amber-900'
                  : claimStatus.type === 'success'
                  ? 'bg-emerald-100 border border-emerald-300 text-emerald-900'
                  : 'bg-rose-100 border border-rose-300 text-rose-900'
              }`}
            >
              {claimStatus.type === 'conflict' ? (
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-700" />
              ) : claimStatus.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-700" />
              ) : (
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-700" />
              )}
              <span>{claimStatus.message}</span>
            </div>
          )}

          {/* Action Buttons: Uber/Rapido Style Big Accept & Decline */}
          <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
            <button
              onClick={() => handleDecline(leadId)}
              disabled={claiming}
              className="w-full sm:w-1/3 py-3.5 px-4 rounded-2xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition disabled:opacity-50"
            >
              Decline
            </button>

            <button
              onClick={handleAccept}
              disabled={claiming || claimStatus?.type === 'conflict' || claimStatus?.type === 'success'}
              className="w-full sm:w-2/3 py-3.5 px-5 rounded-2xl text-sm font-black text-white bg-[#06684F] hover:bg-[#055742] active:scale-[0.98] transition shadow-md flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {claiming ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Claiming Job...</span>
                </>
              ) : (
                <>
                  <span>Accept Job Now</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>

          <p className="text-[11px] text-center text-slate-500 font-medium">
            ⚡ By tapping Accept, you agree to dispatch immediately to the customer's location.
          </p>
        </div>
      </div>
    </div>
  );
}
