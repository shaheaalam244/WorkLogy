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
  Modal
} from 'react-native';
import { Ionicons, Feather, MaterialIcons } from '@expo/vector-icons';
import { api } from '../api/client';
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

interface LocalitySuggestion {
  localityId?: string;
  name: string;
  zoneId?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

export default function CreateJobScreen({ route, navigation }: any) {
  const { categorySlug, categoryName, subservice, basePrice, title: initialTitle, urgency: initialUrgency } = route.params || {};

  // Form Fields
  const [title, setTitle] = useState(initialTitle || (subservice ? `${subservice} Service` : ''));
  const [description, setDescription] = useState('');
  const [urgency, setUrgency] = useState<'normal' | 'emergency'>(
    initialUrgency === 'high' || initialUrgency === 'emergency' ? 'emergency' : 'normal'
  );

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

  // GPS & Coordinates Metadata
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(null);
  const [locationSource, setLocationSource] = useState<'gps' | 'manual' | 'saved_address'>('manual');
  const [accuracyMeters, setAccuracyMeters] = useState<number | null>(null);

  // Saved Addresses State
  const [savedAddresses, setSavedAddresses] = useState<ServiceAddress[]>([]);
  const [loadingAddresses, setLoadingAddresses] = useState(false);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);

  // Quick Add Address Modal State
  const [showQuickAddModal, setShowQuickAddModal] = useState(false);
  const [quickLabel, setQuickLabel] = useState('Home');
  const [quickHouse, setQuickHouse] = useState('');
  const [quickStreet, setQuickStreet] = useState('');
  const [quickLocality, setQuickLocality] = useState('');
  const [quickCity, setQuickCity] = useState('Lucknow');
  const [quickPincode, setQuickPincode] = useState('226010');
  const [quickState, setQuickState] = useState('Uttar Pradesh');
  const [savingQuickAddress, setSavingQuickAddress] = useState(false);

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
        // Preselect active default saved address, or first address ("jo active rhe wo aaye")
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
    setHouseNumber(addr.houseNumber || '');
    setStreetAddress(addr.street || '');
    setLocality(addr.locality || addr.landmark || '');
    setCity(cleanAdministrative(addr.city) || 'Lucknow');
    setStateName(addr.state || 'Uttar Pradesh');
    setPincode(addr.zipCode || addr.pincode || '');

    // Set coordinates only if valid and non-zero (never fabricate coordinates)
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

  const handleSaveQuickAddress = async () => {
    if (!quickStreet.trim() || !quickCity.trim() || !quickPincode.trim()) {
      Alert.alert('Required Fields', 'Street/Colony, City, and PIN code are required to save an address.');
      return;
    }

    try {
      setSavingQuickAddress(true);
      const payload: Partial<ServiceAddress> = {
        label: quickLabel,
        houseNumber: quickHouse.trim(),
        street: quickStreet.trim(),
        locality: quickLocality.trim(),
        landmark: quickLocality.trim(),
        city: quickCity.trim(),
        state: quickState.trim() || 'Uttar Pradesh',
        zipCode: quickPincode.trim(),
        isDefault: savedAddresses.length === 0
      };

      const res = await api.customer.addAddress(payload);
      let updatedList = savedAddresses;
      if (res?.addresses && Array.isArray(res.addresses)) {
        updatedList = res.addresses;
        setSavedAddresses(res.addresses);
      } else {
        const fresh = await api.customer.getAddresses();
        if (fresh?.addresses) {
          updatedList = fresh.addresses;
          setSavedAddresses(fresh.addresses);
        }
      }

      // Automatically select and apply the newly added address
      const newlyAdded = updatedList[updatedList.length - 1];
      if (newlyAdded) {
        applySavedAddress(newlyAdded);
      }

      setShowQuickAddModal(false);
      setQuickHouse('');
      setQuickStreet('');
      setQuickLocality('');
      setQuickPincode('226010');
      Alert.alert('Address Saved 🎉', `"${quickLabel}" address has been saved and selected for this service request.`);
    } catch (err: any) {
      Alert.alert('Failed to Save', err.message || 'Could not save address. Please try again.');
    } finally {
      setSavingQuickAddress(false);
    }
  };

  /**
   * Auto-Detects GPS coordinates and reverse geocodes into separated address fields
   * Handles permission denial, disabled services, timeouts, and strips plus codes
   */
  const handleDetectLocation = async () => {
    const currentSeq = ++gpsSeqRef.current;
    try {
      setDetectingLocation(true);
      const res = await detectGpsLocation();

      // Discard outdated async result if a newer request was dispatched
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

      // Populate separated fields cleanly — never allow Plus Codes or Divisions
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
        setAccuracyMeters(loc.accuracyMeters ?? null);
      }

      // If accuracy reading is very imprecise (> 500m), advise the customer
      if (loc.accuracyMeters && loc.accuracyMeters > 500) {
        Alert.alert(
          'Approximate Location (±' + loc.accuracyMeters + 'm)',
          'Your device returned an approximate location reading. Please verify your locality and building/street number before submitting.',
          [{ text: 'Review Address', style: 'default' }]
        );
      }
    } catch (err: any) {
      Alert.alert('Location Error', err?.message || 'Could not detect your GPS location automatically.');
    } finally {
      setDetectingLocation(false);
    }
  };

  /**
   * Debounced Locality Search / Autocomplete via Backend Zone & Locality API
   */
  const handleLocalityChange = (text: string) => {
    // If user enters an administrative division, clean it
    let cleanedText = text;
    if (isDivision(text)) {
      cleanedText = cleanAdministrative(text);
    }
    setLocality(cleanedText);

    // If user modifies locality text after GPS auto-detect, switch source to manual
    if (locationSource === 'gps') {
      setLocationSource('manual');
    }

    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }

    const query = cleanedText.trim();
    if (query.length < 2) {
      setLocalitySuggestions([]);
      setShowSuggestions(false);
      return;
    }

    searchDebounceRef.current = setTimeout(async () => {
      const seq = ++searchSeqRef.current;
      try {
        setLoadingSuggestions(true);
        const res = await api.zones.getLocalities({ search: query });
        if (seq === searchSeqRef.current) {
          if (res?.localities && res.localities.length > 0) {
            setLocalitySuggestions(res.localities.slice(0, 6));
            setShowSuggestions(true);
          } else {
            setLocalitySuggestions([]);
            setShowSuggestions(false);
          }
        }
      } catch {
        if (seq === searchSeqRef.current) {
          setLocalitySuggestions([]);
          setShowSuggestions(false);
        }
      } finally {
        if (seq === searchSeqRef.current) {
          setLoadingSuggestions(false);
        }
      }
    }, 250);
  };

  const handleSelectLocality = (item: LocalitySuggestion) => {
    setLocality(item.name);
    if (item.zoneId) {
      setZoneId(item.zoneId);
    }
    if (!city) {
      setCity('Lucknow');
    }
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

  /**
   * Submit Job with Optional Budget or Quote Request
   */
  const handleSubmit = async () => {
    if (isSubmittingRef.current || submitting) return;

    // Validate Required Fields
    if (!title.trim() || title.trim().length < 3) {
      Alert.alert('Required Information', 'Please provide a descriptive service title (at least 3 characters).');
      return;
    }

    if (!description.trim() || description.trim().length < 10) {
      Alert.alert('Required Information', 'Please describe the problem or requirements in detail (at least 10 characters).');
      return;
    }

    // Clean and validate city and locality
    let finalCity = cleanAdministrative(city.trim());
    let finalLocality = locality.trim();

    if (isDivision(finalLocality)) {
      Alert.alert(
        'Invalid Locality',
        'An administrative division (e.g. "Lucknow Division") cannot be used as a locality. Please specify your sector, colony, or neighborhood (e.g. Kamalabad Barhauli, Gomti Nagar).'
      );
      return;
    }

    // Automatic swap detection: if user put a canonical locality in City (e.g. "Gomti Nagar")
    if (isKnownLocality(finalCity)) {
      if (!finalLocality || finalLocality.toLowerCase() === 'lucknow') {
        finalLocality = finalCity;
        finalCity = 'Lucknow';
        setCity(finalCity);
        setLocality(finalLocality);
      }
    }

    if (!finalCity || finalCity.length < 2) {
      Alert.alert('Required Information', 'City is required for technician dispatch.');
      return;
    }

    if (!streetAddress.trim() && !finalLocality) {
      Alert.alert('Required Information', 'Please provide your street address or locality so nearby professionals know the service area.');
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
        Alert.alert('Invalid Budget', 'Please enter a valid positive budget amount in ₹, or switch to "Request Quotes".');
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
      // Default & Mode B: Request Quotes (no mandatory price)
      budgetPayload = {
        type: 'quote',
        amount: 0
      };
    }

    try {
      isSubmittingRef.current = true;
      setSubmitting(true);

      const selectedSavedAddress = savedAddresses.find((a) => a._id === selectedAddressId);
      const chosenLabel = selectedSavedAddress?.label || 'Service Location';

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
        category: categorySlug || 'electrician',
        subcategory: subservice || undefined,
        urgency: urgency === 'emergency' ? 'urgent' : 'medium',
        budget: budgetPayload,
        location: locationPayload
      });

      // Synchronize affected queries across all screens
      dataSyncService.notify('BOOKINGS_CHANGED', res);

      const pricingDesc =
        budgetPayload.type === 'fixed' && budgetPayload.amount > 0
          ? `Fixed Budget: ₹${budgetPayload.amount.toLocaleString('en-IN')}`
          : 'Request Quotes (Vendors will submit competitive quotes)';

      Alert.alert(
        'Service Request Created 🎉',
        `Your request has been broadcast to verified local professionals.\n\n📍 Location: ${finalLocality ? finalLocality + ', ' : ''}${finalCity}\n💰 Pricing: ${pricingDesc}`,
        [
          {
            text: 'View My Jobs',
            onPress: () => {
              if (navigation.replace) {
                navigation.replace('MyJobsTab');
              } else {
                navigation.navigate('MyJobsTab');
              }
            }
          }
        ]
      );
    } catch (err: any) {
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
        bounces={false}
        alwaysBounceVertical={false}
        overScrollMode="never"
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.form}>
          {/* Service Title */}
          <View style={styles.titleRow}>
            <Text style={styles.label}>Service Title *</Text>
            {categoryName && (
              <View style={styles.categoryBadgeInline}>
                <Ionicons name="construct" size={11} color={COLORS.primary} />
                <Text style={styles.categoryBadgeInlineText}>{categoryName}</Text>
              </View>
            )}
          </View>
          <TextInput
            style={styles.input}
            placeholder="e.g. Ceiling Fan Installation / AC Not Cooling"
            placeholderTextColor={COLORS.textMuted}
            value={title}
            onChangeText={setTitle}
          />

          {/* Description */}
          <Text style={styles.label}>Problem Description & Requirements *</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Describe symptoms, noise, model number, room accessibility..."
            placeholderTextColor={COLORS.textMuted}
            multiline
            numberOfLines={3}
            value={description}
            onChangeText={setDescription}
          />

          {/* Urgency & Timeline */}
          <Text style={styles.label}>Urgency & Timeline</Text>
          <View style={styles.row}>
            <TouchableOpacity
              style={[styles.toggleBtn, urgency === 'normal' && styles.toggleBtnActive]}
              onPress={() => setUrgency('normal')}
              activeOpacity={0.7}
            >
              <Ionicons
                name="calendar-outline"
                size={15}
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
                size={15}
                color={urgency === 'emergency' ? '#EF4444' : COLORS.textSecondary}
                style={{ marginRight: 6 }}
              />
              <Text style={[styles.toggleText, urgency === 'emergency' && styles.emergencyTextActive]}>
                Urgent (Today)
              </Text>
            </TouchableOpacity>
          </View>

          {/* Pricing Preference: Mode B (Request Quotes) vs Mode A (Fixed Budget) */}
          <Text style={styles.label}>Pricing Preference</Text>
          <View style={styles.row}>
            <TouchableOpacity
              style={[styles.toggleBtn, budgetType === 'quote' && styles.toggleBtnActive]}
              onPress={() => setBudgetType('quote')}
              activeOpacity={0.7}
            >
              <Ionicons
                name="chatbubble-ellipses-outline"
                size={14}
                color={budgetType === 'quote' ? COLORS.primary : COLORS.textSecondary}
                style={{ marginRight: 6 }}
              />
              <Text style={[styles.toggleText, budgetType === 'quote' && styles.toggleTextActive]}>
                Request Quotes
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.toggleBtn, budgetType === 'fixed' && styles.toggleBtnActive]}
              onPress={() => setBudgetType('fixed')}
              activeOpacity={0.7}
            >
              <Ionicons
                name="pricetag-outline"
                size={14}
                color={budgetType === 'fixed' ? COLORS.primary : COLORS.textSecondary}
                style={{ marginRight: 6 }}
              />
              <Text style={[styles.toggleText, budgetType === 'fixed' && styles.toggleTextActive]}>
                Fixed Budget (₹)
              </Text>
            </TouchableOpacity>
          </View>

          {/* Mode B Info Box */}
          {budgetType === 'quote' ? (
            <View style={styles.quoteExplainerBox}>
              <Ionicons name="information-circle-outline" size={17} color={COLORS.primary} style={{ marginTop: 1 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.quoteExplainerTitle}>Request Quotes from Verified Experts</Text>
                <Text style={styles.quoteExplainerText}>
                  Let interested professionals inspect your requirements and submit their best quotations. You can compare estimates before hiring.
                </Text>
              </View>
            </View>
          ) : (
            /* Mode A: Optional Budget Input */
            <View style={{ marginTop: 6 }}>
              <View style={styles.budgetInputContainer}>
                <Text style={styles.currencyPrefix}>₹</Text>
                <TextInput
                  style={styles.budgetInput}
                  keyboardType="numeric"
                  value={budgetAmount}
                  onChangeText={setBudgetAmount}
                  placeholder="e.g. 500 (or leave blank to request quotes)"
                  placeholderTextColor={COLORS.textMuted}
                />
              </View>
              <Text style={styles.budgetHint}>
                Optional. Leave blank to let technicians offer their own quotes.
              </Text>
            </View>
          )}

          {/* Location & Address Section */}
          <View style={styles.savedAddressSection}>
            {/* Choose Saved Address Chips (if customer has saved addresses) */}
            {savedAddresses.length > 0 && (
              <View style={styles.savedSelectorBox}>
                <View style={styles.savedSelectorHeader}>
                  <View style={styles.savedSelectorTitleRow}>
                    <Ionicons name="bookmark" size={13} color={COLORS.primary} />
                    <Text style={styles.savedSelectorTitle}>Choose Saved Address</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.savedSelectorManageLink}
                    onPress={() => {
                      if (navigation.navigate) {
                        navigation.navigate('ProfileTab');
                      }
                    }}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="settings-outline" size={12} color="#64748B" />
                    <Text style={styles.savedSelectorManageText}>Manage in Profile</Text>
                  </TouchableOpacity>
                </View>

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
                        <Ionicons
                          name={iconName}
                          size={13}
                          color={isSelected ? '#059669' : '#64748B'}
                        />
                        <Text style={[styles.savedChipText, isSelected && styles.savedChipTextSelected]}>
                          {addr.label || 'Address'}
                        </Text>
                        {addr.isDefault && (
                          <View style={styles.chipDefaultBadge}>
                            <Text style={styles.chipDefaultText}>Active</Text>
                          </View>
                        )}
                        {isSelected && (
                          <Ionicons name="checkmark-circle" size={13} color="#059669" />
                        )}
                      </TouchableOpacity>
                    );
                  })}

                  <TouchableOpacity
                    style={styles.addChipBtn}
                    onPress={() => setShowQuickAddModal(true)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="add" size={14} color={COLORS.primary} />
                    <Text style={styles.addChipBtnText}>Add New</Text>
                  </TouchableOpacity>
                </ScrollView>
              </View>
            )}

            {/* Manual Entry Form — ALWAYS DIRECTLY VISIBLE ON SCREEN */}
            <View style={styles.manualEntryContainer}>
              <View style={styles.locationHeaderRow}>
                <View>
                  <Text style={[styles.label, { marginTop: 0, marginBottom: 0 }]}>Service Address</Text>
                  <Text style={styles.sectionSubtitleMain}>
                    Enter or verify where service is needed
                  </Text>
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
                    {detectingLocation ? 'Acquiring GPS...' : 'Auto-Detect GPS'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Compact GPS Coordinates Status Pill */}
              {coordinates ? (
                <View style={styles.compactGpsPill}>
                  <Ionicons name="location-sharp" size={12} color="#059669" />
                  <Text style={styles.compactGpsText}>
                    GPS coordinates attached{accuracyMeters ? ` (±${accuracyMeters}m)` : ''}
                  </Text>
                </View>
              ) : (
                <View style={[styles.compactGpsPill, styles.compactGpsPillManual]}>
                  <Ionicons name="location-outline" size={12} color={COLORS.textMuted} />
                  <Text style={styles.compactGpsTextManual}>Manual address entry</Text>
                </View>
              )}

              {/* House / Flat No. and Building Name — optional */}
              <Text style={styles.subLabel}>House / Flat No. and Building Name</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Flat 302, 3rd Floor, Tower B"
                placeholderTextColor={COLORS.textMuted}
                value={houseNumber}
                onChangeText={(val) => {
                  setSelectedAddressId(null);
                  setHouseNumber(val);
                }}
              />

              {/* Street / Road / Colony — optional */}
              <Text style={styles.subLabel}>Street / Road / Colony</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Main Ring Road, Sector B"
                placeholderTextColor={COLORS.textMuted}
                value={streetAddress}
                onChangeText={(val) => {
                  setSelectedAddressId(null);
                  setStreetAddress(val);
                }}
              />

              {/* Locality / Sector / Area — required */}
              <Text style={styles.subLabel}>Locality / Sector / Area *</Text>
              <View style={{ position: 'relative', zIndex: 10 }}>
                <View style={styles.localityInputWrapper}>
                  <TextInput
                    style={[styles.input, { flex: 1, paddingRight: 32 }]}
                    placeholder="Search locality (e.g. Gomti Nagar, Aliganj...)"
                    placeholderTextColor={COLORS.textMuted}
                    value={locality}
                    onChangeText={(val) => {
                      setSelectedAddressId(null);
                      handleLocalityChange(val);
                    }}
                    onFocus={() => {
                      if (localitySuggestions.length > 0) {
                        setShowSuggestions(true);
                      }
                    }}
                  />
                  {loadingSuggestions && (
                    <ActivityIndicator size="small" color={COLORS.primary} style={styles.localitySpinner} />
                  )}
                </View>

                {/* Locality Autocomplete Dropdown */}
                {showSuggestions && localitySuggestions.length > 0 && (
                  <View style={styles.suggestionsContainer}>
                    <View style={styles.suggestionsHeader}>
                      <Text style={styles.suggestionsHeaderText}>Select Verified Locality</Text>
                      <TouchableOpacity onPress={() => setShowSuggestions(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
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
                        }}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="location-outline" size={14} color={COLORS.primary} style={{ marginRight: 6 }} />
                        <Text style={styles.suggestionName} numberOfLines={1}>
                          {item.name}
                        </Text>
                        {item.zoneId && (
                          <View style={styles.suggestionZoneBadge}>
                            <Text style={styles.suggestionZoneText}>{item.zoneId}</Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              {/* City & PIN Code */}
              <View style={[styles.row, { marginTop: 4 }]}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.subLabel}>City *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. Lucknow, Unnao"
                    placeholderTextColor={COLORS.textMuted}
                    value={city}
                    onChangeText={(val) => {
                      setSelectedAddressId(null);
                      handleCityChange(val);
                    }}
                  />
                </View>
                <View style={{ width: 120 }}>
                  <Text style={styles.subLabel}>PIN Code</Text>
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
                    }}
                  />
                </View>
              </View>
            </View>
          </View>

          {/* Selected Address Confirmation Card */}
          <View style={styles.addressConfirmationBox}>
            <View style={styles.confirmationHeaderRow}>
              <View style={styles.confirmationIconPill}>
                <Ionicons name="location-sharp" size={14} color={COLORS.primary} />
                <Text style={styles.confirmationTitle}>Selected Service Destination</Text>
              </View>
              {selectedAddressId && (
                <View style={styles.confirmationLabelBadge}>
                  <Text style={styles.confirmationLabelText}>
                    {savedAddresses.find((a) => a._id === selectedAddressId)?.label || 'Saved'}
                  </Text>
                </View>
              )}
            </View>

            <Text style={styles.confirmationAddressText} numberOfLines={2}>
              {[houseNumber, streetAddress, locality, city, pincode].filter(Boolean).join(', ') || 'No address specified'}
            </Text>

            <View style={styles.confirmationFooterRow}>
              <View style={styles.confirmationSourcePill}>
                <Ionicons
                  name={coordinates ? 'navigate' : 'map-outline'}
                  size={12}
                  color={coordinates ? '#059669' : '#64748B'}
                />
                <Text style={[styles.confirmationSourceText, coordinates && { color: '#059669' }]}>
                  {coordinates
                    ? `GPS Ready (${accuracyMeters ? `±${accuracyMeters}m` : 'Attached'})`
                    : 'Street & Locality Navigation'}
                </Text>
              </View>

              {savedAddresses.length > 0 && (
                <TouchableOpacity
                  onPress={() => {
                    if (navigation.navigate) {
                      navigation.navigate('ProfileTab');
                    }
                  }}
                  style={styles.confirmationChangeBtn}
                >
                  <Text style={styles.confirmationChangeText}>Manage Addresses</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* WorkLogy Escrow Protection Guarantee Note */}
          <View style={styles.guaranteeBox}>
            <Ionicons name="shield-checkmark" size={16} color={COLORS.primary} />
            <Text style={styles.guaranteeText}>
              WorkLogy Escrow Protection holds funds securely until you physically inspect and approve completed work.
            </Text>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={styles.submitBtn}
            onPress={handleSubmit}
            disabled={submitting}
            activeOpacity={0.8}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.submitBtnText}>Submit Service Request</Text>
                <Feather name="arrow-right" size={16} color="#FFFFFF" />
              </View>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Quick Add Address Modal */}
      <Modal visible={showQuickAddModal} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add New Service Address</Text>
              <TouchableOpacity onPress={() => setShowQuickAddModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.textDark} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.subLabel}>Address Label</Text>
              <View style={styles.labelPickerRow}>
                {['Home', 'Office', 'Site'].map((lbl) => (
                  <TouchableOpacity
                    key={lbl}
                    style={[styles.labelChoiceBtn, quickLabel === lbl && styles.labelChoiceBtnActive]}
                    onPress={() => setQuickLabel(lbl)}
                  >
                    <Text
                      style={[styles.labelChoiceText, quickLabel === lbl && styles.labelChoiceTextActive]}
                    >
                      {lbl}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.subLabel}>House / Flat No. & Building Name</Text>
              <TextInput
                style={styles.input}
                value={quickHouse}
                onChangeText={setQuickHouse}
                placeholder="e.g. Flat 402, Lotus Court"
                placeholderTextColor={COLORS.textMuted}
              />

              <Text style={styles.subLabel}>Street / Road / Colony *</Text>
              <TextInput
                style={styles.input}
                value={quickStreet}
                onChangeText={setQuickStreet}
                placeholder="e.g. Main Ring Road, Sector B"
                placeholderTextColor={COLORS.textMuted}
              />

              <Text style={styles.subLabel}>Locality / Landmark</Text>
              <TextInput
                style={styles.input}
                value={quickLocality}
                onChangeText={setQuickLocality}
                placeholder="e.g. Gomti Nagar, Near Metro Station"
                placeholderTextColor={COLORS.textMuted}
              />

              <View style={[styles.row, { marginTop: 0 }]}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.subLabel}>City *</Text>
                  <TextInput
                    style={styles.input}
                    value={quickCity}
                    onChangeText={setQuickCity}
                    placeholder="e.g. Lucknow"
                    placeholderTextColor={COLORS.textMuted}
                  />
                </View>

                <View style={{ width: 120 }}>
                  <Text style={styles.subLabel}>PIN Code *</Text>
                  <TextInput
                    style={styles.input}
                    value={quickPincode}
                    onChangeText={setQuickPincode}
                    placeholder="226010"
                    placeholderTextColor={COLORS.textMuted}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <View style={styles.modalActionRow}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => setShowQuickAddModal(false)}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.saveBtn}
                  onPress={handleSaveQuickAddress}
                  disabled={savingQuickAddress}
                >
                  {savingQuickAddress ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.saveBtnText}>Save & Use Address</Text>
                  )}
                </TouchableOpacity>
              </View>
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
    paddingBottom: 24
  },
  form: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 4
  },
  categoryBadgeInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6
  },
  categoryBadgeInlineText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.primary
  },
  label: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.textDark,
    marginBottom: 4,
    marginTop: 8
  },
  subLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 3,
    marginTop: 6
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: COLORS.textDark
  },
  textArea: {
    height: 72,
    textAlignVertical: 'top'
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
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    paddingVertical: 9,
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
  quoteExplainerBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 10,
    padding: 10,
    marginTop: 6
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
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
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
    height: 38,
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textDark
  },
  budgetHint: {
    fontSize: 10.5,
    color: COLORS.textMuted,
    marginTop: 3,
    marginLeft: 2
  },
  locationHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 4
  },
  gpsDetectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6
  },
  gpsDetectBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primary
  },
  compactGpsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 6,
    marginBottom: 6,
    alignSelf: 'flex-start'
  },
  compactGpsPillManual: {
    backgroundColor: '#F1F5F9'
  },
  compactGpsText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669'
  },
  compactGpsTextManual: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textMuted
  },
  localityInputWrapper: {
    position: 'relative',
    justifyContent: 'center'
  },
  localitySpinner: {
    position: 'absolute',
    right: 10
  },
  suggestionsContainer: {
    position: 'absolute',
    top: 42,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 5,
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
  suggestionZoneBadge: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4
  },
  suggestionZoneText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#0284C7'
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
    marginTop: 12
  },
  guaranteeText: {
    flex: 1,
    fontSize: 11,
    color: '#065F46',
    lineHeight: 15
  },
  submitBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 13,
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
  // Saved Address Block
  savedAddressSection: {
    marginTop: 12,
    marginBottom: 4
  },
  savedAddressHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10
  },
  sectionTitleMain: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textDark
  },
  sectionSubtitleMain: {
    fontSize: 10.5,
    color: COLORS.textSecondary,
    marginTop: 1
  },
  savedSelectorBox: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 10,
    marginBottom: 10
  },
  savedSelectorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  savedSelectorTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  savedSelectorTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.textDark
  },
  savedSelectorManageLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingVertical: 2,
    paddingHorizontal: 4
  },
  savedSelectorManageText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B'
  },
  savedChipsScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 2
  },
  savedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6
  },
  savedChipSelected: {
    borderColor: COLORS.primary,
    backgroundColor: '#F0FDF4'
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
    borderRadius: 4,
    marginLeft: 2
  },
  chipDefaultText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#065F46'
  },
  addChipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderStyle: 'dashed',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6
  },
  addChipBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: COLORS.primary
  },
  manualEntryContainer: {
    marginTop: 2
  },
  addressConfirmationBox: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
    marginBottom: 2
  },
  confirmationHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4
  },
  confirmationIconPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  confirmationTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.textDark
  },
  confirmationLabelBadge: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 4
  },
  confirmationLabelText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#0284C7'
  },
  confirmationAddressText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textDark,
    lineHeight: 16
  },
  confirmationFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC'
  },
  confirmationSourcePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  confirmationSourceText: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#64748B'
  },
  confirmationChangeBtn: {
    paddingVertical: 2,
    paddingHorizontal: 6
  },
  confirmationChangeText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primary
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
    maxHeight: '88%'
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
  labelPickerRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8
  },
  labelChoiceBtn: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    backgroundColor: '#FFFFFF'
  },
  labelChoiceBtnActive: {
    borderColor: COLORS.primary,
    backgroundColor: '#ECFDF5'
  },
  labelChoiceText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary
  },
  labelChoiceTextActive: {
    color: COLORS.primary
  },
  modalActionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
    paddingBottom: 8
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center'
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textSecondary
  },
  saveBtn: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    alignItems: 'center'
  },
  saveBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF'
  }
});
