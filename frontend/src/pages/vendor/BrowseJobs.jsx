import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { 
  Search, 
  MapPin, 
  Clock, 
  AlertCircle, 
  ArrowRight,
  Briefcase,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  X,
  RefreshCw,
  Users,
  Tag,
  Flame,
  FileText,
  Zap,
  Navigation,
  Check,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  AlertTriangle,
  Settings,
  HelpCircle
} from 'lucide-react';
import Button from '../../components/common/Button';
import Loader from '../../components/common/Loader';
import ClaimJobModal from '../../components/vendor/ClaimJobModal';
import JobDetailsModal from '../../components/vendor/JobDetailsModal';
import { useSocketContext } from '../../context/SocketContext';
import { jobAPI } from '../../api/job.api';
import { categoryAPI } from '../../api/category.api';
import { formatCurrency, formatRelativeTime, formatShortAddress, getDisplayName } from '../../utils/formatters';
import { resolveJobImage, getJobImage, handleImageFallback, FALLBACK_SERVICE_IMAGE } from '../../constants/serviceImages';

const LUCKNOW_LOCALITIES = [
  'All Localities',
  'Gomti Nagar',
  'Hazratganj',
  'Indira Nagar',
  'Alambagh',
  'Mahanagar',
  'Ashiyana',
  'Chowk',
  'Jankipuram',
  'Vikas Nagar',
  'Aliganj',
  'Charbagh',
  'Rajajipuram',
  'Chinhat',
  'Telibagh'
];

const BUDGET_OPTIONS = [
  { label: 'All Budgets', value: '' },
  { label: 'Under ₹1,000', value: '0-1000' },
  { label: '₹1,000 - ₹3,000', value: '1000-3000' },
  { label: '₹3,000 - ₹5,000', value: '3000-5000' },
  { label: '₹5,000+', value: '5000-999999' }
];

export default function VendorBrowseJobs() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { socket } = useSocketContext();

  // Active Tab: 'all' | 'new' | 'open' | 'assigned' | 'cancelled'
  const activeTab = searchParams.get('tab') || 'all';

  // Filters State
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [selectedCat, setSelectedCat] = useState(searchParams.get('category') || '');
  const [selectedUrgency, setSelectedUrgency] = useState(searchParams.get('urgency') || '');
  const [selectedLocality, setSelectedLocality] = useState(searchParams.get('locality') || '');
  const [budgetRange, setBudgetRange] = useState(searchParams.get('budgetRange') || '');
  const [sortBy, setSortBy] = useState(searchParams.get('sortBy') || 'newest');
  const [page, setPage] = useState(parseInt(searchParams.get('page') || '1', 10));

  // Data & Feed State
  const [jobs, setJobs] = useState([]);
  const [totalJobs, setTotalJobs] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Vendor Coverage & Eligibility
  const [vendorCoverage, setVendorCoverage] = useState({
    city: 'Lucknow',
    localities: [],
    hasCityWide: true,
    approvedCategoriesCount: 0,
    categories: []
  });
  const [configurationStatus, setConfigurationStatus] = useState('ready');
  const [vendorEligibility, setVendorEligibility] = useState({
    approvalStatus: 'approved',
    canClaim: true,
    reason: ''
  });

  // Tab Counts
  const [counts, setCounts] = useState({
    allAvailable: 0,
    new: 0,
    open: 0,
    assignedToMe: 0,
    cancelled: 0
  });

  // Modals
  const [claimJobTarget, setClaimJobTarget] = useState(null);
  const [selectedJobIdForModal, setSelectedJobIdForModal] = useState(searchParams.get('jobId') || null);

  // Sync modal with URL param
  useEffect(() => {
    const urlJobId = searchParams.get('jobId');
    if (urlJobId) {
      setSelectedJobIdForModal(urlJobId);
    }
  }, [searchParams]);

  // Fetch Nearby Jobs Feed from Backend
  const fetchNearbyJobs = useCallback(async (isSilentRefresh = false) => {
    try {
      if (isSilentRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const params = {
        tab: activeTab,
        page,
        limit: 12,
        sortBy
      };

      if (search.trim()) params.search = search.trim();
      if (selectedCat) params.category = selectedCat;
      if (selectedUrgency && selectedUrgency !== 'all') params.urgency = selectedUrgency;
      if (selectedLocality && selectedLocality !== 'All Localities') params.locality = selectedLocality;
      if (budgetRange) {
        const [minB, maxB] = budgetRange.split('-');
        if (minB) params.minBudget = minB;
        if (maxB) params.maxBudget = maxB;
      }

      const res = await jobAPI.getNearby(params);

      if (res?.success) {
        setJobs(res.jobs || []);
        setTotalJobs(res.total || 0);
        setTotalPages(res.totalPages || 1);
        if (res.counts) setCounts(res.counts);
        if (res.vendorCoverage) setVendorCoverage(res.vendorCoverage);
        if (res.configurationStatus) setConfigurationStatus(res.configurationStatus);
        if (res.vendorEligibility) setVendorEligibility(res.vendorEligibility);
      } else {
        setError(res?.message || 'Failed to load nearby jobs feed.');
      }
    } catch (err) {
      console.error('Error fetching nearby jobs feed:', err);
      const msg = err.response?.data?.message || err.message || 'Unable to connect to nearby jobs server.';
      setError(msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeTab, page, sortBy, search, selectedCat, selectedUrgency, selectedLocality, budgetRange]);

  // Fetch when filters or tab change
  useEffect(() => {
    fetchNearbyJobs();
  }, [fetchNearbyJobs]);

  // Sync state to URL search parameters
  useEffect(() => {
    const params = new URLSearchParams();
    if (activeTab && activeTab !== 'all') params.set('tab', activeTab);
    if (search.trim()) params.set('search', search.trim());
    if (selectedCat) params.set('category', selectedCat);
    if (selectedUrgency && selectedUrgency !== 'all') params.set('urgency', selectedUrgency);
    if (selectedLocality && selectedLocality !== 'All Localities') params.set('locality', selectedLocality);
    if (budgetRange) params.set('budgetRange', budgetRange);
    if (sortBy && sortBy !== 'newest') params.set('sortBy', sortBy);
    if (page > 1) params.set('page', String(page));
    if (selectedJobIdForModal) params.set('jobId', selectedJobIdForModal);

    setSearchParams(params, { replace: true });
  }, [activeTab, search, selectedCat, selectedUrgency, selectedLocality, budgetRange, sortBy, page, selectedJobIdForModal, setSearchParams]);

  // Real-time socket updates: live synchronization with customer creations, claims, and cancellations
  useEffect(() => {
    if (!socket) return;

    const handleJobRemoved = (data) => {
      const removedId = (data?.jobId || data?.id || data?._id)?.toString();
      if (!removedId) return;

      // Immediately remove from active opportunities if not on cancelled view
      if (activeTab !== 'cancelled') {
        setJobs((prevJobs) => prevJobs.filter((j) => (j._id || j.id)?.toString() !== removedId));
        setTotalJobs((prev) => Math.max(0, prev - 1));
      }

      // If the vendor has this modal open, dismiss claim
      setClaimJobTarget((prev) => {
        if (prev && (prev._id || prev.id)?.toString() === removedId) {
          return null;
        }
        return prev;
      });

      // Refetch tab counts silently in background
      fetchNearbyJobs(true);
    };

    const handleNewLead = () => {
      fetchNearbyJobs(true);
    };

    socket.on('job_taken', handleJobRemoved);
    socket.on('job_cancelled', handleJobRemoved);
    socket.on('job_deleted', handleJobRemoved);
    socket.on('new_lead_alert', handleNewLead);
    socket.on('new_instant_job_lead', handleNewLead);
    socket.on('emergency_job_lead', handleNewLead);

    return () => {
      socket.off('job_taken', handleJobRemoved);
      socket.off('job_cancelled', handleJobRemoved);
      socket.off('job_deleted', handleJobRemoved);
      socket.off('new_lead_alert', handleNewLead);
      socket.off('new_instant_job_lead', handleNewLead);
      socket.off('emergency_job_lead', handleNewLead);
    };
  }, [socket, activeTab, fetchNearbyJobs]);

  const handleTabChange = (newTab) => {
    setPage(1);
    const params = new URLSearchParams(searchParams);
    if (newTab === 'all') {
      params.delete('tab');
    } else {
      params.set('tab', newTab);
    }
    params.delete('page');
    setSearchParams(params);
  };

  const hasActiveFilters = Boolean(
    search.trim() || 
    selectedCat || 
    (selectedUrgency && selectedUrgency !== 'all') || 
    (selectedLocality && selectedLocality !== 'All Localities') ||
    budgetRange ||
    sortBy !== 'newest'
  );

  const handleClearFilters = () => {
    setSearch('');
    setSelectedCat('');
    setSelectedUrgency('');
    setSelectedLocality('');
    setBudgetRange('');
    setSortBy('newest');
    setPage(1);
  };

  const getUrgencyBadge = (urgency) => {
    switch ((urgency || '').toLowerCase()) {
      case 'emergency':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 uppercase tracking-wider animate-pulse">
            <Flame className="w-3 h-3 text-rose-600" />
            <span>Emergency</span>
          </span>
        );
      case 'high':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 uppercase tracking-wider">
            High Priority
          </span>
        );
      case 'medium':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 uppercase tracking-wider">
            Standard
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200 uppercase tracking-wider">
            Flexible
          </span>
        );
    }
  };

  const getStatusBadge = (job) => {
    if (job.status === 'cancelled') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
          <X className="w-3 h-3" />
          <span>Cancelled</span>
        </span>
      );
    }
    if (activeTab === 'assigned' || job.status === 'assigned') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
          <CheckCircle2 className="w-3 h-3 text-emerald-700" />
          <span>Assigned to You</span>
        </span>
      );
    }
    if (job.status === 'in_progress') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
          <Zap className="w-3 h-3 text-blue-600" />
          <span>In Progress</span>
        </span>
      );
    }
    if (job.status === 'completed') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
          <Check className="w-3 h-3 text-emerald-700" />
          <span>Completed</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
        <Zap className="w-3 h-3 text-emerald-600" />
        <span>Available</span>
      </span>
    );
  };

  // Tab definitions with counts
  const TABS = [
    { id: 'all', label: 'All Available', count: counts.allAvailable, icon: Briefcase },
    { id: 'new', label: 'New (<48h)', count: counts.new, icon: Flame },
    { id: 'open', label: 'Open Opportunities', count: counts.open, icon: Zap },
    { id: 'assigned', label: 'Assigned to Me', count: counts.assignedToMe, icon: CheckCircle2 },
    { id: 'cancelled', label: 'Cancelled History', count: counts.cancelled, icon: X }
  ];

  return (
    <div className="space-y-6 w-full">
      {/* ── 1. Page Header with Coverage Pill & Live Synchronization ── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold">
              <Briefcase className="w-3.5 h-3.5 text-emerald-700" />
              <span>HYPERLOCAL DISPATCH</span>
            </span>

            {/* Active Service Area Coverage Badge */}
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200 text-xs font-medium">
              <MapPin className="w-3.5 h-3.5 text-emerald-700" />
              <span>
                {vendorCoverage.city || 'Lucknow'}
                {vendorCoverage.hasCityWide 
                  ? ' (City-wide coverage)' 
                  : vendorCoverage.localities.length > 0 
                    ? ` • ${vendorCoverage.localities.slice(0, 2).join(', ')}${vendorCoverage.localities.length > 2 ? ` +${vendorCoverage.localities.length - 2}` : ''}`
                    : ''}
              </span>
            </span>

            {/* Approved Trade Categories Pill */}
            {vendorCoverage.approvedCategoriesCount > 0 && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200 text-xs font-medium">
                <Tag className="w-3 h-3 text-slate-500" />
                <span>{vendorCoverage.approvedCategoriesCount} Trade {vendorCoverage.approvedCategoriesCount === 1 ? 'Category' : 'Categories'}</span>
              </span>
            )}
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Nearby Jobs
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl leading-relaxed">
            Discover verified customer service requests tailored to your approved trade skills and configured service area in {vendorCoverage.city || 'Lucknow'}.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => fetchNearbyJobs(true)}
            disabled={refreshing || loading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 shadow-2xs transition disabled:opacity-50"
            title="Refresh feed"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${refreshing ? 'animate-spin text-emerald-700' : ''}`} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>

          <Link to="/vendor/responses">
            <Button variant="secondary" size="md" icon={FileText}>
              My Offers
            </Button>
          </Link>
        </div>
      </div>

      {/* ── 2. Configuration & Account Eligibility Warnings ── */}
      {configurationStatus === 'missing_categories' && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-2xs">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h2 className="text-sm font-bold text-amber-900">No Service Categories Configured</h2>
              <p className="text-xs text-amber-700 mt-0.5 leading-relaxed">
                You have not added any approved trade categories to your contractor profile yet. Add your skills so WorkLogy can match you with local customer jobs.
              </p>
            </div>
          </div>
          <Link to="/vendor/profile" className="shrink-0">
            <button className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl transition shadow-xs">
              Configure Categories
            </button>
          </Link>
        </div>
      )}

      {configurationStatus === 'missing_service_area' && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-2xs">
          <div className="flex items-start gap-3">
            <MapPin className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h2 className="text-sm font-bold text-amber-900">Service Area Not Configured</h2>
              <p className="text-xs text-amber-700 mt-0.5 leading-relaxed">
                Your service coverage area is not configured. Please select your operating city or service localities in your profile to discover jobs nearby.
              </p>
            </div>
          </div>
          <Link to="/vendor/profile" className="shrink-0">
            <button className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl transition shadow-xs">
              Set Service Area
            </button>
          </Link>
        </div>
      )}

      {vendorEligibility.approvalStatus !== 'approved' && configurationStatus === 'ready' && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-start gap-3 shadow-2xs">
          <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
          <div className="text-xs text-blue-900 leading-relaxed">
            <strong className="font-bold">Account Verification Notice:</strong> Your contractor application is currently{' '}
            <span className="font-semibold underline capitalize">{vendorEligibility.approvalStatus?.replace('_', ' ')}</span>. You can inspect nearby opportunities in read-only mode, and will be able to accept jobs immediately once your profile is approved by our operations team.
          </div>
        </div>
      )}

      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-center justify-between gap-4 text-xs text-rose-800 shadow-2xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => fetchNearbyJobs()}
            className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-lg text-xs transition"
          >
            Retry Connection
          </button>
        </div>
      )}

      {/* ── 3. Status Tabs Strip with Live Counts ── */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-slate-200 scrollbar-none">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleTabChange(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap border ${
                isActive
                  ? 'bg-emerald-800 text-white border-emerald-800 shadow-xs'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
              <span>{tab.label}</span>
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                  isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── 4. Unified Responsive Filter Toolbar ── */}
      <div className="bg-white border border-slate-200 shadow-2xs p-4 rounded-2xl space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-center">
          {/* Keyword Search Input */}
          <div className="relative sm:col-span-2 lg:col-span-4">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by job title, problem description, locality..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-8 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-700 focus:bg-white transition"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 rounded-full"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Approved Categories Selector */}
          <div className="sm:col-span-1 lg:col-span-3">
            <select
              value={selectedCat}
              onChange={(e) => {
                setSelectedCat(e.target.value);
                setPage(1);
              }}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-700 focus:bg-white transition cursor-pointer"
            >
              <option value="">All Approved Categories</option>
              {vendorCoverage.categories.map((c) => (
                <option key={c.id || c._id} value={c.id || c._id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Locality Selector */}
          <div className="sm:col-span-1 lg:col-span-2">
            <select
              value={selectedLocality}
              onChange={(e) => {
                setSelectedLocality(e.target.value);
                setPage(1);
              }}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-700 focus:bg-white transition cursor-pointer"
            >
              {LUCKNOW_LOCALITIES.map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </select>
          </div>

          {/* Urgency Selector */}
          <div className="sm:col-span-1 lg:col-span-2">
            <select
              value={selectedUrgency}
              onChange={(e) => {
                setSelectedUrgency(e.target.value);
                setPage(1);
              }}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-700 focus:bg-white transition cursor-pointer"
            >
              <option value="">All Urgencies</option>
              <option value="emergency">Emergency Priority</option>
              <option value="high">High Priority</option>
              <option value="medium">Standard Priority</option>
              <option value="low">Flexible</option>
            </select>
          </div>

          {/* Reset Filters */}
          <div className="sm:col-span-1 lg:col-span-1 flex items-center justify-end">
            {hasActiveFilters ? (
              <button
                type="button"
                onClick={handleClearFilters}
                className="w-full inline-flex items-center justify-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold text-rose-700 hover:bg-rose-50 border border-rose-200 transition"
                title="Reset all active filters"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            ) : (
              <span className="text-[11px] text-slate-400 text-center w-full block">Live Feed</span>
            )}
          </div>
        </div>

        {/* Secondary Row: Budget & Sort Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-slate-500 font-medium">Budget:</span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {BUDGET_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    setBudgetRange(opt.value);
                    setPage(1);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition border ${
                    budgetRange === opt.value
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300 shadow-2xs'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-medium flex items-center gap-1">
              <ArrowUpDown className="w-3 h-3 text-slate-400" />
              <span>Sort:</span>
            </span>
            <select
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value);
                setPage(1);
              }}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-700 cursor-pointer"
            >
              <option value="newest">Newest First</option>
              <option value="distance">Nearest Distance</option>
              <option value="budget_high">Budget: High to Low</option>
              <option value="budget_low">Budget: Low to High</option>
              <option value="oldest">Oldest First</option>
            </select>
          </div>
        </div>

        {/* Results Info Strip */}
        <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
          <span>
            Showing <strong className="text-slate-900">{jobs.length}</strong> of{' '}
            <strong className="text-slate-900">{totalJobs}</strong> matching{' '}
            {activeTab === 'cancelled' ? 'cancelled tenders' : 'service tenders'} in {vendorCoverage.city || 'Lucknow'}
          </span>
          {hasActiveFilters && (
            <span className="text-[11px] text-emerald-800 font-semibold">
              Custom criteria active
            </span>
          )}
        </div>
      </div>

      {/* ── 5. Responsive Job Cards Grid ── */}
      {loading ? (
        <div className="py-20">
          <Loader text="Matching verified service requests in your area..." />
        </div>
      ) : jobs.length > 0 ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {jobs.map((job) => {
              const hasBudget = Boolean(job.budget?.amount && Number(job.budget.amount) > 0);
              const categoryName = getDisplayName(job.category || job.serviceCategory) || 'General Trade';
              const locationShort = formatShortAddress(job.location);
              const isAssigned = job.status === 'assigned' || activeTab === 'assigned';
              const isCancelled = job.status === 'cancelled';

              return (
                <div 
                  key={job._id}
                  className="bg-white border border-slate-200 hover:border-emerald-300 hover:shadow-md rounded-2xl overflow-hidden transition-all duration-200 flex flex-col justify-between shadow-2xs group"
                >
                  {/* Service Image Container */}
                  <div className="relative aspect-video w-full bg-slate-100 overflow-hidden border-b border-slate-100">
                    <img
                      src={getJobImage(job)}
                      alt={job.title || 'Service Image'}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      onError={(e) => handleImageFallback(e, FALLBACK_SERVICE_IMAGE)}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
                    
                    {/* Urgency Badge */}
                    <div className="absolute top-3 left-3 flex items-center gap-1.5 flex-wrap">
                      {getUrgencyBadge(job.urgency)}
                    </div>

                    {/* Status Badge */}
                    <div className="absolute top-3 right-3">
                      {getStatusBadge(job)}
                    </div>

                    {/* Category Tag */}
                    <div className="absolute bottom-2.5 left-3">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-bold bg-white/95 text-slate-800 shadow-2xs backdrop-blur-xs truncate max-w-[200px]">
                        <Tag className="w-2.5 h-2.5 text-emerald-700 shrink-0" />
                        <span className="truncate">{categoryName}</span>
                      </span>
                    </div>

                    {/* Verified Reliable Distance Badge: NEVER display fabricated distances */}
                    {job.distanceFormatted && (
                      <div className="absolute bottom-2.5 right-3">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-bold bg-emerald-950/80 text-emerald-200 shadow-2xs backdrop-blur-xs">
                          <Navigation className="w-2.5 h-2.5 text-emerald-400 shrink-0" />
                          <span>{job.distanceFormatted}</span>
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Job Card Content */}
                  <div className="p-5 sm:p-6 pb-2">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-[11px] text-slate-400 flex items-center gap-1 font-medium">
                        <Clock className="w-3 h-3 text-slate-400" />
                        {formatRelativeTime(job.createdAt)}
                      </span>
                      {job.applicantsCount > 0 && (
                        <span className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
                          <Users className="w-3 h-3 text-slate-400" />
                          <span>{job.applicantsCount} offers</span>
                        </span>
                      )}
                    </div>

                    {/* Title */}
                    <h3 className="font-bold text-slate-900 text-base group-hover:text-emerald-800 transition-colors mb-2 line-clamp-2 leading-snug">
                      <button 
                        type="button"
                        onClick={() => setSelectedJobIdForModal(job._id)} 
                        className="hover:underline focus:outline-none text-left"
                      >
                        {job.title}
                      </button>
                    </h3>

                    {/* Description */}
                    <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed mb-4">
                      {job.description || 'Customer service request specifications available upon inspection.'}
                    </p>

                    {/* Metadata Strip */}
                    <div className="bg-slate-50/90 p-2.5 rounded-xl border border-slate-200/70 space-y-1.5 mb-4">
                      <div className="flex items-center gap-1.5 text-xs text-slate-700 font-medium truncate">
                        <MapPin className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                        <span className="truncate">{locationShort}</span>
                      </div>

                      {(job.preferredDate || job.preferredTime) && (
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 truncate">
                          <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate">
                            Preferred: {job.preferredDate || 'Flexible'} {job.preferredTime ? `(${job.preferredTime})` : ''}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card Footer: Budget & Action */}
                  <div className="px-5 sm:px-6 py-4 border-t border-slate-100 flex items-center justify-between gap-3 mt-auto bg-slate-50/40">
                    <div className="min-w-0">
                      <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">
                        Customer Budget
                      </span>
                      {hasBudget ? (
                        <div className="flex items-baseline gap-1 truncate">
                          <span className="text-base sm:text-lg font-black text-emerald-800 tracking-tight">
                            {formatCurrency(job.budget.amount)}
                          </span>
                          <span className="text-[10px] text-slate-500 capitalize">
                            /{job.budget.type || 'fixed'}
                          </span>
                        </div>
                      ) : (
                        <span className="inline-block mt-0.5 text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          Open to offers
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button 
                        type="button"
                        onClick={() => setSelectedJobIdForModal(job._id)}
                        className="text-xs font-semibold text-slate-600 hover:text-slate-900 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 transition"
                      >
                        {isCancelled ? 'Inspect' : 'View Job'}
                      </button>

                      {isCancelled ? (
                        <span className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-500 text-xs font-bold border border-slate-200">
                          Cancelled
                        </span>
                      ) : isAssigned ? (
                        <Link to="/vendor/bookings">
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold transition shadow-2xs"
                          >
                            <span>Manage Job</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        </Link>
                      ) : (
                        <button 
                          type="button"
                          onClick={() => setClaimJobTarget(job)}
                          disabled={!vendorEligibility.canClaim}
                          title={!vendorEligibility.canClaim ? 'Contractor profile approval required to accept jobs' : 'Accept job instantly'}
                          className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-white text-xs font-bold transition shadow-xs hover:shadow-sm focus:ring-2 shrink-0 disabled:opacity-50 disabled:cursor-not-allowed ${
                            job.urgency === 'emergency'
                              ? 'bg-amber-600 hover:bg-amber-700 focus:ring-amber-500'
                              : 'bg-emerald-800 hover:bg-emerald-900 focus:ring-emerald-700'
                          }`}
                        >
                          <Zap className="w-3.5 h-3.5 fill-white" />
                          <span>{job.urgency === 'emergency' ? 'Accept Emergency' : 'Accept Job'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── Pagination Controls ── */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-6 border-t border-slate-200 text-xs">
              <span className="text-slate-500">
                Page <strong className="text-slate-900">{page}</strong> of <strong className="text-slate-900">{totalPages}</strong>
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 font-semibold text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Previous</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 font-semibold text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  <span>Next</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* ── Empty State ── */
        <div className="bg-white border border-slate-200 rounded-3xl p-12 sm:p-16 text-center space-y-4 shadow-2xs">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center mx-auto">
            <Briefcase className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">
            {activeTab === 'cancelled'
              ? 'No Cancelled Jobs Found'
              : activeTab === 'assigned'
                ? 'No Assigned Jobs Yet'
                : activeTab === 'new'
                  ? 'No New Jobs in the Last 48 Hours'
                  : 'No Matching Jobs Found'}
          </h2>
          <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
            {hasActiveFilters
              ? 'No jobs match your active filter criteria. Try resetting keyword, category, or locality filters to discover more opportunities.'
              : activeTab === 'assigned'
                ? 'You currently have no service assignments. Accept an available open job above to start receiving bookings.'
                : activeTab === 'cancelled'
                  ? 'You have no cancelled service records in your historical audit trail.'
                  : `There are currently no open service requests in ${vendorCoverage.city || 'Lucknow'} matching your approved categories. New customer jobs appear here in real time as they are submitted.`}
          </p>
          {hasActiveFilters && (
            <div className="pt-2">
              <button
                type="button"
                onClick={handleClearFilters}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reset All Filters</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Modals: Instant Acceptance & Complete Job Inspection ── */}
      <ClaimJobModal
        job={claimJobTarget}
        isOpen={Boolean(claimJobTarget)}
        onClose={() => setClaimJobTarget(null)}
        onClaimSuccess={() => {
          setClaimJobTarget(null);
          fetchNearbyJobs(true);
        }}
      />

      {selectedJobIdForModal && (
        <JobDetailsModal
          jobId={selectedJobIdForModal}
          isOpen={Boolean(selectedJobIdForModal)}
          onClose={() => {
            setSelectedJobIdForModal(null);
            if (searchParams.get('jobId')) {
              searchParams.delete('jobId');
              setSearchParams(searchParams);
            }
          }}
          onJobUpdated={() => fetchNearbyJobs(true)}
        />
      )}
    </div>
  );
}
