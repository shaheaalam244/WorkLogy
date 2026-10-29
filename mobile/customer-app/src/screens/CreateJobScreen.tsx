import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Image,
  Linking
} from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { api } from '../api/client';
import { useAuth } from '../hooks/useAuth';
import { COLORS } from '../theme/colors';
import { dataSyncService } from '../services/dataSyncService';
import type { ServiceAddress } from '../types';
import {
  getStoredLocation,
  detectGpsLocation,
  isPlusCode,
  isDivision,
  cleanAdministrative,
  isKnownLocality
} from '../services/locationService';
import { CANONICAL_LOCALITIES } from '../constants/zonesData';

interface LocalitySuggestion {
  localityId?: string;
  name: string;
  zoneId?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

const CANONICAL_CATEGORY_SUGGESTIONS: Record<string, string[]> = {
  'electrical-services': [
    'Ceiling Fan Installation',
    'Switchboard Repair',
    'Wiring & Rewiring',
    'Light Fixture Fitting',
    'Inverter & Backup Setup',
    'Electrical Fault Diagnosis'
  ],
  'plumbing-services': [
    'Pipe Leakage Repair',
    'Tap & Faucet Replacement',
    'Bathroom Fittings Installation',
    'Drainage & Blockage Clearing',
    'Water Tank Cleaning'
  ],
  'ac-hvac-services': [
    'AC Not Cooling / Low Cooling',
    'Complete AC Service & Filter Wash',
    'Gas Leakage & Refilling',
    'Split AC Installation',
    'Water Dripping from AC'
  ],
  'appliance-repair': [
    'Washing Machine Repair',
    'Refrigerator Not Cooling',
    'Microwave Heating Failure',
    'RO Water Purifier Service',
    'Geyser Not Heating Water'
  ],
  'carpentry-furniture': [
    'Door Lock & Handle Repair',
    'Furniture Assembly / Dismantling',
    'Wooden Cupboard Hinges Fix',
    'Window Mesh & Latch Fitting'
  ],
  'home-cleaning': [
    'Full Home Deep Cleaning',
    'Kitchen Deep Cleaning',
    'Bathroom Disinfection & Tile Wash',
    'Sofa & Carpet Shampooing'
  ],
  'painting-renovation': [
    'Full House Interior Painting',
    'Wall Seepage & Touch-Up Paint',
    'Waterproofing Treatment',
    'Texture & Accent Wall'
  ]
};

export default function CreateJobScreen({ route, navigation }: any) {
  const { categorySlug, categoryName, subservice, basePrice, title: initialTitle, urgency: initialUrgency } = route.params || {};
  const { user } = useAuth();

  // Category Selection State
  const [availableCategories, setAvailableCategories] = useState<any[]>([]);
  const [selectedCategorySlug, setSelectedCategorySlug] = useState<string>(categorySlug || 'electrical-services');
  const [selectedCategoryName, setSelectedCategoryName] = useState<string>(categoryName || 'Electrical Services');
  const [categorySearchQuery, setCategorySearchQuery] = useState('');
  const [showAllCategoriesModal, setShowAllCategoriesModal] = useState(false);

  // Form Fields
  const [title, setTitle] = useState(initialTitle || (subservice ? `${subservice} Service` : ''));
  const [description, setDescription] = useState('');
  const [urgency, setUrgency] = useState<'normal' | 'emergency'>(
    initialUrgency === 'high' || initialUrgency === 'emergency' ? 'emergency' : 'normal'
  );

  // Optional Photo Attachments State
  const [attachedPhotos, setAttachedPhotos] = useState<{ uri: string; name?: string }[]>([]);
  const [pickingPhoto, setPickingPhoto] = useState(false);

  // Pricing Preference: Mode B ("Request Quotes") is the recommended default
  const [budgetType, setBudgetType] = useState<'quote' | 'fixed'>('quote');
  const [budgetAmount, setBudgetAmount] = useState(basePrice && Number(basePrice) > 0 ? String(basePrice) : '');

  // Separated Address & Locality Fields
  const [houseNumber, setHouseNumber] = useState('');
  const [streetAddress, setStreetAddress] = useState('');
  const [locality, setLocality] = useState('');
  const [city, setCity] = useState('');
  const [stateName, setStateName] = useState('Uttar Pradesh');
  const [pincode, setPincode] = useState('');
  const [zoneId, setZoneId] = useState<string | null>(null);

  // Save Address for Future Bookings State
  const [saveAddressForFuture, setSaveAddressForFuture] = useState(true);
  const [saveAddressLabel, setSaveAddressLabel] = useState<'Home' | 'Work' | 'Other'>('Home');

  // GPS & Coordinates Metadata
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(null);
  const [locationSource, setLocationSource] = useState<'gps' | 'manual' | 'saved_address'>('manual');
  const [accuracyMeters, setAccuracyMeters] = useState<number | null>(null);

  // Saved Addresses State
  const [savedAddresses, setSavedAddresses] = useState<ServiceAddress[]>([]);
  const [loadingAddresses, setLoadingAddresses] = useState(false);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);

  // Status & Autocomplete State
  const [submitting, setSubmitting] = useState(false);
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [localitySuggestions, setLocalitySuggestions] = useState<LocalitySuggestion[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Concurrency & Debounce Guards
  const isSubmittingRef = useRef<boolean>(false);
  const searchDebounceRef = useRef<any>(null);
  const searchSeqRef = useRef<number>(0);
  const gpsSeqRef = useRef<number>(0);

  useEffect(() => {
    loadSavedAddressesAndLocation();
    return () => {
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
      }
    };
  }, []);

  // Fetch active service categories
  useEffect(() => {
    let isMounted = true;
    api.categories
      .getAll()
      .then((res) => {
        if (isMounted && res?.categories && res.categories.length > 0) {
          setAvailableCategories(res.categories);
          if (!categorySlug) {
            const defaultCat = res.categories.find((c: any) => c.slug === 'electrical-services') || res.categories[0];
            if (defaultCat) {
              setSelectedCategorySlug(defaultCat.slug);
              setSelectedCategoryName(defaultCat.name);
            }
          } else {
            const matched = res.categories.find((c: any) => c.slug === categorySlug);
            if (matched) {
              setSelectedCategoryName(matched.name);
            }
          }
        }
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, [categorySlug]);

  // Intercept back actions when form has unsaved edits
  useEffect(() => {
    const isDirty = () => {
      const defaultTitle = initialTitle || (subservice ? `${subservice} Service` : '');
      const titleChanged = Boolean(title.trim() && title.trim() !== defaultTitle);
      const descChanged = Boolean(description.trim().length > 0);
      const addressChanged = Boolean(
        streetAddress.trim() ||
        locality.trim() ||
        houseNumber.trim()
      );
      return titleChanged || descChanged || addressChanged;
    };

    const unregister = navigation?.registerBackHandler?.(() => {
      if (isDirty()) {
        Alert.alert(
          'Discard Service Request?',
          'You have unsaved details in your service request. Are you sure you want to discard them and go back?',
          [
            { text: 'Keep Editing', style: 'cancel' },
            {
              text: 'Discard',
              style: 'destructive',
              onPress: () => navigation.goBack(true)
            }
          ]
        );
        return true;
      }
      return false;
    });

    return () => {
      unregister?.();
    };
  }, [title, description, houseNumber, streetAddress, locality, initialTitle, subservice, navigation]);

  const loadSavedAddressesAndLocation = async () => {
    try {
      setLoadingAddresses(true);
      const res = await api.customer.getAddresses();
      if (res?.addresses && Array.isArray(res.addresses) && res.addresses.length > 0) {
        setSavedAddresses(res.addresses);
        // Preselect active default saved address, or first address
        const activeAddr = res.addresses.find((a) => a.isDefault) || res.addresses[0];
        if (activeAddr) {
          applySavedAddress(activeAddr);
        }
        return;
      }
    } catch {
      // Backend error fallback
    } finally {
      setLoadingAddresses(false);
    }

    // Fallback if no remote saved addresses: read local stored location
    await loadStoredLocationFallback();
  };

  const loadStoredLocationFallback = async () => {
    try {
      const loc = await getStoredLocation(false);
      if (loc) {
        if (loc.houseNumber) setHouseNumber(loc.houseNumber);
        if (loc.city && !isDivision(loc.city)) setCity(cleanAdministrative(loc.city));
        if (loc.locality && !isPlusCode(loc.locality) && !isDivision(loc.locality)) {
          setLocality(loc.locality);
        }
        if (loc.street && !isPlusCode(loc.street) && !isDivision(loc.street)) {
          setStreetAddress(loc.street);
        }
        if (loc.pincode) setPincode(loc.pincode);
        if (loc.accuracyMeters != null) setAccuracyMeters(loc.accuracyMeters);
        if (loc.coordinates) {
          setCoordinates(loc.coordinates);
          setLocationSource('saved_address');
        }
      }
    } catch {
      // Ignore background storage load errors
    }
  };

  const applySavedAddress = (addr: ServiceAddress) => {
    setSelectedAddressId(addr._id || null);
    setSaveAddressForFuture(false); // already saved!
    setHouseNumber(addr.houseNumber || '');
    setStreetAddress(addr.street || '');
    setLocality(addr.locality || addr.landmark || '');
    setCity(cleanAdministrative(addr.city) || 'Lucknow');
    setStateName(addr.state || 'Uttar Pradesh');
    setPincode(addr.zipCode || addr.pincode || '');

    // Set coordinates only if valid and non-zero
    if (addr.coordinates && (Number(addr.coordinates.lat) !== 0 || Number(addr.coordinates.lng) !== 0)) {
      setCoordinates({
        lat: Number(addr.coordinates.lat),
        lng: Number(addr.coordinates.lng)
      });
      setLocationSource('saved_address');
      setAccuracyMeters(null);
    } else {
      setCoordinates(null);
      setLocationSource('saved_address');
      setAccuracyMeters(null);
    }
  };

  const handlePickPhotos = async () => {
    if (attachedPhotos.length >= 4) {
      Alert.alert('Limit Reached', 'You can attach up to 4 photos per service request.');
      return;
    }
    try {
      setPickingPhoto(true);
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert(
          'Photo Access Needed',
          'Please allow access to your photos to attach images of the problem.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() }
          ]
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        selectionLimit: 4 - attachedPhotos.length,
        quality: 0.75
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const validAssets = result.assets.filter((a) => {
          if (a.fileSize && a.fileSize > 5 * 1024 * 1024) {
            Alert.alert('File Too Large', 'Please select images under 5 MB each.');
            return false;
          }
          return true;
        });
        setAttachedPhotos((prev) => [...prev, ...validAssets.map((a) => ({ uri: a.uri }))].slice(0, 4));
      }
    } catch {
      Alert.alert('Notice', 'Could not open photo library.');
    } finally {
      setPickingPhoto(false);
    }
  };

  const handleRemovePhoto = (index: number) => {
    setAttachedPhotos((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleDetectLocation = async () => {
    const currentSeq = ++gpsSeqRef.current;
    try {
      setDetectingLocation(true);
      const res = await detectGpsLocation();

      if (currentSeq !== gpsSeqRef.current) return;

      if (!res.success || !res.location) {
        if (res.errorType === 'permission_denied') {
          Alert.alert(
            'Location Permission Denied',
            'GPS access is needed to detect your current location. You can enter your service address manually below.',
            [{ text: 'Enter Manually', style: 'default' }]
          );
        } else if (res.errorType === 'services_disabled') {
          Alert.alert(
            'Location Services Disabled',
            'Please turn on GPS / Location Services in your Android settings, or enter your service address manually below.',
            [{ text: 'Enter Manually', style: 'default' }]
          );
        } else {
          Alert.alert(
            'GPS Detection Failed',
            res.error || 'Could not acquire accurate GPS coordinates. Please enter your address details manually.'
          );
        }
        return;
      }

      const loc = res.location;

      if (loc.street && !isPlusCode(loc.street) && !isDivision(loc.street)) {
        setStreetAddress(loc.street);
      }
      if (loc.locality && !isPlusCode(loc.locality) && !isDivision(loc.locality)) {
        setLocality(loc.locality);
      }
      if (loc.city && !isDivision(loc.city)) {
        setCity(cleanAdministrative(loc.city));
      }
      if (loc.state) {
        setStateName(loc.state);
      }
      if (loc.pincode) {
        setPincode(loc.pincode);
      }

      if (loc.coordinates) {
        setCoordinates(loc.coordinates);
        setLocationSource('gps');
      }
      if (loc.accuracyMeters != null) {
        setAccuracyMeters(loc.accuracyMeters);
      }
      setSelectedAddressId(null);
      setSaveAddressForFuture(true);
    } catch (err: any) {
      Alert.alert('GPS Notice', err.message || 'Failed to detect GPS location. You can enter your address manually.');
    } finally {
      if (currentSeq === gpsSeqRef.current) {
        setDetectingLocation(false);
      }
    }
  };

  const handleLocalityChange = (text: string) => {
    setLocality(text);
    if (locationSource === 'gps') {
      setLocationSource('manual');
    }

    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }

    const trimmed = text.trim();
    if (trimmed.length < 2) {
      setLocalitySuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const currentSeq = ++searchSeqRef.current;
    searchDebounceRef.current = setTimeout(() => {
      try {
        setLoadingSuggestions(true);
        const lower = trimmed.toLowerCase();
        const matches: LocalitySuggestion[] = CANONICAL_LOCALITIES.filter(
          (loc) =>
            loc.name.toLowerCase().includes(lower) ||
            loc.city.toLowerCase().includes(lower)
        )
          .slice(0, 8)
          .map((loc) => ({
            localityId: loc.localityId,
            name: loc.name,
            zoneId: loc.zoneId,
            coordinates: loc.coordinates
          }));

        if (currentSeq !== searchSeqRef.current) return;
        setLocalitySuggestions(matches);
        setShowSuggestions(matches.length > 0);
      } catch {
        if (currentSeq === searchSeqRef.current) {
          setLocalitySuggestions([]);
          setShowSuggestions(false);
        }
      } finally {
        if (currentSeq === searchSeqRef.current) {
          setLoadingSuggestions(false);
        }
      }
    }, 200);
  };

  const handleSelectLocality = (item: LocalitySuggestion) => {
    setLocality(item.name);
    if (item.zoneId) setZoneId(item.zoneId);
    if (item.coordinates && (item.coordinates.lat || item.coordinates.lng)) {
      setCoordinates(item.coordinates);
      setLocationSource('manual');
      setAccuracyMeters(null);
    }
    setShowSuggestions(false);
    setLocalitySuggestions([]);
  };

  const handleCityChange = (text: string) => {
    const cleanedText = isDivision(text) ? cleanAdministrative(text) : text;
    setCity(cleanedText);
    if (locationSource === 'gps') {
      setLocationSource('manual');
    }
  };

  const currentCategoryObj = availableCategories.find((c) => c.slug === selectedCategorySlug);
  const currentCategorySuggestions =
    currentCategoryObj?.subcategories?.length > 0
      ? currentCategoryObj.subcategories
      : CANONICAL_CATEGORY_SUGGESTIONS[selectedCategorySlug] || [];

  const filteredCategories = availableCategories.filter((cat: any) =>
    (cat.name || '').toLowerCase().includes(categorySearchQuery.toLowerCase())
  );

  /**
   * Submit Job with Optional Budget or Quote Request
   */
  const handleSubmit = async () => {
    if (isSubmittingRef.current || submitting) return;

    // Validate Required Fields
    if (!title.trim() || title.trim().length < 3) {
      Alert.alert('Service Needed', 'Please provide or select a service title (e.g. Ceiling fan installation or AC not cooling).');
      return;
    }

    if (!description.trim() || description.trim().length < 5) {
      Alert.alert('Describe the Problem', 'Please briefly describe what needs fixing or installing (at least 5 characters).');
      return;
    }

    // Clean and validate city and locality
    let finalCity = cleanAdministrative(city.trim());
    let finalLocality = locality.trim();

    if (isDivision(finalLocality)) {
      Alert.alert(
        'Invalid Locality',
        'Please specify your neighborhood or area (e.g. Kamalabad Barhauli, Gomti Nagar).'
      );
      return;
    }

    if (isKnownLocality(finalCity)) {
      if (!finalLocality || finalLocality.toLowerCase() === 'lucknow') {
        finalLocality = finalCity;
        finalCity = 'Lucknow';
        setCity(finalCity);
        setLocality(finalLocality);
      }
    }

    if (!finalCity || finalCity.length < 2) {
      Alert.alert('City Required', 'Please enter your city for service dispatch.');
      return;
    }

    if (!finalLocality && !streetAddress.trim()) {
      Alert.alert('Area / Locality Required', 'Please specify your area or locality so nearby professionals know where to go.');
      return;
    }

    // Validate 6-digit Indian PIN Code if entered
    if (pincode.trim() && !/^[1-9][0-9]{5}$/.test(pincode.trim())) {
      Alert.alert('Invalid PIN Code', 'Please enter a valid 6-digit Indian Postal PIN code (e.g. 226201), or leave it blank.');
      return;
    }

    // Process Budget Payload
    let budgetPayload: { type: string; amount: number };
    if (budgetType === 'fixed' && budgetAmount.trim()) {
      const num = Number(budgetAmount.trim());
      if (isNaN(num) || num <= 0) {
        Alert.alert('Invalid Budget', 'Please enter a valid positive budget amount in ₹, or switch to "Get Quotes".');
        return;
      }
      if (num > 1000000) {
        Alert.alert('Invalid Budget', 'Budget cannot exceed ₹10,00,000.');
        return;
      }
      budgetPayload = {
        type: 'fixed',
        amount: Math.round(num)
      };
    } else {
      budgetPayload = {
        type: 'quote',
        amount: 0
      };
    }

    // Validate Authentication
    if (!user?._id) {
      Alert.alert(
        'Sign In Required',
        'Please sign in to your customer account to submit a service request.',
        [
          { text: 'Sign In', onPress: () => navigation.navigate('Login') },
          { text: 'Cancel', style: 'cancel' }
        ]
      );
      return;
    }

    try {
      isSubmittingRef.current = true;
      setSubmitting(true);

      const selectedSavedAddress = savedAddresses.find((a) => a._id === selectedAddressId);
      const chosenLabel = selectedSavedAddress?.label || saveAddressLabel || 'Home';

      const assembledAddress = [
        houseNumber.trim(),
        streetAddress.trim(),
        finalLocality,
        finalCity,
        pincode.trim()
      ].filter(Boolean).join(', ');

      const locationPayload = {
        addressLabel: chosenLabel,
        houseNumber: houseNumber.trim(),
        street: streetAddress.trim(),
        locality: finalLocality,
        city: finalCity,
        state: stateName.trim() || 'Uttar Pradesh',
        zipCode: pincode.trim(),
        address: assembledAddress,
        locationSource: selectedAddressId ? 'saved_address' : (coordinates ? 'gps' : 'manual'),
        locationAccuracyMeters: accuracyMeters,
        coordinates: coordinates
          ? {
              lat: Number(coordinates.lat) || 0,
              lng: Number(coordinates.lng) || 0
            }
          : {
              lat: 0,
              lng: 0
            }
      };

      const res = await api.jobs.createJob({
        title: title.trim(),
        description: description.trim(),
        category: selectedCategorySlug || categorySlug || 'electrical-services',
        subcategory: subservice || undefined,
        urgency: urgency === 'emergency' ? 'urgent' : 'medium',
        budget: budgetPayload,
        location: locationPayload,
        images: attachedPhotos.map((p) => p.uri)
      });

      // Save Address for Future Use if explicitly checked and not already a saved address
      if (saveAddressForFuture && !selectedAddressId) {
        try {
          await api.customer.addAddress({
            label: saveAddressLabel,
            houseNumber: houseNumber.trim(),
            street: streetAddress.trim() || finalLocality,
            locality: finalLocality,
            city: finalCity,
            state: stateName.trim() || 'Uttar Pradesh',
            zipCode: pincode.trim() || '226010',
            coordinates: coordinates || { lat: 0, lng: 0 },
            isDefault: savedAddresses.length === 0
          });
          dataSyncService.notify('PROFILE_CHANGED');
        } catch (addrErr) {
          console.warn('Address save notice:', addrErr);
        }
      }

      // Synchronize affected queries across all screens
      dataSyncService.notify('BOOKINGS_CHANGED', res);

      const createdJobId = (res as any)?.job?._id || (res as any)?.job?.id || (res as any)?._id;

      Alert.alert(
        'Service Request Posted! 🎉',
        `Your request has been broadcast to verified local professionals.\n\n📍 Location: ${finalLocality ? finalLocality + ', ' : ''}${finalCity}\n💰 Preference: ${
          budgetPayload.type === 'fixed' ? `Fixed ₹${budgetPayload.amount}` : 'Compare Quotes'
        }`,
        [
          {
            text: 'View Request Details',
            onPress: () => {
              if (createdJobId && navigation.replace) {
                navigation.replace('JobDetail', { jobId: createdJobId });
              } else if (createdJobId) {
                navigation.navigate('JobDetail', { jobId: createdJobId });
              } else {
                navigation.navigate('MyJobsTab');
              }
            }
          }
        ]
      );
    } catch (err: any) {
      if (err?.isAuthError || err?.isTokenMissing || err?.isSessionExpired || err?.status === 401) {
        Alert.alert(
          'Sign In Required',
          'Your session has expired or you are not signed in. Please sign in to submit your request.',
          [
            { text: 'Sign In', onPress: () => navigation.navigate('Login') },
            { text: 'Cancel', style: 'cancel' }
          ]
        );
        return;
      }
      Alert.alert('Submission Error', err.message || 'Failed to submit service request. Please check your connection.');
    } finally {
      isSubmittingRef.current = false;
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.form}>
          {/* ========================================================================= */}
          {/* STEP 1: WHAT SERVICE DO YOU NEED?                                          */}
          {/* ========================================================================= */}
          <View style={styles.stepSection}>
            <View style={styles.stepHeaderRow}>
              <View style={styles.stepNumberBadge}>
                <Text style={styles.stepNumberText}>1</Text>
              </View>
              <View>
                <Text style={styles.stepTitle}>What service do you need?</Text>
                <Text style={styles.stepSubtitle}>Select your category and task</Text>
              </View>
            </View>

            {/* Category Search Input */}
            <View style={styles.searchCategoryBox}>
              <Ionicons name="search" size={16} color={COLORS.textSecondary} style={{ marginRight: 6 }} />
              <TextInput
                style={styles.searchCategoryInput}
                placeholder="Search 30+ service categories (e.g. Electrical, AC, Plumbing...)"
                placeholderTextColor={COLORS.textMuted}
                value={categorySearchQuery}
                onChangeText={setCategorySearchQuery}
              />
              {categorySearchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setCategorySearchQuery('')}>
                  <Ionicons name="close-circle" size={16} color={COLORS.textMuted} />
                </TouchableOpacity>
              )}
            </View>

            {/* Active Category Display & Chips */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.categoryScroll}
              contentContainerStyle={styles.categoryScrollContent}
            >
              {(categorySearchQuery ? filteredCategories : availableCategories).slice(0, 12).map((cat: any) => {
                const isSelected = selectedCategorySlug === cat.slug;
                return (
                  <TouchableOpacity
                    key={cat._id || cat.slug}
                    style={[styles.categoryChip, isSelected && styles.categoryChipActive]}
                    onPress={() => {
                      setSelectedCategorySlug(cat.slug);
                      setSelectedCategoryName(cat.name);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.categoryChipText, isSelected && styles.categoryChipTextActive]}>
                      {cat.name}
                    </Text>
                    {isSelected && <Ionicons name="checkmark-circle" size={13} color={COLORS.primary} style={{ marginLeft: 4 }} />}
                  </TouchableOpacity>
                );
              })}

              {availableCategories.length > 12 && (
                <TouchableOpacity
                  style={styles.allCategoriesPill}
                  onPress={() => setShowAllCategoriesModal(true)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.allCategoriesPillText}>View All ({availableCategories.length}) ›</Text>
                </TouchableOpacity>
              )}
            </ScrollView>

            {/* Relevant Suggestions for Selected Category */}
            {currentCategorySuggestions.length > 0 && (
              <View style={styles.suggestionsContainerBox}>
                <Text style={styles.suggestionsTitle}>Popular Tasks in {selectedCategoryName}:</Text>
                <View style={styles.suggestionsPillsWrap}>
                  {currentCategorySuggestions.map((sug, idx) => {
                    const isSelectedSug = title === sug;
                    return (
                      <TouchableOpacity
                        key={idx}
                        style={[styles.taskSuggestionPill, isSelectedSug && styles.taskSuggestionPillActive]}
                        onPress={() => setTitle(sug)}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.taskSuggestionText, isSelectedSug && styles.taskSuggestionTextActive]}>
                          {sug}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}
          </View>

          {/* ========================================================================= */}
          {/* STEP 2: DESCRIBE THE PROBLEM                                               */}
          {/* ========================================================================= */}
          <View style={styles.stepSection}>
            <View style={styles.stepHeaderRow}>
              <View style={styles.stepNumberBadge}>
                <Text style={styles.stepNumberText}>2</Text>
              </View>
              <View>
                <Text style={styles.stepTitle}>Describe the problem</Text>
                <Text style={styles.stepSubtitle}>Tell us what needs fixing or installing</Text>
              </View>
            </View>

            <Text style={styles.fieldLabel}>Service Needed *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Ceiling fan installation or AC not cooling"
              placeholderTextColor={COLORS.textMuted}
              value={title}
              onChangeText={setTitle}
            />

            <Text style={styles.fieldLabel}>Describe the problem *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Tell us what needs fixing, what is wrong, or what you want installed."
              placeholderTextColor={COLORS.textMuted}
              multiline
              numberOfLines={3}
              value={description}
              onChangeText={setDescription}
            />

            {/* Photos Attachment (Optional) */}
            <View style={styles.photoSection}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <Text style={styles.fieldLabel}>Add Photos (Optional)</Text>
                <Text style={styles.photoCountText}>{attachedPhotos.length}/4 photos</Text>
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {attachedPhotos.map((photo, idx) => (
                  <View key={idx} style={styles.photoThumbWrapper}>
                    <Image source={{ uri: photo.uri }} style={styles.photoThumb} />
                    <TouchableOpacity
                      style={styles.removePhotoBtn}
                      onPress={() => handleRemovePhoto(idx)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="close" size={12} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                ))}

                {attachedPhotos.length < 4 && (
                  <TouchableOpacity
                    style={styles.addPhotoBtn}
                    onPress={handlePickPhotos}
                    disabled={pickingPhoto}
                    activeOpacity={0.7}
                  >
                    {pickingPhoto ? (
                      <ActivityIndicator size="small" color={COLORS.primary} />
                    ) : (
                      <>
                        <Ionicons name="camera-outline" size={20} color={COLORS.primary} />
                        <Text style={styles.addPhotoBtnText}>Add Photo</Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}
              </ScrollView>
            </View>
          </View>

          {/* ========================================================================= */}
          {/* STEP 3: CHOOSE WHEN YOU NEED THE SERVICE                                  */}
          {/* ========================================================================= */}
          <View style={styles.stepSection}>
            <View style={styles.stepHeaderRow}>
              <View style={styles.stepNumberBadge}>
                <Text style={styles.stepNumberText}>3</Text>
              </View>
              <View>
                <Text style={styles.stepTitle}>Choose when you need service</Text>
                <Text style={styles.stepSubtitle}>Standard scheduled or urgent dispatch</Text>
              </View>
            </View>

            <View style={styles.row}>
              <TouchableOpacity
                style={[styles.toggleBtn, urgency === 'normal' && styles.toggleBtnActive]}
                onPress={() => setUrgency('normal')}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="calendar-outline"
                  size={16}
                  color={urgency === 'normal' ? COLORS.primary : COLORS.textSecondary}
                  style={{ marginRight: 6 }}
                />
                <Text style={[styles.toggleText, urgency === 'normal' && styles.toggleTextActive]}>
                  Standard Schedule
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.toggleBtn, urgency === 'emergency' && styles.emergencyToggleActive]}
                onPress={() => setUrgency('emergency')}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="flash"
                  size={16}
                  color={urgency === 'emergency' ? '#EF4444' : COLORS.textSecondary}
                  style={{ marginRight: 6 }}
                />
                <Text style={[styles.toggleText, urgency === 'emergency' && styles.emergencyTextActive]}>
                  Urgent (Today / ASAP)
                </Text>
              </TouchableOpacity>
            </View>

            {urgency === 'emergency' && (
              <View style={styles.urgentNoticeBox}>
                <Ionicons name="information-circle" size={15} color="#DC2626" />
                <Text style={styles.urgentNoticeText}>
                  Urgent requests are immediately broadcast as high priority to certified local specialists.
                </Text>
              </View>
            )}
          </View>

          {/* ========================================================================= */}
          {/* STEP 4: CHOOSE HOW YOU WANT TO PAY                                        */}
          {/* ========================================================================= */}
          <View style={styles.stepSection}>
            <View style={styles.stepHeaderRow}>
              <View style={styles.stepNumberBadge}>
                <Text style={styles.stepNumberText}>4</Text>
              </View>
              <View>
                <Text style={styles.stepTitle}>Choose how you want to pay</Text>
                <Text style={styles.stepSubtitle}>Get competitive quotes or set a fixed budget</Text>
              </View>
            </View>

            <View style={styles.row}>
              <TouchableOpacity
                style={[styles.toggleBtn, budgetType === 'quote' && styles.toggleBtnActive]}
                onPress={() => setBudgetType('quote')}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="chatbubbles-outline"
                  size={16}
                  color={budgetType === 'quote' ? COLORS.primary : COLORS.textSecondary}
                  style={{ marginRight: 6 }}
                />
                <Text style={[styles.toggleText, budgetType === 'quote' && styles.toggleTextActive]}>
                  Get Quotes (Recommended)
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.toggleBtn, budgetType === 'fixed' && styles.toggleBtnActive]}
                onPress={() => setBudgetType('fixed')}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="cash-outline"
                  size={16}
                  color={budgetType === 'fixed' ? COLORS.primary : COLORS.textSecondary}
                  style={{ marginRight: 6 }}
                />
                <Text style={[styles.toggleText, budgetType === 'fixed' && styles.toggleTextActive]}>
                  Fixed Budget (₹)
                </Text>
              </TouchableOpacity>
            </View>

            {budgetType === 'quote' ? (
              <View style={styles.quoteExplainerBox}>
                <Ionicons name="shield-checkmark" size={16} color="#059669" style={{ marginTop: 1 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.quoteExplainerTitle}>Receive & Compare Quotes</Text>
                  <Text style={styles.quoteExplainerText}>
                    Verified technicians review your problem and provide transparent price estimates. You can compare
                    profiles, ratings, and quotes before deciding.
                  </Text>
                </View>
              </View>
            ) : (
              <View style={{ marginTop: 8 }}>
                <View style={styles.budgetInputContainer}>
                  <Text style={styles.currencyPrefix}>₹</Text>
                  <TextInput
                    style={styles.budgetInput}
                    keyboardType="numeric"
                    value={budgetAmount}
                    onChangeText={setBudgetAmount}
                    placeholder="Enter maximum budget amount"
                    placeholderTextColor={COLORS.textMuted}
                  />
                </View>
                <Text style={styles.budgetHint}>You only pay once you review and approve the completed job.</Text>
              </View>
            )}
          </View>

          {/* ========================================================================= */}
          {/* STEP 5 & 6: SERVICE ADDRESS & SAVE FOR FUTURE                             */}
          {/* ========================================================================= */}
          <View style={styles.stepSection}>
            <View style={styles.stepHeaderRow}>
              <View style={styles.stepNumberBadge}>
                <Text style={styles.stepNumberText}>5</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.stepTitle}>Service address</Text>
                <Text style={styles.stepSubtitle}>Where should the professional visit?</Text>
              </View>
              <TouchableOpacity
                onPress={handleDetectLocation}
                disabled={detectingLocation}
                style={styles.gpsDetectBtn}
                activeOpacity={0.7}
              >
                {detectingLocation ? (
                  <ActivityIndicator size="small" color={COLORS.primary} />
                ) : (
                  <Ionicons name="navigate-circle" size={15} color={COLORS.primary} />
                )}
                <Text style={styles.gpsDetectBtnText}>
                  {detectingLocation ? 'Locating...' : 'Use Current GPS'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Choose Saved Address Chips if any */}
            {savedAddresses.length > 0 && (
              <View style={styles.savedSelectorBox}>
                <Text style={styles.savedSelectorTitle}>Select Saved Address:</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.savedChipsScroll}
                >
                  {savedAddresses.map((addr, idx) => {
                    const isSelected = selectedAddressId === addr._id;
                    const iconName =
                      addr.label?.toLowerCase() === 'work' || addr.label?.toLowerCase() === 'office'
                        ? 'business'
                        : addr.label?.toLowerCase() === 'site'
                        ? 'construct'
                        : 'home';
                    return (
                      <TouchableOpacity
                        key={addr._id || idx}
                        style={[styles.savedChip, isSelected && styles.savedChipSelected]}
                        onPress={() => applySavedAddress(addr)}
                        activeOpacity={0.8}
                      >
                        <Ionicons name={iconName} size={13} color={isSelected ? '#059669' : '#64748B'} />
                        <Text style={[styles.savedChipText, isSelected && styles.savedChipTextSelected]}>
                          {addr.label || 'Address'}
                        </Text>
                        {addr.isDefault && (
                          <View style={styles.chipDefaultBadge}>
                            <Text style={styles.chipDefaultText}>Default</Text>
                          </View>
                        )}
                        {isSelected && <Ionicons name="checkmark-circle" size={13} color="#059669" />}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            {/* Address Input Fields */}
            <Text style={styles.fieldLabel}>House / Flat / Building (Optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Flat 302, 3rd Floor, Tower B"
              placeholderTextColor={COLORS.textMuted}
              value={houseNumber}
              onChangeText={(val) => {
                setSelectedAddressId(null);
                setHouseNumber(val);
                setSaveAddressForFuture(true);
              }}
            />

            <Text style={styles.fieldLabel}>Street / Road / Colony</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Main Ring Road, Sector B"
              placeholderTextColor={COLORS.textMuted}
              value={streetAddress}
              onChangeText={(val) => {
                setSelectedAddressId(null);
                setStreetAddress(val);
                setSaveAddressForFuture(true);
              }}
            />

            <Text style={styles.fieldLabel}>Locality / Area *</Text>
            <View style={{ position: 'relative', zIndex: 10 }}>
              <TextInput
                style={styles.input}
                placeholder="Search area (e.g. Gomti Nagar, Aliganj, Indira Nagar...)"
                placeholderTextColor={COLORS.textMuted}
                value={locality}
                onChangeText={(val) => {
                  setSelectedAddressId(null);
                  handleLocalityChange(val);
                  setSaveAddressForFuture(true);
                }}
                onFocus={() => {
                  if (localitySuggestions.length > 0) setShowSuggestions(true);
                }}
              />
              {loadingSuggestions && (
                <ActivityIndicator size="small" color={COLORS.primary} style={styles.localitySpinner} />
              )}

              {/* Locality Autocomplete Dropdown */}
              {showSuggestions && localitySuggestions.length > 0 && (
                <View style={styles.suggestionsContainer}>
                  <View style={styles.suggestionsHeader}>
                    <Text style={styles.suggestionsHeaderText}>Select Verified Area</Text>
                    <TouchableOpacity onPress={() => setShowSuggestions(false)}>
                      <Ionicons name="close-circle" size={16} color={COLORS.textMuted} />
                    </TouchableOpacity>
                  </View>
                  {localitySuggestions.map((item, index) => (
                    <TouchableOpacity
                      key={item.localityId || `${item.name}-${index}`}
                      style={styles.suggestionItem}
                      onPress={() => {
                        setSelectedAddressId(null);
                        handleSelectLocality(item);
                        setSaveAddressForFuture(true);
                      }}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="location-outline" size={14} color={COLORS.primary} style={{ marginRight: 6 }} />
                      <Text style={styles.suggestionName} numberOfLines={1}>
                        {item.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            <View style={[styles.row, { marginTop: 4 }]}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={styles.fieldLabel}>City *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Lucknow"
                  placeholderTextColor={COLORS.textMuted}
                  value={city}
                  onChangeText={(val) => {
                    setSelectedAddressId(null);
                    handleCityChange(val);
                    setSaveAddressForFuture(true);
                  }}
                />
              </View>

              <View style={{ width: 120 }}>
                <Text style={styles.fieldLabel}>PIN Code</Text>
                <TextInput
                  style={styles.input}
                  placeholder="6 digits"
                  placeholderTextColor={COLORS.textMuted}
                  keyboardType="numeric"
                  maxLength={6}
                  value={pincode}
                  onChangeText={(val) => {
                    setSelectedAddressId(null);
                    setPincode(val);
                    setSaveAddressForFuture(true);
                  }}
                />
              </View>
            </View>

            {/* Selected Destination Summary */}
            <View style={styles.destinationBox}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <Ionicons name="location-sharp" size={15} color={COLORS.primary} />
                <Text style={styles.destinationHeading}>Selected Destination</Text>
              </View>
              <Text style={styles.destinationAddressText}>
                {[houseNumber, streetAddress, locality, city, pincode].filter(Boolean).join(', ') ||
                  'Please enter your address above'}
              </Text>
            </View>

            {/* Step 6: Save Address for Future Bookings Checkbox */}
            {!selectedAddressId && (
              <View style={styles.saveAddressBox}>
                <TouchableOpacity
                  style={styles.checkboxRow}
                  onPress={() => setSaveAddressForFuture(!saveAddressForFuture)}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={saveAddressForFuture ? 'checkbox' : 'square-outline'}
                    size={20}
                    color={saveAddressForFuture ? COLORS.primary : COLORS.textSecondary}
                  />
                  <Text style={styles.checkboxLabel}>Save this address for future bookings</Text>
                </TouchableOpacity>

                {saveAddressForFuture && (
                  <View style={styles.labelPickerBox}>
                    <Text style={styles.labelPickerHeading}>Address Label:</Text>
                    <View style={styles.labelButtonsRow}>
                      {(['Home', 'Work', 'Other'] as const).map((lbl) => (
                        <TouchableOpacity
                          key={lbl}
                          style={[styles.labelChoiceBtn, saveAddressLabel === lbl && styles.labelChoiceBtnActive]}
                          onPress={() => setSaveAddressLabel(lbl)}
                        >
                          <Text style={[styles.labelChoiceText, saveAddressLabel === lbl && styles.labelChoiceTextActive]}>
                            {lbl}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}
              </View>
            )}
          </View>

          {/* ========================================================================= */}
          {/* STEP 7: FINAL REVIEW & SUBMIT                                              */}
          {/* ========================================================================= */}
          <View style={styles.stepSection}>
            <View style={styles.stepHeaderRow}>
              <View style={styles.stepNumberBadge}>
                <Text style={styles.stepNumberText}>6</Text>
              </View>
              <View>
                <Text style={styles.stepTitle}>Review & Submit</Text>
                <Text style={styles.stepSubtitle}>Verify your request before dispatching</Text>
              </View>
            </View>

            <View style={styles.reviewSummaryBox}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Service:</Text>
                <Text style={styles.summaryValue} numberOfLines={1}>
                  {title.trim() || 'Not specified'}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Category:</Text>
                <Text style={styles.summaryValue}>{selectedCategoryName}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Schedule:</Text>
                <Text style={styles.summaryValue}>
                  {urgency === 'emergency' ? 'Urgent (Today / ASAP)' : 'Standard Schedule'}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Pricing:</Text>
                <Text style={styles.summaryValue}>
                  {budgetType === 'fixed' && budgetAmount ? `Fixed Budget: ₹${budgetAmount}` : 'Get Quotes (Compare Bids)'}
                </Text>
              </View>
              <View style={[styles.summaryRow, { borderBottomWidth: 0 }]}>
                <Text style={styles.summaryLabel}>Location:</Text>
                <Text style={[styles.summaryValue, { flex: 1 }]} numberOfLines={2}>
                  {[houseNumber, streetAddress, locality, city, pincode].filter(Boolean).join(', ') || 'Not specified'}
                </Text>
              </View>
            </View>

            {/* Escrow Guarantee */}
            <View style={styles.guaranteeBox}>
              <Ionicons name="shield-checkmark" size={16} color={COLORS.primary} />
              <Text style={styles.guaranteeText}>
                WorkLogy Escrow Protection: Funds are only released after you physically inspect and approve the work.
              </Text>
            </View>

            {/* Primary Submit Button */}
            <TouchableOpacity
              style={[styles.submitBtn, submitting && { opacity: 0.7 }]}
              onPress={handleSubmit}
              disabled={submitting}
              activeOpacity={0.8}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={styles.submitBtnText}>Post Service Request</Text>
                  <Feather name="arrow-right" size={17} color="#FFFFFF" />
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* All Categories Modal */}
      <Modal visible={showAllCategoriesModal} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Service Category</Text>
              <TouchableOpacity onPress={() => setShowAllCategoriesModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.textDark} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {availableCategories.map((cat: any) => {
                const isSelected = selectedCategorySlug === cat.slug;
                return (
                  <TouchableOpacity
                    key={cat._id || cat.slug}
                    style={[styles.modalCatRow, isSelected && styles.modalCatRowActive]}
                    onPress={() => {
                      setSelectedCategorySlug(cat.slug);
                      setSelectedCategoryName(cat.name);
                      setShowAllCategoriesModal(false);
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.modalCatName, isSelected && styles.modalCatNameActive]}>
                        {cat.name}
                      </Text>
                      {cat.description ? (
                        <Text style={styles.modalCatDesc} numberOfLines={1}>
                          {cat.description}
                        </Text>
                      ) : null}
                    </View>
                    {isSelected && <Ionicons name="checkmark-circle" size={18} color={COLORS.primary} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC'
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 32
  },
  form: {
    paddingHorizontal: 16,
    paddingTop: 12
  },
  stepSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2
  },
  stepHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9'
  },
  stepNumberBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#A7F3D0'
  },
  stepNumberText: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.primary
  },
  stepTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textDark
  },
  stepSubtitle: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 1
  },
  searchCategoryBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginBottom: 10
  },
  searchCategoryInput: {
    flex: 1,
    fontSize: 12,
    color: COLORS.textDark,
    padding: 0
  },
  categoryScroll: {
    marginBottom: 10
  },
  categoryScrollContent: {
    gap: 8,
    paddingVertical: 2
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC'
  },
  categoryChipActive: {
    borderColor: COLORS.primary,
    backgroundColor: '#ECFDF5'
  },
  categoryChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary
  },
  categoryChipTextActive: {
    color: COLORS.primary,
    fontWeight: '800'
  },
  allCategoriesPill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.primary,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center'
  },
  allCategoriesPillText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: COLORS.primary
  },
  suggestionsContainerBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    marginTop: 4
  },
  suggestionsTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginBottom: 6
  },
  suggestionsPillsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6
  },
  taskSuggestionPill: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 5
  },
  taskSuggestionPillActive: {
    borderColor: COLORS.primary,
    backgroundColor: '#ECFDF5'
  },
  taskSuggestionText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textDark
  },
  taskSuggestionTextActive: {
    color: COLORS.primary,
    fontWeight: '700'
  },
  fieldLabel: {
    fontSize: 11.5,
    fontWeight: '800',
    color: COLORS.textDark,
    marginBottom: 5,
    marginTop: 8
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: COLORS.textDark
  },
  textArea: {
    height: 74,
    textAlignVertical: 'top'
  },
  photoSection: {
    marginTop: 8
  },
  photoCountText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '600'
  },
  photoThumbWrapper: {
    position: 'relative',
    width: 64,
    height: 64,
    borderRadius: 10,
    overflow: 'hidden'
  },
  photoThumb: {
    width: 64,
    height: 64,
    borderRadius: 10
  },
  removePhotoBtn: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: 'rgba(0,0,0,0.6)',
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center'
  },
  addPhotoBtn: {
    width: 64,
    height: 64,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderStyle: 'dashed',
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center'
  },
  addPhotoBtnText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: COLORS.primary,
    marginTop: 2
  },
  row: {
    flexDirection: 'row',
    gap: 8
  },
  toggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    paddingVertical: 10,
    borderRadius: 10
  },
  toggleBtnActive: {
    borderColor: COLORS.primary,
    backgroundColor: '#ECFDF5'
  },
  emergencyToggleActive: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2'
  },
  toggleText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary
  },
  toggleTextActive: {
    color: COLORS.primary
  },
  emergencyTextActive: {
    color: '#EF4444'
  },
  urgentNoticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 8,
    padding: 8,
    marginTop: 8
  },
  urgentNoticeText: {
    flex: 1,
    fontSize: 11,
    color: '#B91C1C',
    lineHeight: 15
  },
  quoteExplainerBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 10,
    padding: 10,
    marginTop: 8
  },
  quoteExplainerTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#15803D',
    marginBottom: 2
  },
  quoteExplainerText: {
    fontSize: 11,
    color: '#166534',
    lineHeight: 15
  },
  budgetInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12
  },
  currencyPrefix: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.primary,
    marginRight: 6
  },
  budgetInput: {
    flex: 1,
    height: 40,
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textDark
  },
  budgetHint: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 4,
    marginLeft: 2
  },
  gpsDetectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8
  },
  gpsDetectBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primary
  },
  savedSelectorBox: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 10,
    marginBottom: 8
  },
  savedSelectorTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginBottom: 6
  },
  savedChipsScroll: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 2
  },
  savedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 5
  },
  savedChipSelected: {
    borderColor: COLORS.primary,
    backgroundColor: '#ECFDF5'
  },
  savedChipText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: COLORS.textDark
  },
  savedChipTextSelected: {
    color: '#059669'
  },
  chipDefaultBadge: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4
  },
  chipDefaultText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#065F46'
  },
  localitySpinner: {
    position: 'absolute',
    right: 12,
    top: 12
  },
  suggestionsContainer: {
    position: 'absolute',
    top: 44,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    elevation: 4,
    zIndex: 999,
    paddingVertical: 4
  },
  suggestionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9'
  },
  suggestionsHeaderText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textMuted,
    textTransform: 'uppercase'
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: '#F8FAFC'
  },
  suggestionName: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textDark
  },
  destinationBox: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 10,
    padding: 10,
    marginTop: 10
  },
  destinationHeading: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#065F46'
  },
  destinationAddressText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textDark,
    lineHeight: 16
  },
  saveAddressBox: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9'
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  checkboxLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textDark
  },
  labelPickerBox: {
    marginTop: 8,
    marginLeft: 28
  },
  labelPickerHeading: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginBottom: 6
  },
  labelButtonsRow: {
    flexDirection: 'row',
    gap: 8
  },
  labelChoiceBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF'
  },
  labelChoiceBtnActive: {
    borderColor: COLORS.primary,
    backgroundColor: '#ECFDF5'
  },
  labelChoiceText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: COLORS.textSecondary
  },
  labelChoiceTextActive: {
    color: COLORS.primary
  },
  reviewSummaryBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    gap: 6
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9'
  },
  summaryLabel: {
    fontSize: 11.5,
    fontWeight: '700',
    color: COLORS.textSecondary,
    width: 80
  },
  summaryValue: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textDark,
    textAlign: 'right'
  },
  guaranteeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 10,
    padding: 10,
    marginTop: 10
  },
  guaranteeText: {
    flex: 1,
    fontSize: 11,
    color: '#065F46',
    lineHeight: 15
  },
  submitBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800'
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end'
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '85%'
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9'
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textDark
  },
  modalCatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9'
  },
  modalCatRowActive: {
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 8,
    borderRadius: 8
  },
  modalCatName: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textDark
  },
  modalCatNameActive: {
    color: COLORS.primary
  },
  modalCatDesc: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2
  }
});