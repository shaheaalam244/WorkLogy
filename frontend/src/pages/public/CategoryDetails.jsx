import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Search,
  ArrowRight,
  ArrowLeft,
  Star,
  ShieldCheck,
  MapPin,
  CheckCircle2,
  Clock,
  Sparkles,
  Filter,
  ChevronRight,
  Phone,
  Calendar,
  Zap,
  Wrench,
  AlertTriangle,
  ExternalLink,
  RefreshCw,
  Home as HomeIcon,
  Check,
  Tag,
  Shield,
  Layers,
  Award
} from 'lucide-react';
import { categoryAPI } from '../../api/category.api';
import { vendorAPI } from '../../api/vendor.api';
import { CATEGORIES_LIST } from '../../utils/constants';
import { getCategoryMedia, handleImageFallback } from '../../utils/categoryMedia';
import { getSubServiceImage } from '../../constants/serviceImages';
import Loader from '../../components/common/Loader';

// Popular 8 categories for quick navigation pills
const POPULAR_PILL_SLUGS = [
  'electrical-services',
  'plumbing-services',
  'ac-hvac-services',
  'appliance-repair',
  'carpentry-furniture',
  'home-cleaning',
  'painting-services',
  'pest-control'
];

export default function CategoryDetails() {
  const { slug } = useParams();
  const navigate = useNavigate();

  const [category, setCategory] = useState(null);
  const [allCategories, setAllCategories] = useState(CATEGORIES_LIST);
  const [loading, setLoading] = useState(true);
  const [vendors, setVendors] = useState([]);
  const [loadingVendors, setLoadingVendors] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // 1. Fetch current category and all categories for switcher
  useEffect(() => {
    let isMounted = true;
    const fetchCategoryData = async () => {
      setLoading(true);
      try {
        // Fetch all categories for quick pill switcher
        const allRes = await categoryAPI.getAll();
        if (allRes?.categories?.length > 0 && isMounted) {
          setAllCategories(allRes.categories);
        }

        // Fetch current category by slug
        let foundCat = null;
        try {
          const catRes = await categoryAPI.getBySlug(slug);
          if (catRes?.category) {
            foundCat = catRes.category;
          }
        } catch (e) {
          // Fallback to local canonical catalogue if API 404
        }

        if (!foundCat) {
          foundCat = (allRes?.categories || CATEGORIES_LIST).find(
            (c) => c.slug === slug || 
                   (slug === 'cleaning-services' && c.slug === 'home-cleaning') ||
                   (slug === 'home-cleaning' && c.slug === 'cleaning-services')
          ) || CATEGORIES_LIST.find((c) => c.slug === slug);
        }

        if (isMounted) {
          setCategory(foundCat || null);
        }
      } catch (err) {
        console.error('Failed to load category details:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchCategoryData();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return () => { isMounted = false; };
  }, [slug]);

  // 2. Fetch approved verified professionals in this category
  useEffect(() => {
    let isMounted = true;
    if (!category) return;

    const fetchCategoryVendors = async () => {
      setLoadingVendors(true);
      try {
        const res = await vendorAPI.getAll({
          category: category.slug,
          limit: 4
        });
        if (res?.success && Array.isArray(res.vendors) && isMounted) {
          const approved = res.vendors.filter((v) => v.approvalStatus === 'approved');
          setVendors(approved.slice(0, 4));
        }
      } catch (err) {
        console.warn('Failed to load category professionals:', err.message);
      } finally {
        if (isMounted) setLoadingVendors(false);
      }
    };

    fetchCategoryVendors();
    return () => { isMounted = false; };
  }, [category]);

  // 3. Filter services by search query
  const subservices = useMemo(() => {
    if (!category || !Array.isArray(category.subcategories)) return [];
    const query = searchQuery.trim().toLowerCase();
    if (!query) return category.subcategories;

    return category.subcategories.filter((sub) =>
      typeof sub === 'string' && sub.toLowerCase().includes(query)
    );
  }, [category, searchQuery]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader />
      </div>
    );
  }

  if (!category) {
    return (
      <div className="page-container py-16 text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-200">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900">Category Not Found</h1>
        <p className="text-sm text-slate-500 max-w-md mx-auto">
          We couldn't find the requested service category. Please explore all 30 available categories below.
        </p>
        <Link
          to="/categories"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#06684F] text-white font-semibold text-sm hover:bg-[#055742] transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Browse All Categories</span>
        </Link>
      </div>
    );
  }

  const { image: categoryImage, alt: categoryAlt } = getCategoryMedia(category);

  return (
    <div className="min-h-screen bg-slate-50/60 pb-16">
      
      {/* ── 1. BREADCRUMBS BAR ── */}
      <div className="bg-white border-b border-slate-200">
        <div className="page-container py-3">
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 sm:gap-2 text-xs text-slate-500 font-medium overflow-x-auto whitespace-nowrap">
            <Link to="/" className="hover:text-[#06684F] transition flex items-center gap-1">
              <HomeIcon className="w-3.5 h-3.5 text-slate-400" />
              <span>Home</span>
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <Link to="/categories" className="hover:text-[#06684F] transition">
              Services
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="text-slate-900 font-bold truncate max-w-[200px] sm:max-w-none">
              {category.name}
            </span>
          </nav>
        </div>
      </div>

      {/* ── 2. CATEGORY HERO BANNER ── */}
      <div className="relative bg-slate-900 text-white overflow-hidden">
        {/* Panoramic Background Image with Dark Vignette */}
        <div className="absolute inset-0">
          <img
            src={categoryImage}
            alt={categoryAlt || category.name}
            className="w-full h-full object-cover opacity-25 scale-105 transform filter blur-xs"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-900/90 to-slate-900/70" />
        </div>

        <div className="relative page-container py-8 sm:py-12 lg:py-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
            {/* Left: Category Header Info */}
            <div className="lg:col-span-8 space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Verified Service Category</span>
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/10 text-slate-200 text-xs font-semibold backdrop-blur-xs">
                  <Layers className="w-3 h-3 text-emerald-400" />
                  <span>{category.subcategories?.length || 6} Services Available</span>
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/10 text-slate-200 text-xs font-semibold backdrop-blur-xs">
                  <MapPin className="w-3 h-3 text-emerald-400" />
                  <span>Lucknow & Surrounding Areas</span>
                </span>
              </div>

              <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight">
                {category.name}
              </h1>

              <p className="text-sm sm:text-base text-slate-300 max-w-2xl leading-relaxed">
                {category.description || 'Connect with verified, background-checked local trade specialists with upfront pricing, live tracking, and guaranteed service start.'}
              </p>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Link
                  to={`/professionals?category=${encodeURIComponent(category.slug)}`}
                  className="px-5 py-2.5 sm:px-6 sm:py-3 rounded-xl bg-[#06684F] hover:bg-[#055742] text-white text-xs sm:text-sm font-bold shadow-md hover:shadow-lg transition flex items-center gap-2"
                >
                  <span>Find a Professional</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>

                <Link
                  to={`/customer/create-job?category=${encodeURIComponent(category.slug)}`}
                  className="px-5 py-2.5 sm:px-6 sm:py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 text-xs sm:text-sm font-bold backdrop-blur-xs transition"
                >
                  <span>Request Custom Service</span>
                </Link>

                <Link
                  to="/emergency"
                  className="px-4 py-2.5 sm:py-3 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-400/30 text-xs sm:text-sm font-bold backdrop-blur-xs transition flex items-center gap-1.5"
                >
                  <Zap className="w-3.5 h-3.5 text-rose-400" />
                  <span>Emergency Dispatch</span>
                </Link>
              </div>
            </div>

            {/* Right: Featured Hero Visual Card */}
            <div className="lg:col-span-4 hidden lg:block">
              <div className="relative rounded-2xl overflow-hidden border-2 border-white/20 shadow-2xl aspect-4/3 bg-slate-800 group">
                <img
                  src={categoryImage}
                  alt={categoryAlt || category.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex items-end p-5">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                      WorkLogy Verified Trades
                    </span>
                    <h3 className="text-base font-bold text-white">
                      Guaranteed Quality & Security
                    </h3>
                    <p className="text-xs text-slate-300">
                      OTP Service-Start • Upfront Estimates • Escrow Payment Hold
                    </p>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* ── 3. HORIZONTAL CATEGORY SWITCHER PILLS ── */}
      <div className="bg-white border-b border-slate-200 sticky top-16 z-20 shadow-2xs">
        <div className="page-container py-2.5">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
            <Link
              to="/categories"
              className="px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition bg-slate-100 text-slate-700 hover:bg-slate-200 flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>All 30 Categories</span>
            </Link>

            {/* Top 8 Popular Category Switcher Pills */}
            {allCategories
              .filter((c) => POPULAR_PILL_SLUGS.includes(c.slug))
              .map((cat) => {
                const isActive = cat.slug === category.slug;
                return (
                  <Link
                    key={cat.slug}
                    to={`/categories/${cat.slug}`}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 transition flex items-center gap-1.5 ${
                      isActive
                        ? 'bg-[#06684F] text-white shadow-xs'
                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300'
                    }`}
                  >
                    <span>{cat.name}</span>
                    {isActive && <Check className="w-3 h-3 stroke-[3]" />}
                  </Link>
                );
              })}
          </div>
        </div>
      </div>

      {/* ── 4. CATEGORY SERVICES CONTENT ── */}
      <div className="page-container py-8 sm:py-12 space-y-10">

        {/* Section Header & Search */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#06684F] mb-1">
              <Tag className="w-3.5 h-3.5" />
              <span>Category Services</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Services in {category.name}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Select any specific service below to book online or connect with local specialists.
            </p>
          </div>

          {/* Search within this category */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search ${category.name}...`}
              className="w-full pl-10 pr-8 py-2 text-xs sm:text-sm rounded-xl border border-slate-300 focus:border-[#06684F] focus:ring-2 focus:ring-[#06684F]/15 outline-none bg-white text-slate-900"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 text-xs"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Services Grid (6 services per category) */}
        {subservices.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
            {subservices.map((subserviceName, idx) => {
              const subMedia = getSubServiceImage(category.slug, subserviceName);
              const bookingUrl = `/customer/create-job?category=${encodeURIComponent(category.slug)}&service=${encodeURIComponent(subserviceName)}&title=${encodeURIComponent(subserviceName)}`;
              const proUrl = `/professionals?category=${encodeURIComponent(category.slug)}&search=${encodeURIComponent(subserviceName)}`;

              return (
                <div
                  key={subserviceName || idx}
                  className="bg-white rounded-2xl border border-slate-200 hover:border-[#06684F] hover:shadow-md transition-all duration-200 flex flex-col justify-between overflow-hidden group"
                >
                  {/* Service Image Header (16:9) */}
                  <div className="relative aspect-video w-full overflow-hidden bg-slate-100 shrink-0">
                    <img
                      src={subMedia.image}
                      alt={subMedia.alt || `${subserviceName} — ${category.name}`}
                      onError={handleImageFallback}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
                    
                    <div className="absolute top-2.5 right-2.5 px-2.5 py-1 rounded-full bg-white/95 backdrop-blur-xs text-[10px] font-bold text-slate-700 shadow-2xs border border-white/60">
                      Standard / Custom
                    </div>
                  </div>

                  {/* Service Info */}
                  <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div className="space-y-1.5">
                      <h3 className="font-bold text-slate-900 text-base group-hover:text-[#06684F] transition-colors leading-snug">
                        {subserviceName}
                      </h3>
                      <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">
                        Professional on-demand {subserviceName.toLowerCase()} by background-checked {category.name.toLowerCase()} specialists in Lucknow.
                      </p>
                    </div>

                    {/* Trust micro-badges */}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-medium">
                      <span className="flex items-center gap-1 text-emerald-700 font-semibold">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>OTP Service Start</span>
                      </span>
                      <span>Verified Contractors</span>
                    </div>

                    {/* Action CTAs */}
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <Link
                        to={bookingUrl}
                        className="py-2.5 px-3 rounded-xl bg-[#06684F] hover:bg-[#055742] text-white text-xs font-bold text-center shadow-2xs transition"
                      >
                        Book Service
                      </Link>
                      <Link
                        to={proUrl}
                        className="py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold text-center transition"
                      >
                        Find Pros
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <Search className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">
              No services found matching "{searchQuery}"
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Try a different keyword or explore all services in this category.
            </p>
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="px-4 py-2 rounded-xl bg-[#06684F] text-white text-xs font-bold hover:bg-[#055742] transition"
            >
              Reset Search
            </button>
          </div>
        )}

        {/* ── 5. VERIFIED PROFESSIONALS IN THIS CATEGORY ── */}
        {vendors.length > 0 && (
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[#06684F]">Direct Contractor Hire</span>
                <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-0.5">
                  Verified {category.name} Professionals in Lucknow
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                  Browse profile ratings, customer reviews, and hire directly with escrow protection.
                </p>
              </div>

              <Link
                to={`/professionals?category=${encodeURIComponent(category.slug)}`}
                className="text-xs sm:text-sm font-bold text-[#06684F] hover:underline flex items-center gap-1 shrink-0"
              >
                <span>View All Specialists</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {vendors.map((vendor) => {
                const vendorName = vendor.businessName || vendor.user?.name || 'Verified Professional';
                const rating = vendor.rating?.average || 4.9;
                const reviewCount = vendor.rating?.count || 12;
                const locality = vendor.serviceArea?.locality || vendor.address?.city || 'Lucknow';

                return (
                  <div
                    key={vendor._id}
                    className="p-4 rounded-2xl border border-slate-200 hover:border-[#06684F] hover:shadow-sm transition flex flex-col justify-between space-y-3 bg-slate-50/50"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 rounded-xl bg-slate-200 flex items-center justify-center font-bold text-slate-700 text-lg overflow-hidden shrink-0 border border-slate-200">
                        {vendor.user?.avatar ? (
                          <img src={vendor.user.avatar} alt={vendorName} className="w-full h-full object-cover" />
                        ) : (
                          vendorName.charAt(0)
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="font-bold text-slate-900 text-sm truncate flex items-center gap-1">
                          <span>{vendorName}</span>
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        </h4>
                        <div className="flex items-center gap-1 text-xs text-amber-500 mt-0.5">
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                          <span className="font-bold text-slate-800">{rating.toFixed(1)}</span>
                          <span className="text-slate-400 text-[11px]">({reviewCount})</span>
                        </div>
                        <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          <span className="truncate">{locality}</span>
                        </p>
                      </div>
                    </div>

                    <Link
                      to={`/professionals/${vendor._id}`}
                      className="w-full py-2 px-3 rounded-xl bg-white border border-slate-300 hover:border-[#06684F] hover:text-[#06684F] text-slate-800 text-xs font-bold text-center transition"
                    >
                      View Profile & Reviews
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── 6. WHY CHOOSE WORKLOGY FOR THIS CATEGORY ── */}
        <div className="bg-emerald-50/50 border border-emerald-200/80 rounded-3xl p-6 sm:p-8 space-y-5">
          <div className="text-center max-w-xl mx-auto space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-[#06684F]">WorkLogy Guarantee</span>
            <h3 className="text-xl sm:text-2xl font-black text-slate-900">
              Why Book {category.name} Through WorkLogy?
            </h3>
            <p className="text-xs sm:text-sm text-slate-600">
              Safe, transparent, and completely covered by platform escrow guarantees.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
            <div className="bg-white p-4 rounded-2xl border border-emerald-100 space-y-1.5 shadow-2xs">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-[#06684F] flex items-center justify-center font-bold">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <h4 className="font-bold text-slate-900 text-sm">Vetted & Licensed</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Govt ID, skill certification, and trade background verified prior to onboarding.
              </p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-emerald-100 space-y-1.5 shadow-2xs">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-[#06684F] flex items-center justify-center font-bold">
                <Tag className="w-4 h-4" />
              </div>
              <h4 className="font-bold text-slate-900 text-sm">Upfront Pricing</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Standard diagnostic and fixed service rates with zero hidden doorstep surprises.
              </p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-emerald-100 space-y-1.5 shadow-2xs">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-[#06684F] flex items-center justify-center font-bold">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <h4 className="font-bold text-slate-900 text-sm">Service-Start OTP</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Technician cannot start work until you verify their on-site arrival with a secure PIN.
              </p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-emerald-100 space-y-1.5 shadow-2xs">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-[#06684F] flex items-center justify-center font-bold">
                <Shield className="w-4 h-4" />
              </div>
              <h4 className="font-bold text-slate-900 text-sm">Escrow Protection</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Your payment remains securely held in escrow until work is completed to your satisfaction.
              </p>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
