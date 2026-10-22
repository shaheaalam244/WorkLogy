import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  Search, 
  Filter, 
  MapPin, 
  Star, 
  ShieldCheck, 
  Sparkles, 
  SlidersHorizontal,
  ChevronDown,
  X,
  CheckCircle2
} from 'lucide-react';
import VendorCard from '../../components/cards/VendorCard';
import DirectBookingModal from '../../components/booking/DirectBookingModal';
import { vendorAPI } from '../../api/vendor.api';
import { categoryAPI } from '../../api/category.api';
import Loader from '../../components/common/Loader';
import Button from '../../components/common/Button';
import { getCategoryMedia, handleImageFallback } from '../../utils/categoryMedia';

export default function CustomerExplore() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [vendors, setVendors] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filters & Search
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedLocality, setSelectedLocality] = useState('all');
  const [sortBy, setSortBy] = useState('recommended'); // 'recommended', 'rating', 'jobs', 'price_low', 'price_high'
  
  // Modal for Direct Booking
  const [selectedVendorForBooking, setSelectedVendorForBooking] = useState(null);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);

  // Fetch categories once
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await categoryAPI.getAll();
        if (res?.categories) {
          setCategories(res.categories);
        }
      } catch (err) {
        console.error('Failed to load categories:', err);
      }
    };
    fetchCategories();
  }, []);

  // Fetch vendors whenever search or category changes
  useEffect(() => {
    let isMounted = true;
    const fetchVendors = async () => {
      setLoading(true);
      try {
        const params = {};
        if (search.trim()) params.search = search.trim();
        if (selectedCategory && selectedCategory !== 'all') params.category = selectedCategory;
        
        const res = await vendorAPI.getAll(params);
        if (isMounted && res?.vendors) {
          setVendors(res.vendors);

          // Check if vendorId was passed via query params to open modal
          const urlVendorId = searchParams.get('vendorId');
          if (urlVendorId) {
            const found = res.vendors.find(v => v._id === urlVendorId);
            if (found) {
              setSelectedVendorForBooking(found);
              setIsBookingModalOpen(true);
            }
          }
        }
      } catch (err) {
        console.error('Failed to fetch vendors:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchVendors();
    return () => { isMounted = false; };
  }, [search, selectedCategory, searchParams]);

  // Extract unique localities from fetched vendors
  const availableLocalities = Array.from(new Set(
    vendors.flatMap(v => {
      const locs = [];
      if (v.location?.locality) locs.push(v.location.locality);
      if (v.location?.city) locs.push(v.location.city);
      if (v.serviceAreas && Array.isArray(v.serviceAreas)) {
        v.serviceAreas.forEach(a => {
          if (typeof a === 'string') locs.push(a);
          else if (a?.name) locs.push(a.name);
        });
      }
      return locs;
    })
  )).filter(Boolean);

  // Filter & Sort vendors locally
  const filteredAndSortedVendors = vendors
    .filter(v => {
      if (selectedLocality === 'all') return true;
      const vLocality = v.location?.locality?.toLowerCase() || '';
      const vCity = v.location?.city?.toLowerCase() || '';
      const vAreas = (v.serviceAreas || []).map(a => (typeof a === 'string' ? a : a?.name || '').toLowerCase());
      const target = selectedLocality.toLowerCase();
      return vLocality.includes(target) || vCity.includes(target) || vAreas.some(a => a.includes(target));
    })
    .sort((a, b) => {
      if (sortBy === 'rating') {
        return (b.rating || 0) - (a.rating || 0);
      }
      if (sortBy === 'jobs') {
        return (b.completedJobsCount || 0) - (a.completedJobsCount || 0);
      }
      if (sortBy === 'price_low') {
        return (a.hourlyRate || 0) - (b.hourlyRate || 0);
      }
      if (sortBy === 'price_high') {
        return (b.hourlyRate || 0) - (a.hourlyRate || 0);
      }
      return 0; // recommended / default
    });

  const handleOpenDirectBooking = (vendor) => {
    setSelectedVendorForBooking(vendor);
    setIsBookingModalOpen(true);
  };

  const handleCloseBookingModal = () => {
    setIsBookingModalOpen(false);
    setSelectedVendorForBooking(null);
    if (searchParams.get('vendorId')) {
      searchParams.delete('vendorId');
      setSearchParams(searchParams);
    }
  };

  return (
    <div className="space-y-6 w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider block">Book Directly</span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-0.5">Find a Professional</h1>
          <p className="text-xs text-slate-600 mt-1">
            Browse verified professionals, compare prices, and book directly.
          </p>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search service or professional..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-700 shadow-2xs w-full sm:w-72"
          />
          {search && (
            <button 
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
        <button
          onClick={() => setSelectedCategory('all')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
            selectedCategory === 'all'
              ? 'bg-emerald-800 text-white shadow-2xs'
              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
        >
          All Services ({vendors.length})
        </button>
        {categories.map((cat) => {
          const media = getCategoryMedia(cat);
          const isSelected = selectedCategory === (cat.slug || cat._id);
          return (
            <button
              key={cat._id}
              onClick={() => setSelectedCategory(cat.slug || cat._id)}
              className={`inline-flex items-center gap-1.5 pl-1.5 pr-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                isSelected
                  ? 'bg-emerald-800 text-white shadow-2xs'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <img
                src={media.image}
                alt=""
                onError={handleImageFallback}
                className="w-4.5 h-4.5 rounded-full object-cover shrink-0"
              />
              <span>{cat.name}</span>
            </button>
          );
        })}
      </div>

      {/* Secondary Filters Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-3 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
        <div className="flex flex-wrap items-center gap-3">
          {/* Locality Selector */}
          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <MapPin className="w-3.5 h-3.5 text-emerald-700" />
            <span className="font-medium">Area:</span>
            <select
              value={selectedLocality}
              onChange={(e) => setSelectedLocality(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-800 focus:outline-none focus:border-emerald-700"
            >
              <option value="all">All Localities</option>
              {availableLocalities.map((loc, idx) => (
                <option key={idx} value={loc}>{loc}</option>
              ))}
            </select>
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
            <span className="font-medium">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-800 focus:outline-none focus:border-emerald-700"
            >
              <option value="recommended">Recommended</option>
              <option value="rating">Highest Rated</option>
              <option value="jobs">Most Completed Work</option>
              <option value="price_low">Hourly Rate: Low to High</option>
              <option value="price_high">Hourly Rate: High to Low</option>
            </select>
          </div>
        </div>

        <span className="text-xs font-semibold text-slate-500">
          Showing {filteredAndSortedVendors.length} verified {filteredAndSortedVendors.length === 1 ? 'professional' : 'professionals'}
        </span>
      </div>

      {/* Vendors Grid */}
      {loading ? (
        <div className="py-20">
          <Loader text="Loading verified professionals..." />
        </div>
      ) : filteredAndSortedVendors.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center max-w-md mx-auto shadow-2xs space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <Search className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">No Professionals Found</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            No verified professionals match your search. Try adjusting your search or category.
          </p>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => { setSearch(''); setSelectedCategory('all'); setSelectedLocality('all'); }}
            className="mt-2"
          >
            Clear All Filters
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAndSortedVendors.map((vendor) => (
            <VendorCard 
              key={vendor._id} 
              vendor={vendor} 
              onBookDirect={handleOpenDirectBooking}
            />
          ))}
        </div>
      )}

      {/* Direct Professional Booking Modal */}
      {isBookingModalOpen && (
        <DirectBookingModal
          vendor={selectedVendorForBooking}
          isOpen={isBookingModalOpen}
          onClose={handleCloseBookingModal}
          onBookingCreated={() => {
            handleCloseBookingModal();
          }}
        />
      )}
    </div>
  );
}
