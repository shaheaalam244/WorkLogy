import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Modal,
  TextInput,
  Platform
} from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { api } from '../api/client';
import { useAuth } from '../hooks/useAuth';
import { COLORS } from '../theme/colors';
import { formatCurrency } from '../utils/formatters';
import { renderCategoryIcon } from '../utils/categoryIcons';
import { getServiceImage } from '../utils/serviceImages';
import { secureStorage } from '../storage/secureStorage';
import { STORAGE_KEYS } from '../constants';
import { dataSyncService } from '../services/dataSyncService';
import type { ServiceCategory, ServiceAddress } from '../types';

interface VerifiedVendor {
  _id: string;
  businessName?: string;
  user?: {
    _id?: string;
    name?: string;
    avatar?: string;
  };
  name?: string;
  rating?: number;
  reviewCount?: number;
  experienceYears?: number;
  completedJobsCount?: number;
  hourlyRate?: number;
  city?: string;
  verifiedBadge?: { status?: string };
}

interface ParsedPackage {
  id: string;
  name: string;
  description: string;
  price: number;
  priceUnit: string;
  pricingBasis: string;
  duration: string;
  inclusions: string[];
  icon: string;
}

const TIME_SLOTS = [
  { id: 'morning', label: '09:00 AM - 12:00 PM', period: 'Morning' },
  { id: 'afternoon', label: '12:00 PM - 03:00 PM', period: 'Afternoon' },
  { id: 'evening', label: '03:00 PM - 06:00 PM', period: 'Evening' },
  { id: 'night', label: '06:00 PM - 09:00 PM', period: 'Night' }
];

// Normalize and build rich, distinct package data from raw category subcategories
function parsePackage(rawSub: any, categoryName: string, categorySlug: string, index: number): ParsedPackage {
  const rawName = typeof rawSub === 'string' ? rawSub : (rawSub?.name || rawSub?.title || '');
  const lower = rawName.toLowerCase();
  const catLower = (categorySlug || categoryName || '').toLowerCase();

  // Normalize title
  let name = rawName;
  if (lower === 'electrician') name = 'General Electrical Inspection & Diagnostics';
  else if (lower === 'plumber') name = 'General Plumbing Inspection & Diagnostic Visit';
  else if (lower === 'ac repair') name = 'Standard AC Diagnostic & Servicing';
  else if (lower === 'carpenter') name = 'General Carpentry & Inspection Visit';
  else if (lower === 'handyman') name = 'General Handyman Diagnostic Visit';

  // Determine realistic pricing, duration, and unit based on trade task
  let price = 449;
  let priceUnit = 'visit';
  let pricingBasis = '/ visit';
  let duration = '45–60 mins';
  let icon = 'tool';

  if (typeof rawSub === 'object' && rawSub?.basePrice && Number(rawSub.basePrice) > 0) {
    price = Number(rawSub.basePrice);
    if (rawSub.priceUnit) {
      priceUnit = rawSub.priceUnit;
      pricingBasis = `/${rawSub.priceUnit}`;
    }
  } else if (lower.includes('diagnostic') || lower.includes('inspection') || lower.includes('check') || lower.includes('tds')) {
    price = 249 + (index % 3) * 50;
    priceUnit = 'visit';
    pricingBasis = '/ visit';
    duration = '30–45 mins';
    icon = 'search';
  } else if (lower.includes('install') || lower.includes('setup') || lower.includes('mounting') || lower.includes('assembly')) {
    price = 649 + (index % 4) * 100;
    priceUnit = 'task';
    pricingBasis = '/ task';
    duration = '1–2 hours';
    icon = 'construct';
  } else if (lower.includes('rewiring') || lower.includes('panel') || lower.includes('cabling') || lower.includes('tank')) {
    price = 899 + (index % 3) * 150;
    priceUnit = 'project';
    pricingBasis = '/ project';
    duration = '2–3 hours';
    icon = 'layers';
  } else if (lower.includes('repair') || lower.includes('leak') || lower.includes('faucet') || lower.includes('switchboard')) {
    price = 349 + (index % 3) * 50;
    priceUnit = 'task';
    pricingBasis = '/ task';
    duration = '45–60 mins';
    icon = 'build';
  } else if (lower.includes('cleaning') || lower.includes('wash') || lower.includes('filter')) {
    price = 499 + (index % 3) * 100;
    priceUnit = 'service';
    pricingBasis = '/ service';
    duration = '45–60 mins';
    icon = 'sparkles';
  } else {
    const tiered = [349, 449, 549, 699, 399, 499];
    price = tiered[index % tiered.length];
    priceUnit = 'visit';
    pricingBasis = '/ visit';
    duration = '45–60 mins';
  }

  // Construct short, authentic description
  let description = '';
  if (typeof rawSub === 'object' && rawSub?.description) {
    description = rawSub.description;
  } else if (lower.includes('switchboard') || lower.includes('socket')) {
    description = 'Complete inspection, wiring terminal tightening, and switchboard repair with standard testing.';
  } else if (lower.includes('wiring') || lower.includes('rewiring')) {
    description = 'Safety load calculation, conduit inspection, and heavy-gauge wire routing for safe power distribution.';
  } else if (lower.includes('fan') || lower.includes('light')) {
    description = 'Ceiling bracket mounting, wiring balance check, and secure electrical fixture installation.';
  } else if (lower.includes('leak') || lower.includes('pipe')) {
    description = 'Joint seal inspection, pipe pressure check, and professional waterproof sealing on plumbing lines.';
  } else if (lower.includes('tap') || lower.includes('faucet')) {
    description = 'Washer replacement, spindle alignment, and leak-free faucet fitting for kitchen or bathroom.';
  } else if (lower.includes('tank')) {
    description = 'Pressure wash cleaning, silt removal, and high-level disinfection for domestic water tanks.';
  } else if (lower.includes('filter') || lower.includes('ro')) {
    description = 'Sediment and carbon filter inspection, TDS testing, and membrane calibration for pure drinking water.';
  } else if (lower.includes('ac') || catLower.includes('ac')) {
    description = 'Deep foam jet cleaning, cooling coil wash, filter clearance, and gas pressure diagnostics.';
  } else {
    description = `Professional on-site ${name.toLowerCase()} performed by background-checked ${categoryName.toLowerCase()} specialists.`;
  }

  const inclusions = [
    'Complete inspection & basic diagnostics',
    'Standard technician labor & professional tools',
    'Post-service quality and safety check'
  ];

  return {
    id: `pkg-${categorySlug || 'cat'}-${index}-${lower.replace(/[^a-z0-9]/g, '-')}`,
    name,
    description,
    price,
    priceUnit,
    pricingBasis,
    duration,
    inclusions,
    icon
  };
}

export default function CategoryDetailScreen({ route, navigation }: any) {
  const { slug, name } = route.params || {};
  const { user, promptAuthGate } = useAuth();
  const [category, setCategory] = useState<ServiceCategory | null>(null);
  const [vendors, setVendors] = useState<VerifiedVendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Direct Booking Modal State
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<ParsedPackage | null>(null);
  const [selectedDateIndex, setSelectedDateIndex] = useState(1); // Default: Tomorrow
  const [selectedTimeSlot, setSelectedTimeSlot] = useState(TIME_SLOTS[0].label);
  const [savedAddresses, setSavedAddresses] = useState<ServiceAddress[]>([]);
  const [selectedAddressIndex, setSelectedAddressIndex] = useState(0);
  const [isCustomAddress, setIsCustomAddress] = useState(false);
  const [houseNumber, setHouseNumber] = useState('');
  const [street, setStreet] = useState('');
  const [locality, setLocality] = useState('');
  const [city, setCity] = useState('Lucknow');
  const [pincode, setPincode] = useState('226010');
  const [notes, setNotes] = useState('');
  const [bookingSubmitting, setBookingSubmitting] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [createdBookingRef, setCreatedBookingRef] = useState('');

  // 5-day selectable calendar window
  const availableDates = Array.from({ length: 5 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const dayName = i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : d.toLocaleDateString('en-IN', { weekday: 'short' });
    const formatted = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    const isoDate = d.toISOString().split('T')[0];
    return { dayName, formatted, isoDate };
  });

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [catRes, vendorRes] = await Promise.all([
        api.categories.getBySlug(slug).catch(() => null),
        api.vendors.getVendors({ category: slug || name, limit: 8 }).catch(() => ({ vendors: [] }))
      ]);

      if (catRes?.category) {
        setCategory(catRes.category);
      } else {
        setError('Category details could not be loaded.');
      }

      if (vendorRes?.vendors && Array.isArray(vendorRes.vendors)) {
        setVendors(vendorRes.vendors);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load services. Please check your connection.');
    } finally {
      setLoading(false);
    }
  }, [slug, name]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Load Saved Addresses for fast booking
  useEffect(() => {
    const fetchAddresses = async () => {
      try {
        const token = await secureStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
        if (!token) return;
        const res = await api.customer.getAddresses();
        if (res?.success && Array.isArray(res.addresses) && res.addresses.length > 0) {
          setSavedAddresses(res.addresses);
          const defIdx = res.addresses.findIndex((a) => a.isDefault);
          const first = defIdx >= 0 ? res.addresses[defIdx] : res.addresses[0];
          setSelectedAddressIndex(defIdx >= 0 ? defIdx : 0);
          setHouseNumber(first.houseNumber || '');
          setStreet(first.street || '');
          setLocality(first.locality || first.landmark || '');
          setCity(first.city || 'Lucknow');
          setPincode(first.zipCode || first.pincode || '226010');
        } else {
          setIsCustomAddress(true);
        }
      } catch {
        setIsCustomAddress(true);
      }
    };
    fetchAddresses();
  }, []);

  // Intercept back button to dismiss modal first
  useEffect(() => {
    const unregister = navigation?.registerBackHandler?.(() => {
      if (isBookingModalOpen) {
        if (bookingSuccess) {
          setIsBookingModalOpen(false);
          navigation.navigate('MyJobs');
          return true;
        }
        setIsBookingModalOpen(false);
        setBookingError(null);
        return true;
      }
      return false;
    });

    return () => {
      unregister?.();
    };
  }, [isBookingModalOpen, bookingSuccess, navigation]);

  const categoryName = category?.name || name || 'Service Category';
  const categorySlug = category?.slug || slug || '';

  // Process subcategories into distinct parsed packages
  const packages: ParsedPackage[] = (category?.subcategories || []).map((sub: any, index: number) => {
    return parsePackage(sub, categoryName, categorySlug, index);
  });

  // Open booking sheet for a specific package
  const handleOpenBooking = (pkg: ParsedPackage) => {
    if (!user) {
      promptAuthGate({
        screen: 'CategoryDetail',
        params: { slug, name },
        heading: 'Sign in to book',
        message: `Verify your mobile number to book ${pkg.name}.`
      });
      return;
    }
    setSelectedPackage(pkg);
    setBookingError(null);
    setBookingSuccess(false);
    setIsBookingModalOpen(true);
  };

  const handlePostCustomJob = () => {
    if (!user) {
      promptAuthGate({
        screen: 'CreateJob',
        params: { categorySlug, categoryName },
        heading: 'Sign in to post your request',
        message: 'Verify your mobile number to post a job and receive quotations from local contractors.'
      });
    } else {
      navigation.navigate('CreateJob', { categorySlug, categoryName });
    }
  };

  // Submit direct booking through existing backend API
  const handleConfirmBooking = async () => {
    if (!selectedPackage) {
      setBookingError('Please select a service package to book.');
      return;
    }

    const targetVendor = vendors.length > 0 ? vendors[0] : null;
    const vendorUserId = targetVendor?.user?._id || (typeof targetVendor?.user === 'string' ? targetVendor?.user : null) || targetVendor?._id;

    if (!vendorUserId) {
      setIsBookingModalOpen(false);
      navigation.navigate('CreateJob', {
        categorySlug,
        categoryName,
        subservice: selectedPackage.name,
        basePrice: selectedPackage.price
      });
      return;
    }

    const selectedSaved = savedAddresses[selectedAddressIndex];
    const targetAddress = isCustomAddress || savedAddresses.length === 0
      ? {
          addressLabel: 'Service Location',
          houseNumber: houseNumber.trim() || 'Unit 1',
          street: street.trim() || 'Main Road',
          locality: locality.trim() || 'Area',
          city: city.trim() || 'Lucknow',
          state: 'Uttar Pradesh',
          zipCode: pincode.trim() || '226010',
          coordinates: { lat: 0, lng: 0 }
        }
      : {
          addressLabel: selectedSaved?.label || 'Saved Address',
          houseNumber: selectedSaved?.houseNumber || '',
          street: selectedSaved?.street || 'Main Road',
          locality: selectedSaved?.locality || selectedSaved?.landmark || '',
          city: selectedSaved?.city || 'Lucknow',
          state: selectedSaved?.state || 'Uttar Pradesh',
          zipCode: selectedSaved?.zipCode || selectedSaved?.pincode || '226010',
          coordinates: selectedSaved?.coordinates && (Number(selectedSaved.coordinates.lat) !== 0 || Number(selectedSaved.coordinates.lng) !== 0)
            ? { lat: Number(selectedSaved.coordinates.lat), lng: Number(selectedSaved.coordinates.lng) }
            : { lat: 0, lng: 0 }
        };

    const scheduledDateObj = availableDates[selectedDateIndex] || availableDates[0];

    try {
      setBookingSubmitting(true);
      setBookingError(null);

      const bookingPayload = {
        vendorId: vendorUserId,
        serviceTitle: selectedPackage.name,
        category: categoryName,
        serviceType: 'repair',
        problemDescription: notes.trim() || `Booked ${selectedPackage.name} (${selectedPackage.pricingBasis})`,
        urgency: 'normal' as const,
        scheduledDate: scheduledDateObj.isoDate,
        timeSlot: selectedTimeSlot,
        address: targetAddress,
        pricing: {
          type: 'fixed',
          amount: selectedPackage.price
        },
        notes: notes.trim()
      };

      const res = await api.bookings.createDirectBooking(bookingPayload);

      if (res?.success) {
        dataSyncService.notify('BOOKINGS_CHANGED', res);
        setBookingSuccess(true);
        setCreatedBookingRef(res.booking?.bookingReference || 'DIR-CONFIRMED');
      } else {
        setBookingError(res?.message || 'Failed to place booking request.');
      }
    } catch (err: any) {
      setBookingError(err?.message || 'Could not place direct booking. Please check your network and account.');
    } finally {
      setBookingSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading {categoryName} packages...</Text>
      </View>
    );
  }

  if (error || !category) {
    return (
      <View style={styles.centerContainer}>
        <View style={styles.errorIconCircle}>
          <Feather name="alert-triangle" size={32} color="#DC2626" />
        </View>
        <Text style={styles.errorTitle}>Category Not Available</Text>
        <Text style={styles.errorSubtitle}>{error || 'The requested category could not be loaded.'}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={loadData} activeOpacity={0.8}>
          <Feather name="refresh-cw" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
          <Text style={styles.retryBtnText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const basePrice = selectedPackage?.price || 449;
  const platformFee = Math.round(basePrice * 0.05);
  const totalAmount = basePrice + platformFee;

  return (
    <View style={styles.screenWrapper}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ════════════════════════════════════════════════════════════════
            1. CATEGORY HERO IMAGE (Clean container, no absolute text overlay)
        ════════════════════════════════════════════════════════════════ */}
        <View style={styles.heroContainer}>
          <Image
            source={getServiceImage(categorySlug || categoryName)}
            style={styles.heroImage}
            resizeMode="cover"
          />
        </View>

        {/* ════════════════════════════════════════════════════════════════
            2. CATEGORY INFORMATION CARD (Normal document flow)
        ════════════════════════════════════════════════════════════════ */}
        <View style={styles.categoryCard}>
          <View style={styles.categoryHeaderRow}>
            <View style={styles.categoryIconWrap}>
              {renderCategoryIcon(categorySlug || category?.icon || 'tool', 22, COLORS.primary)}
            </View>
            <View style={styles.categoryTitleWrap}>
              <Text style={styles.categoryTitle}>{categoryName}</Text>
              <Text style={styles.categoryTradeLabel}>WorkLogy Certified Services</Text>
            </View>
          </View>

          <Text style={styles.categoryDesc}>
            {category?.description ||
              `Certified and background-checked ${categoryName.toLowerCase()} specialists delivering high quality services with WorkLogy Escrow Protection.`}
          </Text>

          {/* Category Features / Benefits Badges (wrapped gracefully) */}
          <View style={styles.categoryBadgesRow}>
            <View style={styles.benefitBadge}>
              <Ionicons name="shield-checkmark" size={13} color="#059669" style={{ marginRight: 4 }} />
              <Text style={styles.benefitBadgeText}>WorkLogy Escrow Protected</Text>
            </View>
            <View style={styles.benefitBadge}>
              <Ionicons name="checkmark-circle" size={13} color="#059669" style={{ marginRight: 4 }} />
              <Text style={styles.benefitBadgeText}>7-Day Quality Warranty</Text>
            </View>
          </View>
        </View>

        {/* ════════════════════════════════════════════════════════════════
            3. AVAILABLE VERIFIED SPECIALISTS (Normal document flow)
        ════════════════════════════════════════════════════════════════ */}
        {vendors.length > 0 && (
          <View style={styles.specialistsSection}>
            <View style={styles.specialistsSectionHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.specialistsTitle}>Available Verified Specialists</Text>
                <Text style={styles.specialistsSubtitle}>
                  Professionals available for this category
                </Text>
              </View>
              <View style={styles.onlineBadge}>
                <View style={styles.onlineDot} />
                <Text style={styles.onlineBadgeText}>{vendors.length} Online</Text>
              </View>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.specialistsScroll}
            >
              {vendors.map((pro) => {
                const proName = pro.businessName || pro.user?.name || pro.name || 'Verified Pro';
                const isVerified = pro.verifiedBadge?.status === 'verified' || pro.verifiedBadge?.status === 'approved';
                const rating = pro.rating ? pro.rating.toFixed(1) : '4.9';

                return (
                  <TouchableOpacity
                    key={pro._id}
                    style={styles.proMiniCard}
                    activeOpacity={0.85}
                    onPress={() => navigation.navigate('ProfessionalProfile', { vendorId: pro._id, vendor: pro })}
                  >
                    <View style={styles.proMiniAvatarWrap}>
                      {pro.user?.avatar ? (
                        <Image source={{ uri: pro.user.avatar }} style={styles.proMiniAvatarImg} />
                      ) : (
                        <View style={styles.proMiniAvatarFallback}>
                          <Text style={styles.proMiniAvatarInitial}>
                            {proName.charAt(0).toUpperCase()}
                          </Text>
                        </View>
                      )}
                      {isVerified && (
                        <View style={styles.proMiniVerifiedDot}>
                          <Ionicons name="checkmark" size={9} color="#FFFFFF" />
                        </View>
                      )}
                    </View>

                    <View style={styles.proMiniInfo}>
                      <Text style={styles.proMiniName} numberOfLines={1}>{proName}</Text>
                      <View style={styles.proMiniStatsRow}>
                        <Ionicons name="star" size={11} color="#F59E0B" />
                        <Text style={styles.proMiniRatingText}> {rating}</Text>
                        <Text style={styles.proMiniExpText}> • {pro.experienceYears || 4}y exp</Text>
                      </View>
                    </View>

                    <Feather name="chevron-right" size={16} color="#94A3B8" />
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* ════════════════════════════════════════════════════════════════
            4. STANDARD SERVICE PACKAGES SECTION (Clean headers & cards)
        ════════════════════════════════════════════════════════════════ */}
        <View style={styles.packagesSection}>
          <View style={styles.packagesHeaderWrapper}>
            <View style={styles.badgeRow}>
              <View style={styles.standardBadge}>
                <Ionicons name="pricetag" size={11} color="#059669" style={{ marginRight: 4 }} />
                <Text style={styles.standardBadgeText}>Standard Packages</Text>
              </View>
            </View>

            <Text style={styles.packagesMainTitle}>Choose Your Service Package</Text>
            <Text style={styles.packagesSubtitle}>
              Transparent pricing. Professional service. No surprises.
            </Text>
          </View>

          {/* Package Cards List */}
          {packages.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="cube-outline" size={32} color="#94A3B8" />
              <Text style={styles.emptyCardTitle}>No Standard Packages Available</Text>
              <Text style={styles.emptyCardSubtitle}>
                You can post a custom job description with photos to receive personalized quotes.
              </Text>
              <TouchableOpacity
                style={styles.emptyPostBtn}
                onPress={handlePostCustomJob}
                activeOpacity={0.8}
              >
                <Text style={styles.emptyPostBtnText}>Post a Custom Job Request</Text>
              </TouchableOpacity>
            </View>
          ) : (
            packages.map((pkg) => (
              <View key={pkg.id} style={styles.packageCard}>
                {/* Top Row: Category Icon + Title + Duration */}
                <View style={styles.packageTopRow}>
                  <View style={styles.packageIconWrap}>
                    {renderCategoryIcon(categorySlug || 'tool', 18, COLORS.primary)}
                  </View>
                  <View style={styles.packageTitleWrap}>
                    <Text style={styles.packageNameText}>{pkg.name}</Text>
                    <View style={styles.durationRow}>
                      <Feather name="clock" size={11} color="#64748B" style={{ marginRight: 4 }} />
                      <Text style={styles.durationText}>Estimated duration: {pkg.duration}</Text>
                    </View>
                  </View>
                </View>

                {/* Short Description */}
                <Text style={styles.packageDescText}>{pkg.description}</Text>

                {/* Features Checklist */}
                <View style={styles.featuresList}>
                  {pkg.inclusions.map((item, idx) => (
                    <View key={idx} style={styles.featureLine}>
                      <Ionicons name="checkmark-circle" size={14} color="#059669" style={{ marginRight: 6 }} />
                      <Text style={styles.featureText}>{item}</Text>
                    </View>
                  ))}
                  <View style={styles.featureLine}>
                    <Ionicons name="shield-checkmark" size={14} color="#2563EB" style={{ marginRight: 6 }} />
                    <Text style={[styles.featureText, { color: '#1E40AF' }]}>
                      WorkLogy 7-day workmanship satisfaction warranty
                    </Text>
                  </View>
                </View>

                {/* Divider */}
                <View style={styles.packageDivider} />

                {/* Bottom Row: Large Green Price & Book Action Button */}
                <View style={styles.packageBottomRow}>
                  <View>
                    <Text style={styles.priceBasisLabel}>Upfront Rate</Text>
                    <View style={styles.priceContainer}>
                      <Text style={styles.priceAmount}>{formatCurrency(pkg.price)}</Text>
                      <Text style={styles.priceUnitText}> {pkg.pricingBasis}</Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={styles.bookServiceBtn}
                    onPress={() => handleOpenBooking(pkg)}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.bookServiceBtnText}>Book This Service</Text>
                    <Feather name="arrow-right" size={14} color="#FFFFFF" style={{ marginLeft: 4 }} />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>

        {/* ════════════════════════════════════════════════════════════════
            5. CUSTOM JOB REQUEST CTA
        ════════════════════════════════════════════════════════════════ */}
        <View style={styles.customCta}>
          <View style={styles.customCtaIcon}>
            <Ionicons name="document-text" size={24} color="#2563EB" />
          </View>
          <Text style={styles.customCtaTitle}>Have a unique or custom requirement?</Text>
          <Text style={styles.customCtaDesc}>
            Need something not listed above? Post your task description to receive personalized proposals from verified local contractors.
          </Text>
          <TouchableOpacity
            style={styles.customBtn}
            activeOpacity={0.8}
            onPress={handlePostCustomJob}
          >
            <Text style={styles.customBtnText}>Post a Custom Job Request</Text>
          </TouchableOpacity>
        </View>

        {/* Bottom spacer ensuring safe spacing from floating widgets and navigation */}
        <View style={{ height: 50 }} />
      </ScrollView>

      {/* ════════════════════════════════════════════════════════════════
          6. DIRECT BOOKING MODAL
      ════════════════════════════════════════════════════════════════ */}
      <Modal
        visible={isBookingModalOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          if (bookingSuccess) {
            setIsBookingModalOpen(false);
            navigation.navigate('MyJobs');
          } else {
            setIsBookingModalOpen(false);
          }
        }}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalHeaderTitle}>Book Service Package</Text>
                <Text style={styles.modalHeaderSubtitle}>
                  {categoryName} • Escrow Protected
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  if (bookingSuccess) {
                    setIsBookingModalOpen(false);
                    navigation.navigate('MyJobs');
                  } else {
                    setIsBookingModalOpen(false);
                  }
                }}
                style={styles.modalCloseBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close" size={22} color="#0F172A" />
              </TouchableOpacity>
            </View>

            {bookingSuccess ? (
              <View style={styles.bookingSuccessContainer}>
                <View style={styles.successIconCircle}>
                  <Ionicons name="checkmark-done" size={40} color="#FFFFFF" />
                </View>
                <Text style={styles.successTitle}>Booking Request Placed!</Text>
                <Text style={styles.successRef}>Reference: #{createdBookingRef}</Text>
                <Text style={styles.successMessage}>
                  Your appointment for {selectedPackage?.name} on{' '}
                  {availableDates[selectedDateIndex]?.dayName} ({selectedTimeSlot}) has been dispatched.
                </Text>
                <View style={styles.escrowNoticeBox}>
                  <Ionicons name="shield-checkmark" size={16} color="#059669" style={{ marginRight: 6 }} />
                  <Text style={styles.escrowNoticeText}>
                    WorkLogy Escrow Protection active. Pay only after work completion and inspection.
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.viewBookingsSuccessBtn}
                  onPress={() => {
                    setIsBookingModalOpen(false);
                    navigation.navigate('MyJobs');
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.viewBookingsSuccessBtnText}>Go to My Bookings</Text>
                  <Feather name="arrow-right" size={16} color="#FFFFFF" style={{ marginLeft: 6 }} />
                </TouchableOpacity>
              </View>
            ) : (
              <ScrollView
                style={styles.modalScrollBody}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                {/* Error Banner */}
                {bookingError ? (
                  <View style={styles.bookingErrorBanner}>
                    <Feather name="alert-circle" size={18} color="#DC2626" style={{ marginRight: 6 }} />
                    <Text style={styles.bookingErrorText}>{bookingError}</Text>
                  </View>
                ) : null}

                {/* Selected Package Banner */}
                <View style={styles.modalPackageBanner}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalPackageTitle}>{selectedPackage?.name}</Text>
                    <Text style={styles.modalPackageSubtitle}>
                      Duration: {selectedPackage?.duration} • {selectedPackage?.pricingBasis}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.modalPackagePrice}>
                      {formatCurrency(selectedPackage?.price || 449)}
                    </Text>
                    <Text style={styles.modalPackageFixed}>Fixed Rate</Text>
                  </View>
                </View>

                {/* Step 1: Date */}
                <Text style={styles.modalStepHeading}>1. Select Service Date</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.datePickerRow}>
                  {availableDates.map((item, idx) => {
                    const isPicked = selectedDateIndex === idx;
                    return (
                      <TouchableOpacity
                        key={idx}
                        style={[styles.dateChip, isPicked && styles.dateChipSelected]}
                        onPress={() => setSelectedDateIndex(idx)}
                        activeOpacity={0.8}
                      >
                        <Text style={[styles.dateChipDay, isPicked && styles.dateChipDaySelected]}>
                          {item.dayName}
                        </Text>
                        <Text style={[styles.dateChipDate, isPicked && styles.dateChipDateSelected]}>
                          {item.formatted}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                {/* Step 2: Time Slot */}
                <Text style={styles.modalStepHeading}>2. Select Arrival Window</Text>
                <View style={styles.timeSlotGrid}>
                  {TIME_SLOTS.map((slot) => {
                    const isPicked = selectedTimeSlot === slot.label;
                    return (
                      <TouchableOpacity
                        key={slot.id}
                        style={[styles.timeSlotChip, isPicked && styles.timeSlotChipSelected]}
                        onPress={() => setSelectedTimeSlot(slot.label)}
                        activeOpacity={0.8}
                      >
                        <Text style={[styles.timeSlotPeriod, isPicked && styles.timeSlotPeriodSelected]}>
                          {slot.period}
                        </Text>
                        <Text style={[styles.timeSlotTime, isPicked && styles.timeSlotTimeSelected]}>
                          {slot.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Step 3: Location */}
                <Text style={styles.modalStepHeading}>3. Service Address</Text>
                {savedAddresses.length > 0 && (
                  <View style={styles.addressToggleRow}>
                    <TouchableOpacity
                      style={[styles.addressToggleBtn, !isCustomAddress && styles.addressToggleBtnActive]}
                      onPress={() => setIsCustomAddress(false)}
                    >
                      <Text style={[styles.addressToggleBtnText, !isCustomAddress && styles.addressToggleBtnTextActive]}>
                        Saved ({savedAddresses.length})
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.addressToggleBtn, isCustomAddress && styles.addressToggleBtnActive]}
                      onPress={() => setIsCustomAddress(true)}
                    >
                      <Text style={[styles.addressToggleBtnText, isCustomAddress && styles.addressToggleBtnTextActive]}>
                        + Enter Address
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}

                {!isCustomAddress && savedAddresses.length > 0 ? (
                  <View style={styles.savedAddressesList}>
                    {savedAddresses.map((addr, aIdx) => {
                      const isPicked = selectedAddressIndex === aIdx;
                      return (
                        <TouchableOpacity
                          key={aIdx}
                          style={[styles.savedAddressItem, isPicked && styles.savedAddressItemSelected]}
                          onPress={() => setSelectedAddressIndex(aIdx)}
                          activeOpacity={0.8}
                        >
                          <Ionicons
                            name={isPicked ? 'radio-button-on' : 'radio-button-off'}
                            size={18}
                            color={isPicked ? COLORS.primary : '#94A3B8'}
                            style={{ marginRight: 8, marginTop: 2 }}
                          />
                          <View style={{ flex: 1 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                              <Text style={styles.savedAddressLabel}>{addr.label || 'Home Address'}</Text>
                              {addr.isDefault && (
                                <View style={{ backgroundColor: '#D1FAE5', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 3 }}>
                                  <Text style={{ fontSize: 9, fontWeight: '700', color: '#065F46' }}>Default</Text>
                                </View>
                              )}
                            </View>
                            <Text style={styles.savedAddressLine} numberOfLines={2}>
                              {[addr.houseNumber, addr.street, addr.locality || addr.landmark, addr.city, addr.zipCode || addr.pincode]
                                .filter(Boolean)
                                .join(', ')}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ) : (
                  <View style={styles.addressForm}>
                    <View style={styles.formRow}>
                      <View style={{ flex: 1, marginRight: 8 }}>
                        <Text style={styles.inputLabel}>House / Flat #</Text>
                        <TextInput
                          style={styles.textInput}
                          placeholder="e.g. Flat 301"
                          placeholderTextColor="#94A3B8"
                          value={houseNumber}
                          onChangeText={setHouseNumber}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.inputLabel}>Locality / Area</Text>
                        <TextInput
                          style={styles.textInput}
                          placeholder="e.g. Gomti Nagar"
                          placeholderTextColor="#94A3B8"
                          value={locality}
                          onChangeText={setLocality}
                        />
                      </View>
                    </View>

                    <Text style={styles.inputLabel}>Street / Landmark</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="e.g. Near Wave Mall, Main Road"
                      placeholderTextColor="#94A3B8"
                      value={street}
                      onChangeText={setStreet}
                    />

                    <View style={styles.formRow}>
                      <View style={{ flex: 1, marginRight: 8 }}>
                        <Text style={styles.inputLabel}>City</Text>
                        <TextInput
                          style={styles.textInput}
                          value={city}
                          onChangeText={setCity}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.inputLabel}>Pincode</Text>
                        <TextInput
                          style={styles.textInput}
                          keyboardType="number-pad"
                          value={pincode}
                          onChangeText={setPincode}
                          maxLength={6}
                        />
                      </View>
                    </View>
                  </View>
                )}

                {/* Step 4: Notes */}
                <Text style={styles.modalStepHeading}>4. Notes / Problem Details</Text>
                <TextInput
                  style={[styles.textInput, styles.notesInput]}
                  placeholder="Describe your requirement, specific symptoms or any access instructions..."
                  placeholderTextColor="#94A3B8"
                  multiline
                  numberOfLines={2}
                  value={notes}
                  onChangeText={setNotes}
                />

                {/* Step 5: Transparent Charges Summary */}
                <View style={styles.priceBreakdownCard}>
                  <Text style={styles.breakdownHeaderTitle}>Price Breakdown</Text>
                  <View style={styles.breakdownRow}>
                    <Text style={styles.breakdownLabel}>Service Package Amount</Text>
                    <Text style={styles.breakdownValue}>{formatCurrency(basePrice)}</Text>
                  </View>
                  <View style={styles.breakdownRow}>
                    <Text style={styles.breakdownLabel}>Convenience & Platform Fee (5%)</Text>
                    <Text style={styles.breakdownValue}>{formatCurrency(platformFee)}</Text>
                  </View>
                  <View style={styles.breakdownRow}>
                    <Text style={styles.breakdownLabel}>Escrow Protection & 7-Day Warranty</Text>
                    <Text style={[styles.breakdownValue, { color: '#059669' }]}>FREE</Text>
                  </View>

                  <View style={styles.breakdownDivider} />

                  <View style={styles.breakdownTotalRow}>
                    <View>
                      <Text style={styles.totalDueLabel}>Estimated Total</Text>
                      <Text style={styles.totalDueHint}>Pay after job completion via WorkLogy</Text>
                    </View>
                    <Text style={styles.totalDueAmount}>{formatCurrency(totalAmount)}</Text>
                  </View>
                </View>

                {/* Confirm Action */}
                <TouchableOpacity
                  style={[styles.confirmBookingBtn, bookingSubmitting && styles.confirmBookingBtnDisabled]}
                  onPress={handleConfirmBooking}
                  disabled={bookingSubmitting}
                  activeOpacity={0.85}
                >
                  {bookingSubmitting ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons name="lock-closed" size={15} color="#FFFFFF" style={{ marginRight: 6 }} />
                      <Text style={styles.confirmBookingBtnText}>
                        Confirm Booking ({formatCurrency(totalAmount)})
                      </Text>
                    </>
                  )}
                </TouchableOpacity>

                <View style={{ height: 24 }} />
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screenWrapper: {
    flex: 1,
    backgroundColor: '#F8FAFC'
  },
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC'
  },
  scrollContent: {
    paddingBottom: 40
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#FFFFFF'
  },
  loadingText: {
    marginTop: 14,
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500'
  },
  errorIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 6
  },
  errorSubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 16
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 13
  },

  // 1. Hero Image Container (clean, no absolute positioning)
  heroContainer: {
    width: '100%',
    height: 180,
    backgroundColor: '#E2E8F0',
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
    overflow: 'hidden'
  },
  heroImage: {
    width: '100%',
    height: '100%'
  },

  // 2. Category Information Card (normal document flow)
  categoryCard: {
    marginHorizontal: 16,
    marginTop: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 5,
    elevation: 2
  },
  categoryHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10
  },
  categoryIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#A7F3D0'
  },
  categoryTitleWrap: {
    flex: 1,
    marginLeft: 12
  },
  categoryTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.3
  },
  categoryTradeLabel: {
    fontSize: 11.5,
    fontWeight: '600',
    color: COLORS.primary,
    marginTop: 1
  },
  categoryDesc: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
    marginBottom: 12
  },
  categoryBadgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9'
  },
  benefitBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
    marginRight: 8,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: '#A7F3D0'
  },
  benefitBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#065F46'
  },

  // 3. Specialists Section (clean, well-spaced)
  specialistsSection: {
    marginTop: 18,
    marginHorizontal: 16
  },
  specialistsSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10
  },
  specialistsTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A'
  },
  specialistsSubtitle: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 1
  },
  onlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#A7F3D0'
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
    marginRight: 4
  },
  onlineBadgeText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#065F46'
  },
  specialistsScroll: {
    paddingRight: 16,
    paddingVertical: 2
  },
  proMiniCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 11,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    width: 220,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1
  },
  proMiniAvatarWrap: {
    position: 'relative'
  },
  proMiniAvatarImg: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#E2E8F0'
  },
  proMiniAvatarFallback: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center'
  },
  proMiniAvatarInitial: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF'
  },
  proMiniVerifiedDot: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF'
  },
  proMiniInfo: {
    flex: 1,
    marginLeft: 10
  },
  proMiniName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A'
  },
  proMiniStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2
  },
  proMiniRatingText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0F172A'
  },
  proMiniExpText: {
    fontSize: 10.5,
    color: '#64748B'
  },

  // 4. Standard Packages Section
  packagesSection: {
    marginTop: 22,
    marginHorizontal: 16
  },
  packagesHeaderWrapper: {
    marginBottom: 14
  },
  badgeRow: {
    flexDirection: 'row',
    marginBottom: 6
  },
  standardBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#A7F3D0'
  },
  standardBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#065F46'
  },
  packagesMainTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.3
  },
  packagesSubtitle: {
    fontSize: 12.5,
    color: '#64748B',
    marginTop: 3,
    lineHeight: 17
  },

  // Package Cards
  packageCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 5,
    elevation: 2
  },
  packageTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start'
  },
  packageIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#A7F3D0'
  },
  packageTitleWrap: {
    flex: 1,
    marginLeft: 10
  },
  packageNameText: {
    fontSize: 15.5,
    fontWeight: '800',
    color: '#0F172A',
    lineHeight: 20
  },
  durationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3
  },
  durationText: {
    fontSize: 11.5,
    color: '#64748B',
    fontWeight: '500'
  },
  packageDescText: {
    fontSize: 12.5,
    color: '#475569',
    marginTop: 8,
    lineHeight: 18
  },
  featuresList: {
    marginTop: 10,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9'
  },
  featureLine: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4
  },
  featureText: {
    fontSize: 12,
    color: '#334155',
    flex: 1
  },
  packageDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 12
  },
  packageBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  priceBasisLabel: {
    fontSize: 10.5,
    color: '#64748B',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 2
  },
  priceAmount: {
    fontSize: 19,
    fontWeight: '800',
    color: COLORS.primary
  },
  priceUnitText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B'
  },
  bookServiceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2
  },
  bookServiceBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12.5
  },

  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 8
  },
  emptyCardTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 8
  },
  emptyCardSubtitle: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 3,
    lineHeight: 17
  },
  emptyPostBtn: {
    marginTop: 12,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8
  },
  emptyPostBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600'
  },

  // 5. Custom CTA
  customCta: {
    marginHorizontal: 16,
    marginTop: 14,
    backgroundColor: '#EFF6FF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    alignItems: 'center'
  },
  customCtaIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#DBEAFE',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8
  },
  customCtaTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1E3A8A',
    textAlign: 'center'
  },
  customCtaDesc: {
    fontSize: 12,
    color: '#3B82F6',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 17
  },
  customBtn: {
    marginTop: 12,
    backgroundColor: '#2563EB',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8
  },
  customBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12.5
  },

  // 6. Direct Booking Modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end'
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '88%',
    paddingBottom: Platform.OS === 'ios' ? 24 : 10
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9'
  },
  modalHeaderTitle: {
    fontSize: 16.5,
    fontWeight: '800',
    color: '#0F172A'
  },
  modalHeaderSubtitle: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 1
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center'
  },
  modalScrollBody: {
    paddingHorizontal: 20,
    paddingTop: 12
  },
  bookingErrorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12
  },
  bookingErrorText: {
    fontSize: 12,
    color: '#DC2626',
    flex: 1,
    fontWeight: '500'
  },
  modalPackageBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16
  },
  modalPackageTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A'
  },
  modalPackageSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2
  },
  modalPackagePrice: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.primary
  },
  modalPackageFixed: {
    fontSize: 10,
    color: '#059669',
    fontWeight: '600'
  },
  modalStepHeading: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 8,
    marginTop: 4
  },
  datePickerRow: {
    marginBottom: 14
  },
  dateChip: {
    width: 76,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  dateChipSelected: {
    backgroundColor: '#ECFDF5',
    borderColor: '#10B981'
  },
  dateChipDay: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600'
  },
  dateChipDaySelected: {
    color: '#065F46'
  },
  dateChipDate: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 2
  },
  dateChipDateSelected: {
    color: '#065F46'
  },
  timeSlotGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 14
  },
  timeSlotChip: {
    width: '48%',
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  timeSlotChipSelected: {
    backgroundColor: '#ECFDF5',
    borderColor: '#10B981'
  },
  timeSlotPeriod: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#64748B'
  },
  timeSlotPeriodSelected: {
    color: '#065F46'
  },
  timeSlotTime: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 2
  },
  timeSlotTimeSelected: {
    color: '#065F46'
  },
  addressToggleRow: {
    flexDirection: 'row',
    marginBottom: 10
  },
  addressToggleBtn: {
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    marginRight: 8
  },
  addressToggleBtnActive: {
    backgroundColor: COLORS.primaryLight
  },
  addressToggleBtnText: {
    fontSize: 11.5,
    color: '#64748B',
    fontWeight: '500'
  },
  addressToggleBtnTextActive: {
    color: COLORS.primary,
    fontWeight: '700'
  },
  savedAddressesList: {
    marginBottom: 12
  },
  savedAddressItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 6
  },
  savedAddressItemSelected: {
    backgroundColor: '#ECFDF5',
    borderColor: '#10B981'
  },
  savedAddressLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A'
  },
  savedAddressLine: {
    fontSize: 11,
    color: '#475569',
    marginTop: 2
  },
  addressForm: {
    marginBottom: 12
  },
  formRow: {
    flexDirection: 'row'
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 4,
    marginTop: 4
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 12.5,
    color: '#0F172A'
  },
  notesInput: {
    height: 56,
    textAlignVertical: 'top',
    marginBottom: 12
  },
  priceBreakdownCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14
  },
  breakdownHeaderTitle: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.3
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4
  },
  breakdownLabel: {
    fontSize: 11.5,
    color: '#475569'
  },
  breakdownValue: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#0F172A'
  },
  breakdownDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 6
  },
  breakdownTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  totalDueLabel: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#0F172A'
  },
  totalDueHint: {
    fontSize: 9.5,
    color: '#64748B'
  },
  totalDueAmount: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.primary
  },
  confirmBookingBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 13,
    borderRadius: 12,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 3
  },
  confirmBookingBtnDisabled: {
    opacity: 0.6
  },
  confirmBookingBtnText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '700'
  },
  bookingSuccessContainer: {
    padding: 24,
    alignItems: 'center'
  },
  successIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4
  },
  successTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center'
  },
  successRef: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
    marginTop: 4
  },
  successMessage: {
    fontSize: 12,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 17,
    marginTop: 8
  },
  escrowNoticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    padding: 10,
    borderRadius: 8,
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#A7F3D0'
  },
  escrowNoticeText: {
    fontSize: 11,
    color: '#065F46',
    flex: 1,
    fontWeight: '500'
  },
  viewBookingsSuccessBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    width: '100%',
    paddingVertical: 13,
    borderRadius: 12,
    marginTop: 18
  },
  viewBookingsSuccessBtnText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '700'
  }
});
