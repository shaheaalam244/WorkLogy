import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Search, PlusCircle, Briefcase, X, Filter, RefreshCw, AlertTriangle, Flame, Clock } from 'lucide-react';
import JobCard from '../../components/cards/JobCard';
import { jobAPI } from '../../api/job.api';
import Loader from '../../components/common/Loader';
import { useAuth } from '../../hooks/useAuth';

const URGENCY_OPTIONS = [
  { id: 'all', label: 'All Urgencies' },
  { id: 'emergency', label: 'Emergency' },
  { id: 'high', label: 'High' },
  { id: 'medium', label: 'Medium' },
  { id: 'low', label: 'Low' }
];

export default function Jobs() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialSearch = searchParams.get('search') || '';
  const initialUrgency = searchParams.get('urgency') || '';

  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(initialSearch);
  const [urgency, setUrgency] = useState(initialUrgency);

  // Sync state to URL params cleanly
  useEffect(() => {
    const params = new URLSearchParams();
    if (search.trim()) params.set('search', search.trim());
    if (urgency && urgency !== 'all') params.set('urgency', urgency);
    setSearchParams(params, { replace: true });
  }, [search, urgency, setSearchParams]);

  // Fetch jobs from backend
  useEffect(() => {
    let isMounted = true;
    const fetchJobs = async () => {
      setLoading(true);
      try {
        const res = await jobAPI.getAll({ 
          search: search.trim() || undefined, 
          urgency: urgency && urgency !== 'all' ? urgency : undefined,
          limit: 50
        });
        if (isMounted && res?.jobs) {
          setJobs(res.jobs);
        }
      } catch (err) {
        console.error('Failed to fetch jobs:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchJobs();
    return () => { isMounted = false; };
  }, [search, urgency]);

  const handleClearSearch = () => {
    setSearch('');
  };

  const handleResetFilters = () => {
    setSearch('');
    setUrgency('');
  };

  // Compute urgency counts from active list
  const urgencyCounts = useMemo(() => {
    const counts = { all: jobs.length, emergency: 0, high: 0, medium: 0, low: 0 };
    jobs.forEach(j => {
      const u = (j.urgency || 'medium').toLowerCase();
      if (counts[u] !== undefined) counts[u]++;
    });
    return counts;
  }, [jobs]);

  return (
    <div className="categories-container py-10 sm:py-12 lg:py-14">
      {/* ── 1. Page Header & Responsive Action Toolbar ── */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-6 border-b border-slate-200">
        <div className="max-w-2xl">
          {/* Eyebrow */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold mb-2.5">
            <Briefcase className="w-3.5 h-3.5 text-emerald-700" />
            <span>Find Available Jobs</span>
          </div>

          {/* Heading */}
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
            Find Available Jobs
          </h1>

          {/* Description */}
          <p className="text-slate-600 text-sm sm:text-base mt-2 leading-relaxed">
            Browse open job requests from customers, view details, and send your price.
          </p>
        </div>

        {/* Right Toolbar: Search, Urgency & Request a Service */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto flex-shrink-0">
          {/* Search Input */}
          <div className="relative flex-1 sm:w-64 md:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search jobs by trade, title..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-9 py-2.5 rounded-xl bg-white border border-slate-300 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-700 shadow-2xs transition"
              aria-label="Search jobs"
            />
            {search && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-full transition"
                title="Clear search query"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Urgency Filter Dropdown */}
          <select
            value={urgency}
            onChange={(e) => setUrgency(e.target.value)}
            className="px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-700 shadow-2xs transition cursor-pointer"
            aria-label="Filter by urgency"
          >
            <option value="">All Urgencies</option>
            <option value="emergency">Emergency Priority</option>
            <option value="high">High Priority</option>
            <option value="medium">Medium Priority</option>
            <option value="low">Standard / Low</option>
          </select>

          {/* Role-Specific Action */}
          {user?.role === 'vendor' ? (
            <Link to="/vendor/responses" className="shrink-0">
              <button
                type="button"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold transition shadow-xs hover:shadow-sm focus:ring-2 focus:ring-emerald-700 focus:outline-none"
              >
                <Briefcase className="w-4 h-4" />
                <span>My Offers</span>
              </button>
            </Link>
          ) : (
            <Link to="/customer/create-job" className="shrink-0">
              <button
                type="button"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold transition shadow-xs hover:shadow-sm focus:ring-2 focus:ring-emerald-700 focus:outline-none"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Request a Service</span>
              </button>
            </Link>
          )}
        </div>
      </div>

      {/* ── 2. Filter Status Strip & Quick Pills ── */}
      <div className="py-4 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-slate-700">Quick Filter:</span>
          {URGENCY_OPTIONS.map((opt) => {
            const isSelected = (opt.id === 'all' && !urgency) || urgency === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setUrgency(opt.id === 'all' ? '' : opt.id)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                  isSelected
                    ? 'bg-emerald-800 text-white font-semibold shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-2xs'
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-3">
          <span className="font-medium text-slate-500">
            Showing <strong className="text-slate-900">{jobs.length}</strong> active {jobs.length === 1 ? 'job' : 'jobs'}
          </span>
          {(search || urgency) && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="inline-flex items-center gap-1 text-emerald-800 font-semibold hover:underline"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* ── 3. Responsive Job Card Grid ── */}
      {loading ? (
        <div className="py-16">
          <Loader text="Loading available jobs..." />
        </div>
      ) : jobs.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 sm:p-16 text-center shadow-xs my-6">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center justify-center mx-auto mb-4">
            <Briefcase className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 mb-1">
            No open jobs match your criteria
          </h2>
          <p className="text-sm text-slate-600 max-w-md mx-auto mb-6 leading-relaxed">
            {search || urgency 
              ? 'Try adjusting your search keywords or switching urgency filters to view more opportunities.'
              : 'There are currently no open jobs in the system. Be the first to request a service!'}
          </p>
          <div className="flex items-center justify-center gap-3">
            {(search || urgency) && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Clear Filters</span>
              </button>
            )}
            {user?.role === 'vendor' ? (
              <Link to="/vendor/dashboard">
                <button
                  type="button"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold transition shadow-xs"
                >
                  <Briefcase className="w-3.5 h-3.5" />
                  <span>Professional Dashboard</span>
                </button>
              </Link>
            ) : (
              <Link to="/customer/create-job">
                <button
                  type="button"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold transition shadow-xs"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Request a Service</span>
                </button>
              </Link>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-2">
          {jobs.map((job) => (
            <JobCard key={job._id} job={job} />
          ))}
        </div>
      )}
    </div>
  );
}
