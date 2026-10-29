import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Check, 
  Upload, 
  ShieldCheck, 
  ArrowRight, 
  ArrowLeft, 
  CheckCircle2, 
  AlertCircle 
} from 'lucide-react';
import OnboardingStepper from '../../components/vendor/OnboardingStepper';
import Button from '../../components/common/Button';
import Loader from '../../components/common/Loader';
import { vendorAPI } from '../../api/vendor.api';
import { categoryAPI } from '../../api/category.api';
import { useAuth } from '../../hooks/useAuth';

export default function VendorOnboarding() {
  const [step, setStep] = useState(1);
  const navigate = useNavigate();
  const { user } = useAuth();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const [formData, setFormData] = useState({
    businessName: user?.businessName || user?.name ? `${user.businessName || user.name} Services` : 'Pro Technical Services',
    tagline: 'Certified Master Electricians & Mechanical Contractors',
    bio: '10+ years of professional residential and commercial trade experience across Lucknow and NCR region.',
    selectedCategories: ['Electrical Services', 'AC & HVAC Services'],
    hourlyRate: 75,
    city: 'Lucknow',
    locality: 'Gomti Nagar',
    radiusKm: 30,
    licenseName: 'Govt Trade Contractor Registration License (Class A)',
    licenseUrl: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=400&q=80',
    days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    startTime: '08:00',
    endTime: '19:00'
  });

  const steps = [
    'Business Info',
    'Trades & Domains',
    'Coverage Area',
    'Compliance Docs',
    'Review & Finish'
  ];

  useEffect(() => {
    const initData = async () => {
      try {
        setLoading(true);
        const [catsRes, profileRes] = await Promise.all([
          categoryAPI.getAll(),
          vendorAPI.getProfile().catch(() => null)
        ]);

        if (catsRes?.categories) {
          setCategories(catsRes.categories);
        }

        if (profileRes?.vendor) {
          const v = profileRes.vendor;
          setFormData(prev => ({
            ...prev,
            businessName: v.businessName || prev.businessName,
            tagline: v.tagline || prev.tagline,
            bio: v.bio || prev.bio,
            hourlyRate: v.hourlyRate || prev.hourlyRate,
            city: v.city || prev.city
          }));
        }
      } catch (err) {
        console.error('Error loading onboarding data:', err);
      } finally {
        setLoading(false);
      }
    };
    initData();
  }, []);

  const handleCategoryToggle = (catName) => {
    setError(null);
    const current = formData.selectedCategories;
    const exists = current.includes(catName);
    if (exists) {
      if (current.length <= 1) {
        setError('At least 1 service domain must be selected.');
        return;
      }
      setFormData({ ...formData, selectedCategories: current.filter(c => c !== catName) });
    } else {
      if (current.length >= 3) {
        setError('You can select a maximum of 3 service domains. Please deselect an existing domain to add another.');
        return;
      }
      setFormData({ ...formData, selectedCategories: [...current, catName] });
    }
  };

  const handleNext = async () => {
    setError(null);
    if (step < 5) {
      setStep(step + 1);
    } else {
      // Save and Complete Onboarding
      try {
        setSaving(true);
        // 1. Update Profile
        await vendorAPI.updateProfile({
          businessName: formData.businessName,
          tagline: formData.tagline,
          bio: formData.bio,
          hourlyRate: Number(formData.hourlyRate),
          city: formData.city
        });

        // 2. Submit Verification
        await vendorAPI.submitVerification([
          {
            name: formData.licenseName,
            url: formData.licenseUrl,
            uploadedAt: new Date()
          }
        ]);

        // 3. Update Availability
        await vendorAPI.updateAvailability({
          days: formData.days,
          hours: { start: formData.startTime, end: formData.endTime },
          isAvailableNow: true
        });

        navigate('/vendor/dashboard');
      } catch (err) {
        console.error('Error saving onboarding data:', err);
        setError('Failed to persist onboarding profile. Please retry.');
      } finally {
        setSaving(false);
      }
    }
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  if (loading) return <div className="py-20"><Loader text="Preparing contractor accreditation stepper..." /></div>;

  return (
    <div className="w-full max-w-5xl mx-auto bg-white border border-slate-200/90 shadow-2xs rounded-3xl p-6 sm:p-8 space-y-6">
      <div>
        <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider block">Contractor Accreditation</span>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-0.5">Vendor Onboarding & Verification</h1>
        <p className="text-xs text-slate-600 mt-0.5">
          Step {step} of 5: Complete your professional registration to receive direct customer tenders across Lucknow.
        </p>
      </div>

      <OnboardingStepper currentStep={step} steps={steps} />

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Step 1: Business Profile */}
      {step === 1 && (
        <div className="space-y-4">
          <h3 className="text-base font-bold text-slate-900">Step 1: Business Profile</h3>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Registered Business or Trade Name *</label>
            <input
              type="text"
              required
              value={formData.businessName}
              onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
              className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 shadow-sm focus:outline-none focus:border-emerald-700 font-bold"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Company Tagline</label>
            <input
              type="text"
              value={formData.tagline}
              onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
              className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 shadow-sm focus:outline-none focus:border-emerald-700"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Professional Overview / Bio</label>
            <textarea
              rows="3"
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 shadow-sm focus:outline-none focus:border-emerald-700"
            />
          </div>
        </div>
      )}

      {/* Step 2: Trades & Specializations */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900">Step 2: Trades & Specializations</h3>
            <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
              formData.selectedCategories.length === 3
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-slate-100 text-slate-700 border-slate-200'
            }`}>
              {formData.selectedCategories.length} of 3 domains selected
            </span>
          </div>
          <p className="text-xs text-slate-600">Select 1 to 3 trade domains you are equipped to perform (jobs feed will be tailored to your selections):</p>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-72 overflow-y-auto pr-1">
            {categories.map((cat) => {
              const checked = formData.selectedCategories.includes(cat.name);
              return (
                <label
                  key={cat._id || cat.slug}
                  className={`flex items-center gap-2.5 p-3 rounded-xl border text-xs cursor-pointer transition ${
                    checked 
                      ? 'bg-emerald-50/70 border-emerald-600 text-emerald-900 font-semibold' 
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => handleCategoryToggle(cat.name)}
                    className="rounded border-slate-300 text-emerald-800 focus:ring-emerald-700 w-4 h-4"
                  />
                  <span className="truncate">{cat.name}</span>
                </label>
              );
            })}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Standard Hourly Rate (₹ INR)</label>
            <input
              type="number"
              min="10"
              value={formData.hourlyRate}
              onChange={(e) => setFormData({ ...formData, hourlyRate: e.target.value })}
              className="w-48 bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 shadow-sm focus:outline-none focus:border-emerald-700"
            />
          </div>
        </div>
      )}

      {/* Step 3: Coverage Area */}
      {step === 3 && (
        <div className="space-y-4">
          <h3 className="text-base font-bold text-slate-900">Step 3: Service Coverage Area</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Primary Operating City</label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 shadow-sm focus:outline-none focus:border-emerald-700"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Base Locality Hub</label>
              <input
                type="text"
                value={formData.locality}
                onChange={(e) => setFormData({ ...formData, locality: e.target.value })}
                className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 shadow-sm focus:outline-none focus:border-emerald-700"
              />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-1.5">
            <p className="font-bold text-slate-900">Default Radius: {formData.radiusKm} Kilometers (Lucknow & NCR)</p>
            <p className="text-slate-600 leading-relaxed">
              You will automatically receive socket notifications and lead alerts for job tenders originating within {formData.radiusKm} km of your base locality.
            </p>
          </div>
        </div>
      )}

      {/* Step 4: Compliance & License Upload */}
      {step === 4 && (
        <div className="space-y-4">
          <h3 className="text-base font-bold text-slate-900">Step 4: Contractor License & Insurance</h3>
          <p className="text-xs text-slate-600">Provide verified trade credentials to unlock the Verified Pro badge:</p>
          
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">License / Certificate Name</label>
            <input
              type="text"
              value={formData.licenseName}
              onChange={(e) => setFormData({ ...formData, licenseName: e.target.value })}
              className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 shadow-sm focus:outline-none focus:border-emerald-700"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Document URL (PDF / Image)</label>
            <input
              type="text"
              value={formData.licenseUrl}
              onChange={(e) => setFormData({ ...formData, licenseUrl: e.target.value })}
              className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 shadow-sm focus:outline-none focus:border-emerald-700"
            />
          </div>

          <div className="flex items-center gap-2 text-xs text-emerald-800 bg-emerald-50 p-3.5 rounded-2xl border border-emerald-200">
            <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0" />
            <span>Documents are reviewed by our compliance audit team within 24 hours of submission.</span>
          </div>
        </div>
      )}

      {/* Step 5: Review & Confirm */}
      {step === 5 && (
        <div className="space-y-4">
          <h3 className="text-base font-bold text-slate-900">Step 5: Review & Confirm Profile</h3>
          <p className="text-xs text-slate-600">Review your contractor credentials before submitting:</p>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-500">Business:</span>
              <strong className="text-slate-900">{formData.businessName}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Location:</span>
              <strong className="text-slate-900">{formData.locality}, {formData.city}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Hourly Rate:</span>
              <strong className="text-emerald-800">₹{formData.hourlyRate}/hour</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Trades:</span>
              <strong className="text-slate-900">{formData.selectedCategories.join(', ')}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">License:</span>
              <strong className="text-slate-900">{formData.licenseName}</strong>
            </div>
          </div>
        </div>
      )}

      {/* Stepper Footer */}
      <div className="flex items-center justify-between pt-6 border-t border-slate-100">
        {step > 1 ? (
          <Button variant="ghost" size="sm" icon={ArrowLeft} onClick={handleBack}>
            Previous Step
          </Button>
        ) : <div />}

        <Button
          variant="primary"
          size="md"
          disabled={saving}
          onClick={handleNext}
        >
          {saving 
            ? 'Saving Profile...' 
            : step === 5 
            ? 'Complete Onboarding & Enter Portal' 
            : 'Continue'}
        </Button>
      </div>
    </div>
  );
}
