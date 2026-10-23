import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  Search,
  MapPin,
  Plus,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Wind,
  Zap,
  Droplets,
  Sparkles,
  Paintbrush,
  Hammer,
  Bug,
  Layers,
  X
} from 'lucide-react';

// Explicit Local Assets (High-Resolution Authentic Indian Service Imagery)
import expertHomepageImg from '../../assets/Expert Homepage.png';
import electricalPanelImg from '../../assets/Electrician Repairing Home Electrical Panel.png';
import plumbingSinkImg from '../../assets/Homepage.png';
import cleaningLivingRoomImg from '../../assets/Professional Cleaning in a Bright Living Room.png';
import wallPaintingImg from '../../assets/Apartment Wall Painting in Progress.png';
import woodenCabinetImg from '../../assets/Skilled Handyman Repairing a Wooden Cabinet.png';
import pestControlImg from '../../assets/Kitchen Pest Control Inspection.png';

export const HERO_SLIDES = [
  {
    id: 'ac-appliances',
    title: 'AC & Appliances',
    shortName: 'AC & Appliances',
    subtitle: 'Installation, Repair & Servicing',
    description: 'Expert diagnostics, deep cleaning, cooling repair & gas charging by certified AC technicians.',
    slug: 'ac-hvac-services',
    image: expertHomepageImg,
    alt: 'Professional Indian AC technician servicing wall-mounted split AC in a modern home',
    objectPosition: 'object-[78%_center] sm:object-[72%_center] lg:object-right',
    icon: Wind,
    stat: 'Same-day 30m response',
    badge: 'Certified Cooling Experts'
  },
  {
    id: 'electrical-services',
    title: 'Electrical Services',
    shortName: 'Electrical',
    subtitle: 'Wiring, Switchboard & Safety Upgrades',
    description: 'Licensed electricians for precision wiring, fault diagnosis, circuit breakers and lighting setup.',
    slug: 'electrical-services',
    image: electricalPanelImg,
    alt: 'Indian electrician wearing safety gear repairing residential electrical switchboard',
    objectPosition: 'object-[75%_center] sm:object-[70%_center] lg:object-right',
    icon: Zap,
    stat: 'Government Certified',
    badge: 'Trade License Verified'
  },
  {
    id: 'plumbing-services',
    title: 'Plumbing Services',
    shortName: 'Plumbing',
    subtitle: 'Leakage, Taps & Bathroom Drainage',
    description: 'Master plumbers for pipe leak repairs, sanitary fittings, taps, drainage clearance and water tanks.',
    slug: 'plumbing-services',
    image: plumbingSinkImg,
    alt: 'Indian plumber repairing pipes beneath a kitchen sink with tools',
    objectPosition: 'object-[82%_center] sm:object-[75%_center] lg:object-right',
    icon: Droplets,
    stat: 'Fixed Upfront Rates',
    badge: 'Zero Leak Guarantee'
  },
  {
    id: 'home-cleaning',
    title: 'Home Cleaning',
    shortName: 'Home Cleaning',
    subtitle: 'Deep Cleaning, Kitchen & Sofas',
    description: 'Thorough eco-friendly home deep cleaning, kitchen degreasing, bathroom descaling & upholstery care.',
    slug: 'home-cleaning',
    image: cleaningLivingRoomImg,
    alt: 'Professional home cleaner cleaning a bright, modern Indian living room',
    objectPosition: 'object-[75%_center] sm:object-[70%_center] lg:object-right',
    icon: Sparkles,
    stat: 'Medical-Grade Sanitizers',
    badge: '100% Spotless Finish'
  },
  {
    id: 'painting-services',
    title: 'Painting Services',
    shortName: 'Painting',
    subtitle: 'Interior, Exterior & Wall Prep',
    description: 'Pristine wall painting, surface putty smoothing, anti-fungal waterproofing & vibrant finishes.',
    slug: 'painting-services',
    image: wallPaintingImg,
    alt: 'Indian professional painter applying smooth paint coat with roller on wall',
    objectPosition: 'object-[75%_center] sm:object-[70%_center] lg:object-right',
    icon: Paintbrush,
    stat: 'Laser Wall Inspection',
    badge: 'Dust-Free Sanding'
  },
  {
    id: 'carpentry-furniture',
    title: 'Carpentry & Furniture',
    shortName: 'Carpentry',
    subtitle: 'Custom Woodwork, Repair & Assembly',
    description: 'Skilled carpenters for bespoke cabinets, furniture restoration, hinge fittings & door adjustments.',
    slug: 'carpentry-furniture',
    image: woodenCabinetImg,
    alt: 'Indian carpenter skillfully repairing wooden cabinet drawer with tools',
    objectPosition: 'object-[75%_center] sm:object-[70%_center] lg:object-right',
    icon: Hammer,
    stat: 'Master Craftsmen',
    badge: 'Precision Joinery'
  },
  {
    id: 'pest-control',
    title: 'Pest Control',
    shortName: 'Pest Control',
    subtitle: 'Termite, Cockroach & Mosquito Control',
    description: 'Safe, odorless chemical and gel treatments targeting pests, termites, bugs and rodents permanently.',
    slug: 'pest-control',
    image: pestControlImg,
    alt: 'Trained pest-control professional treating residential kitchen using protective equipment',
    objectPosition: 'object-[75%_center] sm:object-[70%_center] lg:object-right',
    icon: Bug,
    stat: 'Odorless & Pet-Safe',
    badge: '90-Day Warranty'
  }
];

export default function HeroCarousel({
  searchKeyword = '',
  setSearchKeyword,
  searchLocation = '',
  setSearchLocation,
  onSearch,
  onPostJobClick,
  categories = []
}) {
  const navigate = useNavigate();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchInputRef = useRef(null);
  const suggestionsRef = useRef(null);
  const timerRef = useRef(null);

  const totalSlides = HERO_SLIDES.length;

  // Filter category suggestions based on searchKeyword input
  const suggestions = useMemo(() => {
    const q = searchKeyword.trim().toLowerCase();
    if (!q) {
      // Default to top 6 categories when query is empty but focused
      return categories.slice(0, 6);
    }
    return categories
      .filter((cat) => {
        const nameMatch = cat.name?.toLowerCase().includes(q);
        const slugMatch = cat.slug?.toLowerCase().includes(q);
        const subMatch = Array.isArray(cat.subcategories) && cat.subcategories.some(
          (s) => typeof s === 'string' && s.toLowerCase().includes(q)
        );
        return nameMatch || slugMatch || subMatch;
      })
      .slice(0, 6);
  }, [categories, searchKeyword]);

  // Click outside listener for suggestions dropdown
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(e.target) &&
        searchInputRef.current &&
        !searchInputRef.current.contains(e.target)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Autoplay timer with paused states for hover, hidden tab, and reduced-motion preference
  const nextSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev + 1) % totalSlides);
  }, [totalSlides]);

  const prevSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev === 0 ? totalSlides - 1 : prev - 1));
  }, [totalSlides]);

  const goToSlide = useCallback((index) => {
    setCurrentSlide(index);
  }, []);

  // Set up timer and respect user preferences
  useEffect(() => {
    // Check for reduced motion preference
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion || isPaused) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    // Handle tab visibility change
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        if (timerRef.current) clearInterval(timerRef.current);
      } else {
        startTimer();
      }
    };

    const startTimer = () => {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        nextSlide();
      }, 5000);
    };

    startTimer();
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [nextSlide, isPaused, currentSlide]);

  const activeSlideData = HERO_SLIDES[currentSlide];
  const ActiveIcon = activeSlideData.icon || Wind;

  const handleSelectSuggestion = (cat) => {
    if (setSearchKeyword) setSearchKeyword(cat.name);
    setShowSuggestions(false);
  };

  return (
    <section
      className="relative w-full overflow-hidden bg-slate-950 text-white min-h-[660px] sm:min-h-[700px] lg:h-[760px] xl:h-[780px] flex flex-col justify-between"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      aria-label="WorkLogy Service Carousel"
    >
      {/* ─────────────────────────────────────────────────────────────
          1. FULL-BLEED BACKGROUND IMAGE CAROUSEL
         ───────────────────────────────────────────────────────────── */}
      <div className="absolute inset-0 w-full h-full pointer-events-none select-none">
        {HERO_SLIDES.map((slide, idx) => {
          const isActive = idx === currentSlide;
          return (
            <div
              key={slide.id}
              className={`absolute inset-0 w-full h-full transition-opacity duration-700 ease-in-out ${
                isActive ? 'opacity-100 z-1' : 'opacity-0 z-0'
              }`}
              aria-hidden={!isActive}
            >
              <img
                src={slide.image}
                alt={slide.alt}
                loading={idx === 0 ? 'eager' : 'lazy'}
                className={`w-full h-full object-cover ${slide.objectPosition || 'object-center'} scale-100 transition-transform duration-7000 ease-linear ${
                  isActive ? 'scale-105' : 'scale-100'
                }`}
              />
            </div>
          );
        })}

        {/* ── Balanced Multi-Layer Readability Gradients ── */}
        {/* Left Dark Gradient for Headline & Search Contrast */}
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/95 via-slate-950/80 to-slate-950/25 lg:from-slate-950/92 lg:via-slate-950/65 lg:to-transparent z-2" />
        
        {/* Top subtle vignette for navbar integration */}
        <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-slate-950/70 via-slate-950/20 to-transparent z-2" />

        {/* Bottom Dark Gradient for Selector Bar Contrast */}
        <div className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-slate-950/95 via-slate-950/60 to-transparent z-2" />
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. CAROUSEL PREV / NEXT CONTROLS & PAGINATION DOTS (TOP RIGHT)
         ───────────────────────────────────────────────────────────── */}
      <div className="relative z-10 page-container pt-4 sm:pt-6 flex justify-end items-center">
        <div className="flex items-center gap-2 bg-slate-900/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/15 shadow-sm">
          {/* Previous Button */}
          <button
            type="button"
            onClick={prevSlide}
            className="p-1 rounded-full text-slate-300 hover:text-white hover:bg-white/15 transition active:scale-95"
            aria-label="Previous service slide"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* Dots Indicator */}
          <div className="flex items-center gap-1.5 px-1.5">
            {HERO_SLIDES.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => goToSlide(idx)}
                className={`h-2 rounded-full transition-all duration-300 ${
                  idx === currentSlide
                    ? 'w-6 bg-[#10B981]'
                    : 'w-2 bg-white/40 hover:bg-white/70'
                }`}
                aria-label={`Go to slide ${idx + 1}`}
              />
            ))}
          </div>

          {/* Slide Number */}
          <span className="text-[11px] font-bold text-slate-300 tracking-wider pr-1">
            0{currentSlide + 1} / 0{totalSlides}
          </span>

          {/* Next Button */}
          <button
            type="button"
            onClick={nextSlide}
            className="p-1 rounded-full text-slate-300 hover:text-white hover:bg-white/15 transition active:scale-95"
            aria-label="Next service slide"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          3. MAIN HERO CONTENT (LEFT-ALIGNED & VERTICALLY CENTERED)
         ───────────────────────────────────────────────────────────── */}
      <div className="relative z-10 page-container py-4 sm:py-6 lg:py-8 flex-1 flex items-center">
        <div className="max-w-2xl lg:max-w-2xl space-y-5 lg:space-y-6">
          
          {/* Eyebrow Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-bold backdrop-blur-md shadow-xs">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Verified Professionals · Escrow Protected</span>
          </div>

          {/* Main Heading - Section 3-B requirement */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-[3.25rem] xl:text-[3.65rem] font-black text-white tracking-tight leading-[1.15] drop-shadow-sm">
            Trusted Home Services, <br className="hidden sm:inline" />
            <span className="text-[#34D399]">Right at Your Doorstep.</span>
          </h1>

          {/* Supporting text - Section 3-B requirement */}
          <p className="text-sm sm:text-base lg:text-lg text-slate-200 max-w-xl leading-relaxed drop-shadow-sm">
            Find verified professionals for your home and everyday needs.
          </p>

          {/* ── Search Bar with Real Category Suggestions ── */}
          <div className="relative max-w-2xl">
            <form
              onSubmit={onSearch}
              className="bg-white/95 backdrop-blur-md p-2 rounded-2xl border border-white/20 shadow-xl flex flex-col sm:flex-row items-stretch gap-2"
            >
              {/* Service Input */}
              <div className="relative flex-1 flex items-center gap-2.5 px-3.5 py-2.5 bg-slate-50 rounded-xl border border-slate-200">
                <Search className="w-5 h-5 text-slate-400 flex-shrink-0" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchKeyword}
                  onChange={(e) => {
                    if (setSearchKeyword) setSearchKeyword(e.target.value);
                    setShowSuggestions(true);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  placeholder="What service do you need today?"
                  className="w-full bg-transparent text-sm text-[#111827] placeholder:text-slate-400 focus:outline-none"
                  autoComplete="off"
                />
                {searchKeyword && (
                  <button
                    type="button"
                    onClick={() => {
                      if (setSearchKeyword) setSearchKeyword('');
                      setShowSuggestions(false);
                    }}
                    className="p-1 text-slate-400 hover:text-slate-600 rounded-full"
                    title="Clear"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Location Input */}
              <div className="sm:w-52 flex items-center gap-2 px-3.5 py-2.5 bg-slate-50 rounded-xl border border-slate-200">
                <MapPin className="w-4 h-4 text-[#06684F] flex-shrink-0" />
                <input
                  type="text"
                  value={searchLocation}
                  onChange={(e) => setSearchLocation && setSearchLocation(e.target.value)}
                  placeholder="City or locality"
                  className="w-full bg-transparent text-sm text-[#111827] placeholder:text-slate-400 focus:outline-none"
                />
              </div>

              {/* Search Submit */}
              <button
                type="submit"
                className="px-7 py-3 bg-[#06684F] hover:bg-[#055742] active:bg-[#044837] text-white font-bold text-sm rounded-xl transition shadow-sm flex items-center justify-center gap-2 active:scale-95"
              >
                <Search className="w-4 h-4" />
                <span>Search</span>
              </button>
            </form>

            {/* Popular Search Suggestions (Section 3-B) */}
            <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
              <span className="text-[11px] font-semibold text-slate-300">Popular:</span>
              {[
                { name: 'Electrician', slug: 'electrical-services' },
                { name: 'Plumber', slug: 'plumbing-services' },
                { name: 'AC Repair', slug: 'ac-hvac-services' },
                { name: 'Home Cleaning', slug: 'home-cleaning' },
                { name: 'Carpenter', slug: 'carpentry-furniture' },
                { name: 'Painting', slug: 'painting-services' },
                { name: 'Appliance Repair', slug: 'appliance-repair' }
              ].map((sugg) => (
                <button
                  key={sugg.slug}
                  type="button"
                  onClick={() => {
                    if (setSearchKeyword) setSearchKeyword(sugg.name);
                    navigate(`/categories/${sugg.slug}`);
                  }}
                  className="px-2.5 py-0.5 rounded-full bg-white/15 hover:bg-white/25 text-white text-[11px] font-medium transition backdrop-blur-xs border border-white/10"
                >
                  {sugg.name}
                </button>
              ))}
            </div>

            {/* Suggestions Dropdown Popover */}
            {showSuggestions && suggestions.length > 0 && (
              <div
                ref={suggestionsRef}
                className="absolute left-0 right-0 top-full mt-2 bg-white rounded-2xl shadow-2xl border border-slate-200 p-2 z-30 animate-in fade-in slide-in-from-top-2 duration-150"
              >
                <div className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 flex items-center justify-between">
                  <span>Suggested Services</span>
                  <span className="text-[10px] text-slate-400 lowercase">select to fill</span>
                </div>
                <div className="divide-y divide-slate-100 max-h-56 overflow-y-auto">
                  {suggestions.map((cat) => (
                    <button
                      key={cat._id || cat.slug}
                      type="button"
                      onClick={() => handleSelectSuggestion(cat)}
                      className="w-full px-3 py-2 text-left hover:bg-slate-50 flex items-center justify-between rounded-lg transition group"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-emerald-50 text-[#06684F] flex items-center justify-center font-bold text-xs shrink-0">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-800 group-hover:text-[#06684F]">
                            {cat.name}
                          </p>
                          <p className="text-[11px] text-slate-400 truncate max-w-xs sm:max-w-md">
                            {cat.subcategories?.slice(0, 3).join(', ') || cat.description}
                          </p>
                        </div>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-[#06684F] group-hover:translate-x-1 transition-transform" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Primary CTA: Explore Services & Secondary CTA */}
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <Link
              to="/categories"
              className="px-6 py-3.5 bg-[#06684F] hover:bg-[#055742] text-white font-bold text-sm rounded-xl shadow-lg hover:shadow-xl transition flex items-center gap-2 active:scale-95"
            >
              <span>Explore Services</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              to="/professionals"
              className="px-6 py-3.5 bg-white/10 hover:bg-white/20 text-white border border-white/25 font-semibold text-sm rounded-xl backdrop-blur-md transition flex items-center gap-2 shadow-sm"
            >
              <span>Find Professionals</span>
            </Link>

            <button
              type="button"
              onClick={onPostJobClick}
              className="px-4 py-3 text-slate-200 hover:text-white font-medium text-xs rounded-xl transition flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5 text-emerald-400" />
              <span>Post a Job Free</span>
            </button>
          </div>

          {/* Trust Indicators (Section 3-B) */}
          <div className="pt-2 flex flex-wrap items-center gap-4 sm:gap-6 text-xs text-slate-200 font-medium">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Verified Professionals</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Transparent Quotations</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Secure Payments & Escrow</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Live Booking Tracking</span>
            </div>
          </div>

        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          4. FLOATING SERVICE INFORMATION CARD (LOWER-RIGHT ON DESKTOP)
         ───────────────────────────────────────────────────────────── */}
      <div className="absolute bottom-28 right-6 lg:right-12 z-20 hidden md:block max-w-xs animate-in fade-in slide-in-from-right-4 duration-300">
        <Link
          to={`/categories/${activeSlideData.slug}`}
          className="bg-slate-900/85 hover:bg-slate-900/95 backdrop-blur-md p-4 rounded-2xl border border-white/20 text-white shadow-2xl flex items-center justify-between gap-4 group transition-all"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-400/30 flex items-center justify-center font-bold shrink-0">
              <ActiveIcon className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block truncate">
                {activeSlideData.badge}
              </span>
              <h4 className="text-sm font-bold text-white group-hover:text-emerald-300 transition-colors truncate">
                {activeSlideData.title}
              </h4>
              <p className="text-[11px] text-slate-300 truncate">
                {activeSlideData.subtitle}
              </p>
            </div>
          </div>
          <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-slate-200 group-hover:bg-[#06684F] group-hover:text-white transition-all shrink-0">
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </Link>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          5. BOTTOM HORIZONTAL SERVICE CATEGORY SELECTOR STRIP
         ───────────────────────────────────────────────────────────── */}
      <div className="relative z-20 page-container pb-4 sm:pb-5">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
          {HERO_SLIDES.map((slide, idx) => {
            const isSelected = idx === currentSlide;
            return (
              <button
                key={slide.id}
                type="button"
                onClick={() => goToSlide(idx)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-left shrink-0 transition-all duration-200 ${
                  isSelected
                    ? 'border-[#10B981] bg-[#06684F]/90 text-white shadow-md ring-1 ring-[#10B981]/50 scale-102'
                    : 'border-white/15 bg-slate-950/60 hover:bg-slate-900/80 text-slate-300 hover:text-white backdrop-blur-md'
                }`}
                aria-label={`Switch to ${slide.title}`}
              >
                <img
                  src={slide.image}
                  alt={slide.title}
                  className="w-7 h-7 rounded-lg object-cover shrink-0 border border-white/20"
                />
                <span className="text-xs font-bold whitespace-nowrap">
                  {slide.shortName || slide.title}
                </span>
              </button>
            );
          })}

          {/* More Services item navigating to Explore Services */}
          <Link
            to="/categories"
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl border border-white/20 bg-white/10 hover:bg-white/20 text-white font-bold text-xs shrink-0 backdrop-blur-md transition-all shadow-xs"
          >
            <Layers className="w-4 h-4 text-emerald-400" />
            <span className="whitespace-nowrap">More Services →</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
