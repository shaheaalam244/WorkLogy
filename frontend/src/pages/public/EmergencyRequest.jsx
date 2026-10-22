import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  AlertTriangle,
  Zap,
  Droplets,
  Wind,
  KeyRound,
  Wrench,
  Hammer,
  ShieldCheck,
  MapPin,
  Phone,
  Clock,
  CheckCircle2,
  ArrowRight,
  Loader2,
  Navigation,
  Compass,
  AlertCircle,
  Check,
  X,
  Shield,
  RefreshCw,
  Search,
  ChevronDown,
  Edit2,
  MessageSquare,
  ExternalLink,
  LayoutGrid,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useSocketContext } from '../../context/SocketContext';
import { jobAPI } from '../../api/job.api';
import { vendorAPI } from '../../api/vendor.api';
import { locationAPI } from '../../api/location.api';
import { customerAPI } from '../../api/customer.api';
import { categoryAPI } from '../../api/category.api';
import { getCategoryMedia, handleImageFallback } from '../../utils/categoryMedia';
import { getServiceImage } from '../../constants/serviceImages';

// Top 8 featured emergency categories
const FEATURED_CATEGORIES = [
  { id: 'electrical-services', name: 'Electrical', matchKeywords: ['electric', 'power', 'mcb', 'spark', 'light', 'wiring'] },
  { id: 'plumbing-services', name: 'Plumbing', matchKeywords: ['water', 'pipe', 'leak', 'drain', 'toilet', 'flush', 'tap'] },
  { id: 'ac-hvac-services', name: 'AC & Cooling', matchKeywords: ['ac', 'cooling', 'hvac', 'air', 'compressor'] },
  { id: 'appliance-repair', name: 'Appliance Repair', matchKeywords: ['appliance', 'fridge', 'refrigerator', 'geyser', 'washing', 'heater'] },
  { id: 'locksmith-services', name: 'Locksmith', matchKeywords: ['lock', 'key', 'door', 'locked', 'latch'] },
  { id: 'waterproofing-roofing', name: 'Roofing & Structural', matchKeywords: ['roof', 'ceiling', 'waterproof', 'leakage', 'seepage'] },
  { id: 'ro-water-purifier', name: 'Water Purifier (RO)', matchKeywords: ['ro', 'purifier', 'water filter', 'aquaguard', 'kent'] },
  { id: 'carpentry-furniture', name: 'Carpentry & Handyman', matchKeywords: ['carpenter', 'wood', 'furniture', 'door', 'cabinet', 'hinge'] }
];

// Complete 30 WorkLogy trade categories for full catalog selection
const ALL_CATEGORIES_CATALOG = [
  { id: 'electrical-services', name: 'Electrical Services', matchKeywords: ['electric', 'power', 'mcb', 'spark', 'light', 'wiring'] },
  { id: 'plumbing-services', name: 'Plumbing Services', matchKeywords: ['water', 'pipe', 'leak', 'drain', 'toilet', 'flush', 'tap'] },
  { id: 'ac-hvac-services', name: 'AC & HVAC Services', matchKeywords: ['ac', 'cooling', 'hvac', 'air', 'compressor'] },
  { id: 'appliance-repair', name: 'Appliance Repair', matchKeywords: ['appliance', 'fridge', 'refrigerator', 'geyser', 'washing', 'heater'] },
  { id: 'locksmith-services', name: 'Locksmith Services', matchKeywords: ['lock', 'key', 'door', 'locked', 'latch'] },
  { id: 'waterproofing-roofing', name: 'Waterproofing & Roofing', matchKeywords: ['roof', 'ceiling', 'waterproof', 'leakage', 'seepage'] },
  { id: 'ro-water-purifier', name: 'Water Purifier (RO)', matchKeywords: ['ro', 'purifier', 'water filter', 'aquaguard', 'kent'] },
  { id: 'carpentry-furniture', name: 'Carpentry & Furniture', matchKeywords: ['carpenter', 'wood', 'furniture', 'door', 'cabinet', 'hinge'] },
  { id: 'cctv-security', name: 'CCTV & Security Systems', matchKeywords: ['cctv', 'camera', 'security', 'surveillance', 'alarm'] },
  { id: 'glass-glazing', name: 'Glass & Glazing', matchKeywords: ['glass', 'window', 'mirror', 'glazing', 'door glass'] },
  { id: 'pest-control', name: 'Pest Control & Fumigation', matchKeywords: ['pest', 'termite', 'cockroach', 'bugs', 'rats', 'bedbug'] },
  { id: 'geyser-water-heater', name: 'Geyser & Water Heater', matchKeywords: ['geyser', 'heater', 'hot water', 'sparking geyser'] },
  { id: 'vehicle-repair', name: 'Vehicle & Car Mechanic', matchKeywords: ['car', 'bike', 'vehicle', 'mechanic', 'breakdown', 'puncture'] },
  { id: 'painting-services', name: 'Painting Services', matchKeywords: ['paint', 'wall', 'whitewash', 'distemper', 'texture'] },
  { id: 'cleaning-services', name: 'Deep Cleaning Services', matchKeywords: ['cleaning', 'deep clean', 'sanitize', 'bathroom clean'] },
  { id: 'handyman-services', name: 'Handyman & Repairs', matchKeywords: ['handyman', 'fix', 'drill', 'curtain rod', 'mounting'] },
  { id: 'it-networking', name: 'Home Network & Wi-Fi', matchKeywords: ['wifi', 'router', 'internet', 'lan', 'cable', 'network'] },
  { id: 'laptop-computer-repair', name: 'Laptop & Computer Repair', matchKeywords: ['laptop', 'pc', 'computer', 'screen', 'keyboard', 'windows'] },
  { id: 'solar-panel-services', name: 'Solar Panel Services', matchKeywords: ['solar', 'inverter', 'panel', 'battery', 'charge'] },
  { id: 'construction-masonry', name: 'Construction & Masonry', matchKeywords: ['mason', 'brick', 'plaster', 'cement', 'concrete'] },
  { id: 'curtains-blinds', name: 'Curtains & Blinds', matchKeywords: ['curtain', 'blind', 'rod', 'drapery'] },
  { id: 'packers-movers', name: 'Home Shifting & Packers', matchKeywords: ['packers', 'movers', 'shifting', 'luggage'] },
  { id: 'tile-flooring', name: 'Tile & Floor Work', matchKeywords: ['tile', 'flooring', 'marble', 'grouting'] },
  { id: 'gardening-landscaping', name: 'Gardening & Lawn', matchKeywords: ['garden', 'plants', 'grass', 'lawn', 'tree'] },
  { id: 'home-installation', name: 'TV & Home Installation', matchKeywords: ['tv', 'mount', 'installation', 'assembly'] },
  { id: 'interior-design', name: 'Modular Kitchen & Interior', matchKeywords: ['kitchen', 'interior', 'wardrobe', 'modular'] },
  { id: 'beauty-salon', name: 'Home Salon & Grooming', matchKeywords: ['salon', 'haircut', 'grooming', 'facial'] },
  { id: 'driver-chauffeur', name: 'Chauffeur & Driver', matchKeywords: ['driver', 'chauffeur', 'car driver'] },
  { id: 'laundry-dry-cleaning', name: 'Laundry & Dry Cleaning', matchKeywords: ['laundry', 'dry clean', 'ironing', 'wash'] },
  { id: 'photography-videography', name: 'Photography & Video', matchKeywords: ['photo', 'photographer', 'video', 'shoot'] },
  { id: 'other-services', name: 'Other Urgent Repairs', matchKeywords: [] }
];

const QUICK_SYMPTOMS = [
  { label: 'Water pipe leaking', categoryId: 'plumbing-services' },
  { label: 'Power keeps tripping', categoryId: 'electrical-services' },
  { label: 'AC stopped cooling', categoryId: 'ac-hvac-services' },
  { label: 'Locked outside house', categoryId: 'locksmith-services' },
  { label: 'Water purifier leaking', categoryId: 'ro-water-purifier' },
  { label: 'Burning smell from board', categoryId: 'electrical-services' },
  { label: 'Door latch / lock jammed', categoryId: 'carpentry-furniture' },
  { label: 'Ceiling water seepage', categoryId: 'waterproofing-roofing' }
];

export default function EmergencyRequest() {
  const navigate = useNavigate();
  const { user, login } = useAuth();
  const { socket } = useSocketContext();

  // Categories State
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(FEATURED_CATEGORIES[0]);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [categoryModalSearch, setCategoryModalSearch] = useState('');

  // Form State
  const [problemDescription, setProblemDescription] = useState('');
  const [contactPhone, setContactPhone] = useState(user?.phone || '');
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Address State
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [houseNumber, setHouseNumber] = useState('');
  const [street, setStreet] = useState('');
  const [locality, setLocality] = useState('');
  const [landmark, setLandmark] = useState('');
  const [city, setCity] = useState('Lucknow');
  const [zipCode, setZipCode] = useState('');
  const [coordinates, setCoordinates] = useState({ lat: 26.8467, lng: 80.9462 });
  const [showAddressEditor, setShowAddressEditor] = useState(false);
  const [detectingGps, setDetectingGps] = useState(false);
  const [gpsStatus, setGpsStatus] = useState('');

  // Live Tracking / Dispatch State
  const [dispatchedJob, setDispatchedJob] = useState(null);
  const [assignedPro, setAssignedPro] = useState(null);
  const [bookingInfo, setBookingInfo] = useState(null);
  const [dispatchExpired, setDispatchExpired] = useState(false);
  const [countdown, setCountdown] = useState(90);
  const [cancelling, setCancelling] = useState(false);
  const [retrying, setRetrying] = useState(false);

  // Demo sign-in state
  const [isLoggingInDemo, setIsLoggingInDemo] = useState(false);

  // 1. Load active categories from API
  useEffect(() => {
    async function loadCategories() {
      try {
        const res = await categoryAPI.getAll();
        if (res?.categories && Array.isArray(res.categories)) {
          setCategories(res.categories);
        }
      } catch (err) {
        console.warn('Failed to load categories:', err.message);
      }
    }
    loadCategories();
  }, []);

  // 2. Load user profile and saved addresses
  useEffect(() => {
    async function loadUserProfile() {
      if (!user) return;
      if (user.phone && !contactPhone) setContactPhone(user.phone);

      if (user.role === 'customer') {
        try {
          const res = await customerAPI.getProfile();
          if (res?.profile?.addresses?.length > 0) {
            setSavedAddresses(res.profile.addresses);
            const defaultAddr = res.profile.addresses.find(a => a.isDefault) || res.profile.addresses[0];
            if (defaultAddr) {
              applySavedAddress(defaultAddr);
            }
          }
        } catch (err) {
          console.warn('Failed to load saved addresses:', err.message);
        }
      }
    }
    loadUserProfile();
  }, [user]);

  // Apply a saved address
  const applySavedAddress = (addr) => {
    setSelectedAddressId(addr._id || 'saved');
    if (addr.houseNumber) setHouseNumber(addr.houseNumber);
    if (addr.street) setStreet(addr.street);
    if (addr.locality) setLocality(addr.locality);
    if (addr.landmark) setLandmark(addr.landmark);
    if (addr.city) setCity(addr.city);
    if (addr.zipCode) setZipCode(addr.zipCode);
    if (addr.coordinates?.lat && addr.coordinates?.lng) {
      setCoordinates(addr.coordinates);
    }
    setShowAddressEditor(false);
  };

  // Browser GPS Geolocation Auto-detect
  const handleDetectGPS = () => {
    if (!navigator.geolocation) {
      setGpsStatus('Geolocation not supported by your browser');
      return;
    }

    setDetectingGps(true);
    setGpsStatus('Locating your position...');

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const acc = Math.round(pos.coords.accuracy);

        setCoordinates({ lat, lng });
        setSelectedAddressId('');

        try {
          setGpsStatus('Resolving street address...');
          const res = await locationAPI.reverseGeocode(lat, lng);
          if (res?.success && res.address) {
            const addr = res.address;
            setStreet(addr.street || '');
            setLocality(addr.locality || '');
            setCity(addr.city || 'Lucknow');
            setZipCode(addr.zipCode || '');
            setGpsStatus(`GPS Locked (±${acc}m accuracy)`);
          } else {
            setGpsStatus(`GPS coordinates pinned (±${acc}m). Please confirm street.`);
          }
        } catch (err) {
          setGpsStatus(`GPS coordinates pinned (±${acc}m).`);
        } finally {
          setDetectingGps(false);
        }
      },
      (err) => {
        setDetectingGps(false);
        setGpsStatus('GPS permission denied. Please enter address manually.');
        setShowAddressEditor(true);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Auto-suggest category based on typed description
  const handleDescriptionChange = (e) => {
    const text = e.target.value;
    setProblemDescription(text);

    // Auto-detect category if user hasn't manually locked one
    const lower = text.toLowerCase();
    for (const cat of ALL_CATEGORIES_CATALOG) {
      if (cat.matchKeywords?.some(kw => lower.includes(kw))) {
        setSelectedCategory(cat);
        break;
      }
    }
  };

  // Quick symptom click
  const handleQuickSymptomClick = (symptom) => {
    setProblemDescription(symptom.label);
    const matched = ALL_CATEGORIES_CATALOG.find(c => c.id === symptom.categoryId);
    if (matched) setSelectedCategory(matched);
  };

  // 1-Click Demo Customer sign in for guest users
  const handleQuickDemoLogin = async () => {
    setIsLoggingInDemo(true);
    setFormError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'customer@worklogy.com', password: 'password123' })
      });
      const data = await res.json();
      if (data.success && data.token) {
        login(data.user, data.token);
        if (data.user.phone) setContactPhone(data.user.phone);
      } else {
        setFormError('Unable to sign in automatically. Please sign in to continue.');
      }
    } catch (e) {
      setFormError('Sign in error: ' + e.message);
    } finally {
      setIsLoggingInDemo(false);
    }
  };

  // Submit Emergency Booking
  const handleSubmitBooking = async (e) => {
    if (e) e.preventDefault();
    setFormError('');

    // Validation
    const cleanDesc = problemDescription.trim();
    if (!cleanDesc || cleanDesc.length < 10) {
      setFormError('Please describe what happened (at least 10 characters) so the professional arrives prepared.');
      return;
    }
    if (cleanDesc.length > 1000) {
      setFormError('Problem description is too long (maximum 1000 characters).');
      return;
    }

    if (!street && !locality) {
      setFormError('Please confirm your service address so the technician knows where to go.');
      setShowAddressEditor(true);
      return;
    }

    if (!contactPhone || contactPhone.trim().length < 8) {
      setFormError('Please share a valid contact number so your assigned technician can reach you.');
      return;
    }

    if (!user) {
      setFormError('Please sign in or continue as customer to dispatch this emergency request.');
      return;
    }

    setSubmitting(true);

    try {
      // Find matching DB category ID or fallback
      const matchingDbCat = categories.find(
        c => c.slug === selectedCategory.id || 
             c.name?.toLowerCase().includes(selectedCategory.name.toLowerCase()) ||
             (selectedCategory.id === 'ro-water-purifier' && (c.slug?.includes('ro') || c.slug?.includes('water-purifier'))) ||
             (selectedCategory.id === 'waterproofing-roofing' && (c.slug?.includes('roof') || c.slug?.includes('waterproof')))
      ) || categories[0];

      const fullAddress = [
        houseNumber ? `Flat/House ${houseNumber}` : '',
        street,
        locality,
        landmark ? `Near ${landmark}` : '',
        city,
        zipCode
      ].filter(Boolean).join(', ');

      const payload = {
        title: `🚨 Emergency ${selectedCategory.name}: ${cleanDesc.slice(0, 50)}`,
        description: cleanDesc,
        category: matchingDbCat?._id || selectedCategory.id,
        urgency: 'emergency',
        serviceType: 'repair',
        contactPhone: contactPhone.trim(),
        budget: {
          type: 'fixed',
          amount: 499,
          currency: 'INR'
        },
        location: {
          addressLabel: 'Emergency Location',
          houseNumber: houseNumber.trim(),
          street: street.trim(),
          locality: locality.trim(),
          landmark: landmark.trim(),
          address: fullAddress,
          city: city.trim(),
          state: 'Uttar Pradesh',
          zipCode: zipCode.trim(),
          locationSource: coordinates.lat ? 'gps' : 'manual',
          coordinates
        },
        preferredDate: 'Immediate',
        preferredTimeSlot: 'Within 1 Hour'
      };

      const res = await jobAPI.create(payload);

      if (res?.success && res.job) {
        setDispatchedJob(res.job);
        setDispatchExpired(false);
        setCountdown(90);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        setFormError(res?.message || 'Unable to submit emergency request. Please try again.');
      }
    } catch (err) {
      console.error('Emergency dispatch error:', err);
      setFormError(err.response?.data?.message || err.message || 'Failed to dispatch request.');
    } finally {
      setSubmitting(false);
    }
  };

  // Real-time socket listener for assignment & countdown
  useEffect(() => {
    if (!socket || !dispatchedJob) return;

    const handleJobAssigned = (data) => {
      if (data?.jobId?.toString() === dispatchedJob._id?.toString()) {
        setAssignedPro({
          name: data.vendorName || 'Verified Trade Specialist',
          phone: data.vendorPhone || '',
          avatar: data.vendorAvatar || '',
          agreedPrice: data.finalPrice || 499,
          otp: data.otp || ''
        });
        setBookingInfo({
          bookingId: data.bookingId,
          bookingReference: data.bookingReference
        });
        setDispatchExpired(false);
      }
    };

    const handleJobTaken = () => {
      // General taken broadcast
    };

    socket.on('job_assigned', handleJobAssigned);
    socket.on('job_taken', handleJobTaken);

    return () => {
      socket.off('job_assigned', handleJobAssigned);
      socket.off('job_taken', handleJobTaken);
    };
  }, [socket, dispatchedJob]);

  // Countdown timer for live radar search
  useEffect(() => {
    if (!dispatchedJob || assignedPro || dispatchExpired) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setDispatchExpired(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [dispatchedJob, assignedPro, dispatchExpired]);

  // Cancel Request
  const handleCancel = async () => {
    if (!dispatchedJob?._id) return;
    setCancelling(true);
    try {
      await jobAPI.cancel(dispatchedJob._id, { reason: 'Cancelled by customer' });
      setDispatchedJob(null);
      setAssignedPro(null);
      setDispatchExpired(false);
      setFormError('');
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to cancel request.');
    } finally {
      setCancelling(false);
    }
  };

  // Retry Search
  const handleRetrySearch = async () => {
    if (!dispatchedJob?._id) return;
    setRetrying(true);
    try {
      const res = await jobAPI.retryDispatch(dispatchedJob._id);
      if (res?.success) {
        setDispatchExpired(false);
        setCountdown(90);
        setFormError('');
      } else {
        setFormError(res?.message || 'Could not retry dispatch.');
      }
    } catch (err) {
      setFormError(err.response?.data?.message || 'Could not retry dispatch.');
    } finally {
      setRetrying(false);
    }
  };

  const displayAddress = [
    houseNumber ? `Flat/House ${houseNumber}` : '',
    street,
    locality,
    city
  ].filter(Boolean).join(', ') || 'No address selected';

  // Determine if the selected category is one of the top 8
  const isSelectedInTop8 = FEATURED_CATEGORIES.some(c => c.id === selectedCategory.id);

  // Filtered categories for the modal
  const modalFilteredCategories = ALL_CATEGORIES_CATALOG.filter(c =>
    c.name.toLowerCase().includes(categoryModalSearch.toLowerCase()) ||
    c.matchKeywords?.some(k => k.toLowerCase().includes(categoryModalSearch.toLowerCase()))
  );

  return (
    <div className="min-h-[calc(100vh-65px)] bg-[#F7F9FC] py-3 sm:py-4 px-4 sm:px-6 lg:px-8 flex flex-col justify-center lg:justify-start">
      <div className="max-w-[1340px] w-full mx-auto space-y-3 sm:space-y-3.5">

        {/* ── LIVE REQUEST TRACKING SCREEN (WHEN ACTIVE) ── */}
        {dispatchedJob ? (
          <div className="max-w-2xl mx-auto bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 sm:p-6 space-y-4 my-auto">
            {!assignedPro && !dispatchExpired ? (
              // State A: Finding an available professional...
              <div className="text-center space-y-4 py-2">
                <div className="relative inline-flex items-center justify-center">
                  <span className="animate-ping absolute inline-flex h-16 w-16 rounded-full bg-emerald-400 opacity-25"></span>
                  <div className="relative p-4 bg-emerald-50 text-[#06684F] rounded-full border-2 border-emerald-200 shadow-inner">
                    <Navigation className="w-8 h-8 animate-pulse" />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100/80 text-emerald-900 text-[11px] font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#06684F] animate-ping" />
                    <span>Real-Time Broadcast Active</span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                    Finding an available professional...
                  </h2>
                  <p className="text-xs text-slate-600 max-w-md mx-auto">
                    Alert dispatched to verified <strong className="text-slate-800">{selectedCategory.name}</strong> pros covering <strong className="text-slate-800">{locality || city}</strong>.
                  </p>
                </div>

                {/* Countdown Progress Bar */}
                <div className="max-w-xs mx-auto space-y-1">
                  <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
                    <span>Searching on-duty pros</span>
                    <span className="font-mono font-bold text-slate-800">{countdown}s</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-[#06684F] h-full transition-all duration-1000 ease-linear rounded-full"
                      style={{ width: `${(countdown / 90) * 100}%` }}
                    />
                  </div>
                </div>

                {/* Request Summary Card */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-left text-xs max-w-md mx-auto">
                  <div className="flex items-start gap-3">
                    <img
                      src={getServiceImage(selectedCategory?.name || selectedCategory?.id, dispatchedJob.description)}
                      alt={selectedCategory?.name || 'Emergency Service'}
                      className="w-12 h-12 rounded-lg object-cover shrink-0 border border-slate-200 shadow-2xs mt-0.5"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = '/vite.svg';
                      }}
                    />
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center justify-between border-b border-slate-200/80 pb-1">
                        <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Reference</span>
                        <span className="font-mono font-bold text-slate-800">#{dispatchedJob._id?.slice(-6).toUpperCase()}</span>
                      </div>
                      <div className="flex items-start gap-1.5">
                        <span className="text-slate-500 font-medium w-14 shrink-0 text-[11px]">Problem:</span>
                        <span className="font-semibold text-slate-900 line-clamp-1 text-[11px]">{dispatchedJob.description}</span>
                      </div>
                      <div className="flex items-start gap-1.5">
                        <span className="text-slate-500 font-medium w-14 shrink-0 text-[11px]">Location:</span>
                        <span className="text-slate-700 truncate text-[11px]">{displayAddress}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-center gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={handleCancel}
                    disabled={cancelling}
                    className="px-4 py-2 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition cursor-pointer"
                  >
                    {cancelling ? 'Cancelling...' : 'Cancel Request'}
                  </button>
                  <Link
                    to={`/customer/tracking?jobId=${dispatchedJob._id}`}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition flex items-center gap-1.5"
                  >
                    <span>View in Full Tracker</span>
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            ) : assignedPro ? (
              // State B: Accepted!
              <div className="text-center space-y-4 py-2">
                <div className="inline-flex p-3 bg-emerald-100 text-emerald-700 rounded-full border-2 border-emerald-300">
                  <CheckCircle2 className="w-8 h-8" />
                </div>

                <div className="space-y-0.5">
                  <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold">
                    <Check className="w-3 h-3" />
                    Professional Accepted!
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                    Your Professional is on the way
                  </h2>
                </div>

                {/* Professional Card */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 max-w-md mx-auto text-left space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-lg bg-slate-200 flex items-center justify-center font-bold text-slate-700 text-base overflow-hidden">
                        {assignedPro.avatar ? (
                          <img src={assignedPro.avatar} alt={assignedPro.name} className="w-full h-full object-cover" />
                        ) : (
                          assignedPro.name.charAt(0)
                        )}
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1">
                          {assignedPro.name}
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" title="Verified Professional" />
                        </h3>
                        <p className="text-[11px] text-slate-500">Verified Emergency Specialist</p>
                      </div>
                    </div>

                    {assignedPro.phone && (
                      <a
                        href={`tel:${assignedPro.phone}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition"
                      >
                        <Phone className="w-3 h-3" />
                        <span>Call</span>
                      </a>
                    )}
                  </div>

                  {/* Security OTP Card */}
                  {assignedPro.otp && (
                    <div className="bg-white border-2 border-emerald-300 rounded-lg p-2.5 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                          Service-Start Security Code (OTP)
                        </span>
                        <span className="text-[11px] text-slate-600">Share with pro upon arrival:</span>
                      </div>
                      <span className="font-mono font-black text-xl text-emerald-800 tracking-widest px-2.5 py-0.5 bg-emerald-50 rounded border border-emerald-200">
                        {assignedPro.otp}
                      </span>
                    </div>
                  )}

                  <div className="pt-1.5 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
                    <span>Diagnostic Visit Fee:</span>
                    <strong className="text-slate-900 text-sm">₹{assignedPro.agreedPrice}</strong>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-2 pt-1">
                  <Link
                    to={`/customer/tracking?jobId=${dispatchedJob._id}`}
                    className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#06684F] hover:bg-[#055742] text-white text-xs font-bold shadow-sm transition"
                  >
                    <span>Track Live Job Execution</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ) : (
              // State C: No professional available right now
              <div className="text-center space-y-4 py-2">
                <div className="inline-flex p-3 bg-amber-100 text-amber-700 rounded-full border-2 border-amber-300">
                  <Clock className="w-8 h-8" />
                </div>

                <div className="space-y-0.5">
                  <h2 className="text-xl font-black text-slate-900 tracking-tight">
                    No professional is available right now
                  </h2>
                  <p className="text-xs text-slate-600 max-w-sm mx-auto">
                    Nearby on-duty professionals in {city} are currently on calls or outside working hours.
                  </p>
                </div>

                <div className="flex items-center justify-center gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={handleRetrySearch}
                    disabled={retrying}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#06684F] hover:bg-[#055742] text-white text-xs font-bold shadow-xs transition cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${retrying ? 'animate-spin' : ''}`} />
                    <span>{retrying ? 'Retrying...' : 'Retry Search'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCancel}
                    disabled={cancelling}
                    className="px-4 py-2 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition cursor-pointer"
                  >
                    {cancelling ? 'Cancelling...' : 'Cancel Request'}
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* ── COMPACT ONE-SCREEN TWO-COLUMN EMERGENCY FORM ── */
          <div className="space-y-2.5">
            {formError && (
              <div className="p-2.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2 shadow-2xs">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmitBooking} className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 lg:gap-5 items-start">

              {/* ════ LEFT COLUMN: HEADING, SAFETY, PROBLEM & CATEGORIES (~60% WIDTH) ════ */}
              <div className="lg:col-span-7 space-y-2.5 sm:space-y-3">

                {/* 1. COMPACT HEADER */}
                <div className="space-y-0.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[10px] sm:text-[11px] font-bold">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-ping" />
                      <span>24/7 Priority Emergency Dispatch</span>
                    </div>
                    <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-slate-500 font-semibold">
                      <MapPin className="w-3.5 h-3.5 text-[#06684F]" />
                      <span>Lucknow • Avg &lt; 60s response</span>
                    </div>
                  </div>
                  <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-tight">
                    Need Help Right Now?
                  </h1>
                  <p className="text-xs text-slate-500 leading-normal">
                    Tell us what happened. Available on-duty trade professionals will be alerted instantly.
                  </p>
                </div>

                {/* 2. COMPACT LIFE SAFETY NOTICE */}
                <aside aria-label="Life Safety Notice" className="bg-rose-50/90 border border-rose-200 rounded-xl px-3 py-1.5 flex items-center justify-between gap-2.5 text-[11px] text-rose-900 shadow-2xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                    <p className="leading-snug">
                      <strong className="font-bold text-rose-950">Life Threat or Active Hazard?</strong> In case of fire, gas explosion, or physical peril, immediately call <strong className="font-extrabold text-rose-950">112</strong> or <strong className="font-extrabold text-rose-950">101</strong>.
                    </p>
                  </div>
                  <span className="hidden md:inline-flex shrink-0 px-2 py-0.5 rounded bg-rose-100 text-rose-900 font-bold text-[10px] uppercase tracking-wider">
                    Safety First
                  </span>
                </aside>

                {/* 3. CARD: WHAT'S THE PROBLEM? */}
                <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-3 sm:p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <label htmlFor="emergencyProblem" className="text-xs sm:text-sm font-bold text-slate-900 block">
                      What's the problem? *
                    </label>
                    <span className={`text-[10px] sm:text-[11px] font-mono font-medium ${
                      problemDescription.length >= 10 ? 'text-emerald-700 font-bold' : 'text-slate-400'
                    }`}>
                      {problemDescription.length}/1000 characters
                    </span>
                  </div>

                  <textarea
                    id="emergencyProblem"
                    rows={2}
                    value={problemDescription}
                    onChange={handleDescriptionChange}
                    placeholder="Example: Water pipe burst under kitchen sink flooding floor, power tripping repeatedly, or burning smell from board..."
                    className="w-full h-[72px] sm:h-[80px] px-3 py-2 rounded-lg border border-slate-300 focus:border-[#06684F] focus:ring-2 focus:ring-[#06684F]/15 text-slate-900 text-xs sm:text-sm transition outline-none resize-none leading-relaxed placeholder:text-slate-400 bg-white"
                    required
                  />

                  {/* Common Issue Shortcuts */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Common Issues (Tap to fill):
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {QUICK_SYMPTOMS.map((symptom) => (
                        <button
                          key={symptom.label}
                          type="button"
                          onClick={() => handleQuickSymptomClick(symptom)}
                          className="px-2 py-0.5 rounded-md text-[10px] sm:text-[11px] font-medium border border-slate-200 bg-slate-50 hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-800 text-slate-700 transition cursor-pointer"
                        >
                          {symptom.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 4. CARD: SERVICE CATEGORIES (BALANCED 3x3 GRID WITH ZERO GAPS & FULL 30-CATEGORY ACCESS) */}
                <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-3 sm:p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                        Service Category *
                      </h3>
                      <p className="text-[10px] sm:text-[11px] text-slate-500">
                        Select a category below or explore all 30 trade services
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] sm:text-[11px] font-bold text-[#06684F] bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        {selectedCategory.name} Selected
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowCategoryModal(true)}
                        className="text-[10px] sm:text-[11px] font-bold text-[#06684F] hover:text-[#055742] hover:underline flex items-center gap-1 bg-emerald-50/70 hover:bg-emerald-100/70 px-2 py-0.5 rounded-full border border-emerald-200 transition cursor-pointer"
                      >
                        <LayoutGrid className="w-3 h-3" />
                        <span>All 30 Services</span>
                      </button>
                    </div>
                  </div>

                  {/* Balanced 3-Column Grid (3 rows x 3 cols = exactly 9 cards, zero gaps) */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 sm:gap-2">
                    {/* Top 8 Featured Categories */}
                    {FEATURED_CATEGORIES.map((cat) => {
                      const isSelected = selectedCategory.id === cat.id;
                      const media = getCategoryMedia(cat.id);
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setSelectedCategory(cat)}
                          className={`flex items-center gap-2 p-1.5 sm:p-2 rounded-lg border text-left transition relative group overflow-hidden cursor-pointer ${
                            isSelected
                              ? 'border-[#06684F] bg-emerald-50/70 text-[#06684F] ring-1 ring-[#06684F]/30 shadow-2xs'
                              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300'
                          }`}
                        >
                          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-md overflow-hidden shrink-0 bg-slate-100 border border-slate-200/70 shadow-2xs">
                            <img
                              src={media.image}
                              alt={media.alt || cat.name}
                              onError={handleImageFallback}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              loading="lazy"
                            />
                          </div>
                          <div className="flex-1 min-w-0 pr-1">
                            <span className={`text-[11px] sm:text-xs font-bold block leading-tight truncate ${
                              isSelected ? 'text-[#06684F]' : 'text-slate-800'
                            }`}>
                              {cat.name}
                            </span>
                            <span className="text-[9px] sm:text-[10px] text-slate-400 font-medium block">
                              24/7 Available
                            </span>
                          </div>
                          {isSelected && (
                            <div className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full bg-[#06684F] text-white flex items-center justify-center shadow-2xs">
                              <Check className="w-2 h-2 stroke-[3]" />
                            </div>
                          )}
                        </button>
                      );
                    })}

                    {/* 9th Card: Custom Selected Category OR "More Categories (+22)" Trigger */}
                    {!isSelectedInTop8 ? (
                      // A custom category from the 30-category catalog is currently active!
                      <button
                        type="button"
                        onClick={() => setShowCategoryModal(true)}
                        className="flex items-center gap-2 p-1.5 sm:p-2 rounded-lg border text-left transition relative group overflow-hidden cursor-pointer border-[#06684F] bg-emerald-50/70 text-[#06684F] ring-1 ring-[#06684F]/30 shadow-2xs"
                      >
                        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-md overflow-hidden shrink-0 bg-slate-100 border border-slate-200/70 shadow-2xs">
                          <img
                            src={getCategoryMedia(selectedCategory.id).image}
                            alt={selectedCategory.name}
                            onError={handleImageFallback}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            loading="lazy"
                          />
                        </div>
                        <div className="flex-1 min-w-0 pr-1">
                          <span className="text-[11px] sm:text-xs font-bold block leading-tight truncate text-[#06684F]">
                            {selectedCategory.name}
                          </span>
                          <span className="text-[9px] sm:text-[10px] text-emerald-700 font-bold block">
                            Tap to Change ↻
                          </span>
                        </div>
                        <div className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full bg-[#06684F] text-white flex items-center justify-center shadow-2xs">
                          <Check className="w-2 h-2 stroke-[3]" />
                        </div>
                      </button>
                    ) : (
                      // Standard 9th card: Opens the full 30-category modal
                      <button
                        type="button"
                        onClick={() => setShowCategoryModal(true)}
                        className="flex items-center gap-2 p-1.5 sm:p-2 rounded-lg border border-dashed border-slate-300 hover:border-[#06684F] bg-slate-50/80 hover:bg-emerald-50/50 text-left transition group overflow-hidden cursor-pointer"
                      >
                        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-md overflow-hidden shrink-0 bg-white border border-slate-200/80 flex items-center justify-center text-[#06684F] shadow-2xs group-hover:bg-[#06684F] group-hover:text-white transition">
                          <LayoutGrid className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0 pr-1">
                          <span className="text-[11px] sm:text-xs font-bold block leading-tight truncate text-slate-800 group-hover:text-[#06684F]">
                            More Services
                          </span>
                          <span className="text-[9px] sm:text-[10px] text-slate-500 font-medium block">
                            +22 More Categories
                          </span>
                        </div>
                      </button>
                    )}
                  </div>
                </div>

              </div>

              {/* ════ RIGHT COLUMN: LOCATION, PHONE, SUMMARY & SUBMIT CTA (~40% WIDTH) ════ */}
              <div className="lg:col-span-5 space-y-2.5 sm:space-y-3">

                {/* 1. CARD: SERVICE LOCATION & CONTACT */}
                <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-3 sm:p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                        Service Location *
                      </h3>
                      <p className="text-[10px] sm:text-[11px] text-slate-500">
                        Where should the technician report?
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleDetectGPS}
                      disabled={detectingGps}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-[#06684F] hover:text-[#055742] bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 transition cursor-pointer"
                    >
                      {detectingGps ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Navigation className="w-3 h-3" />
                      )}
                      <span>{detectingGps ? 'Locating...' : 'Use My GPS'}</span>
                    </button>
                  </div>

                  {gpsStatus && (
                    <div className="p-1.5 rounded-md bg-emerald-50/70 border border-emerald-200 text-[11px] text-emerald-900 flex items-center gap-1.5">
                      <Compass className="w-3 h-3 text-[#06684F] shrink-0" />
                      <span className="truncate">{gpsStatus}</span>
                    </div>
                  )}

                  {/* Saved Locations Selector */}
                  {savedAddresses.length > 0 && (
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Saved Locations:
                      </span>
                      <div className="flex flex-wrap items-center gap-1">
                        {savedAddresses.map((addr, idx) => {
                          const isSelected = selectedAddressId === (addr._id || 'saved');
                          const label = addr.label || addr.addressType || (addr.locality ? `${addr.locality}` : `Address ${idx + 1}`);
                          return (
                            <button
                              key={addr._id || idx}
                              type="button"
                              onClick={() => applySavedAddress(addr)}
                              className={`px-2 py-0.5 rounded-md text-[10px] sm:text-[11px] font-semibold border transition flex items-center gap-1 cursor-pointer ${
                                isSelected
                                  ? 'border-[#06684F] bg-emerald-50 text-[#06684F] ring-1 ring-[#06684F]'
                                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300'
                              }`}
                            >
                              <MapPin className="w-2.5 h-2.5 shrink-0" />
                              <span>{label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Selected Address Display Box */}
                  <div className="p-2 rounded-lg border border-slate-200 bg-slate-50 flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2 min-w-0">
                      <MapPin className="w-3.5 h-3.5 text-[#06684F] shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-slate-900 block truncate">
                          {displayAddress}
                        </span>
                        <span className="text-[10px] text-slate-400 block truncate">
                          Exact street is private until contractor accepts
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowAddressEditor(!showAddressEditor)}
                      className="text-xs font-bold text-[#06684F] hover:underline shrink-0 flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-emerald-50 cursor-pointer"
                    >
                      <Edit2 className="w-2.5 h-2.5" />
                      <span>{showAddressEditor ? 'Close' : 'Change'}</span>
                    </button>
                  </div>

                  {/* Address Editor Form */}
                  {showAddressEditor && (
                    <div className="p-2.5 bg-slate-100/90 border border-slate-200 rounded-lg space-y-1.5">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label htmlFor="modalHouseNumber" className="text-[10px] font-bold text-slate-600 block mb-0.5">
                            House / Flat No.
                          </label>
                          <input
                            id="modalHouseNumber"
                            type="text"
                            value={houseNumber}
                            onChange={(e) => setHouseNumber(e.target.value)}
                            placeholder="Flat 302"
                            className="w-full px-2 py-1 rounded-md border border-slate-300 text-xs text-slate-900 outline-none focus:border-[#06684F] bg-white"
                          />
                        </div>
                        <div>
                          <label htmlFor="modalStreet" className="text-[10px] font-bold text-slate-600 block mb-0.5">
                            Street / Area *
                          </label>
                          <input
                            id="modalStreet"
                            type="text"
                            value={street}
                            onChange={(e) => setStreet(e.target.value)}
                            placeholder="Near Apollo"
                            className="w-full px-2 py-1 rounded-md border border-slate-300 text-xs text-slate-900 outline-none focus:border-[#06684F] bg-white"
                            required
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label htmlFor="modalLocality" className="text-[10px] font-bold text-slate-600 block mb-0.5">
                            Locality *
                          </label>
                          <input
                            id="modalLocality"
                            type="text"
                            value={locality}
                            onChange={(e) => setLocality(e.target.value)}
                            placeholder="Gomti Nagar"
                            className="w-full px-2 py-1 rounded-md border border-slate-300 text-xs text-slate-900 outline-none focus:border-[#06684F] bg-white"
                            required
                          />
                        </div>
                        <div>
                          <label htmlFor="modalCity" className="text-[10px] font-bold text-slate-600 block mb-0.5">
                            City *
                          </label>
                          <input
                            id="modalCity"
                            type="text"
                            value={city}
                            onChange={(e) => setCity(e.target.value)}
                            placeholder="Lucknow"
                            className="w-full px-2 py-1 rounded-md border border-slate-300 text-xs text-slate-900 font-bold outline-none focus:border-[#06684F] bg-white"
                            required
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Contact Phone */}
                  <div className="space-y-1 pt-1 border-t border-slate-100">
                    <label htmlFor="emergencyPhone" className="text-[11px] font-bold text-slate-700 block">
                      Your Phone Number (for coordination) *
                    </label>
                    <div className="relative">
                      <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        id="emergencyPhone"
                        type="tel"
                        value={contactPhone}
                        onChange={(e) => setContactPhone(e.target.value)}
                        placeholder="e.g. 9876543210"
                        className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 focus:border-[#06684F] focus:ring-1 focus:ring-[#06684F]/20 text-slate-900 text-xs sm:text-sm outline-none font-medium bg-white"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* 2. CARD: REQUEST SUMMARY & SUBMIT CTA */}
                <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-3 sm:p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                      Request Summary
                    </h3>
                    <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                      Emergency Priority
                    </span>
                  </div>

                  {/* Selected Category & Description Preview */}
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg overflow-hidden shrink-0 border border-slate-200 bg-slate-100 shadow-2xs">
                        <img
                          src={getCategoryMedia(selectedCategory.id).image}
                          alt={selectedCategory.name}
                          onError={handleImageFallback}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-900 text-xs sm:text-sm block truncate">{selectedCategory.name}</span>
                          <button
                            type="button"
                            onClick={() => setShowCategoryModal(true)}
                            className="text-[10px] text-[#06684F] hover:underline font-semibold shrink-0 cursor-pointer"
                          >
                            (Change)
                          </button>
                        </div>
                        <span className="text-slate-500 text-[10px] sm:text-[11px] block truncate">
                          {problemDescription ? problemDescription : 'Describe your problem on the left'}
                        </span>
                      </div>
                    </div>

                    <div className="p-2 rounded-lg bg-slate-50 border border-slate-200/80 space-y-1 text-[11px]">
                      <div className="flex items-center justify-between text-slate-600">
                        <span>Service Area:</span>
                        <strong className="text-slate-900 font-semibold">{locality || city || 'Lucknow'}</strong>
                      </div>
                      <div className="flex items-center justify-between text-slate-600">
                        <span>Diagnostic Visit Fee:</span>
                        <strong className="text-emerald-700 font-bold text-xs">₹499</strong>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5 border-t border-slate-200/60">
                        <span>Payment:</span>
                        <span>Paid on arrival after inspection</span>
                      </div>
                    </div>
                  </div>

                  {/* Guest demo login notice */}
                  {!user && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 text-xs space-y-1">
                      <div className="flex items-center gap-1.5 text-amber-900 font-bold text-[10px] sm:text-[11px]">
                        <AlertCircle className="w-3 h-3 text-amber-600 shrink-0" />
                        <span>Sign in required to dispatch</span>
                      </div>
                      <button
                        type="button"
                        onClick={handleQuickDemoLogin}
                        disabled={isLoggingInDemo}
                        className="w-full py-1.5 px-3 rounded-md bg-amber-600 hover:bg-amber-700 text-white font-bold text-[10px] sm:text-[11px] transition cursor-pointer"
                      >
                        {isLoggingInDemo ? 'Signing in...' : 'Continue as Demo Customer'}
                      </button>
                    </div>
                  )}

                  {/* Main CTA Button */}
                  <div className="space-y-1 pt-0.5">
                    <button
                      type="submit"
                      disabled={submitting || (!user && !isLoggingInDemo)}
                      className="w-full py-2.5 sm:py-3 px-4 rounded-xl bg-[#06684F] hover:bg-[#055742] focus:ring-4 focus:ring-emerald-200 text-white font-bold text-sm sm:text-base shadow-sm hover:shadow transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Broadcasting Request...</span>
                        </>
                      ) : (
                        <>
                          <Zap className="w-4 h-4 fill-white" />
                          <span>Find Available Professional</span>
                        </>
                      )}
                    </button>

                    <p className="text-center text-[10px] text-slate-500">
                      Average response: <strong className="text-slate-800">Under 60 seconds</strong> • No charges until pro arrives
                    </p>
                  </div>
                </div>

              </div>

            </form>
          </div>
        )}

      </div>

      {/* ── 30-CATEGORY SELECTION MODAL ── */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full p-4 sm:p-5 space-y-3.5 max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-[#06684F] flex items-center justify-center border border-emerald-200">
                  <LayoutGrid className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900">
                    Choose Service Category
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Select from all 30 WorkLogy trade services for emergency dispatch
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowCategoryModal(false);
                  setCategoryModalSearch('');
                }}
                className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-700 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Search Input */}
            <div className="relative shrink-0">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={categoryModalSearch}
                onChange={(e) => setCategoryModalSearch(e.target.value)}
                placeholder="Search categories (e.g., Pest, CCTV, Painting, Cleaning, Vehicle, Handyman)..."
                className="w-full pl-9 pr-8 py-2 rounded-xl border border-slate-300 focus:border-[#06684F] focus:ring-2 focus:ring-[#06684F]/15 text-slate-900 text-xs sm:text-sm outline-none bg-slate-50/50"
                autoFocus
              />
              {categoryModalSearch && (
                <button
                  type="button"
                  onClick={() => setCategoryModalSearch('')}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 text-xs"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Categories Scrollable Grid */}
            <div className="flex-1 overflow-y-auto pr-1">
              {modalFilteredCategories.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {modalFilteredCategories.map((cat) => {
                    const isSelected = selectedCategory.id === cat.id;
                    const media = getCategoryMedia(cat.id);
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => {
                          setSelectedCategory(cat);
                          setShowCategoryModal(false);
                          setCategoryModalSearch('');
                        }}
                        className={`flex items-center gap-2 p-2 rounded-xl border text-left transition relative group overflow-hidden cursor-pointer ${
                          isSelected
                            ? 'border-[#06684F] bg-emerald-50/70 text-[#06684F] ring-1 ring-[#06684F]/30 shadow-xs'
                            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300'
                        }`}
                      >
                        <div className="w-9 h-9 rounded-lg overflow-hidden shrink-0 bg-slate-100 border border-slate-200/70 shadow-2xs">
                          <img
                            src={media.image}
                            alt={media.alt || cat.name}
                            onError={handleImageFallback}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            loading="lazy"
                          />
                        </div>
                        <div className="flex-1 min-w-0 pr-1">
                          <span className={`text-[11px] sm:text-xs font-bold block leading-tight truncate ${
                            isSelected ? 'text-[#06684F]' : 'text-slate-800'
                          }`}>
                            {cat.name}
                          </span>
                          <span className="text-[9px] text-slate-400 font-medium block">
                            24/7 Available
                          </span>
                        </div>
                        {isSelected && (
                          <div className="absolute top-1.5 right-1.5 w-3.5 h-3.5 rounded-full bg-[#06684F] text-white flex items-center justify-center shadow-2xs">
                            <Check className="w-2 h-2 stroke-[3]" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="py-8 text-center space-y-2">
                  <p className="text-xs text-slate-500">
                    No categories found matching "{categoryModalSearch}".
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      const otherCat = ALL_CATEGORIES_CATALOG.find(c => c.id === 'other-services');
                      if (otherCat) setSelectedCategory(otherCat);
                      setShowCategoryModal(false);
                      setCategoryModalSearch('');
                    }}
                    className="px-3 py-1.5 rounded-lg bg-[#06684F] text-white text-xs font-bold transition"
                  >
                    Select "Other Urgent Repairs"
                  </button>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 shrink-0">
              <span>Showing {modalFilteredCategories.length} of {ALL_CATEGORIES_CATALOG.length} categories</span>
              <button
                type="button"
                onClick={() => {
                  setShowCategoryModal(false);
                  setCategoryModalSearch('');
                }}
                className="px-3 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
