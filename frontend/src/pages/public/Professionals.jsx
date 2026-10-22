import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { 
  Search, 
  Filter, 
  MapPin, 
  Star, 
  UserCheck, 
  X, 
  Briefcase, 
  ArrowRight,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  RotateCcw
} from 'lucide-react';
import VendorCard from '../../components/cards/VendorCard';
import { vendorAPI } from '../../api/vendor.api';
import Loader from '../../components/common/Loader';
import { useAuth } from '../../hooks/useAuth';
import { getCategoryMedia, handleImageFallback } from '../../utils/categoryMedia';

export default function Professionals() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const initialCategory = searchParams.get('category') || '';
  const initialSearch = searchParams.get('search') || '';
  const initialCity = searchParams.get('city') || '';
  const initialVerified = searchParams.get('verifiedOnly') === 'true';

  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter States
  const [search, setSearch] = useState(initialSearch);
  const [city, setCity] = useState(initialCity);
  const [minRating, setMinRating] = useState('0');
  const [verifiedOnly, setVerifiedOnly] = useState(initialVerified);
  const [sortBy, setSortBy] = useState('rating');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalVendors, setTotalVendors] = useState(0);

  const fetchVendors = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        page,
        limit: 12,
        search: search.trim() || undefined,
        city: city && city !== 'all' ? city : undefined,
        minRating: minRating !== '0' ? minRating : undefined,
        verifiedOnly: verifiedOnly ? 'true' : undefined,
        sortBy,
        category: initialCategory || undefined
      };

      const res = await vendorAPI.getAll(params);
      if (res?.vendors) {
        setVendors(res.vendors);
        setTotalVendors(res.total || res.vendors.length);
        setTotalPages(res.totalPages || Math.ceil((res.total || res.vendors.length) / 12) || 1);
      }
    } catch (err) {
      console.error('Failed to fetch vendors:', err);
      setError('Could not load professional directory. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVendors();
  }, [search, city, minRating, verifiedOnly, sortBy, page, initialCategory]);

  const handleClearCategory = () => {
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('category');
    setSearchParams(newParams);
  };

  const handleResetFilters = () => {
    setSearch('');
    setCity('');
    setMinRating('0');
    setVerifiedOnly(false);
    setSortBy('rating');
    setPage(1);
    if (initialCategory) handleClearCategory();
  };

  return (
    <div className="page-container py-8 sm:py-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
      {/* Vendor Advisory Notice */}
      {user?.role === 'vendor' && (
        <div className="p-5 sm:p-6 rounded-2xl bg-amber-50/90 border border-amber-200/90 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-100 border border-amber-300 text-amber-900 flex items-center justify-center shrink-0 mt-0.5">
              <Briefcase className="w-5 h-5 text-amber-800" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-amber-950">
                You are signed in as a Service Professional
              </h2>
              <p className="text-xs sm:text-sm text-amber-900/80 mt-0.5 leading-relaxed">
                This directory is designed for customers to hire professionals. To find open customer jobs and send bids, visit Find Available Jobs.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 w-full md:w-auto shrink-0">
            <Link
              to="/vendor/browse-jobs"
              className="flex-1 md:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs shadow-xs transition"
            >
              <span>Find Available Jobs</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <Link
              to="/vendor/dashboard"
              className="flex-1 md:flex-initial inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-white border border-amber-300 text-amber-950 hover:bg-amber-100 font-semibold text-xs transition"
            >
              Professional Dashboard
            </Link>
          </div>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-2 border-b border-slate-100">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold mb-2">
            <UserCheck className="w-3.5 h-3.5" />
            <span>Verified Professional Directory</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Find Verified Professionals
          </h1>
          <p className="text-slate-600 text-xs sm:text-sm mt-1">
            Browse trusted local trade experts with verified credentials, customer ratings, and real track records.
          </p>

          {initialCategory && (
            <div className="mt-3 flex items-center gap-2">
              <span className="text-xs text-slate-500 font-medium">Filtering by category:</span>
              <span className="inline-flex items-center gap-2 pl-1.5 pr-2.5 py-1 rounded-full bg-emerald-50 text-emerald-900 border border-emerald-300 text-xs font-semibold shadow-2xs">
                <img
                  src={getCategoryMedia(initialCategory).image}
                  alt={getCategoryMedia(initialCategory).alt}
                  onError={handleImageFallback}
                  className="w-5 h-5 rounded-full object-cover shrink-0"
                />
                <span>{initialCategory.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
                <button
                  type="button"
                  onClick={handleClearCategory}
                  className="hover:text-emerald-700 rounded-full p-0.5 transition"
                  title="Clear category filter"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            </div>
          )}
        </div>

        {/* Count pill */}
        <div className="text-xs text-slate-500 font-medium">
          Showing <strong>{vendors.length}</strong> of <strong>{totalVendors}</strong> active professionals
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-center">
          {/* Search Input */}
          <div className="lg:col-span-4 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by name, trade, specialty..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-slate-50/70 border border-slate-300 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-700 focus:bg-white"
            />
          </div>

          {/* City / Area Filter */}
          <div className="lg:col-span-2 relative">
            <select
              value={city}
              onChange={(e) => { setCity(e.target.value); setPage(1); }}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-50/70 border border-slate-300 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-700 focus:bg-white"
            >
              <option value="">All Service Areas</option>
              <option value="Lucknow">Lucknow</option>
              <option value="Kanpur">Kanpur</option>
              <option value="Delhi NCR">Delhi NCR</option>
              <option value="Noida">Noida</option>
              <option value="Varanasi">Varanasi</option>
            </select>
          </div>

          {/* Rating Filter */}
          <div className="lg:col-span-2">
            <select
              value={minRating}
              onChange={(e) => { setMinRating(e.target.value); setPage(1); }}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-50/70 border border-slate-300 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-700 focus:bg-white"
            >
              <option value="0">All Customer Ratings</option>
              <option value="4.0">⭐ 4.0+ Stars</option>
              <option value="4.5">⭐ 4.5+ Stars</option>
              <option value="4.8">⭐ 4.8+ Stars</option>
            </select>
          </div>

          {/* Sort By Filter */}
          <div className="lg:col-span-2">
            <select
              value={sortBy}
              onChange={(e) => { setSortBy(e.target.value); setPage(1); }}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-50/70 border border-slate-300 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-700 focus:bg-white"
            >
              <option value="rating">Highest Rated</option>
              <option value="experience">Most Experienced</option>
              <option value="reviews">Most Reviewed</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="newest">Recently Joined</option>
            </select>
          </div>

          {/* Verified Only Toggle */}
          <div className="lg:col-span-2 flex items-center justify-end">
            <button
              type="button"
              onClick={() => { setVerifiedOnly(!verifiedOnly); setPage(1); }}
              className={`w-full py-2.5 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-2xs ${
                verifiedOnly
                  ? 'bg-emerald-700 text-white border-emerald-800 ring-2 ring-emerald-600/30'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
              }`}
            >
              <ShieldCheck className={`w-4 h-4 ${verifiedOnly ? 'text-white' : 'text-emerald-700'}`} />
              <span>Verified Only</span>
            </button>
          </div>
        </div>
      </div>

      {/* Directory Grid */}
      {loading ? (
        <div className="py-20"><Loader text="Loading verified professionals..." /></div>
      ) : error ? (
        <div className="p-6 rounded-2xl bg-rose-50 border border-rose-200 text-center text-xs text-rose-800">
          <p>{error}</p>
          <button onClick={fetchVendors} className="mt-2 font-bold text-rose-900 underline">Retry</button>
        </div>
      ) : vendors.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center shadow-sm space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-500 mx-auto flex items-center justify-center">
            <UserCheck className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">No verified professionals found</h3>
          <p className="text-slate-600 text-xs max-w-md mx-auto leading-relaxed">
            We couldn't find professionals matching your specific filters. Try expanding your search area or clearing specific filter criteria.
          </p>
          <button
            onClick={handleResetFilters}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-800 text-white text-xs font-bold hover:bg-emerald-900 transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset All Filters</span>
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {vendors.map((vendor) => (
              <VendorCard key={vendor._id} vendor={vendor} />
            ))}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-6 border-t border-slate-200">
              <button
                disabled={page <= 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-40 transition"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Previous</span>
              </button>

              <div className="flex items-center gap-1 text-xs text-slate-600">
                <span>Page <strong>{page}</strong> of <strong>{totalPages}</strong></span>
              </div>

              <button
                disabled={page >= totalPages}
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-40 transition"
              >
                <span>Next</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
