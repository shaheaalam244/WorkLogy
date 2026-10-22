import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  DollarSign, 
  Search, 
  Clock, 
  Star, 
  TrendingUp, 
  CheckCircle, 
  ArrowRight,
  ShieldCheck,
  Calendar,
  AlertCircle,
  PlusCircle,
  Wrench,
  FileText,
  Briefcase,
  Flame,
  Zap,
  MapPin,
  Check,
  SlidersHorizontal,
  XCircle
} from 'lucide-react';
import Button from '../../components/common/Button';
import VerifiedBadge from '../../components/vendor/VerifiedBadge';
import Loader from '../../components/common/Loader';
import { useAuth } from '../../hooks/useAuth';
import { useSocketContext } from '../../context/SocketContext';
import { formatCurrency, getDisplayName } from '../../utils/formatters';
import { vendorAPI } from '../../api/vendor.api';
import { jobAPI } from '../../api/job.api';
import { getServiceImage, resolveJobImage, getJobImage, handleImageFallback, FALLBACK_SERVICE_IMAGE } from '../../constants/serviceImages';

export default function VendorDashboard() {
  const { user } = useAuth();
  const { socket } = useSocketContext();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);

  // Emergency availability & leads state
  const [vendorProfile, setVendorProfile] = useState(null);
  const [emergencyConfig, setEmergencyConfig] = useState({
    isAvailable: false,
    categories: [],
    categoryNames: [],
    serviceAreas: [],
    maxDistanceKm: 15,
    callOutFee: 499
  });
  const [togglingEmergency, setTogglingEmergency] = useState(false);
  const [emergencyLeads, setEmergencyLeads] = useState([]);
  const [claimingLeadId, setClaimingLeadId] = useState(null);
  const [leadFeedback, setLeadFeedback] = useState(null);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [statsRes, profileRes, leadsRes] = await Promise.allSettled([
        vendorAPI.getDashboardStats(),
        vendorAPI.getProfile(),
        jobAPI.getEmergencyLeads()
      ]);

      if (statsRes.status === 'fulfilled' && statsRes.value?.stats) {
        setStats(statsRes.value.stats);
      }
      if (profileRes.status === 'fulfilled' && profileRes.value?.profile) {
        const prof = profileRes.value.profile;
        setVendorProfile(prof);
        if (prof.emergencyAvailability) {
          setEmergencyConfig({
            isAvailable: Boolean(prof.emergencyAvailability.isAvailable),
            categories: prof.emergencyAvailability.categories || [],
            categoryNames: prof.emergencyAvailability.categoryNames || [],
            serviceAreas: prof.emergencyAvailability.serviceAreas || [],
            maxDistanceKm: prof.emergencyAvailability.maxDistanceKm || 15,
            callOutFee: prof.emergencyAvailability.callOutFee || 499
          });
        }
      }
      if (leadsRes.status === 'fulfilled' && leadsRes.value?.leads) {
        setEmergencyLeads(leadsRes.value.leads);
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Unable to load live dashboard metrics. Please refresh.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Listen for real-time emergency leads and assignment updates
  useEffect(() => {
    if (!socket) return;

    const handleLead = (lead) => {
      if (!lead?.jobId) return;
      setEmergencyLeads((prev) => {
        if (prev.some((l) => (l.jobId || l._id) === lead.jobId)) return prev;
        return [lead, ...prev];
      });
    };

    const handleTaken = (data) => {
      const takenId = (data?.jobId || data?.job || data?._id)?.toString();
      if (!takenId) return;
      setEmergencyLeads((prev) => prev.filter((l) => (l.jobId || l._id)?.toString() !== takenId));
    };

    socket.on('emergency_job_lead', handleLead);
    socket.on('job_taken', handleTaken);
    socket.on('job_assigned', handleTaken);
    socket.on('job_cancelled', handleTaken);
    socket.on('job_deleted', handleTaken);

    return () => {
      socket.off('emergency_job_lead', handleLead);
      socket.off('job_taken', handleTaken);
      socket.off('job_assigned', handleTaken);
      socket.off('job_cancelled', handleTaken);
      socket.off('job_deleted', handleTaken);
    };
  }, [socket]);

  // Handle emergency toggle
  const handleToggleEmergency = async () => {
    try {
      setTogglingEmergency(true);
      setLeadFeedback(null);
      const newStatus = !emergencyConfig.isAvailable;

      const payload = {
        emergencyAvailability: {
          ...emergencyConfig,
          isAvailable: newStatus
        }
      };

      const res = await vendorAPI.updateProfile(payload);
      if (res?.success) {
        setEmergencyConfig((prev) => ({ ...prev, isAvailable: newStatus }));
        setLeadFeedback({
          type: 'success',
          message: newStatus 
            ? 'Emergency Availability is now ON. You will receive instant Uber-style dispatches!' 
            : 'Emergency Availability is turned OFF. Incoming alerts paused.'
        });
        setTimeout(() => setLeadFeedback(null), 4000);
      }
    } catch (err) {
      setLeadFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Failed to update emergency availability.'
      });
    } finally {
      setTogglingEmergency(false);
    }
  };

  // Handle accepting an emergency lead from the dashboard
  const handleAcceptEmergencyLead = async (lead) => {
    const leadId = lead.jobId || lead._id;
    try {
      setClaimingLeadId(leadId);
      setLeadFeedback(null);

      const res = await jobAPI.claimInstant(leadId, {
        finalPrice: lead.budget?.amount || lead.callOutFee || 500,
        pricingType: 'fixed',
        estimatedDuration: 'Immediate response (within 30-45 mins)'
      });

      if (res?.success) {
        setLeadFeedback({
          type: 'success',
          message: 'Job successfully accepted! Redirecting to booking execution...'
        });
        setEmergencyLeads((prev) => prev.filter((l) => (l.jobId || l._id) !== leadId));
        setTimeout(() => {
          if (res.booking?._id) {
            navigate(`/vendor/manage-job/${res.booking._id}`);
          } else {
            navigate('/vendor/active-jobs');
          }
        }, 1200);
      }
    } catch (err) {
      if (err.response?.status === 409) {
        setLeadFeedback({
          type: 'error',
          message: err.response?.data?.message || 'This request has already been cancelled or is no longer available.'
        });
        setEmergencyLeads((prev) => prev.filter((l) => (l.jobId || l._id) !== leadId));
      } else {
        setLeadFeedback({
          type: 'error',
          message: err.response?.data?.message || 'Could not claim job.'
        });
      }
    } finally {
      setClaimingLeadId(null);
    }
  };

  // Handle declining an emergency lead
  const handleDeclineEmergencyLead = async (leadId) => {
    try {
      await jobAPI.decline(leadId);
    } catch (e) {
      // Graceful
    } finally {
      setEmergencyLeads((prev) => prev.filter((l) => (l.jobId || l._id) !== leadId));
    }
  };

  if (loading) {
    return (
      <div className="py-20">
        <Loader text="Loading your vendor performance console..." />
      </div>
    );
  }

  const s = stats || {};

  return (
    <div className="space-y-7 w-full">
      {/* 1. Header Banner / Welcome Card */}
      <div className="bg-white border border-slate-200/90 shadow-2xs rounded-3xl p-6 sm:p-7 lg:p-8 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
        <div className="space-y-1.5 flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200/60">
              Professional Dashboard
            </span>
            <VerifiedBadge status={s.verificationStatus || (user?.isVerified ? 'verified' : 'pending')} />
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-[11px] font-semibold text-emerald-800 border border-emerald-200/60">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
              <span>Available for Jobs · Lucknow Metro</span>
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight truncate">
            Welcome back, {user?.businessName || user?.name || 'Professional'}
          </h1>

          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-3xl">
            Professional: <strong className="font-semibold text-slate-900">{user?.name}</strong> ·{' '}
            <span className="text-emerald-800 font-bold">{s.matchingJobsCount || 0} available jobs</span> match your services in {user?.city || 'Lucknow'} today.
          </p>
        </div>

        <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 shrink-0 w-full lg:w-auto">
          <Link to="/vendor/responses" className="flex-1 sm:flex-initial">
            <Button variant="secondary" size="md" icon={FileText} className="w-full sm:w-auto">
              My Offers ({s.submittedQuotations || 0})
            </Button>
          </Link>
          <Link to="/vendor/browse-jobs" className="flex-1 sm:flex-initial">
            <Button variant="primary" size="md" icon={Search} className="w-full sm:w-auto">
              Find Available Jobs ({s.matchingJobsCount || 0})
            </Button>
          </Link>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Emergency Availability & Instant Dispatch Center (Uber/Rapido Style) */}
      <div className={`rounded-3xl p-6 sm:p-7 border-2 transition-all ${
        emergencyConfig.isAvailable 
          ? 'bg-gradient-to-br from-white via-rose-50/20 to-emerald-50/20 border-rose-300 shadow-sm' 
          : 'bg-white border-slate-200 shadow-2xs'
      }`}>
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5 pb-5 border-b border-slate-200/80">
          <div className="space-y-1.5 flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                emergencyConfig.isAvailable 
                  ? 'bg-rose-100 text-rose-800 border border-rose-200' 
                  : 'bg-slate-100 text-slate-600 border border-slate-200'
              }`}>
                <Flame className={`w-3.5 h-3.5 ${emergencyConfig.isAvailable ? 'text-rose-600 animate-pulse' : 'text-slate-400'}`} />
                <span>Instant Emergency Dispatch</span>
              </span>

              {emergencyConfig.isAvailable && (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-100 text-[10px] font-bold text-emerald-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-ping" />
                  <span>Live & Ready to Accept</span>
                </span>
              )}
            </div>

            <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
              Emergency Availability: {emergencyConfig.isAvailable ? 'ON' : 'OFF'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 max-w-2xl">
              {emergencyConfig.isAvailable
                ? 'Your emergency dispatch line is ACTIVE. When customers submit urgent requests in your categories and area, you will receive real-time alerts. First contractor to accept wins the job.'
                : 'Your emergency dispatch line is PAUSED. You will not receive urgent emergency alerts or 1-click dispatch assignments until you turn availability ON.'}
            </p>
          </div>

          {/* Availability Toggle Switch */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={handleToggleEmergency}
              disabled={togglingEmergency}
              className={`relative inline-flex h-11 w-20 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden focus:ring-2 focus:ring-emerald-700 focus:ring-offset-2 ${
                emergencyConfig.isAvailable ? 'bg-[#06684F]' : 'bg-slate-300'
              } disabled:opacity-50`}
              role="switch"
              aria-checked={emergencyConfig.isAvailable}
            >
              <span className="sr-only">Toggle emergency availability</span>
              <span
                aria-hidden="true"
                className={`pointer-events-none inline-block h-10 w-10 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out flex items-center justify-center ${
                  emergencyConfig.isAvailable ? 'translate-x-9' : 'translate-x-0'
                }`}
              >
                {togglingEmergency ? (
                  <span className="w-3.5 h-3.5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                ) : emergencyConfig.isAvailable ? (
                  <Zap className="w-4 h-4 text-emerald-800" />
                ) : (
                  <Flame className="w-4 h-4 text-slate-400" />
                )}
              </span>
            </button>
            <div className="text-left">
              <span className="text-xs font-bold text-slate-900 block">
                {emergencyConfig.isAvailable ? 'Available Now' : 'Turn Availability ON'}
              </span>
              <span className="text-[11px] text-slate-500">
                {togglingEmergency ? 'Updating status...' : 'Tap to toggle'}
              </span>
            </div>
          </div>
        </div>

        {/* Feedback Alert */}
        {leadFeedback && (
          <div className={`mt-4 p-3.5 rounded-2xl text-xs flex items-center gap-2 font-medium ${
            leadFeedback.type === 'success' 
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-900' 
              : 'bg-rose-50 border border-rose-200 text-rose-900'
          }`}>
            {leadFeedback.type === 'success' ? (
              <Check className="w-4 h-4 text-emerald-700 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-700 shrink-0" />
            )}
            <span>{leadFeedback.message}</span>
          </div>
        )}

        {/* Coverage & Categories Meta */}
        <div className="mt-4 pt-1 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-slate-700">Urgent Categories:</span>
            {emergencyConfig.categoryNames?.length > 0 ? (
              emergencyConfig.categoryNames.map((cat, idx) => (
                <span key={idx} className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 font-medium text-[11px] border border-slate-200">
                  {cat}
                </span>
              ))
            ) : (
              <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-medium text-[11px]">
                All registered services
              </span>
            )}
            <span className="text-slate-300 mx-1">|</span>
            <span className="font-semibold text-slate-700">Coverage:</span>
            <span className="text-slate-800 font-bold">
              {emergencyConfig.serviceAreas?.length > 0 ? emergencyConfig.serviceAreas.join(', ') : 'Lucknow Metro'}
            </span>
            <span className="text-slate-500">({emergencyConfig.maxDistanceKm || 15} km radius)</span>
          </div>

          <Link
            to="/vendor/profile"
            className="text-emerald-800 font-bold hover:underline inline-flex items-center gap-1 shrink-0"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Manage Skills & Coverage →</span>
          </Link>
        </div>

        {/* Live Incoming Requests Panel */}
        <div className="mt-5 pt-4 border-t border-slate-200/80">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <span>Incoming Emergency Requests</span>
              {emergencyLeads.length > 0 && (
                <span className="px-2 py-0.2 rounded-full bg-rose-600 text-white text-[10px] font-black">
                  {emergencyLeads.length} NEW
                </span>
              )}
            </span>
          </div>

          {emergencyLeads.length > 0 ? (
            <div className="space-y-3">
              {emergencyLeads.map((lead) => {
                const leadId = lead.jobId || lead._id;
                const isClaiming = claimingLeadId === leadId;
                const leadCatName = getDisplayName(lead.category || lead.categoryName || lead.serviceCategory || lead.service) || 'Emergency';
                const leadProblem = lead.description || lead.title || 'Emergency repair required';
                const leadArea = (typeof lead.location === 'object' && lead.location)
                  ? (getDisplayName(lead.location.locality) || getDisplayName(lead.location.city) || 'Lucknow Metro')
                  : (getDisplayName(lead.location) || 'Lucknow Metro');

                return (
                  <div 
                    key={leadId}
                    className="p-4 sm:p-5 rounded-2xl bg-white border-2 border-rose-400 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-in fade-in"
                  >
                    <div className="flex items-start gap-3.5 flex-1 min-w-0">
                      <img
                        src={getServiceImage(leadCatName, leadProblem)}
                        alt="Emergency Service"
                        className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl object-cover shrink-0 border border-rose-200 shadow-2xs"
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = '/vite.svg';
                        }}
                      />
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 text-[10px] font-black uppercase">
                            {leadCatName}
                          </span>
                          <span className="text-xs text-amber-700 font-bold flex items-center gap-1">
                            <Clock className="w-3 h-3 text-amber-600" />
                            <span>Dispatching Now · First to Accept Wins</span>
                          </span>
                        </div>
                        <p className="text-sm sm:text-base font-bold text-slate-900 leading-snug">
                          "{leadProblem}"
                        </p>
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <MapPin className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                          <span>Area: <strong className="text-slate-800">{leadArea}</strong> (Full address provided upon acceptance)</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0 w-full md:w-auto">
                      <button
                        onClick={() => handleDeclineEmergencyLead(leadId)}
                        disabled={isClaiming}
                        className="flex-1 md:flex-initial px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition disabled:opacity-50 cursor-pointer"
                      >
                        Decline
                      </button>
                      <button
                        onClick={() => handleAcceptEmergencyLead(lead)}
                        disabled={isClaiming}
                        className="flex-1 md:flex-initial px-5 py-2.5 rounded-xl text-xs font-black text-white bg-[#06684F] hover:bg-[#055742] active:scale-95 transition shadow-sm flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                      >
                        {isClaiming ? (
                          <>
                            <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            <span>Claiming...</span>
                          </>
                        ) : (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Accept Job Now</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs text-slate-500 flex items-center gap-2.5">
              <span className="w-2 h-2 rounded-full bg-emerald-600 shrink-0" />
              <span>
                {emergencyConfig.isAvailable
                  ? 'No pending emergency requests in your area right now. When an urgent request is created nearby, an instant alert will pop up on your screen.'
                  : 'Turn Emergency Availability ON above to start receiving instant Uber-style emergency job dispatches.'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* 2. Responsive Summary Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3.5 sm:gap-4">
        {/* Matching Available Jobs */}
        <div className="bg-white border border-slate-200/90 shadow-2xs p-4 sm:p-5 rounded-2xl flex flex-col justify-between hover:border-slate-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">Available Jobs</span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
              <Search className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2.5">
            <p className="text-2xl sm:text-3xl font-black text-blue-700 tracking-tight">{s.matchingJobsCount || 0}</p>
            <span className="text-[11px] text-blue-600 font-medium mt-0.5 block truncate">
              Available to send price
            </span>
          </div>
        </div>

        {/* Submitted Offers */}
        <div className="bg-white border border-slate-200/90 shadow-2xs p-4 sm:p-5 rounded-2xl flex flex-col justify-between hover:border-slate-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">Offers Sent</span>
            <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
              <FileText className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2.5">
            <p className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">{s.submittedQuotations || 0}</p>
            <span className="text-[11px] text-slate-500 font-medium mt-0.5 block truncate">
              Total offers sent
            </span>
          </div>
        </div>

        {/* Waiting for Response */}
        <div className="bg-white border border-slate-200/90 shadow-2xs p-4 sm:p-5 rounded-2xl flex flex-col justify-between hover:border-slate-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">Waiting for Response</span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2.5">
            <p className="text-2xl sm:text-3xl font-black text-amber-700 tracking-tight">{s.awaitingDecisionCount || 0}</p>
            <span className="text-[11px] text-amber-700 font-medium mt-0.5 block truncate">
              {s.acceptedQuotationsCount || 0} accepted by customers
            </span>
          </div>
        </div>

        {/* Confirmed Jobs */}
        <div className="bg-white border border-slate-200/90 shadow-2xs p-4 sm:p-5 rounded-2xl flex flex-col justify-between hover:border-slate-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">Confirmed Jobs</span>
            <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center">
              <CheckCircle className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2.5">
            <p className="text-2xl sm:text-3xl font-black text-purple-800 tracking-tight">{s.upcomingBookingsCount || 0}</p>
            <span className="text-[11px] text-purple-700 font-medium mt-0.5 block truncate">
              {s.activeJobsCount ? `${s.activeJobsCount} in progress` : 'Scheduled jobs'}
            </span>
          </div>
        </div>

        {/* Completed Work */}
        <div className="bg-white border border-slate-200/90 shadow-2xs p-4 sm:p-5 rounded-2xl flex flex-col justify-between hover:border-slate-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">Completed Work</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-800 flex items-center justify-center">
              <ShieldCheck className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2.5">
            <p className="text-2xl sm:text-3xl font-black text-emerald-800 tracking-tight">{s.completedJobsCount || 0}</p>
            <span className="text-[11px] text-emerald-700 font-medium mt-0.5 block truncate">
              Successfully delivered
            </span>
          </div>
        </div>

        {/* Earnings After Fees */}
        <div className="col-span-2 sm:col-span-1 md:col-span-1 xl:col-span-1 bg-white border border-slate-200/90 shadow-2xs p-4 sm:p-5 rounded-2xl flex flex-col justify-between hover:border-slate-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">Earnings After Fees</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-800 flex items-center justify-center">
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2.5">
            <p className="text-2xl sm:text-3xl font-black text-emerald-800 tracking-tight truncate">
              {formatCurrency(s.totalEarnings || 0)}
            </p>
            <span className="text-[11px] text-slate-500 font-medium mt-0.5 block truncate">
              {s.pendingEscrow > 0 ? `${formatCurrency(s.pendingEscrow)} payment protected` : 'All payouts settled'}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Profile Completion Card */}
      <div className="w-full bg-white border border-slate-200/90 shadow-2xs rounded-2xl p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2.5">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-emerald-50 text-emerald-800 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-4 h-4 text-emerald-700" />
            </div>
            <span className="text-xs sm:text-sm font-bold text-slate-900">
              Profile Completion
            </span>
          </div>
          <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200/60 self-start sm:self-auto">
            {s.profileCompleteness || 85}% Complete
          </span>
        </div>

        <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden my-3">
          <div 
            className="bg-emerald-700 h-2.5 rounded-full transition-all duration-500"
            style={{ width: `${s.profileCompleteness || 85}%` }}
          />
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-500 pt-1">
          <span>Complete all steps and upload verification documents to receive more job requests.</span>
          <Link to="/vendor/verification" className="text-emerald-800 font-bold hover:underline shrink-0">
            Manage Documents & Licenses →
          </Link>
        </div>
      </div>

      {/* 4. Live Sections: Hot Job Opportunities & Upcoming Bookings */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 lg:gap-7 items-stretch">
        
        {/* Section A: Recent Matching Jobs */}
        <div className="bg-white border border-slate-200/90 shadow-2xs rounded-3xl p-6 sm:p-7 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-5 pb-3.5 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-800 flex items-center justify-center">
                  <Briefcase className="w-4 h-4 text-emerald-700" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Available Jobs Near You</h3>
                  <p className="text-[11px] text-slate-500">Open requests from customers in your area</p>
                </div>
              </div>
              <Link to="/vendor/browse-jobs" className="text-xs font-bold text-emerald-800 hover:underline shrink-0">
                Find Available Jobs →
              </Link>
            </div>

            {s.recentJobs && s.recentJobs.length > 0 ? (
              <div className="space-y-3.5">
                {s.recentJobs.map((job) => (
                  <div 
                    key={job._id} 
                    className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 hover:border-emerald-700/40 hover:bg-white transition-all space-y-2 shadow-2xs"
                  >
                    <div className="flex items-start gap-3">
                      <img
                        src={getJobImage(job)}
                        alt={job.title || 'Service Image'}
                        className="w-12 h-12 rounded-xl object-cover shrink-0 border border-slate-200"
                        onError={(e) => handleImageFallback(e, FALLBACK_SERVICE_IMAGE)}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <span className="text-xs sm:text-sm font-bold text-slate-900 truncate flex-1">{job.title}</span>
                          <span className="text-xs font-bold text-emerald-800 shrink-0 bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-200/60">
                            {job.budget?.amount > 0 ? formatCurrency(job.budget.amount) : 'Open to offers'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed mt-1">{job.description}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1.5 border-t border-slate-100">
                      <div className="flex items-center gap-2 truncate">
                        <span>{job.location?.city || 'Lucknow'}</span>
                        <span>·</span>
                        <span className="font-semibold text-slate-700 capitalize">{job.urgency || 'Normal'} Urgency</span>
                      </div>
                      <Link to={`/vendor/jobs/${job._id}`} className="text-emerald-800 font-bold hover:underline shrink-0">
                        View Job →
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center flex flex-col items-center justify-center space-y-2">
                <div className="w-10 h-10 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center">
                  <Briefcase className="w-5 h-5" />
                </div>
                <p className="text-xs font-semibold text-slate-700">No open jobs matching your services right now.</p>
                <p className="text-[11px] text-slate-500 max-w-xs">New customer requests appear here in real time as they are posted in Lucknow.</p>
                <Link to="/vendor/browse-jobs" className="pt-2">
                  <Button variant="secondary" size="sm">
                    Find Available Jobs
                  </Button>
                </Link>
              </div>
            )}
          </div>

          <div className="pt-5 mt-5 border-t border-slate-100">
            <Link to="/vendor/browse-jobs" className="block w-full">
              <Button variant="secondary" size="md" className="w-full">
                Find Available Jobs
              </Button>
            </Link>
          </div>
        </div>

        {/* Section B: Confirmed Jobs */}
        <div className="bg-white border border-slate-200/90 shadow-2xs rounded-3xl p-6 sm:p-7 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-5 pb-3.5 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
                  <Clock className="w-4 h-4 text-blue-700" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Confirmed Jobs</h3>
                  <p className="text-[11px] text-slate-500">Scheduled customer jobs with protected payment</p>
                </div>
              </div>
              <Link to="/vendor/bookings" className="text-xs font-bold text-blue-700 hover:underline shrink-0">
                View Confirmed Jobs →
              </Link>
            </div>

            {s.upcomingBookings && s.upcomingBookings.length > 0 ? (
              <div className="space-y-3.5">
                {s.upcomingBookings.map((b) => (
                  <div 
                    key={b._id} 
                    className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 hover:border-blue-700/40 hover:bg-white transition-all space-y-2 shadow-2xs"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-xs sm:text-sm font-bold text-slate-900 truncate flex-1">{b.serviceTitle}</span>
                      <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase bg-emerald-100 text-emerald-800 shrink-0">
                        {b.status}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-600">
                      <span>Customer: <strong className="text-slate-800">{b.customer?.name || 'Customer'}</strong></span>
                      <span className="font-black text-slate-900">{formatCurrency(b.pricing?.amount || 0)}</span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1.5 border-t border-slate-100">
                      <div className="flex items-center gap-1.5 truncate">
                        <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{new Date(b.scheduledDate).toLocaleDateString()} · {b.timeSlot || 'Scheduled'}</span>
                      </div>
                      <Link to={`/vendor/manage-job/${b._id}`} className="text-blue-700 font-bold hover:underline shrink-0">
                        Manage Job →
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center flex flex-col items-center justify-center space-y-2">
                <div className="w-10 h-10 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center">
                  <Clock className="w-5 h-5" />
                </div>
                <p className="text-xs font-semibold text-slate-700">No active jobs currently scheduled.</p>
                <p className="text-[11px] text-slate-500 max-w-xs">When customers book your services or accept your price offers, they will appear here.</p>
                <div className="pt-2 flex items-center gap-2">
                  <Link to="/vendor/calendar">
                    <Button variant="secondary" size="sm">
                      Check Calendar
                    </Button>
                  </Link>
                  <Link to="/vendor/browse-jobs">
                    <Button variant="primary" size="sm">
                      Find Available Jobs
                    </Button>
                  </Link>
                </div>
              </div>
            )}
          </div>

          <div className="pt-5 mt-5 border-t border-slate-100 flex flex-col sm:flex-row items-center gap-3">
            <Link to="/vendor/bookings" className="w-full sm:flex-1">
              <Button variant="primary" size="md" className="w-full">
                View Confirmed Jobs
              </Button>
            </Link>
            <Link to="/vendor/calendar" className="w-full sm:w-auto">
              <Button variant="secondary" size="md" icon={Calendar} className="w-full sm:w-auto">
                Calendar
              </Button>
            </Link>
          </div>
        </div>

      </div>

      {/* 5. My Recent Offers Section */}
      <div className="bg-white border border-slate-200/90 shadow-2xs rounded-3xl p-6 sm:p-7">
        <div className="flex items-center justify-between mb-5 pb-3.5 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-800 flex items-center justify-center">
              <FileText className="w-4 h-4 text-emerald-700" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">My Recent Offers</h3>
              <p className="text-[11px] text-slate-500">Track price offers you sent for customer jobs</p>
            </div>
          </div>
          <Link to="/vendor/responses" className="text-xs font-bold text-emerald-800 hover:underline shrink-0">
            View All Offers ({s.submittedQuotations || 0}) →
          </Link>
        </div>

        {s.recentQuotations && s.recentQuotations.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {s.recentQuotations.map((q) => {
              const statusStyle = 
                q.status === 'accepted' ? 'bg-emerald-100 text-emerald-800' :
                q.status === 'rejected' ? 'bg-rose-100 text-rose-800' :
                q.status === 'shortlisted' ? 'bg-purple-100 text-purple-800' :
                'bg-blue-100 text-blue-800';

              return (
                <div 
                  key={q._id}
                  className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 hover:border-emerald-700/40 hover:bg-white transition-all space-y-2.5 shadow-2xs"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-xs sm:text-sm font-bold text-slate-900 truncate flex-1">
                      {q.job?.title || 'Job Service Request'}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase shrink-0 ${statusStyle}`}>
                      {q.status}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-600">
                    <span>Your Price: <strong className="text-emerald-800 font-black">{formatCurrency(q.proposedAmount)}</strong></span>
                    <span className="text-slate-500 text-[11px]">Estimated Time: {q.estimatedDuration || '1-2 days'}</span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100">
                    <span>Submitted: {new Date(q.createdAt).toLocaleDateString()}</span>
                    {q.job?._id && (
                      <Link to={`/vendor/jobs/${q.job._id}`} className="text-emerald-800 font-bold hover:underline shrink-0">
                        View Job →
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-8 text-center flex flex-col items-center justify-center space-y-2">
            <div className="w-10 h-10 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <p className="text-xs font-semibold text-slate-700">You haven't sent any price offers yet.</p>
            <p className="text-[11px] text-slate-500 max-w-sm">
              Discover customer jobs seeking licensed pros and send your price to win bookings.
            </p>
            <Link to="/vendor/browse-jobs" className="pt-2">
              <Button variant="primary" size="sm" icon={Search}>
                Find Available Jobs
              </Button>
            </Link>
          </div>
        )}
      </div>

      {/* 6. Quick Launchpad to Professional Operations */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 shadow-xs">
        <div className="space-y-1 max-w-2xl">
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 block">
            Grow Your Business
          </span>
          <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            List your services or send prices on customer requests
          </h3>
          <p className="text-xs text-slate-300 leading-relaxed">
            Professionals with 3 or more published services receive up to 4x more direct booking requests from verified customers across Lucknow.
          </p>
        </div>
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 shrink-0 w-full lg:w-auto">
          <Link to="/vendor/services/new" className="flex-1 sm:flex-initial">
            <Button variant="primary" size="md" className="!bg-emerald-600 hover:!bg-emerald-500 !text-white border-none w-full sm:w-auto">
              Add New Service
            </Button>
          </Link>
          <Link to="/vendor/responses" className="flex-1 sm:flex-initial">
            <Button variant="secondary" size="md" className="!bg-slate-800 !text-slate-200 !border-slate-700 hover:!bg-slate-700 w-full sm:w-auto">
              My Offers
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
