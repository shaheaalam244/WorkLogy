import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  Alert,
  ActivityIndicator,
  Image,
  Dimensions,
  Platform,
  StatusBar,
  KeyboardAvoidingView,
  BackHandler
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api, getStoredAuthToken } from '../api/client';
import { useNavigation } from '../context/NavigationContext';
import { getServiceImage } from '../utils/serviceImages';
import type { ServiceListing } from '../types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const ALL_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const COMMON_LOCALITIES = [
  'Gomti Nagar',
  'Hazratganj',
  'Aliganj',
  'Indira Nagar',
  'Mahanagar',
  'Vibhuti Khand',
  'Chowk',
  'Ashiyana',
  'Rajajipuram',
  'Janki Puram'
];

/**
 * Deterministic service title, summary & description auto-generation.
 * Populates professional, trade-specific content without fabrication.
 */
export function generateServiceDefaults(categoryName: string, subcategoryName: string, customName?: string) {
  const task = (customName || subcategoryName || '').trim();
  if (!task || task === 'Other') {
    return {
      title: '',
      shortSummary: '',
      description: ''
    };
  }

  const lower = task.toLowerCase();

  // 1. Electrical Services
  if (lower.includes('fan') || lower.includes('light')) {
    return {
      title: `${task} Service`,
      shortSummary: 'Professional installation and repair of ceiling fans, wall lights and compatible fixtures.',
      description: 'Comprehensive installation and repair of compatible fans and lighting fixtures, including secure mounting, connection safety checks, and full operational testing. Additional wiring or custom brackets quoted transparently.'
    };
  }
  if (lower.includes('wiring') || lower.includes('rewiring')) {
    return {
      title: `${task} & Circuit Testing`,
      shortSummary: 'Certified electrical wiring, short-circuit diagnostics, and standard load safety checks.',
      description: 'Complete wiring and rewiring services for home or commercial premises using heat-resistant copper conductors. Includes circuit breaker inspection, earthing verification, and load balancing.'
    };
  }
  if (lower.includes('switchboard') || lower.includes('socket')) {
    return {
      title: `${task} & Replacement`,
      shortSummary: 'Safe switchboard repair, modular socket replacement, and earthing connection testing.',
      description: 'Thorough inspection and replacement of spark-damaged or loose switchboards and sockets. Includes voltage testing, insulation check, and secure faceplate mounting.'
    };
  }
  if (lower.includes('inverter') || lower.includes('backup')) {
    return {
      title: `${task} & Battery Maintenance`,
      shortSummary: 'Inverter setup, battery terminal cleaning, distilled water top-up, and backup diagnostics.',
      description: 'Diagnostic inspection and installation of domestic inverters and UPS systems. Covers electrolyte density checking, terminal corrosion removal, and automatic transfer switch testing.'
    };
  }
  if (lower.includes('fault') || lower.includes('diagnosis') || lower.includes('electrician')) {
    return {
      title: `${task} & Emergency Troubleshooting`,
      shortSummary: 'Rapid electrical fault isolation, tripping breaker diagnostics, and safety restoration.',
      description: 'Step-by-step diagnostic isolation of short circuits, persistent MCB tripping, voltage fluctuations, and open grounds. Workmanship warranty on all rectified connections.'
    };
  }

  // 2. AC & HVAC Services
  if (lower.includes('ac repair') || lower.includes('cooling')) {
    return {
      title: `${task} & Performance Diagnostics`,
      shortSummary: 'Comprehensive AC cooling diagnostics, gas pressure check, and electrical testing.',
      description: 'Complete diagnostic check of indoor and outdoor units, cooling coil examination, compressor performance evaluation, capacitor check, and gas pressure audit.'
    };
  }
  if (lower.includes('ac servicing') || lower.includes('jet cleaning') || lower.includes('jet wash')) {
    return {
      title: `${task} with Foam & Pressure Wash`,
      shortSummary: 'Deep jet wash cleaning of cooling coils, filters, blower wheel, and outdoor condenser.',
      description: 'High-pressure foam wash and jet cleaning for split or window air conditioners. Removes accumulated dust, enhances airflow efficiency, and cleans drain trays to prevent water leakage.'
    };
  }
  if (lower.includes('ac installation') || lower.includes('uninstallation')) {
    return {
      title: `${task} with Level Balancing`,
      shortSummary: 'Precision mounting of indoor unit, outdoor bracket fixing, copper piping, and vacuuming.',
      description: 'Professional installation following manufacturer specifications: vibration-free bracket mounting, flare joint tightening, nitrogen pressure check, and operational testing.'
    };
  }
  if (lower.includes('gas') || lower.includes('charging') || lower.includes('compressor')) {
    return {
      title: `${task} & Refrigerant Leak Sealing`,
      shortSummary: 'Nitrogen leak testing, brazing repair, system evacuation, and pure refrigerant charging.',
      description: 'Specialized refrigerant top-up and compressor servicing. Involves electronic leak detection, brazing fracture repair, vacuum pump moisture removal, and precise scale-based gas charging.'
    };
  }

  // 3. Plumbing Services
  if (lower.includes('pipe') || lower.includes('leakage') || lower.includes('seepage')) {
    return {
      title: `${task} & Concealed Line Sealing`,
      shortSummary: 'Detection and permanent repair of fractured water supply pipes and concealed seepages.',
      description: 'Acoustic and pressure-based detection of concealed plumbing leaks. Repair of CPVC, UPVC, or GI pipes using industrial solvent welds or compression fittings with zero mess.'
    };
  }
  if (lower.includes('tap') || lower.includes('faucet') || lower.includes('mixer')) {
    return {
      title: `${task} & Cartridge Replacement`,
      shortSummary: 'Repair of dripping taps, mixer cartridge replacement, and aerator descaling.',
      description: 'Complete servicing of sink mixers, basin taps, and shower faucets. Includes spindle replacement, teflon sealing, and flow pressure calibration.'
    };
  }
  if (lower.includes('drainage') || lower.includes('blockage') || lower.includes('clog')) {
    return {
      title: `${task} & Chemical Cleaning`,
      shortSummary: 'High-torque snake rod drain clearing, kitchen sink unclogging, and trap disinfection.',
      description: 'Mechanical clearing of stubborn clogs in bathroom gullies, kitchen sinks, and soil waste pipes. Restores free-flowing drainage and sanitizes pipe traps.'
    };
  }
  if (lower.includes('tank') || lower.includes('water tank')) {
    return {
      title: `${task} & UV Disinfection`,
      shortSummary: 'Automated sludge removal, high-pressure tank washing, and antibacterial UV treatment.',
      description: 'Multi-stage overhead or underground water tank cleaning: dewatering, sludge vacuuming, high-pressure jet washing, antibacterial spray, and UV germicidal treatment.'
    };
  }

  // 4. General / Custom Fallback
  return {
    title: `${task} Service`,
    shortSummary: `Expert ${task.toLowerCase()} delivered by verified local specialists.`,
    description: `Professional ${task.toLowerCase()} with standard preliminary inspection, certified tool application, transparent material procurement, and verified operational testing.`
  };
}

/**
 * Domain-Aware Dynamic Placeholders based on selected service trade.
 */
function getDomainPlaceholders(category: any) {
  const catName = (category?.name || '').toLowerCase();
  const slug = (category?.slug || '').toLowerCase();

  if (catName.includes('ac') || slug.includes('ac') || catName.includes('hvac') || slug.includes('hvac')) {
    return {
      customSubcategory: 'e.g. Split AC Servicing & Gas Leakage Diagnosis',
      title: 'e.g. Split AC Servicing & Cooling Issue Diagnosis',
      summary: 'e.g. Complete split AC foam wash, filter cleaning, and cooling performance check.',
      description: 'Explain the AC inspection process, gas pressure audit, cooling coil cleaning, and guarantee provided.'
    };
  }

  if (catName.includes('electr') || slug.includes('electr')) {
    return {
      customSubcategory: 'e.g. Inverter Battery Descaling & Terminal Repair',
      title: 'e.g. Ceiling Fan and Modular Light Installation',
      summary: 'e.g. Professional installation of ceiling fans, wall lights, and modular switch fixtures.',
      description: 'Explain the wiring inspection, circuit load balancing, safety earthing checks, and workmanship warranty.'
    };
  }

  if (catName.includes('plumb') || slug.includes('plumb')) {
    return {
      customSubcategory: 'e.g. Overhead Tank Float Valve Replacement',
      title: 'e.g. Tap Leakage Repair & Concealed Pipe Fitting',
      summary: 'e.g. Fast detection and permanent repair of pipe fractures, dripping taps, and drainage leaks.',
      description: 'Detail the plumbing diagnosis, CPVC pipe fitting, drain unclogging tools used, and parts guarantee.'
    };
  }

  if (catName.includes('carpen') || slug.includes('carpen')) {
    return {
      customSubcategory: 'e.g. Modular Kitchen Hinge Alignment & Slide Repair',
      title: 'e.g. Door Lock Repair & Modular Furniture Fitting',
      summary: 'e.g. Precision fitting of wooden door locks, hinges, modular cabinets, and alignment repairs.',
      description: 'Detail the carpentry woodwork, hinge alignment, hardware installation, and finishing quality.'
    };
  }

  if (catName.includes('clean') || slug.includes('clean')) {
    return {
      customSubcategory: 'e.g. Balcony Floor Scrubbing & Bird Net Cleaning',
      title: 'e.g. Deep Home & Bathroom Sanitization Service',
      summary: 'e.g. Deep scrubbing, chemical disinfection, and eco-friendly sanitization of living spaces.',
      description: 'Detail the cleaning chemicals used, machine scrubbing process, areas sanitized, and safety measures.'
    };
  }

  if (catName.includes('paint') || slug.includes('paint')) {
    return {
      customSubcategory: 'e.g. Waterproof Exterior Wall Primer Application',
      title: 'e.g. Interior Wall Painting & Putty Touch-Up',
      summary: 'e.g. Two-coat premium emulsion painting with wall putty smoothing and primer base.',
      description: 'Detail the surface preparation, sanding, primer coats, paint brands used, and masking protection.'
    };
  }

  return {
    customSubcategory: 'e.g. Specialized Diagnostic & Maintenance Service',
    title: 'e.g. Professional Repair and Maintenance Service',
    summary: 'e.g. Expert service delivered by verified trade specialists with quality guarantee.',
    description: 'Explain the step-by-step repair process, materials provided, exclusions, and warranty terms.'
  };
}

export default function VendorNewServiceScreen({ navigation, route }: any) {
  const insets = useSafeAreaInsets();
  const appNav = useNavigation();
  const topInset = Math.max(
    insets.top,
    Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 0
  );

  const existingService: ServiceListing | undefined = route?.params?.service;
  const isEditing = Boolean(existingService?._id);

  // Idempotency key scoped to this creation session
  const idempotencyKeyRef = useRef<string>(
    `svc_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
  );

  // 5-Step wizard state: 1 to 5
  const [step, setStep] = useState(1);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'validating' | 'submitting' | 'success' | 'error'>('idle');

  // Vendor Domains and Canonical Categories
  const [approvedCategories, setApprovedCategories] = useState<any[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [hasNoApprovedDomains, setHasNoApprovedDomains] = useState(false);

  // Step 1: Basic Info
  const [selectedCategory, setSelectedCategory] = useState<any>(null);
  const [subcategory, setSubcategory] = useState(existingService?.subcategory || '');
  const [isCustom, setIsCustom] = useState(Boolean(existingService?.isCustom));
  const [customSubcategory, setCustomSubcategory] = useState(
    existingService?.isCustom ? (existingService?.customSubcategory || existingService?.subcategory || '') : ''
  );
  const [title, setTitle] = useState(existingService?.title || '');
  const [shortSummary, setShortSummary] = useState(existingService?.shortSummary || '');
  const [description, setDescription] = useState(existingService?.description || '');
  const [experienceYears, setExperienceYears] = useState(
    existingService?.experienceYears !== undefined ? existingService.experienceYears.toString() : '4'
  );

  // User edit tracking (prevent unexpected overwrite of custom text)
  const [hasEditedTitle, setHasEditedTitle] = useState(isEditing);
  const [hasEditedSummary, setHasEditedSummary] = useState(isEditing);
  const [hasEditedDesc, setHasEditedDesc] = useState(isEditing);

  // Step 2: Pricing
  const [pricingType, setPricingType] = useState<'fixed' | 'starting' | 'quote'>(
    (existingService?.pricing?.type as any) || 'fixed'
  );
  const [amount, setAmount] = useState(existingService?.pricing?.amount?.toString() || '450');
  const [minPrice, setMinPrice] = useState(existingService?.pricing?.minPrice?.toString() || '350');
  const [unit, setUnit] = useState<'per visit' | 'per hour' | 'per item' | 'per project'>(
    existingService?.pricing?.unit || 'per visit'
  );
  const [visitFee, setVisitFee] = useState(existingService?.pricing?.visitFee?.toString() || '0');
  const [materialCostIncluded, setMaterialCostIncluded] = useState(
    existingService?.pricing?.materialCostIncluded || false
  );

  // Step 3: Coverage Area
  const [city, setCity] = useState(existingService?.location?.city || 'Lucknow');
  const [locality, setLocality] = useState(existingService?.location?.locality || 'Gomti Nagar');
  const [radiusKm, setRadiusKm] = useState(existingService?.location?.radiusKm?.toString() || '25');
  const [selectedLocalities, setSelectedLocalities] = useState<string[]>(
    existingService?.location?.supportedLocalities || ['Gomti Nagar', 'Hazratganj', 'Aliganj', 'Indira Nagar']
  );
  const [homeVisitAvailable, setHomeVisitAvailable] = useState(
    existingService?.location?.homeVisitAvailable ?? true
  );

  // Step 4: Availability
  const [selectedDays, setSelectedDays] = useState<string[]>(
    existingService?.availability?.days || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  );
  const [startHour, setStartHour] = useState(existingService?.availability?.hours?.start || '09:00');
  const [endHour, setEndHour] = useState(existingService?.availability?.hours?.end || '19:00');
  const [emergencyAvailable, setEmergencyAvailable] = useState(
    existingService?.availability?.emergencyAvailable || false
  );
  const [maxDailyBookings, setMaxDailyBookings] = useState(
    existingService?.availability?.maxDailyBookings?.toString() || '5'
  );

  // Dynamic domain-aware placeholders
  const domainPlaceholders = getDomainPlaceholders(selectedCategory);

  // Load Vendor's Approved Domains & Area
  useEffect(() => {
    loadVendorDomainsAndArea();
  }, []);

  // Hardware Back Handler & Discard Protection
  useEffect(() => {
    const onBackPress = () => {
      if (submitStatus === 'submitting') {
        return true; // Disallow back while submitting
      }

      if (step > 1) {
        setStep((prev) => Math.max(1, prev - 1));
        return true;
      }

      // On Step 1: Confirm discard if form was modified
      const isDirty = Boolean(title.trim() || customSubcategory.trim());
      if (isDirty && !isEditing) {
        Alert.alert(
          'Discard Service?',
          'Are you sure you want to discard this service creation? Any unsaved edits will be lost.',
          [
            { text: 'Keep Editing', style: 'cancel' },
            {
              text: 'Discard',
              style: 'destructive',
              onPress: () => navigation.goBack()
            }
          ]
        );
        return true;
      }

      return false; // Let navigation handle it
    };

    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [step, submitStatus, title, customSubcategory, isEditing, navigation]);

  const loadVendorDomainsAndArea = async () => {
    try {
      setLoadingCategories(true);

      const [profileRes, catRes, areaRes] = await Promise.all([
        api.vendors.getProfile().catch(() => null),
        api.categories.getAll().catch(() => null),
        api.vendors.getServiceArea().catch(() => null)
      ]);

      const allCategories: any[] = Array.isArray(catRes) ? catRes : catRes?.categories || [];
      const vendorProf = profileRes?.vendor;

      // Extract approved category IDs
      const rawVendorCats = vendorProf?.categories || [];
      const approvedIds = rawVendorCats
        .map((c: any) => (typeof c === 'object' ? c._id?.toString() : c?.toString()))
        .filter(Boolean);

      // Filter canonical categories by vendor's approved domains only!
      let filtered: any[] = [];
      if (approvedIds.length > 0) {
        filtered = allCategories.filter((c: any) => approvedIds.includes(c._id?.toString()));
      }

      if (filtered.length === 0) {
        setHasNoApprovedDomains(true);
        setApprovedCategories([]);
        return;
      }

      setHasNoApprovedDomains(false);
      setApprovedCategories(filtered);

      // Select initial domain
      let currentSelected: any = null;
      if (existingService?.domain || existingService?.category) {
        const catId = typeof existingService.category === 'object' ? existingService.category?._id : existingService.category;
        currentSelected = filtered.find(
          (c: any) => c._id === catId || c.slug === existingService.domain || c.name === existingService.domain
        );
      }

      if (!currentSelected && filtered.length > 0) {
        currentSelected = filtered[0];
      }

      if (currentSelected) {
        setSelectedCategory(currentSelected);

        // Pre-fill initial subcategory if not editing
        if (!existingService && currentSelected.subcategories?.length > 0 && !subcategory) {
          const firstSub = currentSelected.subcategories[0];
          setSubcategory(firstSub);
          setIsCustom(false);
          const defaults = generateServiceDefaults(currentSelected.name, firstSub);
          setTitle(defaults.title);
          setShortSummary(defaults.shortSummary);
          setDescription(defaults.description);
        }
      }

      // Pre-populate service area settings from vendor's coverage
      if (!isEditing && areaRes?.coverage) {
        if (areaRes.coverage.city) setCity(areaRes.coverage.city);
        if (areaRes.coverage.baseAddress) setLocality(areaRes.coverage.baseAddress);
        if (areaRes.coverage.radiusKm) setRadiusKm(areaRes.coverage.radiusKm.toString());
      }
    } catch (err) {
      console.warn('Failed to load vendor domains:', err);
      Alert.alert('Load Error', 'Unable to retrieve your approved service domains.');
    } finally {
      setLoadingCategories(false);
    }
  };

  // Domain Switch Handler
  const handleSelectCategory = (cat: any) => {
    if (selectedCategory?._id === cat._id) return;

    setSelectedCategory(cat);

    // If previous subcategory does not belong to new domain, reset subcategory
    const subs: string[] = cat.subcategories || [];
    const belongs = subs.some((s) => s.toLowerCase() === subcategory.toLowerCase());

    if (!belongs && !isCustom) {
      const firstSub = subs.length > 0 ? subs[0] : '';
      setSubcategory(firstSub);
      setIsCustom(false);
      setCustomSubcategory('');

      // Auto-update suggestions if fields weren't manually edited
      if (!hasEditedTitle || !hasEditedSummary || !hasEditedDesc) {
        const defaults = generateServiceDefaults(cat.name, firstSub);
        if (!hasEditedTitle) setTitle(defaults.title);
        if (!hasEditedSummary) setShortSummary(defaults.shortSummary);
        if (!hasEditedDesc) setDescription(defaults.description);
      }
    }
  };

  // Subcategory Selection Handler
  const handleSelectSubcat = (name: string, customMode: boolean) => {
    if (customMode) {
      setIsCustom(true);
      setSubcategory('Other');
      // If user typed custom name previously, generate defaults
      if (customSubcategory.trim()) {
        const defaults = generateServiceDefaults(selectedCategory?.name || '', 'Other', customSubcategory.trim());
        if (!hasEditedTitle) setTitle(defaults.title);
        if (!hasEditedSummary) setShortSummary(defaults.shortSummary);
        if (!hasEditedDesc) setDescription(defaults.description);
      }
    } else {
      setIsCustom(false);
      setSubcategory(name);
      setCustomSubcategory('');

      const defaults = generateServiceDefaults(selectedCategory?.name || '', name);
      if (!hasEditedTitle) setTitle(defaults.title);
      if (!hasEditedSummary) setShortSummary(defaults.shortSummary);
      if (!hasEditedDesc) setDescription(defaults.description);
    }
  };

  // Custom Service Name Change Handler
  const handleCustomSubcategoryChange = (text: string) => {
    setCustomSubcategory(text);
    if (!hasEditedTitle || !hasEditedSummary || !hasEditedDesc) {
      const defaults = generateServiceDefaults(selectedCategory?.name || '', 'Other', text);
      if (!hasEditedTitle) setTitle(defaults.title);
      if (!hasEditedSummary) setShortSummary(defaults.shortSummary);
      if (!hasEditedDesc) setDescription(defaults.description);
    }
  };

  // Explicit Re-populate / Suggestion Refresh
  const handleRegenerateSuggestions = () => {
    const taskName = isCustom ? customSubcategory.trim() : subcategory;
    if (!taskName) {
      Alert.alert('Notice', 'Please select a subcategory or enter a custom service name first.');
      return;
    }
    const defaults = generateServiceDefaults(selectedCategory?.name || '', subcategory, customSubcategory.trim());
    setTitle(defaults.title);
    setShortSummary(defaults.shortSummary);
    setDescription(defaults.description);
    setHasEditedTitle(false);
    setHasEditedSummary(false);
    setHasEditedDesc(false);
  };

  const toggleDay = (day: string) => {
    if (selectedDays.includes(day)) {
      if (selectedDays.length <= 1) {
        Alert.alert('Notice', 'At least one working day must be selected.');
        return;
      }
      setSelectedDays(selectedDays.filter((d) => d !== day));
    } else {
      setSelectedDays([...selectedDays, day]);
    }
  };

  const toggleLocality = (loc: string) => {
    if (selectedLocalities.includes(loc)) {
      if (selectedLocalities.length <= 1) {
        Alert.alert('Notice', 'At least one operational locality is required.');
        return;
      }
      setSelectedLocalities(selectedLocalities.filter((l) => l !== loc));
    } else {
      setSelectedLocalities([...selectedLocalities, loc]);
    }
  };

  // Step Validation
  const validateStep = (currentStep: number): boolean => {
    if (currentStep === 1) {
      if (!selectedCategory) {
        Alert.alert('Validation Error', 'Please select a verified service domain.');
        return false;
      }
      if (isCustom) {
        if (!customSubcategory.trim() || customSubcategory.trim().length < 3 || customSubcategory.trim().length > 60) {
          Alert.alert('Validation Error', 'Please enter a custom service name between 3 and 60 characters.');
          return false;
        }
      } else {
        if (!subcategory.trim()) {
          Alert.alert('Validation Error', 'Please select a specific subcategory or task.');
          return false;
        }
      }
      if (!title.trim() || title.trim().length < 5) {
        Alert.alert('Validation Error', 'Please provide a clear service title (at least 5 characters).');
        return false;
      }
      if (!description.trim() || description.trim().length < 15) {
        Alert.alert('Validation Error', 'Please provide a descriptive scope of work (at least 15 characters).');
        return false;
      }
      const expNum = parseInt(experienceYears, 10);
      if (isNaN(expNum) || expNum < 0 || expNum > 50) {
        Alert.alert('Validation Error', 'Please enter valid years of experience (between 0 and 50).');
        return false;
      }
    }

    if (currentStep === 2) {
      if (pricingType !== 'quote') {
        const val = pricingType === 'starting' ? parseFloat(minPrice) : parseFloat(amount);
        if (isNaN(val) || val <= 0) {
          Alert.alert('Validation Error', 'Please enter a valid price amount greater than ₹0.');
          return false;
        }
      }
    }

    if (currentStep === 3) {
      if (!city.trim()) {
        Alert.alert('Validation Error', 'Please specify your primary operational city.');
        return false;
      }
      if (selectedLocalities.length === 0) {
        Alert.alert('Validation Error', 'Please select at least one covered locality.');
        return false;
      }
    }

    if (currentStep === 4) {
      if (selectedDays.length === 0) {
        Alert.alert('Validation Error', 'Please choose at least one working day.');
        return false;
      }
      const maxSlots = parseInt(maxDailyBookings, 10);
      if (isNaN(maxSlots) || maxSlots < 1) {
        Alert.alert('Validation Error', 'Max daily appointments capacity must be at least 1.');
        return false;
      }
    }

    return true;
  };

  const handleNext = () => {
    if (validateStep(step)) {
      setStep((prev) => Math.min(prev + 1, 5));
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep((prev) => prev - 1);
    } else {
      const isDirty = Boolean(title.trim() || customSubcategory.trim());
      if (isDirty && !isEditing) {
        Alert.alert(
          'Discard Service?',
          'Are you sure you want to discard this service? Any unsaved edits will be lost.',
          [
            { text: 'Keep Editing', style: 'cancel' },
            { text: 'Discard', style: 'destructive', onPress: () => navigation.goBack() }
          ]
        );
      } else {
        navigation.goBack();
      }
    }
  };

  // Submit Handler with Idempotency and Duplicate Protection
  const handleSave = async (publishStatus: 'draft' | 'published') => {
    if (submitStatus === 'submitting') return;

    // Validate all steps before submitting
    for (let s = 1; s <= 4; s++) {
      if (!validateStep(s)) {
        setStep(s);
        return;
      }
    }

    const token = await getStoredAuthToken();
    if (!token) {
      Alert.alert('Authentication Required', 'Please sign in to publish or save your service listings.');
      navigation.navigate('VendorLogin');
      return;
    }

    try {
      setSubmitStatus('submitting');

      const parsedAmount = parseFloat(amount) || 0;
      const parsedMinPrice = parseFloat(minPrice) || 0;
      const parsedVisitFee = parseFloat(visitFee) || 0;
      const parsedRadius = parseFloat(radiusKm) || 25;
      const parsedExp = parseInt(experienceYears, 10) || 4;
      const parsedMaxDaily = parseInt(maxDailyBookings, 10) || 5;

      const finalSubcategory = isCustom ? customSubcategory.trim() : subcategory.trim();

      const payload = {
        title: title.trim(),
        domain: selectedCategory?.slug,
        category: selectedCategory?._id,
        subcategory: finalSubcategory,
        isCustom,
        customSubcategory: isCustom ? finalSubcategory : '',
        shortSummary: shortSummary.trim() || title.trim(),
        description: description.trim(),
        experienceYears: parsedExp,
        deliveryType: 'home_service',
        languages: ['Hindi', 'English'],
        pricing: {
          type: pricingType,
          amount: pricingType === 'quote' ? 0 : parsedAmount,
          minPrice: pricingType === 'starting' ? parsedMinPrice : 0,
          currency: 'INR',
          unit,
          visitFee: parsedVisitFee,
          materialCostIncluded,
          cancellationTerms: 'Free cancellation up to 2 hours before scheduled slot'
        },
        location: {
          country: 'India',
          state: 'Uttar Pradesh',
          city: city.trim(),
          locality: locality.trim(),
          radiusKm: parsedRadius,
          supportedLocalities: selectedLocalities,
          homeVisitAvailable,
          travelCharge: 0
        },
        availability: {
          days: selectedDays,
          hours: {
            start: startHour,
            end: endHour
          },
          emergencyAvailable,
          maxDailyBookings: parsedMaxDaily
        },
        status: publishStatus,
        idempotencyKey: idempotencyKeyRef.current
      };

      if (isEditing && existingService?._id) {
        await api.services.update(existingService._id, payload);
        setSubmitStatus('success');
        Alert.alert(
          'Service Updated 🎉',
          `Your service "${title.trim()}" has been updated and is ${publishStatus === 'published' ? 'Live on WorkLogy' : 'saved as Draft'}.`,
          [
            {
              text: 'View Services',
              onPress: () => navigation.navigate('VendorServices', { refresh: Date.now() })
            }
          ]
        );
      } else {
        await api.services.create(payload, idempotencyKeyRef.current);
        setSubmitStatus('success');
        Alert.alert(
          'Service Created 🎉',
          `Your service "${title.trim()}" is now ${publishStatus === 'published' ? 'Live & ready for bookings' : 'saved as Draft'}.`,
          [
            {
              text: 'View My Services',
              onPress: () => navigation.navigate('VendorServices', { refresh: Date.now() })
            }
          ]
        );
      }
    } catch (err: any) {
      setSubmitStatus('error');
      console.warn('Failed to save service listing:', err);

      // Handle duplicate listing gracefully
      if (err?.status === 409 || err?.message?.includes('already exists') || err?.message?.includes('active listing')) {
        Alert.alert(
          'Listing Already Exists',
          err.message || 'You already have an active service listing for this subcategory. You can view or edit your existing listings.',
          [
            {
              text: 'View My Services',
              onPress: () => navigation.navigate('VendorServices', { refresh: Date.now() })
            },
            {
              text: 'Edit Current',
              style: 'cancel'
            }
          ]
        );
      } else {
        Alert.alert('Save Failed', err?.message || 'Could not save service listing to database.');
      }
    }
  };

  const previewImage = getServiceImage(selectedCategory?.slug || 'electrical-services');

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Top Header */}
      <View style={[styles.header, { paddingTop: topInset + 8 }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={handleBack} style={styles.backBtn} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={20} color="#0F172A" />
          </TouchableOpacity>
          <View style={styles.headerTitleWrap}>
            <Text style={styles.headerTitle}>
              {isEditing ? 'Edit Service' : 'Add Service'}
            </Text>
          </View>
          <View style={{ width: 36 }} />
        </View>

        {/* 5-Step Stepper */}
        <View style={styles.stepperContainer}>
          {[
            { num: 1, label: 'Basic Info' },
            { num: 2, label: 'Pricing' },
            { num: 3, label: 'Service Area' },
            { num: 4, label: 'Availability' },
            { num: 5, label: 'Review' }
          ].map((s, idx) => (
            <React.Fragment key={s.num}>
              {idx > 0 && (
                <View
                  style={[
                    styles.stepperLine,
                    step >= s.num ? styles.stepperLineActive : styles.stepperLineInactive
                  ]}
                />
              )}
              <View style={styles.stepItem}>
                <View
                  style={[
                    styles.stepCircle,
                    step === s.num
                      ? styles.stepCircleActive
                      : step > s.num
                      ? styles.stepCircleCompleted
                      : styles.stepCircleInactive
                  ]}
                >
                  {step > s.num ? (
                    <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                  ) : (
                    <Text
                      style={[
                        styles.stepCircleText,
                        step === s.num && styles.stepCircleTextActive
                      ]}
                    >
                      {s.num}
                    </Text>
                  )}
                </View>
                <Text
                  style={[
                    styles.stepLabel,
                    step === s.num ? styles.stepLabelActive : styles.stepLabelInactive
                  ]}
                  numberOfLines={1}
                >
                  {s.label}
                </Text>
              </View>
            </React.Fragment>
          ))}
        </View>
      </View>

      {/* Screen Body */}
      <ScrollView
        style={styles.scrollBody}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── STEP 1: SERVICE INFORMATION ── */}
        {step === 1 && (
          <View>
            <Text style={styles.stepHeading}>Step 1: Trade & Service Info</Text>
            <Text style={styles.stepSub}>
              Select from your approved trade categories and specify the exact service you deliver.
            </Text>

            {/* Approved Domains Selector */}
            <Text style={styles.label}>Select Trade Category (Your Approved Domains) *</Text>
            {loadingCategories ? (
              <ActivityIndicator size="small" color="#059669" style={{ marginVertical: 12 }} />
            ) : hasNoApprovedDomains ? (
              <View style={styles.noDomainsCard}>
                <Ionicons name="alert-circle-outline" size={32} color="#D97706" />
                <Text style={styles.noDomainsTitle}>No Approved Service Domains</Text>
                <Text style={styles.noDomainsSub}>
                  You have not registered or been approved for any service domains yet. Please configure your service domains in your profile to add services.
                </Text>
                <TouchableOpacity
                  style={styles.manageDomainsBtn}
                  onPress={() => navigation.navigate('VendorDomains')}
                  activeOpacity={0.8}
                >
                  <Text style={styles.manageDomainsBtnText}>Manage My Domains →</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.categoryScroll}
              >
                {approvedCategories.map((cat) => {
                  const isSelected = selectedCategory?._id === cat._id;
                  return (
                    <TouchableOpacity
                      key={cat._id}
                      style={[styles.categoryCard, isSelected && styles.categoryCardSelected]}
                      onPress={() => handleSelectCategory(cat)}
                      activeOpacity={0.75}
                    >
                      <Image
                        source={getServiceImage(cat.slug)}
                        style={styles.categoryThumb}
                        resizeMode="cover"
                      />
                      <Text
                        style={[
                          styles.categoryName,
                          isSelected && styles.categoryNameSelected
                        ]}
                        numberOfLines={1}
                      >
                        {cat.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}

            {/* Subcategory or Specific Task */}
            {!hasNoApprovedDomains && (
              <>
                <Text style={styles.label}>Subcategory or Specific Task *</Text>
                <View style={styles.subcatWrap}>
                  {(selectedCategory?.subcategories || []).map((name: string, idx: number) => {
                    const isChosen = !isCustom && subcategory === name;
                    return (
                      <TouchableOpacity
                        key={idx}
                        style={[styles.subcatChip, isChosen && styles.subcatChipChosen]}
                        onPress={() => handleSelectSubcat(name, false)}
                        activeOpacity={0.75}
                      >
                        <Text style={[styles.subcatChipText, isChosen && styles.subcatChipTextChosen]}>
                          {name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                  {/* Canonical "Other" Option */}
                  <TouchableOpacity
                    style={[styles.subcatChip, isCustom && styles.subcatChipChosen]}
                    onPress={() => handleSelectSubcat('Other', true)}
                    activeOpacity={0.75}
                  >
                    <Ionicons
                      name="add-circle-outline"
                      size={14}
                      color={isCustom ? '#047857' : '#64748B'}
                      style={{ marginRight: 4 }}
                    />
                    <Text style={[styles.subcatChipText, isCustom && styles.subcatChipTextChosen]}>
                      Other (Custom)
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Custom Subcategory Name Input (visible only when Other is selected) */}
                {isCustom && (
                  <View style={styles.customTaskContainer}>
                    <Text style={styles.customTaskLabel}>Custom Service Name *</Text>
                    <TextInput
                      style={styles.input}
                      placeholder={domainPlaceholders.customSubcategory}
                      placeholderTextColor="#94A3B8"
                      value={customSubcategory}
                      onChangeText={handleCustomSubcategoryChange}
                      maxLength={60}
                    />
                    <Text style={styles.helperText}>
                      Specify your specialized service within {selectedCategory?.name || 'this domain'}.
                    </Text>
                  </View>
                )}

                {/* Auto-Fill Regeneration Button */}
                <View style={styles.suggestRow}>
                  <Text style={styles.suggestNotice}>
                    Smart suggestions automatically filled from your selected task.
                  </Text>
                  <TouchableOpacity
                    style={styles.suggestBtn}
                    onPress={handleRegenerateSuggestions}
                    activeOpacity={0.75}
                  >
                    <Ionicons name="sparkles-outline" size={13} color="#059669" />
                    <Text style={styles.suggestBtnText}>Suggest Content</Text>
                  </TouchableOpacity>
                </View>

                {/* Service Offering Title */}
                <Text style={styles.label}>Service Offering Title *</Text>
                <TextInput
                  style={styles.input}
                  placeholder={domainPlaceholders.title}
                  placeholderTextColor="#94A3B8"
                  value={title}
                  onChangeText={(val) => {
                    setTitle(val);
                    setHasEditedTitle(true);
                  }}
                />

                {/* Short Summary */}
                <Text style={styles.label}>Short Summary (One-liner)</Text>
                <TextInput
                  style={styles.input}
                  placeholder={domainPlaceholders.summary}
                  placeholderTextColor="#94A3B8"
                  value={shortSummary}
                  onChangeText={(val) => {
                    setShortSummary(val);
                    setHasEditedSummary(true);
                  }}
                />

                {/* Detailed Description */}
                <Text style={styles.label}>Detailed Description of Scope *</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder={domainPlaceholders.description}
                  placeholderTextColor="#94A3B8"
                  value={description}
                  onChangeText={(val) => {
                    setDescription(val);
                    setHasEditedDesc(true);
                  }}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />

                {/* Years of Experience */}
                <Text style={styles.label}>Years of Experience in this Trade</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your years of experience, e.g. 4"
                  placeholderTextColor="#94A3B8"
                  value={experienceYears}
                  onChangeText={setExperienceYears}
                  keyboardType="number-pad"
                  maxLength={2}
                />
                <Text style={styles.helperText}>
                  Your verified hands-on experience in this skilled trade (0 - 50 years).
                </Text>
              </>
            )}
          </View>
        )}

        {/* ── STEP 2: PRICING ── */}
        {step === 2 && (
          <View>
            <Text style={styles.stepHeading}>Step 2: Transparent Pricing</Text>
            <Text style={styles.stepSub}>
              Choose how you charge customers. Clear, honest pricing builds direct customer trust.
            </Text>

            {/* Pricing Model */}
            <Text style={styles.label}>Pricing Model *</Text>
            <View style={styles.modelRow}>
              <TouchableOpacity
                style={[styles.modelOption, pricingType === 'fixed' && styles.modelOptionActive]}
                onPress={() => setPricingType('fixed')}
              >
                <Ionicons
                  name="pricetag-outline"
                  size={20}
                  color={pricingType === 'fixed' ? '#059669' : '#64748B'}
                />
                <Text style={[styles.modelText, pricingType === 'fixed' && styles.modelTextActive]}>
                  Fixed Price
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modelOption, pricingType === 'starting' && styles.modelOptionActive]}
                onPress={() => setPricingType('starting')}
              >
                <Ionicons
                  name="trending-up-outline"
                  size={20}
                  color={pricingType === 'starting' ? '#059669' : '#64748B'}
                />
                <Text style={[styles.modelText, pricingType === 'starting' && styles.modelTextActive]}>
                  Starts At
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modelOption, pricingType === 'quote' && styles.modelOptionActive]}
                onPress={() => setPricingType('quote')}
              >
                <Ionicons
                  name="chatbubbles-outline"
                  size={20}
                  color={pricingType === 'quote' ? '#059669' : '#64748B'}
                />
                <Text style={[styles.modelText, pricingType === 'quote' && styles.modelTextActive]}>
                  Quote on Site
                </Text>
              </TouchableOpacity>
            </View>

            {/* Amount Input */}
            {pricingType !== 'quote' && (
              <>
                <Text style={styles.label}>
                  {pricingType === 'starting' ? 'Starting Price (₹) *' : 'Fixed Price Amount (₹) *'}
                </Text>
                <View style={styles.currencyInputWrap}>
                  <Text style={styles.currencySymbol}>₹</Text>
                  <TextInput
                    style={styles.currencyInput}
                    placeholder={pricingType === 'starting' ? "Enter starting price in ₹, e.g. 350" : "Enter service price in ₹, e.g. 450"}
                    placeholderTextColor="#94A3B8"
                    value={pricingType === 'starting' ? minPrice : amount}
                    onChangeText={pricingType === 'starting' ? setMinPrice : setAmount}
                    keyboardType="numeric"
                  />
                </View>
              </>
            )}

            {/* Unit */}
            <Text style={styles.label}>Billing Unit</Text>
            <View style={styles.unitRow}>
              {(['per visit', 'per hour', 'per item', 'per project'] as const).map((u) => (
                <TouchableOpacity
                  key={u}
                  style={[styles.unitChip, unit === u && styles.unitChipActive]}
                  onPress={() => setUnit(u)}
                >
                  <Text style={[styles.unitChipText, unit === u && styles.unitChipTextActive]}>
                    {u}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Material cost toggle */}
            <View style={styles.switchRow}>
              <View style={{ flex: 1, marginRight: 12 }}>
                <Text style={styles.switchTitle}>Material & Spare Parts Included</Text>
                <Text style={styles.switchSub}>
                  Turn on if standard replacement parts or hardware consumables are included in the price.
                </Text>
              </View>
              <Switch
                value={materialCostIncluded}
                onValueChange={setMaterialCostIncluded}
                trackColor={{ false: '#CBD5E1', true: '#A7F3D0' }}
                thumbColor={materialCostIncluded ? '#059669' : '#F1F5F9'}
              />
            </View>
          </View>
        )}

        {/* ── STEP 3: SERVICE AREA ── */}
        {step === 3 && (
          <View>
            <Text style={styles.stepHeading}>Step 3: Service Area & Localities</Text>
            <Text style={styles.stepSub}>
              Choose the localities where you can deliver this service reliably and promptly.
            </Text>

            {/* City */}
            <Text style={styles.label}>Primary Operating City *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your operating city, e.g. Lucknow"
              placeholderTextColor="#94A3B8"
              value={city}
              onChangeText={setCity}
            />

            {/* Base Workshop / Locality */}
            <Text style={styles.label}>Base Workshop / Central Locality</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter workshop or base locality, e.g. Gomti Nagar"
              placeholderTextColor="#94A3B8"
              value={locality}
              onChangeText={setLocality}
            />

            {/* Radius */}
            <Text style={styles.label}>Maximum Travel Radius (km)</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter travel radius in km, e.g. 25"
              placeholderTextColor="#94A3B8"
              value={radiusKm}
              onChangeText={setRadiusKm}
              keyboardType="numeric"
            />

            {/* Localities Selection */}
            <Text style={styles.label}>Covered Localities ({selectedLocalities.length} selected) *</Text>
            <View style={styles.localityWrap}>
              {COMMON_LOCALITIES.map((loc) => {
                const isSelected = selectedLocalities.includes(loc);
                return (
                  <TouchableOpacity
                    key={loc}
                    style={[styles.localityChip, isSelected && styles.localityChipSelected]}
                    onPress={() => toggleLocality(loc)}
                  >
                    <Ionicons
                      name={isSelected ? 'checkmark-circle' : 'add-circle-outline'}
                      size={14}
                      color={isSelected ? '#059669' : '#64748B'}
                    />
                    <Text
                      style={[
                        styles.localityChipText,
                        isSelected && styles.localityChipTextSelected
                      ]}
                    >
                      {loc}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Home visit toggle */}
            <View style={styles.switchRow}>
              <View style={{ flex: 1, marginRight: 12 }}>
                <Text style={styles.switchTitle}>At-Home Service Available</Text>
                <Text style={styles.switchSub}>
                  You travel to customer homes or job sites with your standard toolkits.
                </Text>
              </View>
              <Switch
                value={homeVisitAvailable}
                onValueChange={setHomeVisitAvailable}
                trackColor={{ false: '#CBD5E1', true: '#A7F3D0' }}
                thumbColor={homeVisitAvailable ? '#059669' : '#F1F5F9'}
              />
            </View>
          </View>
        )}

        {/* ── STEP 4: AVAILABILITY ── */}
        {step === 4 && (
          <View>
            <Text style={styles.stepHeading}>Step 4: Working Days & Booking Slots</Text>
            <Text style={styles.stepSub}>
              Set when you are available to receive customer bookings.
            </Text>

            <Text style={styles.label}>Working Days *</Text>
            <View style={styles.daysWrap}>
              {ALL_DAYS.map((day) => {
                const isChecked = selectedDays.includes(day);
                return (
                  <TouchableOpacity
                    key={day}
                    style={[styles.dayCard, isChecked && styles.dayCardChecked]}
                    onPress={() => toggleDay(day)}
                  >
                    <Ionicons
                      name={isChecked ? 'checkbox' : 'square-outline'}
                      size={18}
                      color={isChecked ? '#059669' : '#94A3B8'}
                    />
                    <Text style={[styles.dayText, isChecked && styles.dayTextChecked]}>
                      {day}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Hours */}
            <View style={styles.rowTwoCol}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={styles.label}>Start Hour</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Start time (24-hr), e.g. 09:00"
                  placeholderTextColor="#94A3B8"
                  value={startHour}
                  onChangeText={setStartHour}
                />
              </View>
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={styles.label}>End Hour</Text>
                <TextInput
                  style={styles.input}
                  placeholder="End time (24-hr), e.g. 19:00"
                  placeholderTextColor="#94A3B8"
                  value={endHour}
                  onChangeText={setEndHour}
                />
              </View>
            </View>

            {/* Max daily bookings */}
            <Text style={styles.label}>Max Daily Appointments Capacity</Text>
            <TextInput
              style={styles.input}
              placeholder="Max bookings capacity per day, e.g. 5"
              placeholderTextColor="#94A3B8"
              value={maxDailyBookings}
              onChangeText={setMaxDailyBookings}
              keyboardType="number-pad"
            />

            {/* Emergency Toggle */}
            <View style={styles.switchRow}>
              <View style={{ flex: 1, marginRight: 12 }}>
                <Text style={styles.switchTitle}>Emergency Service Available</Text>
                <Text style={styles.switchSub}>
                  Accept priority emergency repair requests within 60 minutes for higher fees.
                </Text>
              </View>
              <Switch
                value={emergencyAvailable}
                onValueChange={setEmergencyAvailable}
                trackColor={{ false: '#CBD5E1', true: '#A7F3D0' }}
                thumbColor={emergencyAvailable ? '#059669' : '#F1F5F9'}
              />
            </View>
          </View>
        )}

        {/* ── STEP 5: REVIEW AND PUBLISH ── */}
        {step === 5 && (
          <View>
            <Text style={styles.stepHeading}>Step 5: Review & Publish</Text>
            <Text style={styles.stepSub}>
              Verify your service offering preview before making it live to customers.
            </Text>

            {/* Card Preview */}
            <View style={styles.previewCard}>
              <Image source={previewImage} style={styles.previewImage} resizeMode="cover" />
              <View style={styles.previewBadgeOverlay}>
                <View style={styles.previewDomainBadge}>
                  <Text style={styles.previewDomainText}>
                    {selectedCategory?.name || 'Home Service'}
                  </Text>
                </View>
              </View>

              <View style={styles.previewBody}>
                <Text style={styles.previewTitle}>{title || 'Service Title'}</Text>
                <Text style={styles.previewSubcat}>
                  {isCustom ? customSubcategory : subcategory} • {experienceYears} yrs experience
                </Text>
                <Text style={styles.previewDesc} numberOfLines={3}>
                  {description || 'No description provided.'}
                </Text>

                <View style={styles.previewPriceBox}>
                  <Text style={styles.previewPriceLabel}>Pricing</Text>
                  <Text style={styles.previewPriceVal}>
                    {pricingType === 'quote'
                      ? 'Quote on Inspection'
                      : pricingType === 'starting'
                      ? `Starts at ₹${minPrice} / ${unit.replace('per ', '')}`
                      : `₹${amount} / ${unit.replace('per ', '')}`}
                  </Text>
                </View>

                <View style={styles.previewMeta}>
                  <View style={styles.previewMetaItem}>
                    <Ionicons name="location" size={14} color="#059669" />
                    <Text style={styles.previewMetaText}>
                      {city} ({radiusKm} km radius)
                    </Text>
                  </View>
                  <View style={styles.previewMetaItem}>
                    <Ionicons name="calendar" size={14} color="#059669" />
                    <Text style={styles.previewMetaText}>{selectedDays.length} working days</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Quality Checklist */}
            <View style={styles.checklistCard}>
              <Text style={styles.checklistTitle}>WorkLogy Quality Assurance</Text>
              <View style={styles.checkItem}>
                <Ionicons name="checkmark-circle" size={16} color="#059669" />
                <Text style={styles.checkText}>Accurate approved category and task description</Text>
              </View>
              <View style={styles.checkItem}>
                <Ionicons name="checkmark-circle" size={16} color="#059669" />
                <Text style={styles.checkText}>Transparent pricing with zero hidden fees</Text>
              </View>
              <View style={styles.checkItem}>
                <Ionicons name="checkmark-circle" size={16} color="#059669" />
                <Text style={styles.checkText}>Direct customer booking enabled on publish</Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Bottom Action Footer */}
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        {step < 5 ? (
          <TouchableOpacity
            style={[styles.nextBtn, hasNoApprovedDomains && styles.nextBtnDisabled]}
            onPress={handleNext}
            disabled={hasNoApprovedDomains}
            activeOpacity={0.85}
          >
            <Text style={styles.nextBtnText}>
              {step === 1
                ? 'Next: Pricing →'
                : step === 2
                ? 'Next: Service Area →'
                : step === 3
                ? 'Next: Availability →'
                : 'Next: Review →'}
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.footerTwoBtn}>
            <TouchableOpacity
              style={styles.draftBtn}
              onPress={() => handleSave('draft')}
              disabled={submitStatus === 'submitting'}
              activeOpacity={0.8}
            >
              {submitStatus === 'submitting' ? (
                <ActivityIndicator size="small" color="#475569" />
              ) : (
                <Text style={styles.draftBtnText}>Save Draft</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.publishMainBtn,
                submitStatus === 'submitting' && styles.publishMainBtnDisabled
              ]}
              onPress={() => handleSave('published')}
              disabled={submitStatus === 'submitting'}
              activeOpacity={0.85}
            >
              {submitStatus === 'submitting' ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="cloud-upload-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.publishMainBtnText}>Publish Live</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC'
  },
  header: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingHorizontal: 16,
    paddingBottom: 10
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12
  },
  headerTitleWrap: {
    flex: 1
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A'
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 4
  },
  stepItem: {
    alignItems: 'center',
    width: 62
  },
  stepperLine: {
    flex: 1,
    height: 1.5,
    marginBottom: 16,
    marginHorizontal: -6
  },
  stepperLineActive: {
    backgroundColor: '#06684F'
  },
  stepperLineInactive: {
    backgroundColor: '#E2E8F0'
  },
  stepCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4
  },
  stepCircleActive: {
    backgroundColor: '#06684F'
  },
  stepCircleCompleted: {
    backgroundColor: '#059669'
  },
  stepCircleInactive: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#CBD5E1'
  },
  stepCircleText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B'
  },
  stepCircleTextActive: {
    color: '#FFFFFF'
  },
  stepLabel: {
    fontSize: 9.5,
    textAlign: 'center'
  },
  stepLabelActive: {
    fontWeight: '800',
    color: '#06684F'
  },
  stepLabelInactive: {
    fontWeight: '500',
    color: '#94A3B8'
  },
  scrollBody: {
    flex: 1
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40
  },
  stepHeading: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4
  },
  stepSub: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
    marginBottom: 18
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 8,
    marginTop: 12
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0F172A'
  },
  textArea: {
    minHeight: 90,
    textAlignVertical: 'top'
  },
  categoryScroll: {
    paddingVertical: 4,
    gap: 10
  },
  categoryCard: {
    width: 110,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    padding: 8,
    alignItems: 'center'
  },
  categoryCardSelected: {
    borderColor: '#059669',
    backgroundColor: '#ECFDF5'
  },
  categoryThumb: {
    width: 48,
    height: 48,
    borderRadius: 8,
    marginBottom: 6
  },
  categoryName: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
    textAlign: 'center'
  },
  categoryNameSelected: {
    color: '#047857',
    fontWeight: '700'
  },
  noDomainsCard: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FCD34D',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginVertical: 12
  },
  noDomainsTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#92400E',
    marginTop: 8,
    marginBottom: 4
  },
  noDomainsSub: {
    fontSize: 13,
    color: '#B45309',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 14
  },
  manageDomainsBtn: {
    backgroundColor: '#D97706',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8
  },
  manageDomainsBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700'
  },
  subcatWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10
  },
  subcatChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1'
  },
  subcatChipChosen: {
    backgroundColor: '#ECFDF5',
    borderColor: '#059669'
  },
  subcatChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569'
  },
  subcatChipTextChosen: {
    color: '#047857',
    fontWeight: '700'
  },
  customTaskContainer: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12
  },
  customTaskLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6
  },
  suggestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    marginBottom: 4
  },
  suggestNotice: {
    flex: 1,
    fontSize: 11,
    color: '#64748B',
    marginRight: 8
  },
  suggestBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0'
  },
  suggestBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669'
  },
  modelRow: {
    flexDirection: 'row',
    gap: 8
  },
  modelOption: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 6,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    gap: 6
  },
  modelOptionActive: {
    borderColor: '#059669',
    backgroundColor: '#ECFDF5'
  },
  modelText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    textAlign: 'center'
  },
  modelTextActive: {
    color: '#047857',
    fontWeight: '700'
  },
  currencyInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 14
  },
  currencySymbol: {
    fontSize: 18,
    fontWeight: '700',
    color: '#059669',
    marginRight: 6
  },
  currencyInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    paddingVertical: 10
  },
  unitRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  unitChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1'
  },
  unitChipActive: {
    backgroundColor: '#059669',
    borderColor: '#059669'
  },
  unitChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569'
  },
  unitChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700'
  },
  helperText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 4
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 14,
    marginTop: 16
  },
  switchTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2
  },
  switchSub: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16
  },
  localityWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 6
  },
  localityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1'
  },
  localityChipSelected: {
    backgroundColor: '#ECFDF5',
    borderColor: '#059669'
  },
  localityChipText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#475569'
  },
  localityChipTextSelected: {
    color: '#047857',
    fontWeight: '700'
  },
  daysWrap: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 10
  },
  dayCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    gap: 10
  },
  dayCardChecked: {
    backgroundColor: '#F0FDF4',
    borderRadius: 8
  },
  dayText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569'
  },
  dayTextChecked: {
    color: '#047857',
    fontWeight: '700'
  },
  rowTwoCol: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  previewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16
  },
  previewImage: {
    width: '100%',
    height: 140
  },
  previewBadgeOverlay: {
    position: 'absolute',
    top: 10,
    left: 10
  },
  previewDomainBadge: {
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12
  },
  previewDomainText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700'
  },
  previewBody: {
    padding: 14
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4
  },
  previewSubcat: {
    fontSize: 12,
    fontWeight: '600',
    color: '#059669',
    marginBottom: 8
  },
  previewDesc: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
    marginBottom: 12
  },
  previewPriceBox: {
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 10,
    marginBottom: 12
  },
  previewPriceLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600'
  },
  previewPriceVal: {
    fontSize: 16,
    fontWeight: '800',
    color: '#059669',
    marginTop: 2
  },
  previewMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 10
  },
  previewMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  previewMetaText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '500'
  },
  checklistCard: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 12,
    padding: 14,
    gap: 8
  },
  checklistTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#065F46',
    marginBottom: 4
  },
  checkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  checkText: {
    fontSize: 12,
    color: '#047857',
    fontWeight: '600'
  },
  footer: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingHorizontal: 16,
    paddingTop: 12
  },
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#059669',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8
  },
  nextBtnDisabled: {
    backgroundColor: '#94A3B8'
  },
  nextBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700'
  },
  footerTwoBtn: {
    flexDirection: 'row',
    gap: 12
  },
  draftBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1'
  },
  draftBtnText: {
    color: '#334155',
    fontSize: 15,
    fontWeight: '700'
  },
  publishMainBtn: {
    flex: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#059669',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 6
  },
  publishMainBtnDisabled: {
    backgroundColor: '#6EE7B7'
  },
  publishMainBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700'
  }
});
