import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { 
  PlusCircle, 
  Clock, 
  MapPin, 
  Users, 
  Activity, 
  Search, 
  LayoutGrid, 
  List, 
  Calendar,
  Briefcase,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Tag,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  Key,
  MoreVertical,
  Edit3,
  Trash2,
  XCircle,
  Eye
} from 'lucide-react';
import Button from '../../components/common/Button';
import { jobAPI } from '../../api/job.api';
import Loader from '../../components/common/Loader';
import { 
  formatCurrency, 
  formatRelativeTime, 
  formatFullAddress,
  getStatusBadgeColor, 
  getUrgencyBadgeColor 
} from '../../utils/formatters';
import { resolveJobImage, getJobImage, handleImageFallback, FALLBACK_SERVICE_IMAGE } from '../../constants/serviceImages';
import EditJobModal from '../../components/job/EditJobModal';
import CancelJobModal from '../../components/job/CancelJobModal';
import DeleteJobModal from '../../components/job/DeleteJobModal';
import { useSocketContext } from '../../context/SocketContext';

export default function CustomerMyJobs() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'

  // Job Action Modals and Menu States
  const [activeMenuJobId, setActiveMenuJobId] = useState(null);
  const [editingJob, setEditingJob] = useState(null);
  const [cancellingJob, setCancellingJob] = useState(null);
  const [deletingJob, setDeletingJob] = useState(null);
  const [toast, setToast] = useState(null);

  const { socket } = useSocketContext();
  const menuRef = useRef(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Close actions menu on click outside or escape key
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setActiveMenuJobId(null);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setActiveMenuJobId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleJobUpdated = (updatedJob) => {
    setJobs((prev) => prev.map((j) => (j._id === updatedJob._id ? { ...j, ...updatedJob } : j)));
    showToast('✨ Job tender updated successfully!');
  };

  const handleJobCancelled = (cancelledJob) => {
    setJobs((prev) => prev.map((j) => (j._id === cancelledJob._id ? { ...j, status: 'cancelled' } : j)));
    showToast('🚫 Job tender has been cancelled.');
  };

  const handleJobDeleted = (jobId) => {
    setJobs((prev) => prev.filter((j) => j._id !== jobId));
    showToast('🗑️ Job tender removed successfully.');
  };

  useEffect(() => {
    let isMounted = true;
    const fetchJobs = async () => {
      setLoading(true);
      try {
        const res = await jobAPI.getMyJobs();
        if (isMounted && res?.jobs) {
          setJobs(res.jobs);
        }
      } catch (err) {
        console.error('Failed to load customer jobs:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchJobs();
    return () => { isMounted = false; };
  }, []);

  // Real-time synchronization: Remove or update cancelled/deleted jobs across open browser sessions
  useEffect(() => {
    if (!socket) return;

    const handleRemoteCancelled = (data) => {
      const cId = data?.jobId || data?.id;
      if (cId) {
        setJobs((prev) =>
          prev.map((j) =>
            (j._id || j.id) === cId
              ? { ...j, status: 'cancelled', cancellationReason: data.reason || 'Cancelled by customer' }
              : j
          )
        );
      }
    };

    const handleRemoteDeleted = (data) => {
      const dId = data?.jobId || data?.id;
      if (dId) {
        setJobs((prev) => prev.filter((j) => (j._id || j.id) !== dId));
      }
    };

    socket.on('job_cancelled', handleRemoteCancelled);
    socket.on('job_deleted', handleRemoteDeleted);

    return () => {
      socket.off('job_cancelled', handleRemoteCancelled);
      socket.off('job_deleted', handleRemoteDeleted);
    };
  }, [socket]);

  // Real backend status counts
  const activeJobsCount = jobs.filter((j) => j.status !== 'cancelled').length;
  const openCount = jobs.filter((j) => j.status === 'open').length;
  const assignedCount = jobs.filter((j) => j.status === 'assigned').length;
  const inProgressCount = jobs.filter((j) => j.status === 'in_progress').length;
  const completedCount = jobs.filter((j) => j.status === 'completed').length;
  const cancelledCount = jobs.filter((j) => j.status === 'cancelled').length;

  // Filtered jobs matching active tab and search query (cancelled requests isolated to dedicated Cancelled tab)
  const filteredJobs = jobs.filter((job) => {
    const matchesTab = activeTab === 'all'
      ? job.status !== 'cancelled'
      : job.status === activeTab;
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q || 
      job.title?.toLowerCase().includes(q) ||
      job.description?.toLowerCase().includes(q) ||
      job.category?.name?.toLowerCase().includes(q) ||
      job.location?.address?.toLowerCase().includes(q) ||
      job.location?.city?.toLowerCase().includes(q);

    return matchesTab && matchesSearch;
  });

  const renderActionsMenu = (job) => {
    const isAssignedOrActive = ['assigned', 'in_progress', 'completion_pending'].includes(job.status);
    const applicantsCount = job.applicantsCount || 0;
    const isMenuOpen = activeMenuJobId === job._id;

    return (
      <div className="relative inline-block text-left" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setActiveMenuJobId(isMenuOpen ? null : job._id);
          }}
          className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition active:scale-95"
          title="Job actions"
          aria-label="Job actions"
          aria-haspopup="true"
          aria-expanded={isMenuOpen}
        >
          <MoreVertical className="w-4 h-4" />
        </button>

        {isMenuOpen && (
          <div
            ref={menuRef}
            className="absolute right-0 top-full mt-1 w-52 bg-white rounded-2xl shadow-xl border border-slate-200 py-1.5 z-40 animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* View Details */}
            <Link
              to={`/jobs/${job._id}`}
              onClick={() => setActiveMenuJobId(null)}
              className="w-full px-3.5 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-emerald-800 flex items-center gap-2.5 transition"
            >
              <Eye className="w-3.5 h-3.5 text-slate-400" />
              <span>View Details</span>
            </Link>

            {/* Edit Job (if not completed or cancelled) */}
            {!['completed', 'cancelled', 'expired'].includes(job.status) && (
              <button
                type="button"
                onClick={() => {
                  setActiveMenuJobId(null);
                  setEditingJob(job);
                }}
                className="w-full px-3.5 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-emerald-800 flex items-center gap-2.5 transition"
              >
                <Edit3 className="w-3.5 h-3.5 text-slate-400" />
                <span>{isAssignedOrActive ? 'Edit Notes / Schedule' : 'Edit Job'}</span>
              </button>
            )}

            {/* Track Job (if assigned or in_progress) */}
            {(job.status === 'assigned' || job.status === 'in_progress') && (
              <Link
                to={`/customer/tracking?jobId=${job._id}`}
                onClick={() => setActiveMenuJobId(null)}
                className="w-full px-3.5 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-emerald-800 flex items-center gap-2.5 transition"
              >
                <Activity className="w-3.5 h-3.5 text-slate-400" />
                <span>Track Job</span>
              </Link>
            )}

            {/* View Proposals */}
            <Link
              to={`/jobs/${job._id}`}
              onClick={() => setActiveMenuJobId(null)}
              className="w-full px-3.5 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-emerald-800 flex items-center gap-2.5 transition"
            >
              <Users className="w-3.5 h-3.5 text-slate-400" />
              <span>View Proposals ({applicantsCount})</span>
            </Link>

            {/* Cancel Job (if not completed or cancelled) */}
            {!['completed', 'cancelled'].includes(job.status) && (
              <button
                type="button"
                onClick={() => {
                  setActiveMenuJobId(null);
                  setCancellingJob(job);
                }}
                className="w-full px-3.5 py-2 text-left text-xs font-semibold text-amber-700 hover:bg-amber-50 flex items-center gap-2.5 transition border-t border-slate-100"
              >
                <XCircle className="w-3.5 h-3.5 text-amber-600" />
                <span>Cancel Request</span>
              </button>
            )}

            {/* Delete Job (if open, cancelled, or expired and not active) */}
            {['open', 'cancelled', 'expired'].includes(job.status) && (
              <button
                type="button"
                onClick={() => {
                  setActiveMenuJobId(null);
                  setDeletingJob(job);
                }}
                className="w-full px-3.5 py-2 text-left text-xs font-semibold text-rose-700 hover:bg-rose-50 flex items-center gap-2.5 transition border-t border-slate-100"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                <span>Delete Tender</span>
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* ── 1. Page Header with Title and Action ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            My Jobs
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1 leading-relaxed">
            Manage your service requests, review verified professional offers, and monitor active jobs
          </p>
        </div>

        <Link to="/customer/create-job" className="shrink-0 self-start sm:self-auto">
          <Button variant="primary" size="md" icon={PlusCircle} className="w-full sm:w-auto shadow-xs">
            Request a Service
          </Button>
        </Link>
      </div>

      {/* ── 2. Toolbar: Status Tabs & Search Controls ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-3 sm:p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
        {/* Status Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl overflow-x-auto max-w-full">
          {[
            { id: 'all', label: 'All Jobs', count: activeJobsCount },
            { id: 'open', label: 'Waiting for Response', count: openCount },
            { id: 'assigned', label: 'Confirmed Jobs', count: assignedCount },
            { id: 'in_progress', label: 'Current Work', count: inProgressCount },
            { id: 'completed', label: 'Completed Work', count: completedCount },
            { id: 'cancelled', label: 'Cancelled', count: cancelledCount },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                  isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                }`}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search Input & View Switcher */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by trade, title, or area..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-emerald-700 focus:border-transparent transition"
            />
          </div>

          <div className="hidden sm:flex items-center bg-slate-100 p-1 rounded-xl shrink-0">
            <button
              onClick={() => setViewMode('grid')}
              title="Grid View"
              className={`p-1.5 rounded-lg transition ${
                viewMode === 'grid'
                  ? 'bg-white text-emerald-800 shadow-2xs font-bold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              aria-label="Switch to Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              title="List View"
              className={`p-1.5 rounded-lg transition ${
                viewMode === 'list'
                  ? 'bg-white text-emerald-800 shadow-2xs font-bold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              aria-label="Switch to List View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ── 3. Content Area: Loading, Empty, or Jobs ── */}
      {loading ? (
        <div className="py-16">
          <Loader text="Loading your posted job tenders..." />
        </div>
      ) : filteredJobs.length === 0 ? (
        /* Empty State */
        <div className="bg-white border border-slate-200/90 shadow-2xs rounded-3xl p-10 sm:p-14 text-center max-w-lg mx-auto">
          <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center mx-auto mb-4 text-slate-400">
            <Briefcase className="w-6 h-6 text-slate-500" />
          </div>
          <h3 className="text-base font-bold text-slate-900">
            {searchQuery ? 'No Matching Job Tenders' : 'No Jobs in This Category'}
          </h3>
          <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
            {searchQuery 
              ? `No job tenders match your filter "${searchQuery}". Try a different keyword or reset.`
              : activeTab !== 'all'
                ? `You do not have any jobs currently in "${activeTab.replace('_', ' ')}" status.`
                : 'You have not submitted any service tenders yet. Post your first trade request to receive quotes.'}
          </p>
          <div className="mt-6 flex items-center justify-center gap-3">
            {searchQuery ? (
              <Button variant="secondary" size="sm" onClick={() => setSearchQuery('')}>
                Clear Filter
              </Button>
            ) : (
              <Link to="/customer/create-job">
                <Button variant="primary" size="sm" icon={PlusCircle}>
                  Post a New Job
                </Button>
              </Link>
            )}
          </div>
        </div>
      ) : viewMode === 'grid' ? (
        /* ── 4. Responsive 3-Column Grid View ── */
        <div className="customer-job-grid">
          {filteredJobs.map((job) => {
            const urgency = (job.urgency || 'medium').toLowerCase();
            const isEmergency = urgency === 'emergency';
            const isHigh = urgency === 'high';
            const urgencyStyle = isEmergency
              ? 'bg-rose-50 text-rose-700 border-rose-200'
              : isHigh
              ? 'bg-amber-50 text-amber-800 border-amber-200'
              : 'bg-emerald-50 text-emerald-800 border-emerald-200';

            const isInProgress = job.status === 'in_progress';
            const isCompleted = job.status === 'completed';
            const applicantsCount = job.applicantsCount || 0;

            const rawBudget = job.finalPrice?.amount || job.booking?.pricing?.amount || job.budget?.amount;
            const budgetAmount = typeof rawBudget === 'number' && !isNaN(rawBudget) ? rawBudget : Number(rawBudget) || 0;
            const hasBudget = budgetAmount > 0;
            const budgetLabel = job.finalPrice?.amount || job.booking?.pricing?.amount ? 'Agreed Service Price' : 'Estimated Budget';
            const budgetType = job.budget?.type === 'hourly' ? 'hr' : 'Fixed';

            return (
              <div
                key={job._id}
                className="bg-white border border-slate-200/90 hover:border-slate-300 rounded-3xl overflow-hidden shadow-2xs hover:shadow-xs transition-all duration-200 flex flex-col h-full group"
              >
                {/* 1. Service Image with category label and job status badges */}
                <div className="relative aspect-video w-full bg-slate-100 overflow-hidden border-b border-slate-100 shrink-0">
                  <img
                    src={getJobImage(job)}
                    alt={job.title || 'Service Image'}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    onError={(e) => handleImageFallback(e, FALLBACK_SERVICE_IMAGE)}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent pointer-events-none" />
                  <div className="absolute top-3 left-3 flex items-center gap-1.5 flex-wrap">
                    {job.urgency && (
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border shadow-2xs backdrop-blur-xs ${urgencyStyle}`}>
                        {job.urgency}
                      </span>
                    )}
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border shadow-2xs backdrop-blur-xs ${getStatusBadgeColor(job.status)}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        job.status === 'open' 
                          ? 'bg-emerald-600' 
                          : job.status === 'in_progress' 
                          ? 'bg-blue-600' 
                          : 'bg-slate-500'
                      }`} />
                      <span>{job.status === 'open' ? 'Open' : job.status?.replace('_', ' ')}</span>
                    </span>
                  </div>
                  {job.category?.name && (
                    <div className="absolute bottom-2.5 left-3">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-semibold bg-white/95 text-slate-800 shadow-2xs backdrop-blur-xs">
                        <Tag className="w-2.5 h-2.5 text-emerald-700 shrink-0" />
                        <span className="truncate max-w-[170px]">{job.category.name}</span>
                      </span>
                    </div>
                  )}
                </div>

                {/* Middle Body Area: Date, Title, Description, Assigned Pro, Location */}
                <div className="p-5 sm:p-6 pb-4 flex-1 flex flex-col">
                  {/* 2. Job date and title */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[11px] text-slate-400 flex items-center gap-1 shrink-0 font-medium">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      {formatRelativeTime(job.createdAt)}
                    </span>
                    {renderActionsMenu(job)}
                  </div>

                  <Link 
                    to={`/jobs/${job._id}`}
                    className="block group/title"
                  >
                    <h3 className="text-base font-bold text-slate-900 group-hover/title:text-emerald-800 transition line-clamp-2 leading-snug">
                      {job.title}
                    </h3>
                  </Link>

                  {/* 3. Short job description with controlled line clamping */}
                  <p className="text-xs text-slate-600 line-clamp-2 mt-2 leading-relaxed">
                    {job.description || 'Specialized hyperlocal trade request for verified Lucknow contractors.'}
                  </p>

                  {/* 4. Assigned professional information */}
                  {job.selectedVendor && (
                    <div className="mt-3 p-2.5 rounded-xl bg-blue-50/80 border border-blue-200/80 flex items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-6 h-6 rounded-full bg-blue-200 overflow-hidden shrink-0 flex items-center justify-center font-bold text-blue-900 text-[10px]">
                          {job.selectedVendor.avatar ? (
                            <img src={job.selectedVendor.avatar} alt={job.selectedVendor.name} className="w-full h-full object-cover" />
                          ) : (
                            <span>{(job.selectedVendor.name || 'P').charAt(0)}</span>
                          )}
                        </div>
                        <span className="font-semibold text-blue-900 truncate">
                          Assigned Pro: {job.selectedVendor.name || 'Verified Contractor'}
                        </span>
                      </div>
                      <ShieldCheck className="w-3.5 h-3.5 text-blue-700 shrink-0" />
                    </div>
                  )}

                  {/* 5. Service location and scheduled time, when available (pinned to bottom of body) */}
                  <div className="flex flex-col gap-1.5 text-xs text-slate-500 mt-auto pt-3 border-t border-slate-100">
                    <span className="flex items-start gap-1.5 text-slate-700 leading-snug">
                      <MapPin className="w-3.5 h-3.5 text-emerald-700 shrink-0 mt-0.5" />
                      <span className="line-clamp-1">{formatFullAddress(job.location)}</span>
                    </span>

                    {job.preferredDate && (
                      <span className="flex items-center gap-1.5 text-slate-600">
                        <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">Date & Time: {job.preferredDate} {job.preferredTime ? `(${job.preferredTime})` : ''}</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* 6. Divider & Dedicated Card Footer */}
                <div className="mt-auto border-t border-slate-100 bg-slate-50/40 p-4 sm:p-5 flex flex-col gap-3">
                  {/* 7. Estimated budget section with readable label and value */}
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-500">
                      {budgetLabel}
                    </span>
                    <div className="flex items-baseline gap-1">
                      {hasBudget ? (
                        <>
                          <span className="text-lg sm:text-xl font-black text-emerald-800 tracking-tight">
                            {formatCurrency(budgetAmount)}
                          </span>
                          <span className="text-xs text-slate-500 font-medium">
                            /{budgetType}
                          </span>
                        </>
                      ) : (
                        <span className="text-xs font-bold text-slate-600">
                          Quote on Request
                        </span>
                      )}
                    </div>
                  </div>

                  {/* 8. Action buttons in a separate footer row */}
                  <div className="pt-2.5 border-t border-slate-200/60 flex flex-wrap items-center gap-2">
                    {(job.status === 'assigned' || job.status === 'in_progress' || job.selectedVendor) && (
                      <Link to="/customer/bookings" className="flex-1 min-w-[90px]">
                        <Button variant="primary" size="sm" icon={Key} className="w-full text-xs !bg-emerald-800 hover:!bg-emerald-900 justify-center whitespace-nowrap">
                          View OTP
                        </Button>
                      </Link>
                    )}

                    <Link to={`/jobs/${job._id}`} className="flex-1 min-w-[105px]">
                      <Button variant="secondary" size="sm" icon={Users} className="w-full text-xs justify-center whitespace-nowrap">
                        Proposals ({applicantsCount})
                      </Button>
                    </Link>

                    {isInProgress && (
                      <Link to={`/customer/tracking?jobId=${job._id}`} className="flex-1 min-w-[90px]">
                        <Button variant="outline" size="sm" icon={Activity} className="w-full text-xs justify-center whitespace-nowrap">
                          Track Job
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
        /* ── 5. Full-Width Structured List View ── */
        <div className="space-y-4">
          {filteredJobs.map((job) => {
            const urgency = (job.urgency || 'medium').toLowerCase();
            const isEmergency = urgency === 'emergency';
            const isHigh = urgency === 'high';
            const urgencyStyle = isEmergency
              ? 'bg-rose-50 text-rose-700 border-rose-200'
              : isHigh
              ? 'bg-amber-50 text-amber-800 border-amber-200'
              : 'bg-emerald-50 text-emerald-800 border-emerald-200';

            const isInProgress = job.status === 'in_progress';
            const applicantsCount = job.applicantsCount || 0;

            return (
              <div
                key={job._id}
                className="bg-white border border-slate-200/90 hover:border-slate-300 rounded-2xl p-5 sm:p-6 shadow-2xs hover:shadow-xs transition-all duration-200 flex flex-col lg:flex-row lg:items-center justify-between gap-5 group"
              >
                {/* Left Details with Service Thumbnail */}
                <div className="flex items-start gap-4 sm:gap-5 flex-1 min-w-0">
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden bg-slate-100 shrink-0 border border-slate-200/80 hidden xs:block">
                    <img
                      src={getJobImage(job)}
                      alt={job.title || 'Service Image'}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => handleImageFallback(e, FALLBACK_SERVICE_IMAGE)}
                    />
                  </div>

                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        {job.category?.name && (
                          <span className="px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            {job.category.name}
                          </span>
                        )}
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider border ${getStatusBadgeColor(job.status)}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            job.status === 'open' ? 'bg-emerald-600' : job.status === 'in_progress' ? 'bg-blue-600' : 'bg-slate-500'
                          }`} />
                          <span>{job.status === 'open' ? 'Open' : job.status?.replace('_', ' ')}</span>
                        </span>
                        {job.urgency && (
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${urgencyStyle}`}>
                            {job.urgency}
                          </span>
                        )}
                        <span className="text-[11px] text-slate-400 flex items-center gap-1 font-medium">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          {formatRelativeTime(job.createdAt)}
                        </span>
                      </div>
                      {renderActionsMenu(job)}
                    </div>

                    <Link to={`/jobs/${job._id}`} className="block">
                      <h3 className="text-base sm:text-lg font-bold text-slate-900 group-hover:text-emerald-800 transition leading-snug">
                        {job.title}
                      </h3>
                    </Link>

                    <p className="text-xs sm:text-sm text-slate-600 line-clamp-2 leading-relaxed">
                      {job.description || 'Specialized hyperlocal trade request for verified Lucknow contractors.'}
                    </p>

                    <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-slate-500 pt-1">
                      <span className="flex items-start gap-1 text-slate-700 leading-snug max-w-md">
                        <MapPin className="w-3.5 h-3.5 text-emerald-700 shrink-0 mt-0.5" />
                        <span>{formatFullAddress(job.location)}</span>
                      </span>

                      {job.preferredDate && (
                        <span className="flex items-center gap-1 text-slate-600">
                          <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>Date and Time: {job.preferredDate} ({job.preferredTime || 'Flexible'})</span>
                        </span>
                      )}

                      <span className="flex items-center gap-1 text-slate-700 font-medium">
                        <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{applicantsCount} Offers Received</span>
                      </span>

                      {job.selectedVendor && (
                        <span className="flex items-center gap-1 text-blue-700 font-semibold">
                          <ShieldCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          <span>Contractor: {job.selectedVendor.name}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Column: Budget & Actions */}
                <div className="shrink-0 flex flex-col sm:flex-row lg:flex-col items-stretch sm:items-center lg:items-end justify-between gap-3 lg:border-l lg:border-slate-100 lg:pl-6 pt-3 lg:pt-0 border-t border-slate-100 lg:border-t-0">
                  <div className="sm:text-left lg:text-right">
                    <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 block">
                      {job.finalPrice?.amount || job.booking?.pricing?.amount ? 'Agreed Service Price' : 'Estimated Budget'}
                    </span>
                    <div className="flex items-baseline gap-1 lg:justify-end">
                      {(job.finalPrice?.amount || job.booking?.pricing?.amount || job.budget?.amount) > 0 ? (
                        <>
                          <span className="text-xl sm:text-2xl font-black text-emerald-800">
                            {formatCurrency(job.finalPrice?.amount || job.booking?.pricing?.amount || job.budget?.amount)}
                          </span>
                          <span className="text-xs text-slate-500 font-medium">
                            /{job.budget?.type === 'hourly' ? 'hr' : 'Fixed'}
                          </span>
                        </>
                      ) : (
                        <span className="text-sm font-bold text-slate-600">
                          Quote on Request
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {(job.status === 'assigned' || job.status === 'in_progress' || job.selectedVendor) && (
                      <Link to="/customer/bookings">
                        <Button variant="primary" size="sm" icon={Key} className="!bg-emerald-800 hover:!bg-emerald-900 text-xs whitespace-nowrap">
                          View OTP
                        </Button>
                      </Link>
                    )}
                    <Link to={`/jobs/${job._id}`}>
                      <Button variant="secondary" size="sm" icon={Users} className="text-xs whitespace-nowrap">
                        Proposals ({applicantsCount})
                      </Button>
                    </Link>
                    {isInProgress && (
                      <Link to={`/customer/tracking?jobId=${job._id}`}>
                        <Button variant="outline" size="sm" icon={Activity} className="text-xs whitespace-nowrap">
                          Track Job
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── 6. Modals for Edit, Cancel, and Delete ── */}
      <EditJobModal
        job={editingJob}
        isOpen={Boolean(editingJob)}
        onClose={() => setEditingJob(null)}
        onJobUpdated={handleJobUpdated}
      />

      <CancelJobModal
        job={cancellingJob}
        isOpen={Boolean(cancellingJob)}
        onClose={() => setCancellingJob(null)}
        onJobCancelled={handleJobCancelled}
      />

      <DeleteJobModal
        job={deletingJob}
        isOpen={Boolean(deletingJob)}
        onClose={() => setDeletingJob(null)}
        onJobDeleted={handleJobDeleted}
      />

      {/* Floating Toast Notification */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-xl border text-sm font-semibold animate-in fade-in slide-in-from-bottom-3 duration-200 ${
          toast.type === 'error'
            ? 'bg-rose-900 text-white border-rose-800'
            : 'bg-slate-900 text-white border-slate-800'
        }`}>
          {toast.type === 'error' ? (
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          )}
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}
