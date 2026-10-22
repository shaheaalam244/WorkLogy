import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import {
  Wrench,
  Zap,
  Droplets,
  Wind,
  CheckCircle2,
  AlertCircle,
  MapPin,
  Calendar,
  Clock,
  Upload,
  X,
  ChevronRight,
  ChevronLeft,
  DollarSign,
  ShieldCheck,
  Home,
  Briefcase,
  Layers,
  Sparkles,
  Eye,
  Check,
  Loader2,
  AlertTriangle,
  Navigation,
  Compass
} from 'lucide-react';
import Button from '../../components/common/Button';
import { jobAPI } from '../../api/job.api';
import { categoryAPI } from '../../api/category.api';
import { customerAPI } from '../../api/customer.api';
import { locationAPI } from '../../api/location.api';
import { getCategoryMedia, handleImageFallback } from '../../utils/categoryMedia';
import { getServiceImage } from '../../constants/serviceImages';

// Domain-specific questionnaire templates
const SERVICE_QUESTIONS = {
  'electrical-services': [
    {
      id: 'propertyType',
      label: 'Property Type',
      type: 'select',
      options: ['Residential (Apartment/House)', 'Commercial (Office/Shop)', 'Industrial']
    },
    {
      id: 'scope',
      label: 'Work Scope',
      type: 'select',
      options: ['Single Point / Switchboard / Appliance', 'Multiple Rooms / Partial Rewiring', 'Full Property Wiring / Panel Upgrade']
    },
    {
      id: 'powerOutage',
      label: 'Is there an active power outage or tripping MCB?',
      type: 'radio',
      options: ['Yes - complete power loss', 'Partial tripping / MCB issues', 'No outage - installation/repair only']
    }
  ],
  'plumbing-services': [
    {
      id: 'issueType',
      label: 'Nature of Plumbing Work',
      type: 'select',
      options: ['Active Pipe Leakage / Burst', 'Clogged Drain / Sewer Blockage', 'Fixture / Tap Replacement', 'Water Tank Cleaning / Repair', 'Complete Bathroom Plumbing']
    },
    {
      id: 'affectedArea',
      label: 'Affected Location',
      type: 'select',
      options: ['Bathroom / Toilet', 'Kitchen Sink / Utility', 'Overhead Tank / Motor Pump', 'Main Supply / Outdoor Line']
    },
    {
      id: 'accessibility',
      label: 'Physical Access',
      type: 'radio',
      options: ['Easily accessible', 'Requires ladder / high ceiling', 'Concealed behind wall / tiles']
    }
  ],
  'ac-hvac-services': [
    {
      id: 'acType',
      label: 'Air Conditioner Type',
      type: 'select',
      options: ['Split AC', 'Window AC', 'Cassette AC', 'Central / Ductable HVAC']
    },
    {
      id: 'serviceNeed',
      label: 'Primary Issue or Service',
      type: 'select',
      options: ['Not Cooling / Low Airflow', 'Water Leakage from Indoor Unit', 'Gas Leakage & Refilling', 'Annual Deep Cleaning & Servicing', 'Uninstallation & Reinstallation']
    },
    {
      id: 'unitCount',
      label: 'Number of Units',
      type: 'select',
      options: ['1 Unit', '2 Units', '3 - 4 Units', '5+ Units']
    }
  ],
  'home-cleaning': [
    {
      id: 'propertyType',
      label: 'Property Size / Configuration',
      type: 'select',
      options: ['1 BHK Apartment', '2 BHK Apartment', '3 BHK Apartment', '4+ BHK / Independent Villa', 'Commercial Office Space']
    },
    {
      id: 'cleaningType',
      label: 'Cleaning Package Desired',
      type: 'select',
      options: ['Full Home Deep Cleaning', 'Kitchen & Bathroom Only', 'Sofa, Carpet & Mattress Shampoo', 'Move-in / Move-out Post-Construction Cleaning']
    },
    {
      id: 'furnishingState',
      label: 'Occupancy Status',
      type: 'radio',
      options: ['Occupied & Furnished', 'Semi-Furnished', 'Vacant / Unfurnished']
    }
  ],
  'appliance-repair': [
    {
      id: 'applianceType',
      label: 'Appliance Category',
      type: 'select',
      options: ['Refrigerator / Freezer', 'Washing Machine / Dryer', 'Microwave Oven', 'Dishwasher', 'Television / Audio System', 'Geyser / Water Purifier']
    },
    {
      id: 'brand',
      label: 'Brand / Make (e.g. LG, Samsung, Whirlpool, IFB)',
      type: 'text',
      placeholder: 'Enter brand name if known'
    },
    {
      id: 'symptom',
      label: 'Observed Fault',
      type: 'radio',
      options: ['Does not turn on / No power', 'Turns on but does not function properly', 'Unusual noise or vibration', 'Water or coolant leaking']
    }
  ],
  'carpentry-furniture': [
    {
      id: 'workType',
      label: 'Carpentry Service Type',
      type: 'select',
      options: ['Repair of Existing Furniture', 'New Custom Woodwork / Cabinetry', 'Door / Window Fitting & Locks', 'Flat-Pack Furniture Assembly (IKEA/etc.)']
    },
    {
      id: 'materialProvided',
      label: 'Wood / Hardware Supply',
      type: 'radio',
      options: ['Contractor to provide all materials', 'I have purchased the materials / labor only', 'To be decided after inspection']
    }
  ],
  'painting-services': [
    {
      id: 'scope',
      label: 'Painting Scope',
      type: 'select',
      options: ['Full Interior Repainting', 'Exterior Painting', 'Single Room / Touch-up Wall', 'Waterproofing & Wall Putty Prep']
    },
    {
      id: 'paintSupply',
      label: 'Paint Material Preference',
      type: 'radio',
      options: ['Contractor provides premium paint & materials', 'Labor only (I will supply paint)', 'Need contractor consultation on brands']
    }
  ],
  'vehicle-repair': [
    {
      id: 'vehicleType',
      label: 'Vehicle Category',
      type: 'select',
      options: ['Two-Wheeler (Motorcycle / Scooter)', 'Hatchback / Sedan Car', 'SUV / Commercial Vehicle']
    },
    {
      id: 'assistanceType',
      label: 'Service Location',
      type: 'radio',
      options: ['Doorstep Service / Inspection', 'Workshop Visit / Towing Needed', 'Emergency Roadside Breakdown']
    }
  ]
};

// Generic questionnaire for all other categories
const DEFAULT_QUESTIONS = [
  {
    id: 'propertyType',
    label: 'Service Setting',
    type: 'select',
    options: ['Residential', 'Commercial / Workplace', 'Outdoor / Other']
  },
  {
    id: 'materialPreference',
    label: 'Materials & Equipment',
    type: 'radio',
    options: ['Contractor provides necessary supplies & tools', 'Customer will provide materials', 'Discuss & inspect on site']
  }
];

export default function CustomerCreateJob() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryCategory = searchParams.get('category') || '';
  const queryService = searchParams.get('service') || '';
  const queryTitle = searchParams.get('title') || '';

  // Wizard state
  const [currentStep, setCurrentStep] = useState(1);
  const [categories, setCategories] = useState([]);
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [errorBanner, setErrorBanner] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [createdJob, setCreatedJob] = useState(null);

  // Current Device Geolocation States
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationStatusText, setLocationStatusText] = useState('');
  const [locationSuccess, setLocationSuccess] = useState(false);
  const [locationError, setLocationError] = useState('');

  // Form Data
  const [formData, setFormData] = useState({
    // Service Type Choice
    serviceTypeChoice: 'normal', // 'normal' or 'emergency'

    // Step 1: Service
    category: '',
    subcategory: '',
    title: '',
    description: '',
    serviceRequirements: {},

    // Step 2: Location & Schedule
    addressMode: 'saved', // 'saved' or 'manual'
    selectedSavedAddressId: '',
    addressLabel: 'Home',
    houseNumber: '',
    street: '',
    locality: '',
    landmark: '',
    accessInstructions: '',
    city: 'Lucknow',
    state: 'Uttar Pradesh',
    zipCode: '226010',
    country: 'India',
    locationSource: 'manual', // 'gps', 'saved_address', 'manual'
    locationAccuracyMeters: null,
    coordinates: { lat: 0, lng: 0 },
    saveAddressToProfile: false,
    scheduleType: 'flexible', // 'flexible' or 'specific'
    preferredDate: '',
    preferredTimeSlot: 'anytime',
    alternateDate: '',

    // Step 3: Budget, Urgency, Photos
    budgetType: 'quote', // 'quote', 'fixed', 'range', 'hourly'
    budgetAmount: '',
    budgetMin: '',
    budgetMax: '',
    urgency: 'medium',
    images: [],

    // Step 4: Acknowledgement
    acknowledged: false
  });

  // Load canonical categories and customer's saved addresses
  useEffect(() => {
    let isMounted = true;
    const fetchInitialData = async () => {
      try {
        setLoadingInitial(true);
        const [catRes, profileRes] = await Promise.allSettled([
          categoryAPI.getAll(),
          customerAPI.getProfile()
        ]);

        if (isMounted && catRes.status === 'fulfilled' && catRes.value?.categories?.length) {
          const cats = catRes.value.categories;
          setCategories(cats);
          
          // Match category from URL param (slug or _id) if present
          let targetCat = cats[0];
          if (queryCategory) {
            const matched = cats.find(c => c.slug === queryCategory || c._id === queryCategory);
            if (matched) targetCat = matched;
          }

          const targetSub = queryService && targetCat.subcategories?.includes(queryService)
            ? queryService
            : (queryService || targetCat.subcategories?.[0] || '');

          setFormData(prev => ({
            ...prev,
            category: targetCat._id,
            subcategory: targetSub,
            title: prev.title || queryTitle || (queryService ? `${queryService} Service` : '')
          }));
        }

        if (isMounted && profileRes.status === 'fulfilled' && profileRes.value?.profile) {
          const profile = profileRes.value.profile;
          const addrs = profile.addresses || [];
          setSavedAddresses(addrs);

          if (addrs.length > 0) {
            const def = addrs.find(a => a.isDefault) || addrs[0];
            setFormData(prev => ({
              ...prev,
              addressMode: 'saved',
              selectedSavedAddressId: def._id || '0',
              addressLabel: def.label || 'Home',
              street: def.street || '',
              city: def.city || 'Lucknow',
              state: def.state || 'Uttar Pradesh',
              zipCode: def.zipCode || '226010',
              coordinates: def.coordinates || { lat: 0, lng: 0 }
            }));
          } else {
            setFormData(prev => ({ ...prev, addressMode: 'manual' }));
          }
        }
      } catch (err) {
        console.error('Failed to load job creation dependencies:', err);
      } finally {
        if (isMounted) setLoadingInitial(false);
      }
    };

    fetchInitialData();
    return () => { isMounted = false; };
  }, []);

  // Currently selected category object
  const selectedCategoryObj = categories.find(c => c._id === formData.category) || categories[0];

  // Active service questions for the chosen category
  const activeQuestions = (selectedCategoryObj?.slug && SERVICE_QUESTIONS[selectedCategoryObj.slug]) || DEFAULT_QUESTIONS;

  // Handle Normal vs Emergency selection
  const handleSelectServiceType = (type) => {
    if (type === 'emergency') {
      const today = new Date().toISOString().split('T')[0];
      setFormData(prev => ({
        ...prev,
        serviceTypeChoice: 'emergency',
        urgency: 'emergency',
        scheduleType: 'specific',
        preferredDate: today,
        preferredTimeSlot: 'Immediate / Within 1 Hour',
        budgetType: prev.budgetType === 'quote' ? 'fixed' : prev.budgetType,
        budgetAmount: prev.budgetAmount || '499'
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        serviceTypeChoice: 'normal',
        urgency: 'medium',
        scheduleType: 'flexible'
      }));
    }
  };

  // Handle category change
  const handleCategoryChange = (catId) => {
    const found = categories.find(c => c._id === catId);
    setFormData(prev => ({
      ...prev,
      category: catId,
      subcategory: found?.subcategories?.[0] || '',
      serviceRequirements: {}
    }));
  };

  // Handle dynamic question input
  const handleRequirementChange = (qId, val) => {
    setFormData(prev => ({
      ...prev,
      serviceRequirements: {
        ...prev.serviceRequirements,
        [qId]: val
      }
    }));
  };

  // Handle saved address selection
  const handleSelectSavedAddress = (addr) => {
    setLocationSuccess(false);
    setLocationError('');
    setFormData(prev => ({
      ...prev,
      selectedSavedAddressId: addr._id || '',
      addressMode: 'saved',
      locationSource: 'saved_address',
      addressLabel: addr.label || 'Home',
      street: addr.street || '',
      locality: addr.locality || '',
      landmark: addr.landmark || '',
      city: addr.city || 'Lucknow',
      state: addr.state || 'Uttar Pradesh',
      zipCode: addr.zipCode || '226010',
      country: addr.country || 'India',
      coordinates: (addr.coordinates?.lat && addr.coordinates?.lng)
        ? { lat: Number(addr.coordinates.lat), lng: Number(addr.coordinates.lng) }
        : { lat: 0, lng: 0 },
      locationAccuracyMeters: null
    }));
    setFieldErrors(prev => {
      const updated = { ...prev };
      delete updated.street;
      delete updated.city;
      delete updated.zipCode;
      return updated;
    });
  };

  // Handle GPS Device Geolocation & Reverse Geocoding
  const handleFetchCurrentLocation = () => {
    setLocationError('');
    setLocationSuccess(false);

    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser. Please enter your address manually.');
      return;
    }

    setLocationLoading(true);
    setLocationStatusText('Acquiring GPS coordinates...');

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const accuracy = position.coords.accuracy ? Math.round(position.coords.accuracy) : null;

        // Associate detected coordinates immediately with GPS source
        setFormData(prev => ({
          ...prev,
          addressMode: 'manual',
          selectedSavedAddressId: '',
          locationSource: 'gps',
          coordinates: { lat, lng },
          locationAccuracyMeters: accuracy
        }));

        try {
          setLocationStatusText('Resolving street address...');
          const result = await locationAPI.reverseGeocode(lat, lng);

          if (result?.success && result?.address) {
            const addr = result.address;

            // Map fields cleanly without falling back to old saved address (prev.street)
            setFormData(prev => ({
              ...prev,
              addressMode: 'manual',
              selectedSavedAddressId: '',
              locationSource: 'gps',
              // Preserve manual house/flat number and landmark
              houseNumber: prev.houseNumber || '',
              landmark: prev.landmark || '',
              // Normalized address components from geocoder adapter
              street: addr.street || '',
              locality: addr.locality || '',
              city: addr.city || 'Lucknow',
              state: addr.state || 'Uttar Pradesh',
              zipCode: addr.zipCode || '',
              country: addr.country || 'India',
              coordinates: {
                lat: addr.coordinates?.lat || lat,
                lng: addr.coordinates?.lng || lng
              },
              locationAccuracyMeters: accuracy
            }));

            // Clear inline errors for populated fields
            setFieldErrors(prev => {
              const updated = { ...prev };
              if (addr.street) delete updated.street;
              if (addr.city) delete updated.city;
              if (addr.zipCode) delete updated.zipCode;
              return updated;
            });

            setLocationSuccess(true);
          } else {
            // Geocoding returned incomplete or failed, but GPS coordinates are retained!
            setLocationSuccess(false);
            setLocationError('GPS coordinates detected, but address could not be fully resolved. Please enter your street and house details manually.');
          }
        } catch (err) {
          console.warn('Reverse geocoding error:', err);
          // Retain detected coordinates
          setLocationSuccess(false);
          setLocationError('GPS coordinates detected, but reverse-geocoding service was unavailable. Please complete your street address manually.');
        } finally {
          setLocationLoading(false);
          setLocationStatusText('');
        }
      },
      (error) => {
        setLocationLoading(false);
        setLocationStatusText('');
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setLocationError('Location permission was denied. Please allow location access in your browser or enter your address manually.');
            break;
          case error.POSITION_UNAVAILABLE:
            setLocationError('Location information is currently unavailable. Please enter your address manually.');
            break;
          case error.TIMEOUT:
            setLocationError('Location request timed out. Please try again or enter your address manually.');
            break;
          default:
            setLocationError('Unable to detect location. Please enter your address manually.');
            break;
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  // Image Upload handler
  const handleImageFileChange = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    if (formData.images.length + files.length > 5) {
      setErrorBanner('You can upload a maximum of 5 photographs.');
      return;
    }

    try {
      setUploadingImage(true);
      setErrorBanner('');

      for (const file of files) {
        if (file.size > 5 * 1024 * 1024) {
          setErrorBanner(`File "${file.name}" exceeds the 5MB size limit.`);
          continue;
        }

        const res = await jobAPI.uploadImage(file);
        if (res?.url) {
          setFormData(prev => ({
            ...prev,
            images: [...prev.images, res.url]
          }));
        }
      }
    } catch (err) {
      console.error('Image upload failed:', err);
      setErrorBanner(err.response?.data?.message || 'Failed to upload photo. Please check file format.');
    } finally {
      setUploadingImage(false);
      e.target.value = '';
    }
  };

  const handleRemoveImage = (indexToRemove) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, idx) => idx !== indexToRemove)
    }));
  };

  // Validation per step
  const validateStep = (stepNumber) => {
    setErrorBanner('');
    const newErrors = {};

    if (stepNumber === 1) {
      if (!formData.title.trim()) {
        newErrors.title = 'Please enter a descriptive job title.';
      } else if (formData.title.trim().length < 3) {
        newErrors.title = 'Job title must be at least 3 characters long.';
      } else if (formData.title.trim().length > 120) {
        newErrors.title = 'Job title must not exceed 120 characters.';
      }

      if (!formData.description.trim()) {
        newErrors.description = 'Please explain the service problem or requirement in the description field.';
      } else if (formData.description.trim().length < 10) {
        newErrors.description = 'Please provide at least 10 characters of detail so professionals can quote accurately.';
      } else if (formData.description.trim().length > 2000) {
        newErrors.description = 'Description must not exceed 2000 characters.';
      }

      setFieldErrors(newErrors);
      if (Object.keys(newErrors).length > 0) {
        const firstErr = Object.values(newErrors)[0];
        setErrorBanner(firstErr);
        return false;
      }
      return true;
    }

    if (stepNumber === 2) {
      if (!formData.street.trim()) {
        newErrors.street = 'Please provide a street or neighborhood address.';
      }
      if (!formData.city.trim()) {
        newErrors.city = 'Please specify the city.';
      }
      if (!formData.zipCode.trim()) {
        newErrors.zipCode = 'Please enter a valid postal / PIN code.';
      } else if (!/^[1-9][0-9]{5}$/.test(formData.zipCode.trim())) {
        newErrors.zipCode = 'Please enter a valid 6-digit Indian PIN code (e.g. 226001).';
      }
      if (formData.scheduleType === 'specific') {
        if (!formData.preferredDate) {
          newErrors.preferredDate = 'Please choose your preferred appointment date.';
        } else {
          const todayIST = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
          if (formData.preferredDate < todayIST) {
            newErrors.preferredDate = 'Preferred service date cannot be in the past.';
          }
        }
      }

      setFieldErrors(newErrors);
      if (Object.keys(newErrors).length > 0) {
        const firstErr = Object.values(newErrors)[0];
        setErrorBanner(firstErr);
        return false;
      }
      return true;
    }

    if (stepNumber === 3) {
      if (formData.budgetType === 'fixed') {
        const val = Number(formData.budgetAmount);
        if (!val || val <= 0) {
          newErrors.budgetAmount = 'Please specify a positive fixed budget in INR.';
        }
      } else if (formData.budgetType === 'range') {
        const min = Number(formData.budgetMin);
        const max = Number(formData.budgetMax);
        if (!min || !max || min <= 0 || max <= 0) {
          newErrors.budgetRange = 'Please specify valid minimum and maximum budget amounts.';
        } else if (min > max) {
          newErrors.budgetRange = 'Minimum budget cannot exceed maximum budget.';
        }
      } else if (formData.budgetType === 'hourly') {
        const val = Number(formData.budgetAmount);
        if (!val || val <= 0) {
          newErrors.budgetAmount = 'Please specify an hourly rate expectation in INR.';
        }
      }

      setFieldErrors(newErrors);
      if (Object.keys(newErrors).length > 0) {
        const firstErr = Object.values(newErrors)[0];
        setErrorBanner(firstErr);
        return false;
      }
      return true;
    }

    setFieldErrors({});
    return true;
  };

  const handleNextStep = () => {
    if (validateStep(currentStep)) {
      setFieldErrors({});
      setErrorBanner('');
      setCurrentStep(prev => Math.min(prev + 1, 4));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePrevStep = () => {
    setErrorBanner('');
    setFieldErrors({});
    setCurrentStep(prev => Math.max(prev - 1, 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Final Form Submission
  const handleSubmitJob = async (e) => {
    e?.preventDefault();
    setErrorBanner('');

    if (!formData.acknowledged) {
      setErrorBanner('Please check the confirmation box to verify your service details before posting.');
      return;
    }

    setIsSubmitting(true);

    try {
      // Build budget payload
      let budgetPayload = { type: formData.budgetType, currency: 'INR' };
      if (formData.budgetType === 'fixed') {
        budgetPayload.amount = Number(formData.budgetAmount);
      } else if (formData.budgetType === 'range') {
        budgetPayload.minAmount = Number(formData.budgetMin);
        budgetPayload.maxAmount = Number(formData.budgetMax);
        budgetPayload.amount = Number(formData.budgetMax);
      } else if (formData.budgetType === 'hourly') {
        budgetPayload.amount = Number(formData.budgetAmount);
      } else {
        budgetPayload.amount = 0;
      }

      // Build location payload
      const locationPayload = {
        addressLabel: formData.addressLabel,
        houseNumber: formData.houseNumber,
        street: formData.street,
        locality: formData.locality,
        landmark: formData.landmark,
        instructions: (formData.accessInstructions || '').trim(),
        address: `${formData.houseNumber ? formData.houseNumber + ', ' : ''}${formData.street}${formData.locality ? ', ' + formData.locality : ''}`,
        city: formData.city,
        state: formData.state,
        zipCode: formData.zipCode,
        country: formData.country || 'India',
        locationSource: formData.locationSource || 'manual',
        locationAccuracyMeters: formData.locationAccuracyMeters,
        confirmedAt: new Date(),
        coordinates: formData.coordinates || { lat: 0, lng: 0 }
      };

      const payload = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        category: formData.category,
        subcategory: formData.subcategory,
        serviceRequirements: formData.serviceRequirements,
        urgency: formData.urgency,
        budget: budgetPayload,
        location: locationPayload,
        scheduleType: formData.scheduleType,
        preferredDate: formData.scheduleType === 'specific' ? formData.preferredDate : null,
        preferredTime: formData.scheduleType === 'specific' ? formData.preferredTimeSlot : 'Flexible',
        preferredTimeSlot: formData.scheduleType === 'specific' ? formData.preferredTimeSlot : 'anytime',
        alternateDate: formData.alternateDate,
        accessInstructions: (formData.accessInstructions || '').trim(),
        additionalInstructions: (formData.accessInstructions || '').trim(),
        images: formData.images,
        saveAddressToProfile: formData.saveAddressToProfile
      };

      const response = await jobAPI.create(payload);
      if (response?.success && response?.job) {
        setCreatedJob(response.job);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        throw new Error(response?.message || 'Unexpected response from server');
      }
    } catch (err) {
      console.error('Job submission failed:', err);
      const msg = err.response?.data?.message || err.message || 'Failed to submit service request. Please try again.';
      setErrorBanner(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Today's date string for min date picker (Asia/Kolkata timezone)
  const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());

  // -----------------------------------------------------------------
  // SUCCESS VIEW
  // -----------------------------------------------------------------
  if (createdJob) {
    const jobRef = `#JOB-${createdJob._id.slice(-6).toUpperCase()}`;
    return (
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6">
        <div className="bg-white border border-emerald-200/80 rounded-3xl p-6 sm:p-10 shadow-sm text-center">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-800 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-sm ring-8 ring-emerald-50">
            <CheckCircle2 className="w-9 h-9" />
          </div>

          <span className="inline-block px-3 py-1 bg-emerald-100 text-emerald-800 font-bold text-xs uppercase tracking-wider rounded-full mb-2">
            Job Broadcast Active
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Your Service Request is Live!
          </h1>
          <p className="text-sm text-slate-600 mt-2 max-w-xl mx-auto">
            Reference <span className="font-mono font-bold text-emerald-800">{jobRef}</span> has been dispatched to certified contractors in{' '}
            <span className="font-semibold text-slate-800">{createdJob.location?.city || formData.city}</span>.
          </p>

          {/* Job Details Card */}
          <div className="mt-8 bg-slate-50 border border-slate-200/80 rounded-2xl p-5 text-left max-w-2xl mx-auto">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-slate-200">
              <div>
                <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block">
                  {createdJob.category?.name || selectedCategoryObj?.name}
                </span>
                <h3 className="text-base font-bold text-slate-900 mt-0.5">{createdJob.title}</h3>
              </div>
              <span className={`px-2.5 py-1 text-xs font-bold rounded-lg uppercase tracking-wider ${
                createdJob.urgency === 'emergency'
                  ? 'bg-rose-100 text-rose-800'
                  : createdJob.urgency === 'high'
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-emerald-100 text-emerald-800'
              }`}>
                {createdJob.urgency} Urgency
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-4 text-xs">
              <div>
                <span className="text-slate-600 block">Subcategory:</span>
                <span className="font-semibold text-slate-800 mt-0.5 block">{createdJob.subcategory || 'Standard Service'}</span>
              </div>
              <div>
                <span className="text-slate-600 block">Budget Mode:</span>
                <span className="font-semibold text-slate-800 mt-0.5 block capitalize">
                  {createdJob.budget?.type === 'quote' ? 'Competitive Quotes' : `₹${createdJob.budget?.amount?.toLocaleString() || 0} (${createdJob.budget?.type})`}
                </span>
              </div>
              <div>
                <span className="text-slate-600 block">Service Area:</span>
                <span className="font-semibold text-slate-800 mt-0.5 block">{createdJob.location?.city || formData.city}</span>
              </div>
            </div>
          </div>

          {/* What happens next roadmap - Instant Assignment & OTP Verification */}
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto text-left">
            <div className="p-4 bg-white border border-slate-200 rounded-xl">
              <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 text-xs font-extrabold flex items-center justify-center mb-2">1</span>
              <h4 className="text-xs font-bold text-slate-900">Request Sent</h4>
              <p className="text-[11px] text-slate-600 mt-1">Eligible local professionals received your service request.</p>
            </div>
            <div className="p-4 bg-white border border-slate-200 rounded-xl">
              <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 text-xs font-extrabold flex items-center justify-center mb-2">2</span>
              <h4 className="text-xs font-bold text-slate-900">Instant Claim</h4>
              <p className="text-[11px] text-slate-600 mt-1">First verified professional to accept your request secures the job.</p>
            </div>
            <div className="p-4 bg-white border border-slate-200 rounded-xl">
              <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 text-xs font-extrabold flex items-center justify-center mb-2">3</span>
              <h4 className="text-xs font-bold text-slate-900">Service Start OTP</h4>
              <p className="text-[11px] text-slate-600 mt-1">Receive a 6-digit OTP to verify your professional upon arrival.</p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button
              variant="primary"
              size="md"
              icon={CheckCircle2}
              onClick={() => navigate('/customer/bookings')}
            >
              View Bookings & Service Start OTP
            </Button>
            <Button
              variant="secondary"
              size="md"
              onClick={() => navigate('/customer/my-jobs')}
            >
              Manage in My Jobs
            </Button>
            <button
              type="button"
              onClick={() => {
                setCreatedJob(null);
                setCurrentStep(1);
                setFormData(prev => ({
                  ...prev,
                  title: '',
                  description: '',
                  serviceRequirements: {},
                  images: [],
                  acknowledged: false
                }));
              }}
              className="text-xs font-bold text-emerald-800 hover:text-emerald-950 underline px-3 py-2"
            >
              Post Another Job
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Loading skeleton
  if (loadingInitial) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4 flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-emerald-800 animate-spin mb-3" />
        <p className="text-sm font-semibold text-slate-700">Loading service catalogue & profiles...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6">
      {/* Wizard Header */}
      <div className="mb-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider block">Customer Job Dispatcher</span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-0.5 tracking-tight">Post a Service Job</h1>
          </div>
          <span className="text-xs font-bold px-3 py-1 bg-slate-100 text-slate-700 rounded-full border border-slate-200">
            Step {currentStep} of 4
          </span>
        </div>
        <p className="text-xs text-slate-600 mt-1">
          Provide your project requirements to receive competitive bids from verified local service providers.
        </p>

        {/* Progress Bar & Steps Tabs */}
        <div className="mt-6">
          <div className="grid grid-cols-4 gap-2">
            {[
              { num: 1, label: 'Service Details' },
              { num: 2, label: 'Location & Schedule' },
              { num: 3, label: 'Budget & Photos' },
              { num: 4, label: 'Review & Submit' }
            ].map((step) => {
              const isPassed = currentStep > step.num;
              const isCurrent = currentStep === step.num;
              return (
                <button
                  key={step.num}
                  type="button"
                  onClick={() => {
                    if (isPassed) setCurrentStep(step.num);
                  }}
                  disabled={!isPassed && !isCurrent}
                  className={`text-left pb-2 transition-all border-b-4 ${
                    isCurrent
                      ? 'border-emerald-800 text-slate-900'
                      : isPassed
                      ? 'border-emerald-600 text-emerald-900 cursor-pointer hover:border-emerald-700'
                      : 'border-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  <span className="text-[10px] uppercase font-bold tracking-wider block">
                    {isPassed ? `✓ Step ${step.num}` : `Step ${step.num}`}
                  </span>
                  <span className="text-xs font-bold truncate block">{step.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Global Error Banner */}
      {errorBanner && (
        <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-3 shadow-sm">
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-700 mt-0.5" />
          <div className="flex-1">
            <span className="font-bold block">Please review the following:</span>
            <span>{errorBanner}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorBanner('')}
            className="text-rose-500 hover:text-rose-700 p-0.5"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Wizard Form Container */}
      <div className="bg-white border border-slate-200 shadow-sm rounded-3xl p-6 sm:p-8">

        {/* -------------------------------------------------------------
            STEP 1: SELECT SERVICE & DETAILS
        ------------------------------------------------------------- */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <div className="pb-4 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900">Select Service Category & Scope</h2>
              <p className="text-xs text-slate-600 mt-0.5">
                Choose between scheduled routine service or priority emergency dispatch.
              </p>
            </div>

            {/* Clear Choice: Normal Service vs Emergency Service */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-2">
                Service Request Type <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handleSelectServiceType('normal')}
                  className={`p-4 rounded-2xl border text-left transition-all flex items-start gap-3.5 ${
                    formData.serviceTypeChoice !== 'emergency'
                      ? 'bg-emerald-50/70 border-emerald-600 ring-2 ring-emerald-600/20'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                    formData.serviceTypeChoice !== 'emergency'
                      ? 'bg-emerald-700 text-white'
                      : 'bg-slate-100 text-slate-600'
                  }`}>
                    <Wrench className="w-4 h-4" />
                  </div>
                  <div className="space-y-0.5 min-w-0">
                    <span className="text-xs font-extrabold text-slate-900 block">Normal Service</span>
                    <p className="text-[11px] text-slate-600 leading-snug">
                      Scheduled maintenance, installations, routine repairs, and inspection quotes at standard rates.
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectServiceType('emergency')}
                  className={`p-4 rounded-2xl border text-left transition-all flex items-start gap-3.5 ${
                    formData.serviceTypeChoice === 'emergency'
                      ? 'bg-amber-50/80 border-amber-600 ring-2 ring-amber-600/20'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                    formData.serviceTypeChoice === 'emergency'
                      ? 'bg-amber-600 text-white'
                      : 'bg-slate-100 text-slate-600'
                  }`}>
                    <Zap className="w-4 h-4 fill-current" />
                  </div>
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-extrabold text-slate-900 block">Emergency Service</span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold uppercase bg-amber-200 text-amber-900">
                        Priority Dispatch
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 leading-snug">
                      Immediate dispatch for burst pipes, power outages, and acute breakdowns. First available pro wins.
                    </p>
                  </div>
                </button>
              </div>
            </div>

            {/* Emergency Notice & Privacy Protection Explanation */}
            {formData.serviceTypeChoice === 'emergency' && (
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-2">
                <div className="flex items-center gap-2 font-bold text-amber-950">
                  <Zap className="w-4 h-4 text-amber-600 fill-amber-600" />
                  <span>Emergency Service Dispatch Protocol</span>
                </div>
                <p className="text-[11px] text-amber-900 leading-relaxed">
                  • <strong>First Acceptance Wins:</strong> Your request will instantly notify all eligible verified professionals in your locality who have emergency availability enabled. The first professional to accept wins the job and gets assigned.
                </p>
                <p className="text-[11px] text-amber-900 leading-relaxed">
                  • <strong>Availability Notice:</strong> Emergency response depends on active nearby professionals. While dispatched with top priority, an immediate response cannot be 100% guaranteed if technicians are on other active jobs.
                </p>
                <p className="text-[11px] text-amber-900 leading-relaxed">
                  • <strong>Privacy Protected:</strong> Your full house number, exact coordinates, and personal phone number are hidden from candidate contractors. Full contact details are only shared with the one professional who confirms acceptance.
                </p>
              </div>
            )}

            {/* Category and Subcategory Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  Primary Service Domain <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-xs font-medium text-slate-900 focus:outline-none focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700 shadow-sm"
                >
                  {categories.map((cat) => (
                    <option key={cat._id} value={cat._id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
                {selectedCategoryObj && (
                  <div className="mt-2.5 p-2 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-2.5">
                    <div className="w-12 h-10 rounded-lg overflow-hidden shrink-0 bg-slate-200 border border-slate-300/60">
                      <img
                        src={getServiceImage(selectedCategoryObj.name, formData.subcategory) || getCategoryMedia(selectedCategoryObj).image}
                        alt={selectedCategoryObj.name}
                        onError={handleImageFallback}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-800 truncate">{selectedCategoryObj.name}</p>
                      <p className="text-[10px] text-slate-500 line-clamp-1">{selectedCategoryObj.description || 'Verified licensed trade specialists'}</p>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  Subcategory / Specialization <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData.subcategory}
                  onChange={(e) => setFormData({ ...formData, subcategory: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-xs font-medium text-slate-900 focus:outline-none focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700 shadow-sm"
                >
                  {selectedCategoryObj?.subcategories?.map((sub, idx) => {
                    const subName = typeof sub === 'string' ? sub : sub?.name || `Option ${idx + 1}`;
                    return (
                      <option key={idx} value={subName}>
                        {subName}
                      </option>
                    );
                  })}
                </select>
                <p className="text-[11px] text-slate-500 mt-1">
                  Filters contractor bidding to technicians with this exact skill set.
                </p>
              </div>
            </div>

            {/* Job Title */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-xs font-bold text-slate-800">
                  Job Title <span className="text-rose-500">*</span>
                </label>
                <span className={`text-[11px] font-medium ${formData.title.length > 110 ? 'text-amber-600 font-bold' : 'text-slate-500'}`}>
                  {formData.title.length} / 120 chars
                </span>
              </div>
              <input
                type="text"
                maxLength={120}
                placeholder="e.g. AC Not Cooling — Need Inspection & Gas Top-up"
                value={formData.title}
                onChange={(e) => {
                  setFormData(prev => ({ ...prev, title: e.target.value }));
                  if (fieldErrors.title) setFieldErrors(prev => ({ ...prev, title: '' }));
                  if (errorBanner) setErrorBanner('');
                }}
                className={`w-full px-4 py-2.5 rounded-xl bg-white text-xs text-slate-900 placeholder-slate-400 focus:outline-none shadow-sm transition-colors ${
                  fieldErrors.title
                    ? 'border-2 border-rose-500 focus:border-rose-600 focus:ring-1 focus:ring-rose-500 bg-rose-50/20'
                    : 'border border-slate-300 focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700'
                }`}
              />
              {fieldErrors.title ? (
                <p className="text-xs text-rose-600 font-semibold mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  {fieldErrors.title}
                </p>
              ) : (
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Be concise and clear. Mention the specific problem or task (e.g. AC cooling, Tap Leak, Switchboard).
                </span>
              )}
            </div>

            {/* Detailed Description */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-xs font-bold text-slate-800">
                  Detailed Requirement / Problem Description <span className="text-rose-500">*</span>
                </label>
                <span className={`text-[11px] font-medium ${formData.description.length > 1900 ? 'text-amber-600 font-bold' : 'text-slate-500'}`}>
                  {formData.description.length} / 2000 chars
                </span>
              </div>
              <textarea
                rows={4}
                maxLength={2000}
                placeholder="Explain what needs to be fixed, installed, cleaned, or assembled. Include any relevant dimensions, brand names, observed symptoms, or special access requirements..."
                value={formData.description}
                onChange={(e) => {
                  setFormData(prev => ({ ...prev, description: e.target.value }));
                  if (fieldErrors.description) setFieldErrors(prev => ({ ...prev, description: '' }));
                  if (errorBanner) setErrorBanner('');
                }}
                className={`w-full px-4 py-3 rounded-xl bg-white text-xs text-slate-900 placeholder-slate-400 focus:outline-none shadow-sm transition-colors ${
                  fieldErrors.description
                    ? 'border-2 border-rose-500 focus:border-rose-600 focus:ring-1 focus:ring-rose-500 bg-rose-50/20'
                    : 'border border-slate-300 focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700'
                }`}
              />
              <div className="flex justify-between items-center text-[11px] mt-1">
                {fieldErrors.description ? (
                  <p className="text-xs text-rose-600 font-semibold flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    {fieldErrors.description}
                  </p>
                ) : (
                  <span className="text-slate-500">Min 10 characters. Describe symptoms clearly so professionals can quote accurately.</span>
                )}
              </div>
            </div>

            {/* Service-Specific Dynamic Questions */}
            <div className="p-4 bg-slate-50 border border-slate-200/90 rounded-2xl space-y-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-800" />
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Service Specifications ({selectedCategoryObj?.name})
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {activeQuestions.map((q) => (
                  <div key={q.id} className={q.type === 'radio' ? 'sm:col-span-2' : ''}>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      {q.label}
                    </label>

                    {q.type === 'select' && (
                      <select
                        value={formData.serviceRequirements[q.id] || q.options[0]}
                        onChange={(e) => handleRequirementChange(q.id, e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700 shadow-sm"
                      >
                        <option value="">-- Choose Option --</option>
                        {q.options.map((opt, i) => (
                          <option key={i} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    )}

                    {q.type === 'radio' && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {q.options.map((opt, i) => {
                          const isSelected = formData.serviceRequirements[q.id] === opt;
                          return (
                            <button
                              key={i}
                              type="button"
                              onClick={() => handleRequirementChange(q.id, opt)}
                              className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all text-left ${
                                isSelected
                                  ? 'bg-emerald-50 border-emerald-700 text-emerald-900 ring-1 ring-emerald-700'
                                  : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                              }`}
                            >
                              {opt}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {q.type === 'text' && (
                      <input
                        type="text"
                        placeholder={q.placeholder || ''}
                        value={formData.serviceRequirements[q.id] || ''}
                        onChange={(e) => handleRequirementChange(q.id, e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700 shadow-sm"
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Next Action */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-100">
              <div className="w-full sm:w-auto">
                {errorBanner && (
                  <span className="text-xs text-rose-700 font-semibold flex items-center gap-1.5 bg-rose-50 px-3 py-2 rounded-xl border border-rose-200 shadow-sm">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                    {errorBanner}
                  </span>
                )}
              </div>
              <Button
                variant="primary"
                size="md"
                icon={ChevronRight}
                onClick={handleNextStep}
                className="w-full sm:w-auto"
              >
                Continue to Location & Schedule
              </Button>
            </div>
          </div>
        )}

        {/* -------------------------------------------------------------
            STEP 2: LOCATION & SCHEDULE
        ------------------------------------------------------------- */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <div className="pb-4 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900">Service Location & Appointment Schedule</h2>
              <p className="text-xs text-slate-600 mt-0.5">
                Exact addresses are safeguarded and only disclosed to the technician you hire.
              </p>
            </div>

            {/* GPS Current Location Action Bar */}
            <div className="bg-emerald-50/70 border border-emerald-200/90 rounded-2xl p-4 sm:p-5 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-emerald-700 text-white flex items-center justify-center shrink-0 shadow-xs">
                    {locationLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Compass className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-2">
                      Device Geolocation
                      {locationSuccess && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md">
                          <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                          Address Detected
                        </span>
                      )}
                    </h3>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Automatically fill your address using your device location.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={locationLoading}
                  onClick={handleFetchCurrentLocation}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white hover:bg-emerald-50 text-emerald-800 hover:text-emerald-950 border border-emerald-600 font-bold text-xs rounded-xl shadow-xs transition-all active:scale-95 disabled:opacity-60 disabled:pointer-events-none shrink-0"
                >
                  {locationLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-emerald-700" />
                      <span>{locationStatusText || 'Detecting Location...'}</span>
                    </>
                  ) : (
                    <>
                      <Navigation className="w-4 h-4 text-emerald-700 fill-emerald-100" />
                      <span>Use My Current Location</span>
                    </>
                  )}
                </button>
              </div>

              {/* Status Feedback Banners */}
              {locationSuccess && (
                <div className="mt-3.5 p-3 bg-white border border-emerald-300 rounded-xl text-xs text-emerald-900 flex items-start gap-2 shadow-xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <span className="font-bold block">Location detected. Please verify your address and add your house or flat number.</span>
                    <span className="text-slate-600">GPS accurately identifies your street and locality; please enter your building/floor number below.</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setLocationSuccess(false)}
                    className="text-emerald-700 hover:text-emerald-900 text-xs font-bold p-0.5"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {locationError && (
                <div className="mt-3.5 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <span className="font-bold block">Location Notice:</span>
                    <span>{locationError}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setLocationError('')}
                    className="text-rose-600 hover:text-rose-800 text-xs font-bold p-0.5"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* Saved Addresses Toggle if user has saved addresses */}
            {savedAddresses.length > 0 && (
              <div className="space-y-3">
                <label className="block text-xs font-bold text-slate-800">
                  Select a Saved Address or Enter New
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {savedAddresses.map((addr) => {
                    const isSelected = formData.addressMode === 'saved' && formData.selectedSavedAddressId === addr._id;
                    return (
                      <div
                        key={addr._id}
                        onClick={() => {
                          setFormData(prev => ({ ...prev, addressMode: 'saved' }));
                          handleSelectSavedAddress(addr);
                        }}
                        className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-emerald-50 border-emerald-700 ring-2 ring-emerald-700/30'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-emerald-800" />
                            {addr.label || 'Saved Location'}
                          </span>
                          {addr.isDefault && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded">
                              Default
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-600 truncate">{addr.street}</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {addr.city}, {addr.state} - {addr.zipCode}
                        </p>
                      </div>
                    );
                  })}

                  <div
                    onClick={() => {
                      setLocationSuccess(false);
                      setLocationError('');
                      setFormData(prev => ({
                        ...prev,
                        addressMode: 'manual',
                        selectedSavedAddressId: '',
                        locationSource: 'manual',
                        street: '',
                        houseNumber: '',
                        locality: '',
                        landmark: '',
                        coordinates: { lat: 0, lng: 0 },
                        locationAccuracyMeters: null
                      }));
                    }}
                    className={`p-3.5 rounded-2xl border cursor-pointer flex flex-col justify-center items-center text-center transition-all ${
                      formData.addressMode === 'manual' && formData.locationSource === 'manual'
                        ? 'bg-emerald-50 border-emerald-700 ring-2 ring-emerald-700/30'
                        : 'bg-slate-50 border-dashed border-slate-300 hover:border-slate-400'
                    }`}
                  >
                    <span className="text-xs font-bold text-slate-800">+ Enter a Different Address</span>
                    <span className="text-[11px] text-slate-500 mt-0.5">Custom location for this specific service</span>
                  </div>
                </div>
              </div>
            )}

            {/* Address Form Fields */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Service Address Details
                </span>
                {formData.coordinates?.lat && formData.coordinates?.lng ? (
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-md border border-emerald-200">
                      <MapPin className="w-3 h-3 text-emerald-700" />
                      GPS Coordinates Attached ({formData.coordinates.lat.toFixed(4)}, {formData.coordinates.lng.toFixed(4)})
                      {formData.locationSource === 'gps' && ' · Live GPS'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, coordinates: { lat: 0, lng: 0 }, locationSource: 'manual' }))}
                      className="text-[10px] text-slate-500 hover:text-rose-600 underline"
                      title="Clear attached coordinates"
                    >
                      Clear
                    </button>
                  </div>
                ) : null}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Address Label</label>
                  <select
                    value={formData.addressLabel}
                    onChange={(e) => setFormData({ ...formData, addressLabel: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs text-slate-900 shadow-sm"
                  >
                    <option value="Home">Home</option>
                    <option value="Office">Office</option>
                    <option value="Rental Property">Rental Property</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">House / Flat / Unit #</label>
                  <input
                    type="text"
                    placeholder="e.g. Flat 402, Tower B"
                    value={formData.houseNumber}
                    onChange={(e) => setFormData({ ...formData, houseNumber: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs text-slate-900 shadow-sm"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">Add floor/unit number</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Street / Road / Colony <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Vibhuti Khand, Gomti Nagar"
                    value={formData.street}
                    onChange={(e) => {
                      setFormData({ ...formData, street: e.target.value });
                      if (fieldErrors.street) setFieldErrors(prev => ({ ...prev, street: '' }));
                    }}
                    className={`w-full px-3 py-2 rounded-xl bg-white text-xs text-slate-900 shadow-sm focus:outline-none ${
                      fieldErrors.street
                        ? 'border-2 border-rose-500 focus:border-rose-600 focus:ring-1 focus:ring-rose-500'
                        : 'border border-slate-300 focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700'
                    }`}
                  />
                  {fieldErrors.street && (
                    <p className="text-[11px] text-rose-600 font-semibold mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      {fieldErrors.street}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Locality / Area</label>
                  <input
                    type="text"
                    placeholder="e.g. Sector 4"
                    value={formData.locality}
                    onChange={(e) => setFormData({ ...formData, locality: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs text-slate-900 shadow-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Landmark (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Near Wave Mall"
                    value={formData.landmark}
                    onChange={(e) => setFormData({ ...formData, landmark: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs text-slate-900 shadow-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    City <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="City"
                    value={formData.city}
                    onChange={(e) => {
                      setFormData({ ...formData, city: e.target.value });
                      if (fieldErrors.city) setFieldErrors(prev => ({ ...prev, city: '' }));
                    }}
                    className={`w-full px-3 py-2 rounded-xl bg-white text-xs text-slate-900 shadow-sm focus:outline-none ${
                      fieldErrors.city
                        ? 'border-2 border-rose-500 focus:border-rose-600 focus:ring-1 focus:ring-rose-500'
                        : 'border border-slate-300 focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700'
                    }`}
                  />
                  {fieldErrors.city && (
                    <p className="text-[11px] text-rose-600 font-semibold mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      {fieldErrors.city}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    PIN / Postal Code <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 226010"
                    value={formData.zipCode}
                    onChange={(e) => {
                      setFormData({ ...formData, zipCode: e.target.value });
                      if (fieldErrors.zipCode) setFieldErrors(prev => ({ ...prev, zipCode: '' }));
                    }}
                    className={`w-full px-3 py-2 rounded-xl bg-white text-xs text-slate-900 shadow-sm focus:outline-none ${
                      fieldErrors.zipCode
                        ? 'border-2 border-rose-500 focus:border-rose-600 focus:ring-1 focus:ring-rose-500'
                        : 'border border-slate-300 focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700'
                    }`}
                  />
                  {fieldErrors.zipCode && (
                    <p className="text-[11px] text-rose-600 font-semibold mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      {fieldErrors.zipCode}
                    </p>
                  )}
                </div>
              </div>

              {/* Optional Entry / Access Instructions */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Access & Arrival Instructions (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Call 10 minutes prior, gate passcode 1234, 3rd floor left door, lift available"
                  value={formData.accessInstructions}
                  onChange={(e) => setFormData({ ...formData, accessInstructions: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs text-slate-900 shadow-sm"
                />
                <span className="text-[10px] text-slate-500 mt-0.5 block">
                  Helpful entry directions and landmark cues for the technician upon arrival.
                </span>
              </div>

              {formData.addressMode === 'manual' && (
                <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={formData.saveAddressToProfile}
                    onChange={(e) => setFormData({ ...formData, saveAddressToProfile: e.target.checked })}
                    className="w-4 h-4 text-emerald-800 rounded border-slate-300 focus:ring-emerald-700"
                  />
                  <span>Save this address to my profile for future service orders</span>
                </label>
              )}

              <div className="flex items-center gap-2 p-2.5 bg-emerald-50/60 border border-emerald-200/60 rounded-xl text-[11px] text-emerald-900">
                <ShieldCheck className="w-4 h-4 text-emerald-800 shrink-0" />
                <span>
                  <strong>Privacy Protected:</strong> Public job browsing displays only your city and locality. Your building and house number are only shared with the vendor you hire.
                </span>
              </div>
            </div>

            {/* Schedule Section */}
            <div className="space-y-4 pt-2">
              <h3 className="text-sm font-bold text-slate-900">Preferred Service Schedule</h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div
                  onClick={() => setFormData({ ...formData, scheduleType: 'flexible' })}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                    formData.scheduleType === 'flexible'
                      ? 'bg-emerald-50 border-emerald-700 ring-2 ring-emerald-700/30'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-emerald-800" />
                    <span className="text-xs font-bold text-slate-900">Flexible Schedule</span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-1">
                    Coordinate date and arrival time directly with the hired professional based on mutual convenience.
                  </p>
                </div>

                <div
                  onClick={() => setFormData({ ...formData, scheduleType: 'specific' })}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                    formData.scheduleType === 'specific'
                      ? 'bg-emerald-50 border-emerald-700 ring-2 ring-emerald-700/30'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-emerald-800" />
                    <span className="text-xs font-bold text-slate-900">Specific Date & Time Window</span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-1">
                    Request service on a specific target date with a preferred arrival time window.
                  </p>
                </div>
              </div>

              {formData.scheduleType === 'specific' && (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Preferred Date <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="date"
                      min={todayStr}
                      value={formData.preferredDate}
                      onChange={(e) => setFormData({ ...formData, preferredDate: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs text-slate-900 shadow-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Time Window</label>
                    <select
                      value={formData.preferredTimeSlot}
                      onChange={(e) => setFormData({ ...formData, preferredTimeSlot: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs text-slate-900 shadow-sm"
                    >
                      <option value="anytime">Anytime during working hours</option>
                      <option value="morning">Morning (8:00 AM - 12:00 PM)</option>
                      <option value="afternoon">Afternoon (12:00 PM - 4:00 PM)</option>
                      <option value="evening">Evening (4:00 PM - 8:00 PM)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Alternate Date (Optional)</label>
                    <input
                      type="date"
                      min={todayStr}
                      value={formData.alternateDate}
                      onChange={(e) => setFormData({ ...formData, alternateDate: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs text-slate-900 shadow-sm"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Stepper Navigation */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-100">
              <Button
                variant="secondary"
                size="md"
                icon={ChevronLeft}
                onClick={handlePrevStep}
              >
                Back
              </Button>
              <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                {errorBanner && (
                  <span className="text-xs text-rose-700 font-semibold flex items-center gap-1.5 bg-rose-50 px-3 py-2 rounded-xl border border-rose-200 shadow-sm">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                    {errorBanner}
                  </span>
                )}
                <Button
                  variant="primary"
                  size="md"
                  icon={ChevronRight}
                  onClick={handleNextStep}
                  className="w-full sm:w-auto"
                >
                  Continue to Budget & Photos
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* -------------------------------------------------------------
            STEP 3: BUDGET, URGENCY & PHOTOS
        ------------------------------------------------------------- */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <div className="pb-4 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900">Budget, Urgency & Photographs</h2>
              <p className="text-xs text-slate-600 mt-0.5">
                Set expectations and attach photos of the area to receive accurate, tailored proposals.
              </p>
            </div>

            {/* Budget Mode Selector */}
            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-800">
                Budget / Pricing Preference
              </label>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { id: 'quote', label: 'Let Vendors Quote', desc: 'Recommended for inspections' },
                  { id: 'fixed', label: 'Fixed Budget', desc: 'Set expected total in ₹' },
                  { id: 'range', label: 'Price Range', desc: 'Min and max bracket' },
                  { id: 'hourly', label: 'Hourly Rate', desc: 'Rate per hour in ₹' }
                ].map((b) => {
                  const isSelected = formData.budgetType === b.id;
                  return (
                    <div
                      key={b.id}
                      onClick={() => setFormData({ ...formData, budgetType: b.id })}
                      className={`p-3 rounded-2xl border cursor-pointer text-left transition-all ${
                        isSelected
                          ? 'bg-emerald-50 border-emerald-700 ring-2 ring-emerald-700/30'
                          : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <span className="text-xs font-bold text-slate-900 block">{b.label}</span>
                      <span className="text-[11px] text-slate-500 mt-0.5 block leading-tight">{b.desc}</span>
                    </div>
                  );
                })}
              </div>

              {/* Dynamic Budget Amount Inputs */}
              {formData.budgetType === 'fixed' && (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl max-w-sm">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Fixed Budget Amount (₹ INR) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">₹</span>
                    <input
                      type="number"
                      min="50"
                      step="50"
                      placeholder="e.g. 1500"
                      value={formData.budgetAmount}
                      onChange={(e) => setFormData({ ...formData, budgetAmount: e.target.value })}
                      className="w-full pl-7 pr-3 py-2 rounded-xl bg-white border border-slate-300 text-xs font-bold text-slate-900 shadow-sm"
                    />
                  </div>
                </div>
              )}

              {formData.budgetType === 'range' && (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl grid grid-cols-2 gap-3 max-w-md">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Min Amount (₹) <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">₹</span>
                      <input
                        type="number"
                        min="50"
                        step="50"
                        placeholder="e.g. 800"
                        value={formData.budgetMin}
                        onChange={(e) => setFormData({ ...formData, budgetMin: e.target.value })}
                        className="w-full pl-7 pr-3 py-2 rounded-xl bg-white border border-slate-300 text-xs font-bold text-slate-900 shadow-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Max Amount (₹) <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">₹</span>
                      <input
                        type="number"
                        min="50"
                        step="50"
                        placeholder="e.g. 2000"
                        value={formData.budgetMax}
                        onChange={(e) => setFormData({ ...formData, budgetMax: e.target.value })}
                        className="w-full pl-7 pr-3 py-2 rounded-xl bg-white border border-slate-300 text-xs font-bold text-slate-900 shadow-sm"
                      />
                    </div>
                  </div>
                </div>
              )}

              {formData.budgetType === 'hourly' && (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl max-w-sm">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Expected Rate per Hour (₹ INR) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">₹</span>
                    <input
                      type="number"
                      min="50"
                      step="50"
                      placeholder="e.g. 350"
                      value={formData.budgetAmount}
                      onChange={(e) => setFormData({ ...formData, budgetAmount: e.target.value })}
                      className="w-full pl-7 pr-3 py-2 rounded-xl bg-white border border-slate-300 text-xs font-bold text-slate-900 shadow-sm"
                    />
                  </div>
                </div>
              )}

              <p className="text-[11px] text-slate-500 italic">
                Note: Budgets serve as expectations for vendor bids and do not charge your account until you confirm a quote.
              </p>
            </div>

            {/* Urgency Selector */}
            <div className="space-y-3 pt-2">
              <label className="block text-xs font-bold text-slate-800">
                Service Urgency
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                {[
                  { id: 'low', label: 'Low', badge: 'Flexible', desc: 'Within 1-2 weeks', border: 'hover:border-slate-300' },
                  { id: 'medium', label: 'Medium', badge: 'Standard', desc: 'Within 2-3 days', border: 'hover:border-slate-300' },
                  { id: 'high', label: 'High', badge: 'Priority', desc: 'Today or Tomorrow', border: 'hover:border-amber-300' },
                  { id: 'emergency', label: 'Emergency', badge: 'Critical', desc: 'Immediate attention', border: 'hover:border-rose-300' }
                ].map((u) => {
                  const isSelected = formData.urgency === u.id;
                  return (
                    <div
                      key={u.id}
                      onClick={() => setFormData({ ...formData, urgency: u.id })}
                      className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                        isSelected
                          ? u.id === 'emergency'
                            ? 'bg-rose-50 border-rose-600 ring-2 ring-rose-500/30'
                            : u.id === 'high'
                            ? 'bg-amber-50 border-amber-600 ring-2 ring-amber-500/30'
                            : 'bg-emerald-50 border-emerald-700 ring-2 ring-emerald-700/30'
                          : `bg-white border-slate-200 ${u.border}`
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900">{u.label}</span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          u.id === 'emergency'
                            ? 'bg-rose-100 text-rose-800'
                            : u.id === 'high'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}>
                          {u.badge}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-500 mt-1 block">{u.desc}</span>
                    </div>
                  );
                })}
              </div>

              {formData.urgency === 'emergency' && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-xs text-rose-800">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>
                    Emergency requests are highlighted with high visual priority to on-duty contractors in your zip code.
                  </span>
                </div>
              )}
            </div>

            {/* Photos & Attachments Upload */}
            <div className="space-y-3 pt-2">
              <label className="block text-xs font-bold text-slate-800">
                Photographs & Documentation (Optional, Up to 5)
              </label>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {formData.images.map((imgUrl, idx) => (
                  <div key={idx} className="relative group rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 aspect-square">
                    <img src={imgUrl} alt={`Upload ${idx + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(idx)}
                      className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-slate-900/80 text-white flex items-center justify-center hover:bg-rose-600 transition-colors shadow-sm"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}

                {formData.images.length < 5 && (
                  <label className={`relative rounded-2xl border-2 border-dashed flex flex-col items-center justify-center p-3 text-center cursor-pointer transition-all aspect-square ${
                    uploadingImage
                      ? 'bg-slate-100 border-slate-300 cursor-not-allowed'
                      : 'bg-slate-50 hover:bg-slate-100 border-slate-300 hover:border-emerald-700'
                  }`}>
                    {uploadingImage ? (
                      <Loader2 className="w-6 h-6 text-emerald-800 animate-spin" />
                    ) : (
                      <>
                        <Upload className="w-5 h-5 text-slate-500 mb-1" />
                        <span className="text-[11px] font-bold text-slate-700">Add Photo</span>
                        <span className="text-[10px] text-slate-600">JPG/PNG &lt;5MB</span>
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      disabled={uploadingImage}
                      onChange={handleImageFileChange}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
              <p className="text-[11px] text-slate-600">
                Clear photos of damaged components, water leaks, or breaker boxes help technicians formulate accurate quotes.
              </p>
            </div>

            {/* Stepper Navigation */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-100">
              <Button
                variant="secondary"
                size="md"
                icon={ChevronLeft}
                onClick={handlePrevStep}
              >
                Back
              </Button>
              <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                {errorBanner && (
                  <span className="text-xs text-rose-700 font-semibold flex items-center gap-1.5 bg-rose-50 px-3 py-2 rounded-xl border border-rose-200 shadow-sm">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                    {errorBanner}
                  </span>
                )}
                <Button
                  variant="primary"
                  size="md"
                  icon={ChevronRight}
                  onClick={handleNextStep}
                  className="w-full sm:w-auto"
                >
                  Review Summary & Submit
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* -------------------------------------------------------------
            STEP 4: REVIEW & SUBMIT
        ------------------------------------------------------------- */}
        {currentStep === 4 && (
          <div className="space-y-6">
            <div className="pb-4 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900">Review & Confirm Service Request</h2>
              <p className="text-xs text-slate-600 mt-0.5">
                Verify all information before broadcasting your request to certified local technicians.
              </p>
            </div>

            {/* Summary Cards with quick edit jump */}
            <div className="space-y-4">
              {/* Card 1: Service */}
              <div className="p-4 bg-slate-50 border border-slate-200/90 rounded-2xl relative">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">
                    1. Service Requirement
                  </span>
                  <button
                    type="button"
                    onClick={() => setCurrentStep(1)}
                    className="text-xs font-bold text-emerald-800 hover:text-emerald-950 underline"
                  >
                    Edit
                  </button>
                </div>
                <h4 className="text-base font-bold text-slate-900">{formData.title}</h4>
                <p className="text-xs text-slate-600 mt-1 whitespace-pre-line">{formData.description}</p>
                <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-slate-200 text-xs">
                  <span className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-slate-700 font-medium">
                    Domain: <strong className="text-slate-900">{selectedCategoryObj?.name}</strong>
                  </span>
                  <span className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-slate-700 font-medium">
                    Subcategory: <strong className="text-slate-900">{formData.subcategory || 'Standard'}</strong>
                  </span>
                  {Object.entries(formData.serviceRequirements).map(([key, val]) => (
                    <span key={key} className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-slate-700 font-medium capitalize">
                      {key}: <strong className="text-slate-900">{String(val)}</strong>
                    </span>
                  ))}
                </div>
              </div>

              {/* Card 2: Location & Schedule */}
              <div className="p-4 bg-slate-50 border border-slate-200/90 rounded-2xl relative">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">
                    2. Location & Schedule
                  </span>
                  <button
                    type="button"
                    onClick={() => setCurrentStep(2)}
                    className="text-xs font-bold text-emerald-800 hover:text-emerald-950 underline"
                  >
                    Edit
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-600 block">Service Address:</span>
                    <span className="font-semibold text-slate-900 mt-0.5 block">
                      {formData.houseNumber ? `${formData.houseNumber}, ` : ''}{formData.street}
                      {formData.locality ? `, ${formData.locality}` : ''}
                    </span>
                    <span className="text-slate-600 mt-0.5 block">
                      {formData.city}, {formData.state} - {formData.zipCode}
                    </span>
                    {formData.coordinates?.lat && formData.coordinates?.lng ? (
                      <span className="inline-flex items-center gap-1 text-[10px] text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded mt-1.5 font-semibold">
                        <MapPin className="w-3 h-3 text-emerald-700" />
                        GPS Pinned: {formData.coordinates.lat.toFixed(4)}, {formData.coordinates.lng.toFixed(4)}
                      </span>
                    ) : null}
                    {formData.accessInstructions && (
                      <span className="text-[11px] text-slate-700 bg-white border border-slate-200 rounded-md px-2 py-1 mt-1.5 block">
                        <strong>Arrival Instructions:</strong> {formData.accessInstructions}
                      </span>
                    )}
                  </div>
                  <div>
                    <span className="text-slate-600 block">Appointment Schedule:</span>
                    <span className="font-semibold text-slate-900 mt-0.5 block capitalize">
                      {formData.scheduleType === 'flexible'
                        ? 'Flexible Schedule (To be coordinated with pro)'
                        : `${formData.preferredDate} (${formData.preferredTimeSlot})`}
                    </span>
                    {formData.alternateDate && (
                      <span className="text-slate-600 mt-0.5 block">
                        Alternate: {formData.alternateDate}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Card 3: Budget, Urgency & Photos */}
              <div className="p-4 bg-slate-50 border border-slate-200/90 rounded-2xl relative">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">
                    3. Budget & Urgency
                  </span>
                  <button
                    type="button"
                    onClick={() => setCurrentStep(3)}
                    className="text-xs font-bold text-emerald-800 hover:text-emerald-950 underline"
                  >
                    Edit
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <span className="text-slate-600 block">Budget Mode:</span>
                    <span className="font-bold text-slate-900 mt-0.5 block capitalize">
                      {formData.budgetType === 'quote'
                        ? 'Competitive Quotes'
                        : formData.budgetType === 'fixed'
                        ? `₹${Number(formData.budgetAmount).toLocaleString()} (Fixed)`
                        : formData.budgetType === 'range'
                        ? `₹${Number(formData.budgetMin).toLocaleString()} - ₹${Number(formData.budgetMax).toLocaleString()}`
                        : `₹${Number(formData.budgetAmount).toLocaleString()}/hr`}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-600 block">Urgency Level:</span>
                    <span className="font-bold text-slate-900 mt-0.5 block capitalize">
                      {formData.urgency}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-600 block">Attached Photos:</span>
                    <span className="font-bold text-slate-900 mt-0.5 block">
                      {formData.images.length > 0 ? `${formData.images.length} Image(s) Attached` : 'No photos attached'}
                    </span>
                  </div>
                </div>

                {formData.images.length > 0 && (
                  <div className="flex gap-2 mt-3 pt-3 border-t border-slate-200 overflow-x-auto">
                    {formData.images.map((img, i) => (
                      <img
                        key={i}
                        src={img}
                        alt="Preview"
                        className="w-12 h-12 rounded-lg object-cover border border-slate-200"
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Acknowledgment Checkbox */}
            <div className="p-4 bg-emerald-50/50 border border-emerald-200/70 rounded-2xl">
              <label className="flex items-start gap-3 cursor-pointer text-xs text-slate-800">
                <input
                  type="checkbox"
                  checked={formData.acknowledged}
                  onChange={(e) => setFormData({ ...formData, acknowledged: e.target.checked })}
                  className="w-4 h-4 text-emerald-800 rounded border-slate-300 focus:ring-emerald-700 mt-0.5"
                />
                <span className="leading-relaxed">
                  I confirm the project details and address provided are accurate. I understand that posting this job does not commit me to any payment until I review and explicitly accept a vendor quotation.
                </span>
              </label>
            </div>

            {/* Stepper Navigation & Submit */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <Button
                variant="secondary"
                size="md"
                icon={ChevronLeft}
                onClick={handlePrevStep}
                disabled={isSubmitting}
              >
                Back
              </Button>
              <Button
                variant="primary"
                size="md"
                loading={isSubmitting}
                disabled={isSubmitting || !formData.acknowledged}
                icon={Check}
                onClick={handleSubmitJob}
              >
                Broadcast Job & Request Quotes
              </Button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
