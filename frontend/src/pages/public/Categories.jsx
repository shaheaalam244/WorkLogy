import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Search, X, Sparkles, Filter, RefreshCw, ChevronDown, ChevronUp, Home as HomeIcon, ChevronRight } from 'lucide-react';
import CategoryCard from '../../components/cards/CategoryCard';
import { categoryAPI } from '../../api/category.api';
import { CATEGORIES_LIST, CATEGORY_FILTERS } from '../../utils/constants';
import Loader from '../../components/common/Loader';

const INITIAL_VISIBLE_COUNT = 12;

const POPULAR_SLUGS_ORDER = [
  'electrical-services',
  'plumbing-services',
  'ac-hvac-services',
  'appliance-repair',
  'carpentry-furniture',
  'home-cleaning',
  'painting-services',
  'pest-control'
];

export default function Categories() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [categories, setCategories] = useState(CATEGORIES_LIST);
  const [loading, setLoading] = useState(true);

  // Initialize search & filter from URL query params if present
  const initialSearch = searchParams.get('search') || searchParams.get('cat') || '';
  const initialGroup = searchParams.get('group') || 'all';

  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [activeFilter, setActiveFilter] = useState(initialGroup);
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_COUNT);

  useEffect(() => {
    let isMounted = true;
    const fetchCats = async () => {
      try {
        const res = await categoryAPI.getAll();
        if (isMounted && res?.categories && res.categories.length > 0) {
          setCategories(res.categories);
        }
      } catch (err) {
        console.error('Failed to load categories from API, using canonical catalogue:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchCats();
    return () => { isMounted = false; };
  }, []);

  // Sync with searchParams on popstate or external param changes
  useEffect(() => {
    const s = searchParams.get('search') || searchParams.get('cat');
    const g = searchParams.get('group');
    if (s !== null && s !== searchQuery) setSearchQuery(s);
    if (g !== null && g !== activeFilter) setActiveFilter(g);
  }, [searchParams]);

  // Filter & Search Logic with Popular Sort Priority
  const filteredCategories = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    const filtered = categories.filter((cat) => {
      // 1. Group Filter check
      if (activeFilter !== 'all') {
        const group = cat.filterGroup || 'other-services';
        if (group !== activeFilter) {
          return false;
        }
      }

      // 2. Search Query check (matches category name, slug, description, or subcategories)
      if (!query) return true;

      const nameMatch = cat.name?.toLowerCase().includes(query);
      const slugMatch = cat.slug?.toLowerCase().includes(query);
      const descMatch = cat.description?.toLowerCase().includes(query);
      const subMatch = Array.isArray(cat.subcategories) && cat.subcategories.some(
        (sub) => typeof sub === 'string' && sub.toLowerCase().includes(query)
      );

      return nameMatch || slugMatch || descMatch || subMatch;
    });

    // Sort with top 8 popular categories first
    return filtered.sort((a, b) => {
      const slugA = a.slug || a.id;
      const slugB = b.slug || b.id;
      const idxA = POPULAR_SLUGS_ORDER.indexOf(slugA);
      const idxB = POPULAR_SLUGS_ORDER.indexOf(slugB);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return (a.sortOrder || 99) - (b.sortOrder || 99);
    });
  }, [categories, searchQuery, activeFilter]);

  // When searching, show all matches immediately without hiding behind Show More
  const isSearching = searchQuery.trim().length > 0;
  const displayedCategories = useMemo(() => {
    if (isSearching) {
      return filteredCategories;
    }
    return filteredCategories.slice(0, visibleCount);
  }, [filteredCategories, visibleCount, isSearching]);

  // Real Counts for each filter pill from database categories
  const filterCounts = useMemo(() => {
    const counts = { all: categories.length };
    CATEGORY_FILTERS.forEach((f) => {
      if (f.id !== 'all') {
        counts[f.id] = categories.filter(
          (c) => (c.filterGroup || 'other-services') === f.id
        ).length;
      }
    });
    return counts;
  }, [categories]);

  const handleClearSearch = () => {
    setSearchQuery('');
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('search');
      next.delete('cat');
      return next;
    });
  };

  const handleFilterChange = (filterId) => {
    setActiveFilter(filterId);
    setVisibleCount(INITIAL_VISIBLE_COUNT);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (filterId === 'all') {
        next.delete('group');
      } else {
        next.set('group', filterId);
      }
      return next;
    });
  };

  const handleResetAll = () => {
    setSearchQuery('');
    setActiveFilter('all');
    setVisibleCount(INITIAL_VISIBLE_COUNT);
    setSearchParams({});
  };

  const handleShowMore = () => {
    setVisibleCount(filteredCategories.length);
  };

  const handleShowLess = () => {
    setVisibleCount(INITIAL_VISIBLE_COUNT);
    const gridEl = document.getElementById('categories-grid');
    if (gridEl) gridEl.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="page-container py-8 sm:py-10 lg:py-12">
      
      {/* ── Breadcrumb Navigation ── */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-slate-500 font-medium mb-4">
        <Link to="/" className="hover:text-[#06684F] transition flex items-center gap-1">
          <HomeIcon className="w-3.5 h-3.5 text-slate-400" />
          <span>Home</span>
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        <span className="text-slate-900 font-bold">Services</span>
      </nav>

      {/* ── 1. Page Header & Search Bar ── */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-6 border-b border-slate-200">
        <div className="max-w-2xl">
          {/* Eyebrow */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-[#06684F] border border-emerald-200 text-xs font-bold mb-2.5">
            <Sparkles className="w-3.5 h-3.5 text-[#06684F]" />
            <span>Browse Services</span>
          </div>

          {/* Main Heading */}
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#111827] tracking-tight leading-tight">
            Find the Right Professional for Every Job
          </h1>

          {/* Description */}
          <p className="text-slate-600 text-xs sm:text-sm mt-2 leading-relaxed">
            Explore trusted local service categories, compare available professionals, and find the right help for your home or business.
          </p>
        </div>

        {/* Search Field */}
        <div className="w-full lg:w-96 shrink-0">
          <label htmlFor="category-search" className="sr-only">
            Search service categories
          </label>
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id="category-search"
              type="text"
              placeholder="Search services (e.g. Electrician, AC Repair, Plumber)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-white border border-slate-300 text-sm text-[#111827] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#06684F] focus:border-transparent shadow-2xs transition"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition"
                title="Clear search"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <div className="flex items-center justify-between mt-1.5 px-1 text-xs text-slate-500">
            <span>
              Showing {displayedCategories.length} of {filteredCategories.length} categories
            </span>
            {searchQuery && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="text-[#06684F] font-semibold hover:underline"
              >
                Clear search
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── 2. Filter Group Chips & Reset ── */}
      <div className="py-5 flex items-center justify-between gap-4 overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-2 flex-nowrap min-w-max">
          <div className="hidden sm:flex items-center gap-1 text-xs font-bold text-slate-400 uppercase tracking-wider mr-1">
            <Filter className="w-3.5 h-3.5" />
            <span>Filter:</span>
          </div>
          {CATEGORY_FILTERS.map((f) => {
            const isActive = activeFilter === f.id;
            const count = filterCounts[f.id] ?? 0;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => handleFilterChange(f.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-150 ${
                  isActive
                    ? 'bg-[#06684F] text-white shadow-2xs'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 shadow-2xs'
                }`}
              >
                <span>{f.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    isActive ? 'bg-[#044837] text-emerald-100' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {(searchQuery || activeFilter !== 'all') && (
          <button
            type="button"
            onClick={handleResetAll}
            className="shrink-0 inline-flex items-center gap-1 text-xs font-semibold text-[#06684F] hover:text-[#055742] hover:underline px-2 py-1"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Reset filters</span>
          </button>
        )}
      </div>

      {/* ── 3. Category Grid or State Feedback ── */}
      <div id="categories-grid" className="pt-2">
        {loading ? (
          <div className="py-16">
            <Loader text="Loading services directory..." />
          </div>
        ) : filteredCategories.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-10 sm:p-14 text-center shadow-xs my-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-[#06684F] flex items-center justify-center mx-auto mb-3">
              <Search className="w-5 h-5" />
            </div>
            <h2 className="text-base font-bold text-[#111827] mb-1">
              No service categories matched your search
            </h2>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mb-5 leading-relaxed">
              We couldn't find any services matching "{searchQuery}". Try searching for broader terms like "Electrician", "Plumber", or "Cleaning".
            </p>
            <button
              type="button"
              onClick={handleResetAll}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#06684F] hover:bg-[#055742] text-white text-xs font-bold transition shadow-xs"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reset All Filters</span>
            </button>
          </div>
        ) : (
          <>
            {/* Responsive 4 col grid on desktop, 3 on tablet, 2 on mobile */}
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5 sm:gap-6">
              {displayedCategories.map((cat) => (
                <CategoryCard key={cat._id || cat.slug || cat.id} category={cat} />
              ))}
            </div>

            {/* Show More / Show Less Controls (only when not actively searching) */}
            {!isSearching && filteredCategories.length > INITIAL_VISIBLE_COUNT && (
              <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
                {visibleCount < filteredCategories.length ? (
                  <button
                    type="button"
                    onClick={handleShowMore}
                    className="inline-flex items-center gap-2 px-6 py-2.5 bg-white border border-slate-300 hover:border-[#06684F] hover:bg-slate-50 text-slate-800 text-xs font-bold rounded-xl shadow-2xs transition active:scale-95"
                  >
                    <span>Show More Services ({filteredCategories.length - visibleCount} more)</span>
                    <ChevronDown className="w-3.5 h-3.5 text-[#06684F]" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleShowLess}
                    className="inline-flex items-center gap-2 px-6 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-semibold rounded-xl shadow-2xs transition"
                  >
                    <span>Show Less</span>
                    <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>

    </div>
  );
}
