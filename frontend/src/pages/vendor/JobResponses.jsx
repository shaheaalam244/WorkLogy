import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  FileText, 
  Clock, 
  MapPin, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  ArrowRight,
  DollarSign,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Search
} from 'lucide-react';
import Button from '../../components/common/Button';
import Loader from '../../components/common/Loader';
import { applicationAPI } from '../../api/application.api';
import { formatCurrency, getDisplayName } from '../../utils/formatters';

const TABS = [
  { id: 'all', label: 'All Offers' },
  { id: 'pending', label: 'Pending Offers' },
  { id: 'accepted', label: 'Accepted / Confirmed' },
  { id: 'withdrawn', label: 'Withdrawn' },
  { id: 'rejected', label: 'Rejected / Expired' }
];

export default function VendorJobResponses() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  const [actionMsg, setActionMsg] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [withdrawingId, setWithdrawingId] = useState(null);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await applicationAPI.getVendorApplications();
      if (res?.applications) {
        // Deduplicate applications by job ID keeping the latest proposal per job
        const seenJobIds = new Set();
        const deduplicated = [];
        for (const app of res.applications) {
          const jId = app.job?._id?.toString() || app.job?.toString() || app._id;
          if (!seenJobIds.has(jId)) {
            seenJobIds.add(jId);
            deduplicated.push(app);
          }
        }
        setApplications(deduplicated);
      }
    } catch (err) {
      console.error('Error fetching vendor applications:', err);
      setError(err?.response?.data?.message || 'Failed to load your submitted offers. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, []);

  const handleWithdraw = async (id, jobTitle) => {
    const confirmed = window.confirm(
      `Are you sure you want to withdraw your offer for "${jobTitle || 'this job'}"? The customer will no longer see your quote.`
    );
    if (!confirmed) return;

    try {
      setWithdrawingId(id);
      setActionMsg(null);
      setActionError(null);
      const res = await applicationAPI.withdraw(id);
      if (res?.success) {
        setActionMsg('Offer withdrawn successfully. It has been moved to Withdrawn.');
        fetchApplications();
        setTimeout(() => setActionMsg(null), 4000);
      }
    } catch (err) {
      console.error('Error withdrawing application:', err);
      setActionError(err.response?.data?.message || 'Failed to withdraw proposal. Please try again.');
      setTimeout(() => setActionError(null), 4000);
    } finally {
      setWithdrawingId(null);
    }
  };

  // Derive counts across categories
  const pendingApps = applications.filter((app) => {
    const isJobCancelled = app.job?.status === 'cancelled' || app.job?.isDeleted;
    return (app.status === 'submitted' || app.status === 'shortlisted') && !isJobCancelled;
  });

  const acceptedApps = applications.filter((app) => app.status === 'accepted');

  const withdrawnApps = applications.filter((app) => app.status === 'withdrawn');

  const rejectedApps = applications.filter((app) => {
    const isJobCancelled = app.job?.status === 'cancelled' || app.job?.isDeleted;
    return app.status === 'rejected' || (isJobCancelled && app.status !== 'accepted');
  });

  // Filter based on activeTab
  const filteredApplications = applications.filter((app) => {
    const isJobCancelled = app.job?.status === 'cancelled' || app.job?.isDeleted;

    if (activeTab === 'all') return true;
    if (activeTab === 'pending') {
      return (app.status === 'submitted' || app.status === 'shortlisted') && !isJobCancelled;
    }
    if (activeTab === 'accepted') {
      return app.status === 'accepted';
    }
    if (activeTab === 'withdrawn') {
      return app.status === 'withdrawn';
    }
    if (activeTab === 'rejected') {
      return app.status === 'rejected' || (isJobCancelled && app.status !== 'accepted');
    }
    return true;
  });

  const getStatusBadge = (app) => {
    const jobStatus = app.job?.status;
    const isJobCancelled = jobStatus === 'cancelled' || app.job?.isDeleted;

    if (isJobCancelled && app.status !== 'accepted') {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 uppercase flex items-center gap-1">
          <XCircle className="w-3 h-3 text-rose-600" /> Job Cancelled by Customer
        </span>
      );
    }

    if (app.status === 'accepted') {
      if (jobStatus === 'completed' || app.job?.booking?.status === 'completed') {
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 uppercase flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-700" /> Hired · Work Completed
          </span>
        );
      }
      if (jobStatus === 'in_progress' || app.job?.booking?.status === 'in_progress') {
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-300 uppercase flex items-center gap-1 animate-pulse">
            <Clock className="w-3 h-3 text-blue-600" /> Hired · Work in Progress
          </span>
        );
      }
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 uppercase flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3 text-emerald-700" /> Hired · Booking Confirmed
        </span>
      );
    }

    if (app.status === 'withdrawn') {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200 uppercase flex items-center gap-1">
          <RotateCcw className="w-3 h-3 text-slate-500" /> Withdrawn
        </span>
      );
    }

    if (app.status === 'shortlisted') {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200 uppercase flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-purple-600" /> Shortlisted by Customer
        </span>
      );
    }

    if (app.status === 'rejected') {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200 uppercase flex items-center gap-1">
          <XCircle className="w-3 h-3 text-slate-400" /> Another Pro Selected
        </span>
      );
    }

    // Default 'submitted'
    return (
      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200 uppercase flex items-center gap-1">
        <Clock className="w-3 h-3 text-blue-600" /> Pending Customer Review
      </span>
    );
  };

  const getTabCount = (tabId) => {
    switch (tabId) {
      case 'all': return applications.length;
      case 'pending': return pendingApps.length;
      case 'accepted': return acceptedApps.length;
      case 'withdrawn': return withdrawnApps.length;
      case 'rejected': return rejectedApps.length;
      default: return 0;
    }
  };

  return (
    <div className="space-y-6 w-full">
      {/* ── 1. Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider block">Vendor Quotations</span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-0.5 tracking-tight">My Offers</h1>
          <p className="text-xs text-slate-600 mt-1">
            Track price proposals sent to customers, monitor accepted contracts, and manage active service agreements.
          </p>
        </div>

        <Link to="/vendor/browse-jobs">
          <Button variant="primary" size="md">
            Find Available Jobs
          </Button>
        </Link>
      </div>

      {/* ── 2. Feedback Banners ── */}
      {actionMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 shadow-2xs">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-700" />
          <span className="font-medium">{actionMsg}</span>
        </div>
      )}

      {actionError && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2 shadow-2xs">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span className="font-medium">{actionError}</span>
        </div>
      )}

      {/* ── 3. Tabs Filter ── */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3 overflow-x-auto scrollbar-thin">
        {TABS.map((tab) => {
          const count = getTabCount(tab.id);
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs whitespace-nowrap transition ${
                isActive
                  ? 'bg-emerald-800 text-white font-bold shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-medium'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                isActive ? 'bg-emerald-900 text-emerald-100' : 'bg-slate-200 text-slate-700'
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── 4. Main Content Area ── */}
      {loading ? (
        <div className="py-20">
          <Loader text="Fetching your submitted offers..." />
        </div>
      ) : error ? (
        <div className="bg-white border border-rose-200 rounded-3xl p-12 text-center max-w-md mx-auto shadow-2xs space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">Failed to Load Offers</h3>
          <p className="text-xs text-rose-600 leading-relaxed">{error}</p>
          <div className="pt-2 flex justify-center">
            <Button variant="primary" size="sm" onClick={fetchApplications}>
              Try Again
            </Button>
          </div>
        </div>
      ) : filteredApplications.length > 0 ? (
        <div className="space-y-4">
          {filteredApplications.map((app) => {
            const isJobCancelled = app.job?.status === 'cancelled' || app.job?.isDeleted;
            const isAccepted = app.status === 'accepted';
            const isWithdrawn = app.status === 'withdrawn';
            const isPending = app.status === 'submitted' || app.status === 'shortlisted';
            const bookingId = app.job?.booking?._id || app.job?.booking;

            return (
              <div 
                key={app._id}
                className={`bg-white border rounded-3xl p-6 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 transition ${
                  isWithdrawn ? 'opacity-75 border-slate-200 bg-slate-50/50' : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="space-y-2 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {getStatusBadge(app)}
                    <span className="text-[11px] font-semibold text-slate-500">
                      Category: {getDisplayName(app.job?.category) || 'General Trade'}
                    </span>
                    {app.job?.location?.city && (
                      <span className="text-[11px] text-slate-400">
                        · {app.job.location.locality ? `${app.job.location.locality}, ` : ''}{app.job.location.city}
                      </span>
                    )}
                  </div>

                  <h3 className="font-bold text-slate-900 text-base leading-snug">
                    {app.job?.title || 'Job Service Request'}
                  </h3>

                  {app.coverLetter && (
                    <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200/60 line-clamp-2 italic">
                      "{app.coverLetter}"
                    </p>
                  )}

                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-1">
                    <span>Estimated Time: <strong className="text-slate-700">{app.estimatedDuration || '1-2 days'}</strong></span>
                    <span>Proposed Schedule: <strong className="text-slate-700">{app.proposedSchedule || 'Standard Window'}</strong></span>
                    <span>Submitted: <strong className="text-slate-700">{new Date(app.createdAt).toLocaleDateString()}</strong></span>
                  </div>
                </div>

                {/* Offer pricing & action */}
                <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-3 pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-100 shrink-0">
                  <div className="text-left sm:text-right">
                    <span className="text-[10px] text-slate-500 uppercase block font-medium">Your Quoted Price</span>
                    <p className="text-2xl font-black text-emerald-800">
                      {formatCurrency(app.proposedAmount)}
                    </p>
                    <span className="text-[10px] text-slate-500 capitalize">{app.pricingBasis || 'fixed'} basis</span>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap justify-end">
                    {/* View Original Job Spec */}
                    {app.job?._id && (
                      <Link to={`/vendor/jobs/${app.job._id}`}>
                        <Button variant="ghost" size="sm" className="text-xs">
                          View Job
                        </Button>
                      </Link>
                    )}

                    {/* Pending & Not Cancelled: Allow Withdrawing */}
                    {isPending && !isJobCancelled && (
                      <Button
                        variant="secondary"
                        size="sm"
                        loading={withdrawingId === app._id}
                        disabled={withdrawingId === app._id}
                        onClick={() => handleWithdraw(app._id, app.job?.title)}
                        className="!text-rose-600 hover:!bg-rose-50 text-xs"
                      >
                        Withdraw Offer
                      </Button>
                    )}

                    {/* Accepted: Direct Link to Manage Job & Service Delivery */}
                    {isAccepted && (
                      <Link to={`/vendor/manage-job/${bookingId || app.job?._id}`}>
                        <Button variant="primary" size="sm" icon={ArrowRight} className="text-xs !bg-emerald-800 hover:!bg-emerald-900">
                          Manage Job
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center space-y-3 max-w-md mx-auto shadow-2xs">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-800 flex items-center justify-center mx-auto">
            <FileText className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">
            {activeTab === 'all' ? 'No Offers Submitted Yet' : `No Offers in "${TABS.find(t => t.id === activeTab)?.label}"`}
          </h3>
          <p className="text-xs text-slate-600 max-w-sm mx-auto leading-relaxed">
            {activeTab === 'withdrawn'
              ? 'You have not withdrawn any job offers.'
              : activeTab === 'accepted'
              ? 'When customers accept your price proposals, confirmed jobs will appear here.'
              : 'Browse open tenders in your trade categories and submit competitive quotes to win contracts.'}
          </p>
          <div className="pt-2">
            <Link to="/vendor/browse-jobs">
              <Button variant="primary" size="sm">
                Find Available Jobs
              </Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
