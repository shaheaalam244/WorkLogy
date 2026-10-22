import React, { useState, useEffect } from 'react';
import { 
  User, 
  Building, 
  MapPin, 
  DollarSign, 
  ShieldCheck, 
  CheckCircle2, 
  AlertCircle, 
  Save, 
  Eye,
  Plus,
  Edit2,
  Trash2,
  Zap,
  Clock,
  Wrench,
  Check,
  X,
  Layers,
  ChevronDown,
  Navigation
} from 'lucide-react';
import Button from '../../components/common/Button';
import Loader from '../../components/common/Loader';
import { vendorAPI } from '../../api/vendor.api';
import { categoryAPI } from '../../api/category.api';
import { useAuth } from '../../hooks/useAuth';
import { formatCurrency } from '../../utils/formatters';

// Common Lucknow localities for quick selection
const LUCKNOW_LOCALITIES = [
  'Gomti Nagar',
  'Indira Nagar',
  'Hazratganj',
  'Aliganj',
  'Mahanagar',
  'Ashiyana',
  'Rajajipuram',
  'Vikas Nagar',
  'Jankipuram',
  'All Localities'
];

export default function VendorProfile() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [savingBusiness, setSavingBusiness] = useState(false);
  const [savingEmergency, setSavingEmergency] = useState(false);
  const [savingServices, setSavingServices] = useState(false);

  const [vendorId, setVendorId] = useState('');
  const [categories, setCategories] = useState([]);
  const [successMsg, setSuccessMsg] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  // Section A: Business Information
  const [businessData, setBusinessData] = useState({
    businessName: '',
    tagline: '',
    bio: '',
    hourlyRate: 500,
    experienceYears: 5,
    city: 'Lucknow'
  });

  // Section B: My Skills & Services
  const [services, setServices] = useState([]);
  const [serviceModalOpen, setServiceModalOpen] = useState(false);
  const [editingServiceIndex, setEditingServiceIndex] = useState(null);
  const [serviceForm, setServiceForm] = useState({
    category: '',
    categoryName: '',
    title: '',
    description: '',
    pricingType: 'fixed',
    price: 499,
    duration: '1 - 2 hours',
    experienceYears: 3,
    serviceArea: 'All Localities',
    isActive: true
  });
  const [serviceFormError, setServiceFormError] = useState('');

  // Section C: Emergency Availability
  const [emergencyData, setEmergencyData] = useState({
    isAvailable: false,
    categories: [], // IDs
    categoryNames: [], // Names
    serviceAreas: ['All Localities'],
    hours: {
      start: '08:00',
      end: '22:00',
      is24x7: true
    },
    maxDistanceKm: 15,
    callOutFee: 499
  });

  // Load initial data
  useEffect(() => {
    let isMounted = true;
    const fetchInitialData = async () => {
      try {
        setLoading(true);
        const [profileRes, catRes] = await Promise.allSettled([
          vendorAPI.getProfile(),
          categoryAPI.getAll()
        ]);

        if (!isMounted) return;

        let loadedCategories = [];
        if (catRes.status === 'fulfilled' && catRes.value?.categories) {
          loadedCategories = catRes.value.categories;
          setCategories(loadedCategories);
        }

        if (profileRes.status === 'fulfilled' && profileRes.value?.vendor) {
          const v = profileRes.value.vendor;
          setVendorId(v._id || '');

          setBusinessData({
            businessName: v.businessName || '',
            tagline: v.tagline || '',
            bio: v.bio || '',
            hourlyRate: v.hourlyRate || 500,
            experienceYears: v.experienceYears || 5,
            city: v.city || 'Lucknow'
          });

          if (Array.isArray(v.services) && v.services.length > 0) {
            setServices(v.services);
          }

          if (v.emergencyAvailability) {
            const ea = v.emergencyAvailability;
            const categoryIds = (ea.categories || []).map(c => (c?._id || c).toString());
            const categoryNames = ea.categoryNames && ea.categoryNames.length > 0
              ? ea.categoryNames
              : (ea.categories || []).map(c => c?.name).filter(Boolean);

            setEmergencyData({
              isAvailable: Boolean(ea.isAvailable),
              categories: categoryIds,
              categoryNames: categoryNames,
              serviceAreas: ea.serviceAreas?.length > 0 ? ea.serviceAreas : ['All Localities'],
              hours: {
                start: ea.hours?.start || '08:00',
                end: ea.hours?.end || '22:00',
                is24x7: ea.hours?.is24x7 !== false
              },
              maxDistanceKm: ea.maxDistanceKm || 15,
              callOutFee: ea.callOutFee != null ? ea.callOutFee : 499
            });
          }
        }
      } catch (err) {
        console.error('Error fetching vendor data:', err);
        setErrorMsg('Failed to load profile data.');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchInitialData();
    return () => { isMounted = false; };
  }, []);

  // Display feedback banner helper
  const showToast = (msg, isError = false) => {
    if (isError) {
      setErrorMsg(msg);
      setTimeout(() => setErrorMsg(null), 4000);
    } else {
      setSuccessMsg(msg);
      setTimeout(() => setSuccessMsg(null), 4000);
    }
  };

  // --------------------------------------------------------------------------
  // SECTION A: Save Business Information
  // --------------------------------------------------------------------------
  const handleSaveBusiness = async (e) => {
    e.preventDefault();
    if (!businessData.businessName.trim()) {
      showToast('Business or Contractor Name is required.', true);
      return;
    }

    try {
      setSavingBusiness(true);
      setErrorMsg(null);
      const res = await vendorAPI.updateProfile({
        businessName: businessData.businessName.trim(),
        tagline: businessData.tagline.trim(),
        bio: businessData.bio.trim(),
        hourlyRate: Number(businessData.hourlyRate) || 500,
        experienceYears: Number(businessData.experienceYears) || 1,
        city: businessData.city.trim() || 'Lucknow'
      });

      if (res?.success) {
        showToast('Business information saved successfully.');
      }
    } catch (err) {
      console.error('Failed to save business info:', err);
      showToast('Failed to save business information.', true);
    } finally {
      setSavingBusiness(false);
    }
  };

  // --------------------------------------------------------------------------
  // SECTION B: Skills & Services Handlers
  // --------------------------------------------------------------------------
  const openAddServiceModal = () => {
    setEditingServiceIndex(null);
    const defaultCat = categories[0];
    setServiceForm({
      category: defaultCat?._id || '',
      categoryName: defaultCat?.name || 'General Services',
      title: '',
      description: '',
      pricingType: 'fixed',
      price: 499,
      duration: '1 - 2 hours',
      experienceYears: businessData.experienceYears || 3,
      serviceArea: 'All Localities',
      isActive: true
    });
    setServiceFormError('');
    setServiceModalOpen(true);
  };

  const openEditServiceModal = (index) => {
    const s = services[index];
    setEditingServiceIndex(index);
    setServiceForm({
      category: (s.category?._id || s.category || categories[0]?._id || ''),
      categoryName: s.categoryName || s.category?.name || 'General Services',
      title: s.title || '',
      description: s.description || '',
      pricingType: s.pricingType || 'fixed',
      price: s.price != null ? s.price : 499,
      duration: s.duration || '1 - 2 hours',
      experienceYears: s.experienceYears || 3,
      serviceArea: s.serviceArea || 'All Localities',
      isActive: s.isActive !== false
    });
    setServiceFormError('');
    setServiceModalOpen(true);
  };

  const handleServiceFormSubmit = async (e) => {
    e.preventDefault();
    setServiceFormError('');

    const titleTrimmed = serviceForm.title.trim();
    if (!titleTrimmed) {
      setServiceFormError('Please enter a specific skill or service name.');
      return;
    }

    // Check duplicate service name (case-insensitive)
    const isDuplicate = services.some((s, idx) => {
      if (editingServiceIndex !== null && idx === editingServiceIndex) return false;
      return s.title.toLowerCase().trim() === titleTrimmed.toLowerCase();
    });

    if (isDuplicate) {
      setServiceFormError('You have already added a service with this name.');
      return;
    }

    const priceNum = Number(serviceForm.price);
    if (serviceForm.pricingType !== 'quote' && (isNaN(priceNum) || priceNum <= 0)) {
      setServiceFormError('Please enter a valid price greater than 0.');
      return;
    }

    // Selected category object
    const catObj = categories.find(c => c._id === serviceForm.category);
    const catName = catObj?.name || serviceForm.categoryName || 'General Services';

    const newServiceItem = {
      category: serviceForm.category || catObj?._id,
      categoryName: catName,
      title: titleTrimmed,
      description: serviceForm.description.trim(),
      pricingType: serviceForm.pricingType,
      price: serviceForm.pricingType === 'quote' ? 0 : priceNum,
      duration: serviceForm.duration.trim() || '1 - 2 hours',
      experienceYears: Number(serviceForm.experienceYears) || 1,
      serviceArea: serviceForm.serviceArea.trim() || 'All Localities',
      isActive: serviceForm.isActive
    };

    let updatedList = [...services];
    if (editingServiceIndex !== null) {
      updatedList[editingServiceIndex] = { ...updatedList[editingServiceIndex], ...newServiceItem };
    } else {
      updatedList.push(newServiceItem);
    }

    try {
      setSavingServices(true);
      const res = await vendorAPI.updateProfile({ services: updatedList });
      if (res?.success) {
        setServices(res.vendor?.services || updatedList);
        setServiceModalOpen(false);
        showToast(
          editingServiceIndex !== null 
            ? 'Service updated successfully.' 
            : 'New service added to your profile.'
        );
      }
    } catch (err) {
      console.error('Failed to save service:', err);
      setServiceFormError('Failed to save service. Please check your connection.');
    } finally {
      setSavingServices(false);
    }
  };

  const handleToggleServiceActive = async (index) => {
    const updated = services.map((s, idx) => {
      if (idx === index) {
        return { ...s, isActive: !s.isActive };
      }
      return s;
    });

    setServices(updated);
    try {
      const res = await vendorAPI.updateProfile({ services: updated });
      if (res?.success) {
        showToast(`Service "${services[index].title}" ${!services[index].isActive ? 'enabled' : 'disabled'}.`);
      }
    } catch (err) {
      console.error('Failed to toggle service:', err);
      showToast('Failed to update service status.', true);
    }
  };

  const handleRemoveService = async (index) => {
    const confirmed = window.confirm(`Remove "${services[index].title}" from your profile?`);
    if (!confirmed) return;

    const updated = services.filter((_, idx) => idx !== index);
    setServices(updated);

    try {
      const res = await vendorAPI.updateProfile({ services: updated });
      if (res?.success) {
        showToast('Service removed successfully.');
      }
    } catch (err) {
      console.error('Failed to remove service:', err);
      showToast('Failed to remove service.', true);
    }
  };

  // --------------------------------------------------------------------------
  // SECTION C: Emergency Availability Handlers
  // --------------------------------------------------------------------------
  const handleToggleEmergencyActive = () => {
    setEmergencyData(prev => ({
      ...prev,
      isAvailable: !prev.isAvailable
    }));
  };

  const handleToggleEmergencyCategory = (cat) => {
    const catId = cat._id.toString();
    const catName = cat.name;

    setEmergencyData(prev => {
      const isSelected = prev.categories.includes(catId);
      const nextIds = isSelected 
        ? prev.categories.filter(id => id !== catId)
        : [...prev.categories, catId];

      const nextNames = isSelected
        ? prev.categoryNames.filter(name => name !== catName)
        : [...prev.categoryNames, catName];

      return {
        ...prev,
        categories: nextIds,
        categoryNames: nextNames
      };
    });
  };

  const handleToggleEmergencyArea = (area) => {
    setEmergencyData(prev => {
      const isSelected = prev.serviceAreas.includes(area);
      const nextAreas = isSelected
        ? prev.serviceAreas.filter(a => a !== area)
        : [...prev.serviceAreas, area];

      return {
        ...prev,
        serviceAreas: nextAreas.length > 0 ? nextAreas : ['All Localities']
      };
    });
  };

  const handleSaveEmergencyAvailability = async (e) => {
    e.preventDefault();
    try {
      setSavingEmergency(true);
      setErrorMsg(null);

      const payload = {
        emergencyAvailability: {
          isAvailable: emergencyData.isAvailable,
          categories: emergencyData.categories,
          categoryNames: emergencyData.categoryNames,
          serviceAreas: emergencyData.serviceAreas,
          hours: {
            start: emergencyData.hours.start || '08:00',
            end: emergencyData.hours.end || '22:00',
            is24x7: emergencyData.hours.is24x7
          },
          maxDistanceKm: Number(emergencyData.maxDistanceKm) || 15,
          callOutFee: Number(emergencyData.callOutFee) || 499
        }
      };

      const res = await vendorAPI.updateProfile(payload);
      if (res?.success) {
        showToast(
          emergencyData.isAvailable
            ? 'Emergency availability is ON. You will receive matching emergency jobs!'
            : 'Emergency availability turned OFF. Emergency invitations paused.'
        );
      }
    } catch (err) {
      console.error('Failed to save emergency availability:', err);
      showToast('Failed to save emergency availability.', true);
    } finally {
      setSavingEmergency(false);
    }
  };

  if (loading) {
    return <div className="py-20"><Loader text="Loading your vendor profile..." /></div>;
  }

  const publicProfileUrl = vendorId ? `/professionals/${vendorId}` : '/professionals';

  return (
    <div className="w-full space-y-8 pb-12">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider block">
            Vendor Portal
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-0.5">
            My Business Profile
          </h1>
          <p className="text-xs text-slate-600 mt-1">
            Manage your contractor details, offered skills & services, and emergency dispatch availability.
          </p>
        </div>

        <a 
          href={publicProfileUrl} 
          target="_blank" 
          rel="noreferrer"
          className="inline-flex items-center gap-2 text-xs font-bold text-emerald-800 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 px-4 py-2.5 rounded-xl border border-emerald-200 transition shadow-xs"
        >
          <Eye className="w-4 h-4" /> View Public Profile
        </a>
      </div>

      {/* ── Feedback Banners ── */}
      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-medium flex items-center gap-2.5 shadow-xs animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-700" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs font-medium flex items-center gap-2.5 shadow-xs animate-in fade-in">
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────
          SECTION A: BUSINESS INFORMATION
      ─────────────────────────────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 shadow-xs rounded-3xl p-6 sm:p-8 space-y-6">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center font-bold">
              <Building className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">Business Information</h2>
              <p className="text-xs text-slate-500">Your core contractor profile shown to property owners across Lucknow.</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSaveBusiness} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Business or Contractor Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={businessData.businessName}
                onChange={(e) => setBusinessData({ ...businessData, businessName: e.target.value })}
                className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-semibold focus:outline-none focus:border-emerald-700 shadow-xs"
                placeholder="e.g. Apex Master Technical Services"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Business Tagline
              </label>
              <input
                type="text"
                value={businessData.tagline}
                onChange={(e) => setBusinessData({ ...businessData, tagline: e.target.value })}
                className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-emerald-700 shadow-xs"
                placeholder="e.g. Verified Electricians, Plumbers & Rapid HVAC Diagnostics"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Professional Bio & Credentials
            </label>
            <textarea
              rows="3"
              value={businessData.bio}
              onChange={(e) => setBusinessData({ ...businessData, bio: e.target.value })}
              className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-emerald-700 shadow-xs"
              placeholder="Describe your qualifications, certifications, team background, and quality commitments..."
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Standard Hourly Rate (₹)
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 text-xs font-bold">
                  ₹
                </span>
                <input
                  type="number"
                  min="0"
                  value={businessData.hourlyRate}
                  onChange={(e) => setBusinessData({ ...businessData, hourlyRate: Number(e.target.value) })}
                  className="w-full pl-8 bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-bold focus:outline-none focus:border-emerald-700 shadow-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Years of Experience
              </label>
              <input
                type="number"
                min="0"
                max="60"
                value={businessData.experienceYears}
                onChange={(e) => setBusinessData({ ...businessData, experienceYears: Number(e.target.value) })}
                className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-semibold focus:outline-none focus:border-emerald-700 shadow-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Primary City
              </label>
              <input
                type="text"
                value={businessData.city}
                onChange={(e) => setBusinessData({ ...businessData, city: e.target.value })}
                className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-semibold focus:outline-none focus:border-emerald-700 shadow-xs"
              />
            </div>
          </div>

          <div className="flex justify-end pt-3 border-t border-slate-100">
            <Button
              type="submit"
              variant="primary"
              size="md"
              icon={Save}
              disabled={savingBusiness}
            >
              {savingBusiness ? 'Saving Changes...' : 'Save Business Information'}
            </Button>
          </div>
        </form>
      </div>

      {/* ───────────────────────────────────────────────────────────────────
          SECTION B: MY SKILLS & SERVICES
      ─────────────────────────────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 shadow-xs rounded-3xl p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center font-bold">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-900">My Skills & Services</h2>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-100 text-emerald-800">
                  {services.length} Added
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Add every trade skill you can perform. Customers see these on your public profile before booking.
              </p>
            </div>
          </div>

          <Button
            type="button"
            variant="primary"
            size="sm"
            icon={Plus}
            onClick={openAddServiceModal}
          >
            Add a Service
          </Button>
        </div>

        {/* Services List / Cards */}
        {services.length === 0 ? (
          <div className="p-8 text-center rounded-2xl border-2 border-dashed border-slate-200 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto">
              <Wrench className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-slate-800">No Services Added Yet</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Showcase your skills, pricing, and coverage. Add electrical, plumbing, HVAC, or appliance services to get matched with customers.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              icon={Plus}
              onClick={openAddServiceModal}
            >
              Add Your First Service
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {services.map((srv, idx) => (
              <div 
                key={srv._id || idx} 
                className={`p-4 rounded-2xl border transition-all ${
                  srv.isActive !== false 
                    ? 'bg-white border-slate-200 hover:border-emerald-300 shadow-2xs' 
                    : 'bg-slate-50/70 border-slate-200 opacity-70'
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="space-y-1 min-w-0">
                    <span className="inline-block px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider bg-slate-100 text-slate-700">
                      {srv.categoryName || 'General Trade'}
                    </span>
                    <h3 className="text-sm font-bold text-slate-900 truncate">
                      {srv.title}
                    </h3>
                  </div>

                  {/* Toggle Active Pill */}
                  <button
                    type="button"
                    onClick={() => handleToggleServiceActive(idx)}
                    title={srv.isActive !== false ? 'Click to disable' : 'Click to enable'}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold transition ${
                      srv.isActive !== false
                        ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                        : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${srv.isActive !== false ? 'bg-emerald-600' : 'bg-slate-400'}`} />
                    {srv.isActive !== false ? 'Active' : 'Disabled'}
                  </button>
                </div>

                {srv.description && (
                  <p className="text-xs text-slate-600 line-clamp-2 mb-3 leading-relaxed">
                    {srv.description}
                  </p>
                )}

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-[11px] text-slate-600 mb-3">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Pricing</span>
                    <strong className="text-emerald-800 font-extrabold text-xs">
                      {srv.pricingType === 'quote' 
                        ? 'Inspection Quote' 
                        : srv.pricingType === 'hourly'
                        ? `₹${srv.price}/hr`
                        : `₹${srv.price}`}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Experience</span>
                    <span className="font-semibold text-slate-700">{srv.experienceYears || 3} Years</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Area</span>
                    <span className="font-semibold text-slate-700 truncate block">{srv.serviceArea || 'All Localities'}</span>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => openEditServiceModal(idx)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-emerald-800 px-2.5 py-1 rounded-lg hover:bg-slate-100 transition"
                  >
                    <Edit2 className="w-3.5 h-3.5" /> Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemoveService(idx)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600 hover:text-rose-800 px-2.5 py-1 rounded-lg hover:bg-rose-50 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ───────────────────────────────────────────────────────────────────
          SECTION C: EMERGENCY SERVICE AVAILABILITY
      ─────────────────────────────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 shadow-xs rounded-3xl p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-800 flex items-center justify-center font-bold">
              <Zap className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-900">Emergency Service Availability</h2>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                  emergencyData.isAvailable 
                    ? 'bg-emerald-100 text-emerald-800' 
                    : 'bg-slate-100 text-slate-600'
                }`}>
                  Status: {emergencyData.isAvailable ? 'Available for emergency requests' : 'Unavailable'}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Receive instant emergency requests. The first qualified contractor to accept wins the job.
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSaveEmergencyAvailability} className="space-y-6">
          {/* Main Toggle Card */}
          <div className={`p-5 rounded-2xl border transition-all ${
            emergencyData.isAvailable
              ? 'bg-emerald-50/80 border-emerald-300'
              : 'bg-slate-50 border-slate-200'
          }`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="text-xs font-bold text-slate-900 block">
                  Accept Emergency Jobs
                </span>
                <p className="text-xs text-slate-600 max-w-xl leading-relaxed">
                  When enabled, you will receive real-time notifications for emergency jobs in your trade and service localities. First contractor to confirm acceptance wins immediately.
                </p>
              </div>

              <button
                type="button"
                onClick={handleToggleEmergencyActive}
                className={`relative inline-flex h-7 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  emergencyData.isAvailable ? 'bg-emerald-700' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                    emergencyData.isAvailable ? 'translate-x-7' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Emergency Details (Shown whether ON or configuring) */}
          <div className="space-y-5">
            {/* Emergency Categories */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5">
                Emergency Service Categories
              </label>
              <p className="text-[11px] text-slate-500 mb-2">
                Select the trades where you can provide rapid on-site emergency response.
              </p>
              <div className="flex flex-wrap gap-2">
                {categories.map((cat) => {
                  const isChecked = emergencyData.categories.includes(cat._id.toString());
                  return (
                    <button
                      type="button"
                      key={cat._id}
                      onClick={() => handleToggleEmergencyCategory(cat)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
                        isChecked
                          ? 'bg-emerald-800 text-white border-emerald-800 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      {isChecked && <Check className="w-3.5 h-3.5" />}
                      <span>{cat.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Emergency Service Localities */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5">
                Emergency Service Area (Lucknow Localities)
              </label>
              <p className="text-[11px] text-slate-500 mb-2">
                Only receive emergency dispatches located within your serviceable areas.
              </p>
              <div className="flex flex-wrap gap-2">
                {LUCKNOW_LOCALITIES.map((area) => {
                  const isChecked = emergencyData.serviceAreas.includes(area);
                  return (
                    <button
                      type="button"
                      key={area}
                      onClick={() => handleToggleEmergencyArea(area)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
                        isChecked
                          ? 'bg-emerald-50 text-emerald-900 border-emerald-300 font-bold'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      {isChecked && <Check className="w-3.5 h-3.5 text-emerald-700" />}
                      <span>{area}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Working Hours & Fees Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              {/* Working Hours */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-800">
                    Emergency Hours
                  </label>
                  <label className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={emergencyData.hours.is24x7}
                      onChange={(e) => setEmergencyData({
                        ...emergencyData,
                        hours: { ...emergencyData.hours, is24x7: e.target.checked }
                      })}
                      className="rounded border-slate-300 text-emerald-700 focus:ring-emerald-700"
                    />
                    24/7 Available
                  </label>
                </div>

                {emergencyData.hours.is24x7 ? (
                  <div className="px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 font-semibold flex items-center gap-2">
                    <Clock className="w-4 h-4 text-emerald-700" />
                    <span>Active 24 Hours a Day (Day & Night)</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[10px] text-slate-500 font-bold block mb-0.5">Start Time</span>
                      <input
                        type="time"
                        value={emergencyData.hours.start}
                        onChange={(e) => setEmergencyData({
                          ...emergencyData,
                          hours: { ...emergencyData.hours, start: e.target.value }
                        })}
                        className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:border-emerald-700 shadow-xs"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 font-bold block mb-0.5">End Time</span>
                      <input
                        type="time"
                        value={emergencyData.hours.end}
                        onChange={(e) => setEmergencyData({
                          ...emergencyData,
                          hours: { ...emergencyData.hours, end: e.target.value }
                        })}
                        className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:border-emerald-700 shadow-xs"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Max Distance */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  Max Travel Radius (km)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={emergencyData.maxDistanceKm}
                    onChange={(e) => setEmergencyData({ ...emergencyData, maxDistanceKm: Number(e.target.value) })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-bold focus:outline-none focus:border-emerald-700 shadow-xs"
                  />
                  <span className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400 text-xs font-semibold">
                    km
                  </span>
                </div>
              </div>

              {/* Emergency Call-Out Fee */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  Emergency Call-Out / Visit Fee (₹)
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 text-xs font-bold">
                    ₹
                  </span>
                  <input
                    type="number"
                    min="0"
                    value={emergencyData.callOutFee}
                    onChange={(e) => setEmergencyData({ ...emergencyData, callOutFee: Number(e.target.value) })}
                    className="w-full pl-8 bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-bold focus:outline-none focus:border-emerald-700 shadow-xs"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-3 border-t border-slate-100">
            <Button
              type="submit"
              variant="primary"
              size="md"
              icon={Save}
              disabled={savingEmergency}
            >
              {savingEmergency ? 'Saving Availability...' : 'Save Availability'}
            </Button>
          </div>
        </form>
      </div>

      {/* ───────────────────────────────────────────────────────────────────
          MODAL: ADD / EDIT SERVICE MODAL
      ─────────────────────────────────────────────────────────────────── */}
      {serviceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div 
            className="bg-white rounded-3xl max-w-lg w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-200 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-800 flex items-center justify-center font-bold">
                  <Wrench className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-slate-900">
                  {editingServiceIndex !== null ? 'Edit Service' : 'Add a Service'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setServiceModalOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleServiceFormSubmit} className="p-6 space-y-4">
              {serviceFormError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{serviceFormError}</span>
                </div>
              )}

              {/* Category */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Service Category <span className="text-rose-500">*</span>
                </label>
                <select
                  value={serviceForm.category}
                  onChange={(e) => {
                    const sel = categories.find(c => c._id === e.target.value);
                    setServiceForm({
                      ...serviceForm,
                      category: e.target.value,
                      categoryName: sel?.name || 'General Services'
                    });
                  }}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:border-emerald-700 shadow-xs"
                >
                  {categories.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Specific Skill or Service Name */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Specific Skill or Service Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ceiling Fan Installation & Motor Repair"
                  value={serviceForm.title}
                  onChange={(e) => setServiceForm({ ...serviceForm, title: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:border-emerald-700 shadow-xs"
                />
              </div>

              {/* Short Description */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Short Description
                </label>
                <textarea
                  rows="2"
                  placeholder="What is included in this service? (e.g. Includes wiring check, bracket mounting, regulator testing)"
                  value={serviceForm.description}
                  onChange={(e) => setServiceForm({ ...serviceForm, description: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-700 shadow-xs"
                />
              </div>

              {/* Pricing Type & Price */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Pricing Type
                  </label>
                  <select
                    value={serviceForm.pricingType}
                    onChange={(e) => setServiceForm({ ...serviceForm, pricingType: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:border-emerald-700 shadow-xs"
                  >
                    <option value="fixed">Fixed Price</option>
                    <option value="hourly">Hourly Rate</option>
                    <option value="quote">Inspection Quote</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    {serviceForm.pricingType === 'hourly' ? 'Rate (₹/hour)' : 'Price / Starting At (₹)'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    disabled={serviceForm.pricingType === 'quote'}
                    value={serviceForm.pricingType === 'quote' ? '' : serviceForm.price}
                    placeholder={serviceForm.pricingType === 'quote' ? 'Quoted on site' : '499'}
                    onChange={(e) => setServiceForm({ ...serviceForm, price: Number(e.target.value) })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-emerald-700 shadow-xs disabled:bg-slate-100 disabled:text-slate-400"
                  />
                </div>
              </div>

              {/* Experience and Service Area */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Experience in This Trade
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="50"
                    value={serviceForm.experienceYears}
                    onChange={(e) => setServiceForm({ ...serviceForm, experienceYears: Number(e.target.value) })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:border-emerald-700 shadow-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Service Area / Coverage
                  </label>
                  <input
                    type="text"
                    value={serviceForm.serviceArea}
                    onChange={(e) => setServiceForm({ ...serviceForm, serviceArea: e.target.value })}
                    placeholder="e.g. All Localities"
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:border-emerald-700 shadow-xs"
                  />
                </div>
              </div>

              {/* Active Toggle */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div>
                  <span className="text-xs font-bold text-slate-800 block">Service Active Status</span>
                  <p className="text-[11px] text-slate-500">Show this service on your public profile immediately.</p>
                </div>
                <input
                  type="checkbox"
                  checked={serviceForm.isActive}
                  onChange={(e) => setServiceForm({ ...serviceForm, isActive: e.target.checked })}
                  className="w-4 h-4 rounded border-slate-300 text-emerald-700 focus:ring-emerald-700"
                />
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setServiceModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={savingServices}
                >
                  {savingServices ? 'Saving...' : (editingServiceIndex !== null ? 'Save Changes' : 'Add Service')}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
