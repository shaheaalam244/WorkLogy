import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  CheckCircle2, 
  ArrowRight, 
  ArrowLeft, 
  Save, 
  Eye, 
  Upload, 
  DollarSign, 
  MapPin, 
  Clock, 
  Shield, 
  Sparkles,
  AlertCircle
} from 'lucide-react';
import Button from '../../components/common/Button';
import Loader from '../../components/common/Loader';
import { vendorAPI } from '../../api/vendor.api';
import { categoryAPI } from '../../api/category.api';
import { formatCurrency } from '../../utils/formatters';
import { getSubServiceImage } from '../../constants/serviceImages';

export default function VendorNewService() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [loadingCats, setLoadingCats] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [previewMode, setPreviewMode] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    domain: 'Electrical Services',
    subcategory: '',
    shortSummary: '',
    description: '',
    experienceYears: 4,
    deliveryType: 'home_service',
    languages: 'Hindi, English',
    pricing: {
      type: 'fixed',
      amount: 450,
      minPrice: 350,
      maxPrice: 650,
      currency: 'INR',
      unit: 'per visit',
      visitFee: 150,
      materialCostIncluded: false,
      cancellationTerms: 'Free cancellation up to 2 hours prior to scheduled appointment.'
    },
    images: [
      'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=800&q=80'
    ],
    imageUrlInput: '',
    location: {
      state: 'Uttar Pradesh',
      city: 'Lucknow',
      locality: 'Gomti Nagar',
      serviceAddress: 'Vibhuti Khand, Gomti Nagar',
      radiusKm: 25,
      supportedLocalities: 'Gomti Nagar, Hazratganj, Aliganj, Indira Nagar, Mahanagar',
      homeVisitAvailable: true,
      travelCharge: 0
    },
    availability: {
      days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
      hours: { start: '09:00', end: '19:00' },
      emergencyAvailable: false,
      maxDailyBookings: 5
    },
    requirements: {
      toolsProvided: true,
      customerRequirements: 'Direct access to main switchboard / water inlet if required.',
      safetyInstructions: 'Area must be clear of children and pets during live testing.',
      warranty: '30-day verified workmanship warranty'
    },
    status: 'published'
  });

  // Fetch all 30 domains & subcategories from backend catalogue
  useEffect(() => {
    const fetchCats = async () => {
      try {
        setLoadingCats(true);
        const res = await categoryAPI.getAll();
        if (res?.categories && res.categories.length > 0) {
          setCategories(res.categories);
          // Set initial subcategory if available
          const firstCat = res.categories[0];
          if (firstCat && firstCat.subcategories && firstCat.subcategories.length > 0) {
            setFormData(prev => ({
              ...prev,
              domain: firstCat.name,
              subcategory: firstCat.subcategories[0]
            }));
          }
        }
      } catch (err) {
        console.error('Error fetching categories:', err);
      } finally {
        setLoadingCats(false);
      }
    };
    fetchCats();
  }, []);

  // Update subcategories when domain changes
  const selectedDomainObj = categories.find(c => c.name === formData.domain) || categories[0];
  const availableSubcategories = selectedDomainObj?.subcategories || [
    'General Inspection & Diagnostic',
    'Standard Repair & Servicing',
    'Emergency Troubleshooting',
    'New Installation & Fitting'
  ];

  const handleDomainChange = (e) => {
    const newDomain = e.target.value;
    const matched = categories.find(c => c.name === newDomain);
    const firstSub = matched?.subcategories?.[0] || 'Standard Repair & Servicing';
    setFormData(prev => ({
      ...prev,
      domain: newDomain,
      subcategory: firstSub
    }));
  };

  const handleDayToggle = (day) => {
    const current = formData.availability.days;
    const exists = current.includes(day);
    const updated = exists ? current.filter(d => d !== day) : [...current, day];
    setFormData(prev => ({
      ...prev,
      availability: { ...prev.availability, days: updated }
    }));
  };

  const handleAddImage = () => {
    if (formData.imageUrlInput && formData.imageUrlInput.trim()) {
      setFormData(prev => ({
        ...prev,
        images: [...prev.images, prev.imageUrlInput.trim()],
        imageUrlInput: ''
      }));
    }
  };

  const handleRemoveImage = (index) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (submitStatus = 'published') => {
    try {
      setSubmitting(true);
      setError(null);

      if (!formData.title.trim()) {
        setError('Please enter a service package title');
        setSubmitting(false);
        return;
      }

      if (!formData.description.trim()) {
        setError('Please provide a detailed service description');
        setSubmitting(false);
        return;
      }

      const payload = {
        title: formData.title,
        domain: formData.domain,
        subcategory: formData.subcategory || availableSubcategories[0],
        shortSummary: formData.shortSummary,
        description: formData.description,
        experienceYears: Number(formData.experienceYears) || 3,
        deliveryType: formData.deliveryType,
        languages: typeof formData.languages === 'string' 
          ? formData.languages.split(',').map(s => s.trim()) 
          : formData.languages,
        pricing: {
          type: formData.pricing.type,
          amount: Number(formData.pricing.amount) || 0,
          minPrice: Number(formData.pricing.minPrice) || 0,
          maxPrice: Number(formData.pricing.maxPrice) || 0,
          currency: 'INR',
          unit: formData.pricing.unit,
          visitFee: Number(formData.pricing.visitFee) || 0,
          materialCostIncluded: formData.pricing.materialCostIncluded,
          cancellationTerms: formData.pricing.cancellationTerms
        },
        images: formData.images,
        location: {
          state: formData.location.state,
          city: formData.location.city,
          locality: formData.location.locality,
          serviceAddress: formData.location.serviceAddress,
          radiusKm: Number(formData.location.radiusKm) || 25,
          supportedLocalities: typeof formData.location.supportedLocalities === 'string'
            ? formData.location.supportedLocalities.split(',').map(s => s.trim())
            : formData.location.supportedLocalities,
          homeVisitAvailable: formData.location.homeVisitAvailable,
          travelCharge: Number(formData.location.travelCharge) || 0
        },
        availability: formData.availability,
        requirements: formData.requirements,
        status: submitStatus
      };

      const res = await vendorAPI.createService(payload);

      if (res?.success) {
        setSuccessMsg(
          submitStatus === 'draft' 
            ? 'Service draft saved successfully to database.' 
            : 'Service listing published and live for property owners!'
        );
        setTimeout(() => {
          navigate('/vendor/services');
        }, 1200);
      }
    } catch (err) {
      console.error('Error creating service:', err);
      setError(err.response?.data?.message || 'Failed to save service listing. Please check required fields.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingCats) {
    return <div className="py-20"><Loader text="Loading 30 service domains catalogue..." /></div>;
  }

  return (
    <div className="w-full space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider block">Service Catalogue Studio</span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">Post a Standardized Service</h1>
          <p className="text-xs text-slate-600 mt-0.5">
            Create an itemized fixed-price or quote-based service package visible across Lucknow.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            icon={Eye}
            onClick={() => setPreviewMode(!previewMode)}
          >
            {previewMode ? 'Return to Form' : 'Preview Listing'}
          </Button>

          <Button
            variant="secondary"
            size="sm"
            icon={Save}
            disabled={submitting}
            onClick={() => handleSubmit('draft')}
          >
            Save as Draft
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-700" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Live Preview Modal / Card */}
      {previewMode && (
        <div className="bg-emerald-50/50 border-2 border-emerald-600 rounded-3xl p-6 sm:p-8 space-y-6">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Homeowner View Preview</span>
            <span className="text-xs text-slate-500 font-medium">Domain: {formData.domain}</span>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            <img 
              src={formData.images?.[0] || getSubServiceImage(formData.domain, formData.subcategory)} 
              alt="Service Preview" 
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = getSubServiceImage(formData.domain, formData.subcategory);
              }}
              className="w-full h-48 object-cover rounded-xl border border-slate-200"
            />
            <div className="flex items-center justify-between gap-4">
              <div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 uppercase">
                  {formData.subcategory || 'Standard Service'}
                </span>
                <h2 className="text-xl font-extrabold text-slate-900 mt-1">{formData.title || 'Untitled Service Package'}</h2>
                <p className="text-xs text-slate-600 mt-1">{formData.shortSummary || 'No short summary provided.'}</p>
              </div>

              <div className="text-right">
                <span className="text-[10px] text-slate-500 block uppercase">Rate</span>
                <p className="text-2xl font-black text-emerald-800">
                  {formData.pricing.type === 'quote' 
                    ? 'Quote Required' 
                    : formatCurrency(formData.pricing.amount || formData.pricing.minPrice)}
                </p>
                <span className="text-[10px] text-slate-500 font-medium">{formData.pricing.unit}</span>
              </div>
            </div>

            <p className="text-xs text-slate-700 leading-relaxed border-t border-slate-100 pt-3">
              {formData.description || 'Description will appear here.'}
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-100 text-xs">
              <div>
                <span className="text-[10px] text-slate-500 block">Experience</span>
                <strong className="text-slate-800">{formData.experienceYears} Years</strong>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block">Delivery</span>
                <strong className="text-slate-800 capitalize">{formData.deliveryType.replace('_', ' ')}</strong>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block">Coverage</span>
                <strong className="text-slate-800">{formData.location.city} ({formData.location.radiusKm} km)</strong>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block">Warranty</span>
                <strong className="text-emerald-700">{formData.requirements.warranty}</strong>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Multi-Section Form */}
      <div className="space-y-6">

        {/* Section A & B: Domain, Subcategory & Basic Details */}
        <div className="bg-white border border-slate-200 shadow-sm rounded-3xl p-6 sm:p-8 space-y-5">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <span className="w-6 h-6 rounded-full bg-emerald-800 text-white text-xs font-bold flex items-center justify-center">1</span>
            <h3 className="text-base font-bold text-slate-900">Domain, Category & Basic Details</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Primary Service Domain (30 Configured Trades) *
              </label>
              <select
                value={formData.domain}
                onChange={handleDomainChange}
                className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 shadow-sm focus:outline-none focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700"
              >
                {categories.map((c) => (
                  <option key={c._id || c.slug} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Subcategory Specialization *
              </label>
              <select
                value={formData.subcategory}
                onChange={(e) => setFormData({ ...formData, subcategory: e.target.value })}
                className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 shadow-sm focus:outline-none focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700"
              >
                {availableSubcategories.map((sub, idx) => (
                  <option key={idx} value={sub}>
                    {sub}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Dynamic Service Image Visual */}
          <div className="flex items-center gap-3.5 p-3.5 bg-slate-50 border border-slate-200 rounded-2xl">
            <img 
              src={getSubServiceImage(formData.domain, formData.subcategory)} 
              alt={formData.subcategory || formData.domain}
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = getSubServiceImage(formData.domain, formData.subcategory);
              }}
              className="w-20 h-14 object-cover rounded-xl border border-slate-200 shadow-2xs shrink-0" 
            />
            <div className="min-w-0">
              <span className="text-[10px] uppercase font-bold text-emerald-800 tracking-wider block">Standardized Category Visual</span>
              <p className="text-xs font-bold text-slate-800 truncate">{formData.domain} &middot; {formData.subcategory}</p>
              <p className="text-[11px] text-slate-500">Automatically associated with your listing across search results and catalog.</p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Service Listing Title *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Full Electrical Subpanel Replacement & Safety Certification"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 shadow-sm focus:outline-none focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Short Summary (One-liner preview for search results)
            </label>
            <input
              type="text"
              placeholder="e.g. Complete high-grade subpanel replacement with surge protection and 5-year guarantee"
              value={formData.shortSummary}
              onChange={(e) => setFormData({ ...formData, shortSummary: e.target.value })}
              className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 shadow-sm focus:outline-none focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Detailed Scope & Specifications *
            </label>
            <textarea
              rows="4"
              required
              placeholder="Detail what is included, materials used, diagnostic steps, code compliance, and testing standards..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 shadow-sm focus:outline-none focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Years of Field Experience</label>
              <input
                type="number"
                min="0"
                value={formData.experienceYears}
                onChange={(e) => setFormData({ ...formData, experienceYears: Number(e.target.value) })}
                className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 shadow-sm focus:outline-none focus:border-emerald-700"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Service Delivery Type</label>
              <select
                value={formData.deliveryType}
                onChange={(e) => setFormData({ ...formData, deliveryType: e.target.value })}
                className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 shadow-sm focus:outline-none focus:border-emerald-700"
              >
                <option value="home_service">At Customer Home (Doorstep)</option>
                <option value="workshop">At Contractor Workshop / Shop</option>
                <option value="remote">Remote / Digital Inspection</option>
                <option value="onsite">On-Site Commercial Location</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Languages Supported</label>
              <input
                type="text"
                placeholder="Hindi, English, Urdu"
                value={formData.languages}
                onChange={(e) => setFormData({ ...formData, languages: e.target.value })}
                className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 shadow-sm focus:outline-none focus:border-emerald-700"
              />
            </div>
          </div>
        </div>

        {/* Section C: Pricing & Commercial Terms */}
        <div className="bg-white border border-slate-200 shadow-sm rounded-3xl p-6 sm:p-8 space-y-5">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <span className="w-6 h-6 rounded-full bg-emerald-800 text-white text-xs font-bold flex items-center justify-center">2</span>
            <h3 className="text-base font-bold text-slate-900">Pricing Model & Commercial Terms (INR)</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Pricing Model</label>
              <select
                value={formData.pricing.type}
                onChange={(e) => setFormData({
                  ...formData,
                  pricing: { ...formData.pricing, type: e.target.value }
                })}
                className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 shadow-sm focus:outline-none focus:border-emerald-700"
              >
                <option value="fixed">Fixed Price Package</option>
                <option value="starting">Starting Price From</option>
                <option value="range">Price Range (Min - Max)</option>
                <option value="quote">Quote-Based (On Inspection)</option>
              </select>
            </div>

            {formData.pricing.type !== 'range' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Price Amount (₹ INR) *
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.pricing.amount}
                  onChange={(e) => setFormData({
                    ...formData,
                    pricing: { ...formData.pricing, amount: Number(e.target.value) }
                  })}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 shadow-sm focus:outline-none focus:border-emerald-700"
                />
              </div>
            )}

            {formData.pricing.type === 'range' && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Minimum Price (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.pricing.minPrice}
                    onChange={(e) => setFormData({
                      ...formData,
                      pricing: { ...formData.pricing, minPrice: Number(e.target.value) }
                    })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 shadow-sm focus:outline-none focus:border-emerald-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Maximum Price (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.pricing.maxPrice}
                    onChange={(e) => setFormData({
                      ...formData,
                      pricing: { ...formData.pricing, maxPrice: Number(e.target.value) }
                    })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 shadow-sm focus:outline-none focus:border-emerald-700"
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Pricing Unit</label>
              <select
                value={formData.pricing.unit}
                onChange={(e) => setFormData({
                  ...formData,
                  pricing: { ...formData.pricing, unit: e.target.value }
                })}
                className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 shadow-sm focus:outline-none focus:border-emerald-700"
              >
                <option value="per visit">Per Visit</option>
                <option value="per hour">Per Hour</option>
                <option value="per item">Per Item / Appliance</option>
                <option value="per project">Per Project / Turnkey</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Visit / Diagnostic Fee (₹)</label>
              <input
                type="number"
                min="0"
                value={formData.pricing.visitFee}
                onChange={(e) => setFormData({
                  ...formData,
                  pricing: { ...formData.pricing, visitFee: Number(e.target.value) }
                })}
                className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 shadow-sm focus:outline-none focus:border-emerald-700"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">Adjusted against total bill if work is approved</span>
            </div>

            <div className="flex items-center gap-2 pt-6">
              <input
                type="checkbox"
                id="matCost"
                checked={formData.pricing.materialCostIncluded}
                onChange={(e) => setFormData({
                  ...formData,
                  pricing: { ...formData.pricing, materialCostIncluded: e.target.checked }
                })}
                className="rounded border-slate-300 text-emerald-800 focus:ring-emerald-700 w-4 h-4"
              />
              <label htmlFor="matCost" className="text-xs font-semibold text-slate-800 cursor-pointer">
                Standard parts & consumable materials included in quoted price
              </label>
            </div>
          </div>
        </div>

        {/* Section D: Image References */}
        <div className="bg-white border border-slate-200 shadow-sm rounded-3xl p-6 sm:p-8 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <span className="w-6 h-6 rounded-full bg-emerald-800 text-white text-xs font-bold flex items-center justify-center">3</span>
            <h3 className="text-base font-bold text-slate-900">Service Photographs & Portfolio References</h3>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Paste image URL (e.g. https://images.unsplash.com/...)"
              value={formData.imageUrlInput}
              onChange={(e) => setFormData({ ...formData, imageUrlInput: e.target.value })}
              className="flex-1 bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 shadow-sm focus:outline-none focus:border-emerald-700"
            />
            <Button variant="secondary" size="sm" onClick={handleAddImage}>
              Add Photo
            </Button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            {formData.images.map((img, idx) => (
              <div key={idx} className="relative group rounded-xl overflow-hidden border border-slate-200 h-28 bg-slate-100">
                <img src={img} alt={`Work ${idx}`} className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => handleRemoveImage(idx)}
                  className="absolute top-1.5 right-1.5 bg-rose-600 text-white rounded-full p-1 opacity-80 hover:opacity-100 text-[10px]"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Section E: Location & Coverage Area */}
        <div className="bg-white border border-slate-200 shadow-sm rounded-3xl p-6 sm:p-8 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <span className="w-6 h-6 rounded-full bg-emerald-800 text-white text-xs font-bold flex items-center justify-center">4</span>
            <h3 className="text-base font-bold text-slate-900">Service Coverage & Localities</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">City</label>
              <input
                type="text"
                value={formData.location.city}
                onChange={(e) => setFormData({
                  ...formData,
                  location: { ...formData.location, city: e.target.value }
                })}
                className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 shadow-sm focus:outline-none focus:border-emerald-700"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Base Locality / Hub</label>
              <input
                type="text"
                value={formData.location.locality}
                onChange={(e) => setFormData({
                  ...formData,
                  location: { ...formData.location, locality: e.target.value }
                })}
                className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 shadow-sm focus:outline-none focus:border-emerald-700"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Service Radius (Kilometers)</label>
              <input
                type="number"
                min="1"
                max="100"
                value={formData.location.radiusKm}
                onChange={(e) => setFormData({
                  ...formData,
                  location: { ...formData.location, radiusKm: Number(e.target.value) }
                })}
                className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 shadow-sm focus:outline-none focus:border-emerald-700"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Supported Localities (Comma separated)
            </label>
            <input
              type="text"
              value={formData.location.supportedLocalities}
              onChange={(e) => setFormData({
                ...formData,
                location: { ...formData.location, supportedLocalities: e.target.value }
              })}
              className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 shadow-sm focus:outline-none focus:border-emerald-700"
            />
          </div>
        </div>

        {/* Section F & G: Availability & Conditions */}
        <div className="bg-white border border-slate-200 shadow-sm rounded-3xl p-6 sm:p-8 space-y-5">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <span className="w-6 h-6 rounded-full bg-emerald-800 text-white text-xs font-bold flex items-center justify-center">5</span>
            <h3 className="text-base font-bold text-slate-900">Working Schedule & Service Warranty</h3>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">Available Working Days</label>
            <div className="flex flex-wrap gap-2">
              {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => {
                const active = formData.availability.days.includes(day);
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => handleDayToggle(day)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium transition ${
                      active 
                        ? 'bg-emerald-800 text-white font-bold shadow-sm' 
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Daily Working Hours</label>
              <div className="flex items-center gap-2">
                <input
                  type="time"
                  value={formData.availability.hours.start}
                  onChange={(e) => setFormData({
                    ...formData,
                    availability: {
                      ...formData.availability,
                      hours: { ...formData.availability.hours, start: e.target.value }
                    }
                  })}
                  className="bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-900"
                />
                <span className="text-xs text-slate-500">to</span>
                <input
                  type="time"
                  value={formData.availability.hours.end}
                  onChange={(e) => setFormData({
                    ...formData,
                    availability: {
                      ...formData.availability,
                      hours: { ...formData.availability.hours, end: e.target.value }
                    }
                  })}
                  className="bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-900"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Workmanship Warranty</label>
              <input
                type="text"
                value={formData.requirements.warranty}
                onChange={(e) => setFormData({
                  ...formData,
                  requirements: { ...formData.requirements, warranty: e.target.value }
                })}
                className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 shadow-sm focus:outline-none focus:border-emerald-700"
              />
            </div>
          </div>
        </div>

        {/* Section H: Action Bar */}
        <div className="bg-white border border-slate-200 shadow-sm rounded-3xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <Sparkles className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>Publishing immediately indexes this package in customer category discovery.</span>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <Button
              type="button"
              variant="secondary"
              size="md"
              icon={Save}
              disabled={submitting}
              onClick={() => handleSubmit('draft')}
              className="w-full sm:w-auto"
            >
              Save Draft
            </Button>

            <Button
              type="button"
              variant="primary"
              size="md"
              icon={CheckCircle2}
              disabled={submitting}
              onClick={() => handleSubmit('published')}
              className="w-full sm:w-auto"
            >
              {submitting ? 'Publishing...' : 'Publish Service Package'}
            </Button>
          </div>
        </div>

      </div>
    </div>
  );
}
