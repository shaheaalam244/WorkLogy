import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Search, 
  MapPin, 
  ShieldCheck, 
  CheckCircle2, 
  Star, 
  ArrowRight, 
  Wrench, 
  Zap, 
  Droplets, 
  Wind, 
  Hammer,
  Sparkles,
  Paintbrush,
  Key,
  Bug,
  Cpu,
  Car,
  Clock, 
  Plus, 
  Briefcase, 
  DollarSign, 
  AlertCircle, 
  Filter, 
  UserCheck, 
  Send,
  Calendar,
  X,
  Trash2,
  Check,
  KeyRound,
  Truck,
  HardHat,
  Layers,
  Shield,
  Sprout,
  Shirt,
  Scissors,
  Laptop,
  Camera,
  Router,
  Gauge,
  Flame,
  Sun,
  Home as HomeIcon,
  PanelTop,
  Maximize2,
  CheckSquare,
  CarFront,
  Video,
  Lock,
  MessageSquare,
  HelpCircle,
  Activity,
  ArrowUpRight,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useSocketContext } from '../../context/SocketContext';
import { jobAPI } from '../../api/job.api';
import { categoryAPI } from '../../api/category.api';
import { vendorAPI } from '../../api/vendor.api';
import { formatCurrency, formatShortAddress } from '../../utils/formatters';
import api from '../../api/axios';
import CategoryCard from '../../components/cards/CategoryCard';
import { resolveJobImage, getJobImage, handleImageFallback, FALLBACK_SERVICE_IMAGE } from '../../constants/serviceImages';

// Direct 3 Homepage Hero & Action Imagery
import smilingHomepageImg from '../../assets/SmilingHomepage.png';
import expertHomepageImg from '../../assets/Expert Homepage.png';
import homepageImg from '../../assets/Homepage.png';

// Premium Full-Screen Hero Carousel
import HeroCarousel from '../../components/home/HeroCarousel';

// Category icon mapper helper
const CATEGORY_ICONS = {
  Zap,
  Droplets,
  Wind,
  Hammer,
  Sparkles,
  Paintbrush,
  Key: KeyRound,
  KeyRound,
  Bug,
  Cpu,
  Car,
  Truck,
  HardHat,
  Layers,
  Shield,
  Sprout,
  Shirt,
  Scissors,
  Laptop,
  Camera,
  Router,
  Gauge,
  Flame,
  Sun,
  Home: HomeIcon,
  PanelTop,
  Maximize2,
  CheckSquare,
  CarFront,
  Video,
  Wrench
};

export default function Home() {
  const { user, switchRole } = useAuth();
  const { socket } = useSocketContext();
  const navigate = useNavigate();

  // Data states from backend
  const [categories, setCategories] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [loadingVendors, setLoadingVendors] = useState(true);

  // Filter & Search states
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchLocation, setSearchLocation] = useState('');
  const [activeCategoryFilter, setActiveCategoryFilter] = useState('all');
  const [activeUrgencyFilter, setActiveUrgencyFilter] = useState('all');
  const [showAllHomeCategories, setShowAllHomeCategories] = useState(false);

  // Canonical Top 8 Popular Service Categories requested order
  const POPULAR_SLUGS_ORDER = useMemo(() => [
    'electrical-services',
    'plumbing-services',
    'ac-hvac-services',
    'appliance-repair',
    'carpentry-furniture',
    'home-cleaning',
    'painting-services',
    'pest-control'
  ], []);

  // Sort categories with top 8 prioritized in exact requested order
  const sortedPopularCategories = useMemo(() => {
    if (!categories || categories.length === 0) return [];
    const list = [...categories];
    return list.sort((a, b) => {
      const slugA = a.slug || a.id;
      const slugB = b.slug || b.id;
      const idxA = POPULAR_SLUGS_ORDER.indexOf(slugA);
      const idxB = POPULAR_SLUGS_ORDER.indexOf(slugB);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return (a.sortOrder || 99) - (b.sortOrder || 99);
    });
  }, [categories, POPULAR_SLUGS_ORDER]);

  // Display either the top 8 popular categories or all 30
  const displayedHomeCategories = useMemo(() => {
    if (showAllHomeCategories) return sortedPopularCategories;
    return sortedPopularCategories.slice(0, 8);
  }, [sortedPopularCategories, showAllHomeCategories]);

  // Modals & User Interaction states
  const [postJobModalOpen, setPostJobModalOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
  const [submittingJob, setSubmittingJob] = useState(false);
  const [formError, setFormError] = useState('');
  const [successToast, setSuccessToast] = useState('');

  // Post Job Form State
  const [jobFormData, setJobFormData] = useState({
    title: '',
    category: '',
    description: '',
    city: 'Lucknow, UP',
    address: '',
    budgetAmount: '',
    budgetType: 'fixed',
    urgency: 'medium',
    preferredDate: 'Tomorrow Morning',
    preferredTime: '09:00 AM - 12:00 PM',
    additionalInstructions: '',
    agreeConsent: false
  });

  // 1. Fetch initial real data from backend APIs
  useEffect(() => {
    fetchCategories();
    fetchVendors();
  }, []);

  useEffect(() => {
    fetchJobs();
  }, [activeCategoryFilter, activeUrgencyFilter]);

  // 2. Real-time updates via Socket.IO
  useEffect(() => {
    if (!socket) return;

    const handleNewJob = (newJob) => {
      setJobs((prev) => {
        if (prev.some((j) => j._id === newJob._id)) return prev;
        return [newJob, ...prev];
      });
      showToast(`⚡ New job posted in ${newJob?.category?.name || 'marketplace'}!`);
    };

    const handleJobRemoved = (data) => {
      const removedId = (data?.jobId || data?.id || data?._id)?.toString();
      if (!removedId) return;
      setJobs((prev) => prev.filter((j) => (j._id || j.id)?.toString() !== removedId));
      if (selectedJob && (selectedJob._id || selectedJob.id)?.toString() === removedId) {
        setSelectedJob(null);
      }
    };

    const handleStatusUpdate = ({ jobId, status }) => {
      if (status === 'cancelled' || status === 'expired') {
        handleJobRemoved({ jobId });
      } else {
        setJobs((prev) =>
          prev.map((j) => ((j._id || j.id) === jobId ? { ...j, status } : j))
        );
        if (selectedJob && (selectedJob._id || selectedJob.id) === jobId) {
          setSelectedJob((prev) => ({ ...prev, status }));
        }
      }
    };

    socket.on('job_created', handleNewJob);
    socket.on('job_status_updated', handleStatusUpdate);
    socket.on('job_taken', handleJobRemoved);
    socket.on('job_cancelled', handleJobRemoved);
    socket.on('job_deleted', handleJobRemoved);

    return () => {
      socket.off('job_created', handleNewJob);
      socket.off('job_status_updated', handleStatusUpdate);
      socket.off('job_taken', handleJobRemoved);
      socket.off('job_cancelled', handleJobRemoved);
      socket.off('job_deleted', handleJobRemoved);
    };
  }, [socket, selectedJob]);

  const showToast = (msg) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(''), 4500);
  };

  const fetchCategories = async () => {
    setLoadingCategories(true);
    try {
      const res = await categoryAPI.getAll();
      if (res.success && res.categories) {
        setCategories(res.categories);
        if (res.categories.length > 0 && !jobFormData.category) {
          setJobFormData((prev) => ({ ...prev, category: res.categories[0].slug }));
        }
      }
    } catch (err) {
      console.error('Failed to load categories:', err);
    } finally {
      setLoadingCategories(false);
    }
  };

  const fetchJobs = async () => {
    setLoadingJobs(true);
    try {
      const params = {
        limit: 12,
        status: 'open'
      };
      if (activeCategoryFilter !== 'all') params.category = activeCategoryFilter;
      if (activeUrgencyFilter !== 'all') params.urgency = activeUrgencyFilter;
      if (searchLocation.trim()) params.city = searchLocation.trim();
      if (searchKeyword.trim()) params.search = searchKeyword.trim();

      const res = await jobAPI.getAll(params);
      if (res.success && res.jobs) {
        // Deduplicate jobs by _id to avoid any duplicates
        const uniqueJobs = Array.from(
          new Map(res.jobs.map((j) => [j._id, j])).values()
        );
        setJobs(uniqueJobs);
      }
    } catch (err) {
      console.error('Failed to load jobs:', err);
    } finally {
      setLoadingJobs(false);
    }
  };

  const fetchVendors = async () => {
    setLoadingVendors(true);
    try {
      const res = await vendorAPI.getAll();
      if (res.success && res.vendors) {
        // Enforce strict approvalStatus === 'approved' for public listing
        const approvedOnly = res.vendors.filter(
          (v) => v.approvalStatus === 'approved'
        );
        setVendors(approvedOnly.slice(0, 6));
      }
    } catch (err) {
      console.error('Failed to load vendors:', err);
    } finally {
      setLoadingVendors(false);
    }
  };

  const handleHeroSearch = (e) => {
    e.preventDefault();
    fetchJobs();
    const section = document.getElementById('recent-jobs');
    if (section) section.scrollIntoView({ behavior: 'smooth' });
  };

  const handleCategoryCardClick = (slug) => {
    setActiveCategoryFilter(slug);
    const section = document.getElementById('recent-jobs');
    if (section) section.scrollIntoView({ behavior: 'smooth' });
  };

  // Submit Job to Backend API & MongoDB Atlas
  const handlePostJobSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    // Form validations
    if (!jobFormData.title.trim()) {
      setFormError('Please enter a clear job title.');
      return;
    }
    if (jobFormData.description.trim().length < 10) {
      setFormError('Job description must be at least 10 characters long.');
      return;
    }
    if (!jobFormData.budgetAmount || Number(jobFormData.budgetAmount) <= 0) {
      setFormError('Please enter a valid budget amount.');
      return;
    }
    if (!jobFormData.city.trim()) {
      setFormError('Please provide your service city.');
      return;
    }
    if (!jobFormData.agreeConsent) {
      setFormError('Please agree to the WorkLogy job dispatch terms.');
      return;
    }

    // Ensure customer session
    if (!user) {
      await switchRole('customer');
    }

    setSubmittingJob(true);
    try {
      const payload = {
        title: jobFormData.title.trim(),
        category: jobFormData.category,
        description: jobFormData.description.trim(),
        budget: {
          type: jobFormData.budgetType,
          amount: Number(jobFormData.budgetAmount)
        },
        location: {
          address: jobFormData.address.trim(),
          city: jobFormData.city.trim()
        },
        urgency: jobFormData.urgency,
        preferredDate: jobFormData.preferredDate,
        preferredTime: jobFormData.preferredTime,
        additionalInstructions: jobFormData.additionalInstructions.trim()
      };

      const res = await jobAPI.create(payload);
      if (res.success && res.job) {
        // Immediate UI update without full reload
        setJobs((prev) => [res.job, ...prev]);
        setPostJobModalOpen(false);
        showToast('🎉 Your job was published successfully and broadcasted to local verified pros!');
        
        // Reset form
        setJobFormData({
          title: '',
          category: categories[0]?.slug || 'electrician',
          description: '',
          city: 'Lucknow, UP',
          address: '',
          budgetAmount: '',
          budgetType: 'fixed',
          urgency: 'medium',
          preferredDate: 'Tomorrow Morning',
          preferredTime: '09:00 AM - 12:00 PM',
          additionalInstructions: '',
          agreeConsent: false
        });

        // Scroll to recent jobs section to display immediately
        const section = document.getElementById('recent-jobs');
        if (section) section.scrollIntoView({ behavior: 'smooth' });
      } else {
        setFormError(res.message || 'Failed to publish job.');
      }
    } catch (err) {
      setFormError(err.response?.data?.message || err.message || 'Error communicating with server.');
    } finally {
      setSubmittingJob(false);
    }
  };

  // Vendor Action: Accept Job (First-Come, First-Served)
  const handleVendorApply = async (jobId) => {
    if (!user || user.role !== 'vendor') {
      await switchRole('vendor');
    }
    try {
      const price = selectedJob?.budget?.amount || 500;
      const res = await jobAPI.acceptJob(jobId, {
        finalPrice: price,
        pricingType: 'fixed',
        estimatedDuration: 'Standard Response'
      });
      if (res?.success) {
        showToast('🎉 Job accepted successfully! Redirecting to booking...');
        setSelectedJob(null);
        if (res.booking?._id) {
          setTimeout(() => navigate(`/vendor/manage-job/${res.booking._id}`), 900);
        } else {
          setTimeout(() => navigate('/vendor/active-jobs'), 900);
        }
      }
    } catch (err) {
      if (err.response?.status === 409) {
        showToast('⚠️ This job has already been accepted by another professional.');
        setJobs((prev) => prev.map((j) => (j._id === jobId ? { ...j, status: 'assigned' } : j)));
        setSelectedJob((prev) => (prev ? { ...prev, status: 'assigned' } : null));
      } else {
        showToast(err.response?.data?.message || 'Could not accept job at this moment.');
      }
    }
  };

  // Customer Action: Cancel / Delete own job
  const handleDeleteJob = async (jobId) => {
    if (!window.confirm('Are you sure you want to cancel this job post?')) return;
    try {
      const res = await jobAPI.delete(jobId);
      if (res.success) {
        setJobs((prev) => prev.filter((j) => j._id !== jobId));
        if (selectedJob && selectedJob._id === jobId) setSelectedJob(null);
        showToast('🗑️ Job was cancelled and removed.');
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Not authorized to delete this job.');
    }
  };

  return (
    <div className="bg-[#F7F9FC] min-h-screen text-[#111827]">
      
      {/* Success Notification Banner / Toast */}
      {successToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#06684F] text-white px-5 py-3.5 rounded-xl shadow-2xl flex items-center gap-3 border border-emerald-600 animate-in slide-in-from-bottom-4 duration-300">
          <CheckCircle2 className="w-5 h-5 text-emerald-300 flex-shrink-0" />
          <span className="text-sm font-medium">{successToast}</span>
          <button onClick={() => setSuccessToast('')} className="p-1 hover:text-emerald-200">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          1. PREMIUM FULL-SCREEN HERO BACKGROUND CAROUSEL
         ───────────────────────────────────────────────────────────── */}
      <HeroCarousel
        searchKeyword={searchKeyword}
        setSearchKeyword={setSearchKeyword}
        searchLocation={searchLocation}
        setSearchLocation={setSearchLocation}
        onSearch={handleHeroSearch}
        onPostJobClick={() => setPostJobModalOpen(true)}
        categories={categories}
      />

      {/* ─────────────────────────────────────────────────────────────
          2. POPULAR SERVICES SECTION
         ───────────────────────────────────────────────────────────── */}
      <section id="popular-categories" className="page-container py-12 lg:py-16">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#06684F]">Marketplace Services</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#111827] tracking-tight mt-1">
              Popular Services
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-xl">
              Find trusted professionals for your everyday needs.
            </p>
          </div>
          <Link
            to="/categories"
            className="text-xs sm:text-sm font-bold text-[#06684F] hover:text-[#055742] inline-flex items-center gap-1.5 shrink-0 px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 transition"
          >
            <span>View All Services</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Categories Grid (4 cols on desktop, 3 on tablet, 2 on mobile) */}
        {loadingCategories ? (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5 sm:gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-64 sm:h-72 bg-white rounded-2xl border border-slate-200 animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5 sm:gap-6">
              {displayedHomeCategories.map((cat) => (
                <CategoryCard
                  key={cat._id || cat.slug || cat.id}
                  category={cat}
                  isSelected={activeCategoryFilter === cat.slug}
                />
              ))}
            </div>

            {sortedPopularCategories.length > 8 && (
              <div className="mt-8 text-center">
                <button
                  type="button"
                  onClick={() => setShowAllHomeCategories((prev) => !prev)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white border border-slate-300 hover:border-[#06684F] hover:bg-slate-50 text-slate-800 text-xs font-bold shadow-2xs transition active:scale-95"
                >
                  <span>{showAllHomeCategories ? 'Show Fewer Categories' : `View All Categories (${sortedPopularCategories.length})`}</span>
                  {showAllHomeCategories ? (
                    <ChevronUp className="w-4 h-4 text-[#06684F]" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-[#06684F]" />
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </section>

      {/* ─────────────────────────────────────────────────────────────
          3. RECENT JOBS IN YOUR AREA
         ───────────────────────────────────────────────────────────── */}
      <section id="recent-jobs" className="page-container pb-12 lg:pb-16">
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 sm:p-8">
          
          {/* Header & Filters */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#06684F] animate-ping" />
                <span className="text-xs font-bold uppercase tracking-wider text-[#06684F]">Real-Time Dispatch Feed</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[#111827] tracking-tight mt-1">
                Recent Jobs in Your Area
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Saved directly to database and synchronized live across open sessions.
              </p>
            </div>

            {/* Category Filter, Urgency Filter & Post Job */}
            <div className="flex flex-wrap items-center gap-2.5">
              
              {/* Category selector */}
              <select
                value={activeCategoryFilter}
                onChange={(e) => setActiveCategoryFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#06684F]"
              >
                <option value="all">All Service Categories</option>
                {categories.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.name}
                  </option>
                ))}
              </select>

              {/* Urgency selector */}
              <select
                value={activeUrgencyFilter}
                onChange={(e) => setActiveUrgencyFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#06684F]"
              >
                <option value="all">All Urgency Levels</option>
                <option value="emergency">Emergency Only</option>
                <option value="high">High Priority</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>

              <button
                type="button"
                onClick={() => setPostJobModalOpen(true)}
                className="px-4 py-2.5 bg-[#06684F] hover:bg-[#055742] text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5 active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Post a New Job</span>
              </button>
            </div>
          </div>

          {/* Job Feed Cards */}
          {loadingJobs ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-64 bg-slate-100 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : jobs.length === 0 ? (
            <div className="text-center py-16 px-4">
              <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-[#06684F] mx-auto flex items-center justify-center mb-4">
                <Briefcase className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-[#111827]">No open jobs found in this category</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                Be the first to post a service request in this area and receive offers from local verified pros.
              </p>
              <button
                onClick={() => setPostJobModalOpen(true)}
                className="mt-4 px-5 py-2.5 bg-[#06684F] text-white rounded-xl text-xs font-bold hover:bg-[#055742] transition"
              >
                + Post a Job Free
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-6">
              {jobs.map((job) => {
                const isEmergency = job.urgency === 'emergency';
                const isHigh = job.urgency === 'high';
                const isOwner = user && (user.id === job?.customer?._id || user.id === job?.customer);
                const media = resolveJobImage(job);

                return (
                  <div
                    key={job._id}
                    className="bg-white border border-slate-200 hover:border-slate-300 rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition flex flex-col justify-between group"
                  >
                    {/* Consistent 16:9 Aspect Ratio Service Image */}
                    <div className="relative aspect-video w-full overflow-hidden bg-slate-100 shrink-0">
                      <img
                        src={media.image}
                        alt={media.alt}
                        loading="lazy"
                        onError={handleImageFallback}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ease-out"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none opacity-50 group-hover:opacity-30 transition-opacity" />
                    </div>

                    <div className="p-5 flex-1 flex flex-col justify-between">
                      <div>
                        {/* Top Badges */}
                        <div className="flex items-center justify-between gap-2 mb-3">
                          <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-slate-100 text-slate-700 truncate max-w-[170px]" title={media.subcategoryName || job.category?.name || media.categoryName}>
                            {media.subcategoryName || job.category?.name || media.categoryName}
                          </span>

                          <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase shrink-0 ${
                            isEmergency 
                              ? 'bg-rose-100 text-rose-800 border border-rose-200' 
                              : isHigh 
                              ? 'bg-amber-100 text-amber-800' 
                              : 'bg-slate-100 text-slate-600'
                          }`}>
                            {job.urgency}
                          </span>
                        </div>

                        {/* Job Title */}
                        <h3 className="font-bold text-base text-[#111827] line-clamp-2 leading-snug group-hover:text-[#06684F] transition-colors">
                          {job.title}
                        </h3>

                        {/* Job Description */}
                        <p className="text-xs text-slate-600 line-clamp-3 mt-2 leading-relaxed">
                          {job.description}
                        </p>

                        {/* Metadata Details */}
                        <div className="mt-4 pt-3 border-t border-slate-100 space-y-1.5 text-xs text-slate-500">
                          <div className="flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="truncate">
                              {formatShortAddress(job.location) || job.location?.city || 'Lucknow, UP'}
                            </span>
                          </div>

                          {job.preferredDate && (
                            <div className="flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span>Schedule: {job.preferredDate}</span>
                            </div>
                          )}

                          <div className="flex items-center justify-between pt-1">
                            <span className="font-semibold text-[#111827]">
                              Budget: {formatCurrency(job.budget?.amount)} {job.budget?.type === 'hourly' ? '/hr' : 'fixed'}
                            </span>
                            <span className="text-[11px] text-slate-400">
                              {new Date(job.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Bottom Actions */}
                      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedJob(job)}
                          className="text-xs font-semibold text-[#06684F] hover:text-[#055742] hover:underline cursor-pointer"
                        >
                          View Details
                        </button>

                        <div className="flex items-center gap-1.5">
                          {isOwner && (
                            <button
                              type="button"
                              onClick={() => handleDeleteJob(job._id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                              title="Cancel Job"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => setSelectedJob(job)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                              job.status === 'assigned' || job.selectedVendor
                                ? 'bg-slate-100 text-slate-500 border border-slate-200 cursor-default'
                                : 'bg-[#06684F] hover:bg-[#055742] text-white'
                            }`}
                          >
                            {job.status === 'assigned' || job.selectedVendor ? 'Job Taken' : user?.role === 'vendor' ? 'Accept Job' : 'View Job'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          4. FEATURED LOCAL PROFESSIONALS
         ───────────────────────────────────────────────────────────── */}
      <section className="page-container pb-12 lg:pb-16">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#06684F]">Vetted Specialists</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#111827] tracking-tight mt-1">
              Featured Local Professionals
            </h2>
          </div>
          <Link
            to="/professionals"
            className="text-sm font-semibold text-[#06684F] hover:text-[#055742] inline-flex items-center gap-1"
          >
            <span>Browse Directory</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {loadingVendors ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-60 bg-white rounded-2xl border border-slate-200 animate-pulse" />
            ))}
          </div>
        ) : vendors.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 p-6">
            <UserCheck className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-[#111827]">No approved professionals found in this directory radius.</p>
            <p className="text-xs text-slate-500 mt-1">Browse our categories catalogue or post a service request.</p>
            <div className="mt-4 flex items-center justify-center gap-3">
              <Link to="/categories" className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-xl transition">
                Browse Categories
              </Link>
              <button onClick={() => setPostJobModalOpen(true)} className="px-4 py-2 bg-[#06684F] hover:bg-[#055742] text-white text-xs font-semibold rounded-xl transition">
                Post a Job Free
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {vendors.map((v) => (
              <div
                key={v._id}
                className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs hover:shadow-md transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start gap-4">
                    <img
                      src={v.user?.avatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80'}
                      alt={v.businessName}
                      className="w-14 h-14 rounded-xl object-cover border border-slate-200 shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h3 className="font-bold text-[#111827] text-sm truncate">{v.businessName}</h3>
                        {v.verifiedBadge?.status === 'verified' && (
                          <span title="License & Identity Verified">
                            <ShieldCheck className="w-4 h-4 text-[#06684F] flex-shrink-0" />
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 truncate">{v.tagline || 'Skilled Trade Contractor'}</p>
                      
                      <div className="flex items-center gap-2.5 mt-1.5 text-xs text-slate-600 font-medium">
                        <span className="flex items-center gap-1 text-amber-600 font-bold">
                          <Star className="w-3.5 h-3.5 fill-amber-500" />
                          {v.rating ? v.rating.toFixed(1) : '5.0'}
                        </span>
                        <span>•</span>
                        <span>{v.reviewCount || 0} reviews</span>
                        <span>•</span>
                        <span>{v.completedJobsCount || 0} jobs</span>
                      </div>
                    </div>
                  </div>

                  {/* Hourly Rate & Service Area */}
                  <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="font-bold text-[#06684F]">
                      {formatCurrency(v.hourlyRate || 45)}/hr
                    </span>
                    <span className="text-slate-500 truncate max-w-[170px]">
                      {v.serviceAreas?.[0]?.name || v.city || 'Lucknow & surrounding'}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 line-clamp-2 mt-2 leading-relaxed">
                    {v.bio || 'Available for prompt residential service calls and emergency trade dispatches.'}
                  </p>
                </div>

                <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                  <Link
                    to={`/professionals/${v._id}`}
                    className="px-3.5 py-2 border border-slate-300 hover:bg-slate-50 text-slate-800 rounded-xl text-xs font-semibold transition"
                  >
                    View Profile
                  </Link>

                  <Link
                    to={`/professionals/${v._id}`}
                    className="px-4 py-2 bg-[#06684F] hover:bg-[#055742] text-white rounded-xl text-xs font-semibold transition"
                  >
                    Book Now
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ─────────────────────────────────────────────────────────────
          5. CUSTOMER JOURNEY: TWO SIMPLE WAYS TO HIRE
         ───────────────────────────────────────────────────────────── */}
      <section className="page-container pb-12 lg:pb-16">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <span className="text-xs font-bold uppercase tracking-wider text-[#06684F]">Choose Your Path</span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#111827] tracking-tight mt-1">
            Two Simple Ways to Get Work Done
          </h2>
          <p className="text-sm text-slate-600 mt-2">
            Whether you want competitive quotes or need to hire an approved specialist right now, WorkLogy gives you total control.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
          
          {/* Option A — Post a Job */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs hover:shadow-md transition flex flex-col justify-between">
            <div>
              {/* Featured Action Image Banner (Homepage.png) */}
              <div className="relative aspect-[16/9] w-full rounded-2xl overflow-hidden mb-5 bg-slate-100 border border-slate-200 shadow-2xs group">
                <img
                  src={homepageImg}
                  alt="Professional plumber working on a customer request"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
                <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white">
                  <span className="text-xs font-bold drop-shadow-sm flex items-center gap-1.5">
                    <Wrench className="w-3.5 h-3.5 text-emerald-300" />
                    <span>On-Site Execution</span>
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-xs font-semibold">
                    Competitive Bids
                  </span>
                </div>
              </div>

              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-[#06684F] text-xs font-bold mb-3">
                <span>Option A</span>
                <span>•</span>
                <span>Best for custom projects & quotes</span>
              </div>

              <h3 className="text-xl font-extrabold text-[#111827] mb-2">
                Post a Job Free
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed mb-6">
                Describe your requirements, set your preferred schedule and budget, and let verified professionals submit custom offers.
              </p>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-slate-100 text-[#06684F] font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    1
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-[#111827]">Describe Your Work</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">Specify the issue, locality, budget, and timing in a quick 2-minute form.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-slate-100 text-[#06684F] font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    2
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-[#111827]">Receive Direct Offers</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">Nearby licensed technicians receive your request and respond with exact prices.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-slate-100 text-[#06684F] font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    3
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-[#111827]">Compare and Hire</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">Check reviews, message the professional, and confirm with escrow protection.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-8">
              <button
                type="button"
                onClick={() => setPostJobModalOpen(true)}
                className="w-full py-3 bg-[#06684F] hover:bg-[#055742] text-white text-sm font-bold rounded-xl shadow-xs transition flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>Post a Job Free</span>
              </button>
            </div>
          </div>

          {/* Option B — Hire Directly */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs hover:shadow-md transition flex flex-col justify-between">
            <div>
              {/* Featured Action Image Banner (Expert Homepage.png) */}
              <div className="relative aspect-[16/9] w-full rounded-2xl overflow-hidden mb-5 bg-slate-100 border border-slate-200 shadow-2xs group">
                <img
                  src={expertHomepageImg}
                  alt="Expert HVAC technician servicing home equipment"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
                <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white">
                  <span className="text-xs font-bold drop-shadow-sm flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
                    <span>Direct Specialist Hire</span>
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-xs font-semibold">
                    Instant Schedule
                  </span>
                </div>
              </div>

              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 text-slate-800 text-xs font-bold mb-3">
                <span>Option B</span>
                <span>•</span>
                <span>Best for known services & fast bookings</span>
              </div>

              <h3 className="text-xl font-extrabold text-[#111827] mb-2">
                Hire a Professional Directly
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed mb-6">
                Search verified trade profiles, check upfront prices and reviews, and send a direct booking request immediately.
              </p>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-800 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    1
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-[#111827]">Search by Service & Locality</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">Browse electricians, plumbers, HVAC technicians, and carpenters nearby.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-800 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    2
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-[#111827]">Check Upfront Pricing & Skills</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">Review fixed service rates, hourly pricing, ratings, and completed projects.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-800 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    3
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-[#111827]">Select Slot & Book</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">Pick your date and time to submit your booking. The pro confirms directly.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-8">
              <Link
                to="/professionals"
                className="w-full py-3 bg-[#111827] hover:bg-slate-800 text-white text-sm font-bold rounded-xl shadow-xs transition flex items-center justify-center gap-2"
              >
                <Search className="w-4 h-4" />
                <span>Find a Professional</span>
              </Link>
            </div>
          </div>

        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          6. HOW WORKLOGY WORKS
         ───────────────────────────────────────────────────────────── */}
      <section className="page-container pb-12 lg:pb-16">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <span className="text-xs font-bold uppercase tracking-wider text-[#06684F]">Simple 4-Step Process</span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#111827] tracking-tight mt-1">
            How WorkLogy Works
          </h2>
          <p className="text-sm text-slate-600 mt-2">
            Get your trade repairs and installations done without phone tag or hidden costs.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              num: '01',
              title: 'Choose a Service',
              desc: 'Select from specialized trade categories including Electrical, Plumbing, HVAC, Carpentry, and more.'
            },
            {
              num: '02',
              title: 'Describe Your Work',
              desc: 'Tell us your issue, preferred date, budget, and location. Your job immediately alerts nearby verified pros.'
            },
            {
              num: '03',
              title: 'Connect with Professionals',
              desc: 'Review transparent quotes, verified trade licenses, customer reviews, and message directly.'
            },
            {
              num: '04',
              title: 'Confirm and Track Your Job',
              desc: 'Select your preferred technician, track service progress live, and confirm job completion with peace of mind.'
            }
          ].map((step, idx) => (
            <div key={idx} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs relative flex flex-col justify-between">
              <div>
                <span className="text-3xl font-black text-slate-200 block mb-3">{step.num}</span>
                <h3 className="font-bold text-[#111827] text-sm mb-2">{step.title}</h3>
                <p className="text-xs text-slate-600 leading-relaxed">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          7. WHY CUSTOMERS TRUST WORKLOGY
         ───────────────────────────────────────────────────────────── */}
      <section className="page-container pb-16 lg:pb-24">
        <div className="bg-[#06684F] text-white rounded-3xl p-8 sm:p-12 shadow-md">
          <div className="max-w-3xl">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-200">Uncompromising Standards</span>
            <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight mt-1 text-white">
              Why Customers Trust WorkLogy
            </h2>
            <p className="text-emerald-100 text-sm sm:text-base mt-2 leading-relaxed">
              We built WorkLogy around genuine accountability, verified background checks, and protected payments.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
            {[
              {
                icon: ShieldCheck,
                title: 'Professional Verification',
                text: 'Every technician passes identity and trade credential verification before accepting customer work.'
              },
              {
                icon: DollarSign,
                title: 'Clear Pricing',
                text: 'Upfront hourly rates and itemized estimates with zero hidden charges or unexpected markups.'
              },
              {
                icon: Lock,
                title: 'Secure Payments and Escrow',
                text: 'Funds are held safely in escrow and only released once you confirm work has been completed.'
              },
              {
                icon: MessageSquare,
                title: 'Direct Communication',
                text: 'In-app real-time messaging allows you to share photos, discuss requirements, and finalize details directly.'
              },
              {
                icon: Activity,
                title: 'Job Progress Tracking',
                text: 'Follow your job status live with real-time updates from dispatch and arrival to completion.'
              },
              {
                icon: HelpCircle,
                title: 'Support and Dispute Resolution',
                text: 'Our dedicated support team is available to assist with inquiries, questions, or dispute mediation.'
              }
            ].map((f, i) => (
              <div key={i} className="bg-white/10 border border-white/15 p-5 rounded-2xl">
                <f.icon className="w-6 h-6 text-emerald-300 mb-3" />
                <h3 className="font-bold text-sm text-white mb-1">{f.title}</h3>
                <p className="text-xs text-emerald-100 leading-relaxed">{f.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          8. POST A JOB MODAL (FULL FUNCTIONAL FORM)
         ───────────────────────────────────────────────────────────── */}
      {postJobModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-xl w-full my-8 p-6 sm:p-8 animate-in zoom-in-95 duration-200">
            
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-xl font-bold text-[#111827]">Post a Service Job Free</h3>
                <p className="text-xs text-slate-500 mt-0.5">Will be saved to database and broadcasted live to local verified pros</p>
              </div>
              <button
                type="button"
                onClick={() => setPostJobModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handlePostJobSubmit} className="mt-5 space-y-4">
              
              {/* Title */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Job Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="E.g. Fix Kitchen Sink Leak & Install New Disposal"
                  value={jobFormData.title}
                  onChange={(e) => setJobFormData({ ...jobFormData, title: e.target.value })}
                  className="w-full text-sm bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#06684F]"
                />
              </div>

              {/* Service Category */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Service Category *
                </label>
                <select
                  value={jobFormData.category}
                  onChange={(e) => setJobFormData({ ...jobFormData, category: e.target.value })}
                  className="w-full text-sm bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#06684F]"
                >
                  {categories.map((c) => (
                    <option key={c.slug} value={c.slug}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Detailed Description * (min 10 characters)
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Describe the issue, required tools, symptoms, and any material already purchased..."
                  value={jobFormData.description}
                  onChange={(e) => setJobFormData({ ...jobFormData, description: e.target.value })}
                  className="w-full text-sm bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#06684F]"
                />
              </div>

              {/* Location Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">City / Locality *</label>
                  <input
                    type="text"
                    required
                    value={jobFormData.city}
                    onChange={(e) => setJobFormData({ ...jobFormData, city: e.target.value })}
                    className="w-full text-sm bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#06684F]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Street Address (Optional)</label>
                  <input
                    type="text"
                    placeholder="E.g. Vibhuti Khand, Gomti Nagar"
                    value={jobFormData.address}
                    onChange={(e) => setJobFormData({ ...jobFormData, address: e.target.value })}
                    className="w-full text-sm bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#06684F]"
                  />
                </div>
              </div>

              {/* Budget Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Budget Type</label>
                  <select
                    value={jobFormData.budgetType}
                    onChange={(e) => setJobFormData({ ...jobFormData, budgetType: e.target.value })}
                    className="w-full text-sm bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#06684F]"
                  >
                    <option value="fixed">Fixed Price</option>
                    <option value="hourly">Hourly Rate</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Estimated Budget Amount ($) *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    placeholder="250"
                    value={jobFormData.budgetAmount}
                    onChange={(e) => setJobFormData({ ...jobFormData, budgetAmount: e.target.value })}
                    className="w-full text-sm bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#06684F]"
                  />
                </div>
              </div>

              {/* Schedule & Urgency */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Preferred Schedule</label>
                  <input
                    type="text"
                    value={jobFormData.preferredDate}
                    onChange={(e) => setJobFormData({ ...jobFormData, preferredDate: e.target.value })}
                    className="w-full text-sm bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#06684F]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Urgency</label>
                  <select
                    value={jobFormData.urgency}
                    onChange={(e) => setJobFormData({ ...jobFormData, urgency: e.target.value })}
                    className="w-full text-sm bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#06684F]"
                  >
                    <option value="low">Low (Next week)</option>
                    <option value="medium">Medium (Within 2-3 days)</option>
                    <option value="high">High (Tomorrow)</option>
                    <option value="emergency">Emergency (Immediate)</option>
                  </select>
                </div>
              </div>

              {/* Consent Checkbox */}
              <div className="pt-2">
                <label className="flex items-start gap-2.5 text-xs text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={jobFormData.agreeConsent}
                    onChange={(e) => setJobFormData({ ...jobFormData, agreeConsent: e.target.checked })}
                    className="mt-0.5 rounded text-[#06684F] focus:ring-[#06684F]"
                  />
                  <span>
                    I confirm this service request is genuine and agree to receive quotations from verified WorkLogy professionals.
                  </span>
                </label>
              </div>

              {/* Submit Buttons */}
              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setPostJobModalOpen(false)}
                  className="px-4 py-2.5 text-slate-600 hover:text-slate-900 text-xs font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingJob}
                  className="px-6 py-2.5 bg-[#06684F] hover:bg-[#055742] text-white text-xs font-bold rounded-xl shadow-xs transition disabled:opacity-50 active:scale-95 flex items-center gap-1.5"
                >
                  {submittingJob ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Saving to database...</span>
                    </>
                  ) : (
                    <span>Publish Job Now</span>
                  )}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          9. JOB DETAILS MODAL
         ───────────────────────────────────────────────────────────── */}
      {selectedJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Service Image Banner */}
            <div className="relative aspect-video w-full bg-slate-100 overflow-hidden border-b border-slate-100">
              <img
                src={getJobImage(selectedJob)}
                alt={selectedJob.title || 'Service Image'}
                className="w-full h-full object-cover"
                onError={(e) => handleImageFallback(e, FALLBACK_SERVICE_IMAGE)}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 pointer-events-none" />
              <button
                type="button"
                onClick={() => setSelectedJob(null)}
                className="absolute top-3 right-3 p-1.5 bg-black/40 hover:bg-black/60 text-white rounded-full backdrop-blur-xs transition"
                aria-label="Close dialog"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="absolute bottom-3 left-4">
                <span className="px-2.5 py-0.5 rounded text-[10px] font-bold uppercase bg-white/95 text-[#06684F] shadow-2xs backdrop-blur-xs">
                  {selectedJob.category?.name || 'Service Job'}
                </span>
              </div>
            </div>

            <div className="p-6 sm:p-7">
              <div className="pb-3 border-b border-slate-100">
                <h3 className="text-lg font-bold text-[#111827]">{selectedJob.title}</h3>
              </div>

              <div className="py-4 space-y-3 text-xs text-slate-700">
              <p className="leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200">
                {selectedJob.description}
              </p>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="p-2.5 rounded-lg border border-slate-100 bg-white">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Your Budget</span>
                  <span className="text-sm font-bold text-[#111827]">
                    {formatCurrency(selectedJob.budget?.amount)} ({selectedJob.budget?.type})
                  </span>
                </div>
                <div className="p-2.5 rounded-lg border border-slate-100 bg-white">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Location</span>
                  <span className="text-sm font-bold text-[#111827] truncate block">
                    {formatShortAddress(selectedJob.location) || selectedJob.location?.city || 'Lucknow, UP'}
                  </span>
                </div>
              </div>

              {selectedJob.preferredDate && (
                <div className="p-2.5 rounded-lg border border-slate-100 bg-white">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Date and Time</span>
                  <span className="text-xs font-semibold text-slate-800">
                    {selectedJob.preferredDate} ({selectedJob.preferredTime || 'Flexible'})
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between text-slate-500 pt-1">
                <span>Posted by {selectedJob.customer?.name || 'Verified Customer'}</span>
                <span>Status: <strong className="text-[#06684F] uppercase">{selectedJob.status}</strong></span>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setSelectedJob(null)}
                className="px-4 py-2 text-slate-600 hover:text-slate-900 text-xs font-semibold rounded-xl"
              >
                Close
              </button>

              {user?.role === 'vendor' ? (
                selectedJob.status === 'assigned' || selectedJob.selectedVendor ? (
                  <span className="px-5 py-2 bg-slate-100 text-slate-500 text-xs font-bold rounded-xl border border-slate-200">
                    Job Already Taken
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleVendorApply(selectedJob._id)}
                    className="px-5 py-2 bg-[#06684F] hover:bg-[#055742] text-white text-xs font-bold rounded-xl shadow-xs transition active:scale-95"
                  >
                    Accept Job
                  </button>
                )
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedJob(null);
                    navigate('/customer/my-jobs');
                  }}
                  className="px-5 py-2 bg-[#111827] hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-xs transition"
                >
                  Go to My Jobs
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    )}

    </div>
  );
}
