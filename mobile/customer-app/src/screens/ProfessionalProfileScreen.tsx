import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
  Platform,
  Share,
  Dimensions,
  Animated
} from 'react-native';
import { Ionicons, Feather, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { api } from '../api/client';
import { COLORS } from '../theme/colors';
import { formatCurrency, formatDate } from '../utils/formatters';
import { getServiceImage } from '../utils/serviceImages';
import { renderCategoryIcon } from '../utils/categoryIcons';
import { secureStorage } from '../storage/secureStorage';
import { STORAGE_KEYS } from '../constants';
import { dataSyncService } from '../services/dataSyncService';
import type { ServiceAddress } from '../types';

interface ServiceItem {
  _id: string;
  title: string;
  description: string;
  category: string;
  pricingType: 'fixed' | 'starting' | 'hourly' | 'quote';
  price: number;
  maxPrice?: number;
  unit: string;
  duration: string;
  visitFee?: number;
  inclusions: string[];
  exclusions: string[];
  warranty?: string;
  image?: any;
}

const TIME_SLOTS = [
  { id: 'morning', label: '09:00 AM - 12:00 PM', period: 'Morning' },
  { id: 'afternoon', label: '12:00 PM - 03:00 PM', period: 'Afternoon' },
  { id: 'evening', label: '03:00 PM - 06:00 PM', period: 'Evening' },
  { id: 'night', label: '06:00 PM - 09:00 PM', period: 'Night' }
];

export default function ProfessionalProfileScreen({ route, navigation }: any) {
  const { vendorId: initialVendorId, id, proId, vendor: initialVendor } = route.params || {};
  const vendorId = initialVendorId || id || proId || initialVendor?._id;

  // Profile data states
  const [vendor, setVendor] = useState<any>(initialVendor || null);
  const [serviceListings, setServiceListings] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [ratingBreakdown, setRatingBreakdown] = useState<any>(null);
  const [similarVendors, setSimilarVendors] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(!initialVendor);
  const [error, setError] = useState<string | null>(null);

  // UI state
  const [isSaved, setIsSaved] = useState<boolean>(false);
  const [isBioExpanded, setIsBioExpanded] = useState<boolean>(false);
  const [avatarError, setAvatarError] = useState<boolean>(false);

  // Booking Modal State
  const [isBookingModalOpen, setIsBookingModalOpen] = useState<boolean>(false);
  const [selectedService, setSelectedService] = useState<ServiceItem | null>(null);
  const [selectedDateIndex, setSelectedDateIndex] = useState<number>(1); // Default: Tomorrow
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>(TIME_SLOTS[0].label);
  const [savedAddresses, setSavedAddresses] = useState<ServiceAddress[]>([]);
  const [selectedAddressIndex, setSelectedAddressIndex] = useState<number>(0);
  const [isCustomAddress, setIsCustomAddress] = useState<boolean>(false);
  const [houseNumber, setHouseNumber] = useState<string>('');
  const [street, setStreet] = useState<string>('');
  const [locality, setLocality] = useState<string>('');
  const [city, setCity] = useState<string>('Lucknow');
  const [pincode, setPincode] = useState<string>('226010');
  const [notes, setNotes] = useState<string>('');
  const [bookingSubmitting, setBookingSubmitting] = useState<boolean>(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [bookingSuccess, setBookingSuccess] = useState<boolean>(false);
  const [createdBookingRef, setCreatedBookingRef] = useState<string>('');

  const scrollViewRef = useRef<any>(null);
  const servicesSectionY = useRef<number>(0);

  // Generate selectable dates for next 5 days
  const availableDates = Array.from({ length: 5 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const dayName = i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : d.toLocaleDateString('en-IN', { weekday: 'short' });
    const formatted = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    const isoDate = d.toISOString().split('T')[0];
    return { dayName, formatted, isoDate };
  });

  // Load Profile Data from backend
  const loadProfile = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      let targetId = vendorId;

      // If no ID is passed, pick top approved vendor from marketplace
      if (!targetId) {
        const topVendorsRes = await api.vendors.getVendors({ limit: 1 });
        if (topVendorsRes?.vendors && topVendorsRes.vendors.length > 0) {
          targetId = topVendorsRes.vendors[0]._id;
        } else {
          setError('Professional profile not specified.');
          return;
        }
      }

      const res = await api.vendors.getVendorById(targetId);
      if (res?.success && res.vendor) {
        setVendor(res.vendor);
        setServiceListings(res.serviceListings || []);
        setReviews(res.reviews || []);
        setRatingBreakdown(res.ratingBreakdown || null);
        setSimilarVendors(res.similarVendors || []);
      } else {
        setError('Professional not found or profile pending approval.');
      }
    } catch (err: any) {
      console.warn('Failed to load professional profile:', err);
      setError(err?.message || 'Could not load professional profile. Please check your connection.');
    } finally {
      setLoading(false);
    }
  }, [vendorId]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  // Load Customer Saved Addresses for quick direct booking
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

  // Back button interception: close booking modal first, or pop screen
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
      return false; // let normal back stack handle
    });

    return () => {
      unregister?.();
    };
  }, [isBookingModalOpen, bookingSuccess, navigation]);

  // Normalization of services
  const normalizedServices: ServiceItem[] = [];
  const primaryCategoryName = vendor?.categories?.[0]?.name || 'Home Maintenance';

  if (serviceListings && serviceListings.length > 0) {
    serviceListings.forEach((listing: any) => {
      normalizedServices.push({
        _id: listing._id,
        title: listing.title,
        description: listing.shortSummary || listing.description || 'Verified trade skill performed according to WorkLogy safety standards.',
        category: listing.subcategory || listing.category?.name || primaryCategoryName,
        pricingType: listing.pricing?.type === 'quote' ? 'quote' : listing.pricing?.type === 'hourly' ? 'hourly' : listing.pricing?.type === 'starting' ? 'starting' : 'fixed',
        price: listing.pricing?.amount || listing.pricing?.minPrice || vendor?.hourlyRate || 499,
        maxPrice: listing.pricing?.maxPrice,
        unit: listing.pricing?.unit || 'per service',
        duration: listing.duration || '1 - 2 hours',
        visitFee: listing.pricing?.visitFee || 0,
        inclusions: [
          'Safety audit and comprehensive diagnostic inspection',
          'Standard labor, professional instruments and tools provided',
          'Workmanship safety and quality assurance'
        ],
        exclusions: [
          'Replacement spare parts and hardware billed at actuals'
        ],
        warranty: listing.requirements?.warranty || '30-Day WorkLogy Verified Warranty',
        image: listing.images && listing.images[0] ? { uri: listing.images[0] } : getServiceImage(listing.subcategory || primaryCategoryName)
      });
    });
  }

  if (vendor?.services && Array.isArray(vendor.services)) {
    vendor.services.forEach((s: any, idx: number) => {
      if (s.isActive === false) return;
      const alreadyPresent = normalizedServices.some(
        (existing) => existing.title.toLowerCase() === (s.title || '').toLowerCase()
      );
      if (!alreadyPresent && s.title) {
        normalizedServices.push({
          _id: s._id || `vendor-srv-${idx}`,
          title: s.title,
          description: s.description || `${s.title} executed with verified trade expertise and transparent pricing.`,
          category: s.categoryName || primaryCategoryName,
          pricingType: s.pricingType === 'quote' ? 'quote' : s.pricingType === 'hourly' ? 'hourly' : s.pricingType === 'starting' ? 'starting' : 'fixed',
          price: s.price && s.price > 0 ? s.price : (vendor.hourlyRate || 399),
          unit: s.pricingType === 'quote' ? 'quote basis' : s.pricingType === 'hourly' ? 'per hour' : 'fixed price',
          duration: s.duration || '1 - 2 hours',
          inclusions: [
            'Initial fault tracing and diagnostic check',
            'Certified technician labor and standard tools',
            'WorkLogy Escrow-protected service completion'
          ],
          exclusions: [
            'Consumables and hardware parts billed separately'
          ],
          warranty: '7-Day Service Warranty',
          image: getServiceImage(s.categoryName || primaryCategoryName)
        });
      }
    });
  }

  // Fallback service package if vendor has no explicitly published packages
  if (normalizedServices.length === 0 && vendor) {
    normalizedServices.push({
      _id: 'default-inspection-svc',
      title: `${primaryCategoryName} Inspection & Repair`,
      description: `Complete diagnostic evaluation, on-site troubleshooting, and repair estimate by ${vendor.businessName || vendor.user?.name || 'Verified Pro'}.`,
      category: primaryCategoryName,
      pricingType: vendor.hourlyRate ? 'hourly' : 'starting',
      price: vendor.hourlyRate || 299,
      unit: vendor.hourlyRate ? 'per hour' : 'initial visit',
      duration: '1 hour',
      inclusions: [
        'Complete system inspection and diagnostic evaluation',
        'Upfront transparent quotation before starting any extra work',
        'Standard tools and equipment brought on-site'
      ],
      exclusions: [
        'Replacement spare parts and hardware billed separately'
      ],
      warranty: '7-Day Satisfaction Guarantee',
      image: getServiceImage(primaryCategoryName)
    });
  }

  // Profile data derivations
  const professionalName = vendor?.businessName || vendor?.user?.name || 'Verified Professional';
  const individualName = vendor?.user?.name || '';
  const avatarUrl = vendor?.user?.avatar || vendor?.avatar;
  const isVerified = vendor?.verifiedBadge?.status === 'verified' || vendor?.verifiedBadge?.status === 'approved';
  const isAvailableNow = vendor?.availability?.isAvailableNow !== false;
  const experienceYears = vendor?.experienceYears || 5;
  const completedJobs = vendor?.completedJobsCount || 0;
  const averageRating = Number((ratingBreakdown?.averageRating || vendor?.rating || 4.9).toFixed(1));
  const totalReviews = ratingBreakdown?.totalReviews ?? (reviews.length || vendor?.reviewCount || 0);
  const breakdown = ratingBreakdown?.breakdown || { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  const percentages = ratingBreakdown?.percentages || { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  const startingRate = normalizedServices[0]?.price || vendor?.hourlyRate || 299;

  // Covered service areas
  const serviceAreaTags = Array.isArray(vendor?.serviceAreas) && vendor.serviceAreas.length > 0
    ? vendor.serviceAreas.map((a: any) => typeof a === 'string' ? a : a.name || a.city).filter(Boolean)
    : [vendor?.city || 'Lucknow', 'Central City', 'Suburbs'];

  // Start booking action
  const handleOpenBooking = (service?: ServiceItem) => {
    setSelectedService(service || normalizedServices[0]);
    setBookingError(null);
    setBookingSuccess(false);
    setIsBookingModalOpen(true);
  };

  useEffect(() => {
    if (route?.params?.openBooking && !loading && normalizedServices.length > 0 && !isBookingModalOpen) {
      handleOpenBooking(normalizedServices[0]);
    }
  }, [route?.params?.openBooking, loading, normalizedServices.length]);

  const handleShare = async () => {
    try {
      await Share.share({
        title: `${professionalName} on WorkLogy`,
        message: `Hire ${professionalName} (${primaryCategoryName}) on WorkLogy! Verified rating: ${averageRating}★ (${totalReviews} reviews).`
      });
    } catch {
      // User cancelled
    }
  };

  const handleToggleSave = () => {
    setIsSaved((prev) => !prev);
  };

  const scrollToServices = () => {
    if (servicesSectionY.current > 0) {
      scrollViewRef.current?.scrollTo({ y: servicesSectionY.current - 20, animated: true });
    }
  };

  // Submit direct booking through existing backend API
  const handleConfirmBooking = async () => {
    if (!selectedService) {
      setBookingError('Please choose a service to book.');
      return;
    }

    // Determine target vendor user ID (required by backend)
    const vendorUserId = vendor?.user?._id || (typeof vendor?.user === 'string' ? vendor?.user : null) || vendor?._id;
    if (!vendorUserId) {
      setBookingError('Cannot identify professional ID.');
      return;
    }

    // Validate address
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

    if (!targetAddress.street && !targetAddress.locality) {
      setBookingError('Please enter a service street or locality.');
      return;
    }

    const scheduledDateObj = availableDates[selectedDateIndex] || availableDates[0];

    try {
      setBookingSubmitting(true);
      setBookingError(null);

      const serviceRef = selectedService._id && !selectedService._id.startsWith('vendor-srv') ? selectedService._id : undefined;

      const bookingPayload = {
        vendorId: vendorUserId,
        service: serviceRef,
        serviceId: serviceRef,
        serviceTitle: selectedService.title,
        category: selectedService.category || primaryCategoryName,
        serviceType: 'repair',
        problemDescription: notes.trim() || `Booked ${selectedService.title} with ${professionalName}`,
        urgency: 'normal' as const,
        scheduledDate: scheduledDateObj.isoDate,
        timeSlot: selectedTimeSlot,
        address: targetAddress,
        pricing: {
          type: selectedService.pricingType,
          amount: selectedService.price
        },
        notes: notes.trim()
      };

      const res = await api.bookings.createDirectBooking(bookingPayload);

      if (res?.success) {
        dataSyncService.notify('BOOKINGS_CHANGED', res);
        setBookingSuccess(true);
        setCreatedBookingRef(res.booking?.bookingReference || 'DIR-CONFIRMED');
      } else {
        setBookingError(res?.message || 'Failed to confirm booking request.');
      }
    } catch (err: any) {
      console.warn('Booking error:', err);
      // Friendly message without losing user input
      setBookingError(err?.message || 'Could not place direct booking. Please check your network and account.');
    } finally {
      setBookingSubmitting(false);
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER STATES
  // ═══════════════════════════════════════════════════════════════════════════

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading professional profile & services...</Text>
      </View>
    );
  }

  if (error || !vendor) {
    return (
      <View style={styles.centerContainer}>
        <View style={styles.errorIconCircle}>
          <Feather name="alert-triangle" size={32} color="#DC2626" />
        </View>
        <Text style={styles.errorTitle}>Professional Not Found</Text>
        <Text style={styles.errorSubtitle}>
          {error || 'The requested professional is temporarily unavailable or pending verification.'}
        </Text>
        <View style={{ flexDirection: 'row', marginTop: 16 }}>
          <TouchableOpacity style={styles.retryBtn} onPress={loadProfile} activeOpacity={0.8}>
            <Feather name="refresh-cw" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.retryBtn, { backgroundColor: '#F1F5F9', marginLeft: 10 }]}
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}
          >
            <Text style={[styles.retryBtnText, { color: '#0F172A' }]}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Calculate pricing breakdown for selected service
  const basePrice = selectedService?.price || startingRate;
  const convenienceFee = Math.round(basePrice * 0.05);
  const totalPayable = basePrice + convenienceFee;

  return (
    <View style={styles.screenWrapper}>
      <ScrollView
        ref={scrollViewRef}
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ══════════════════════════════════════════════════════════════════
            1. TOP PROFILE HEADER & IDENTITY
        ══════════════════════════════════════════════════════════════════ */}
        <View style={styles.profileHeaderCard}>
          {/* Top action row */}
          <View style={styles.headerActionRow}>
            <View style={styles.categoryPillHeader}>
              {renderCategoryIcon(vendor.categories?.[0]?.slug || 'tool', 14, COLORS.primary)}
              <Text style={styles.categoryPillHeaderText}>{primaryCategoryName}</Text>
            </View>

            <View style={styles.headerButtonsGroup}>
              <TouchableOpacity
                onPress={handleShare}
                style={styles.iconCircleBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityLabel="Share profile"
              >
                <Feather name="share-2" size={16} color="#475569" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleToggleSave}
                style={[styles.iconCircleBtn, { marginLeft: 8 }]}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityLabel="Bookmark professional"
              >
                <Ionicons
                  name={isSaved ? 'heart' : 'heart-outline'}
                  size={18}
                  color={isSaved ? '#EF4444' : '#475569'}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Avatar and Main Info Row */}
          <View style={styles.identityRow}>
            <View style={styles.avatarContainer}>
              {avatarUrl && !avatarError ? (
                <Image
                  source={{ uri: avatarUrl }}
                  style={styles.avatarImage}
                  onError={() => setAvatarError(true)}
                />
              ) : (
                <View style={styles.avatarFallback}>
                  <Text style={styles.avatarFallbackText}>
                    {professionalName.charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
              {isVerified && (
                <View style={styles.verifiedBadgeContainer}>
                  <Ionicons name="checkmark-sharp" size={12} color="#FFFFFF" />
                </View>
              )}
            </View>

            <View style={styles.identityTextContainer}>
              <View style={styles.nameRow}>
                <Text style={styles.businessNameText} numberOfLines={2}>
                  {professionalName}
                </Text>
              </View>

              {individualName && individualName !== professionalName && (
                <Text style={styles.individualNameText}>
                  Lead Specialist: {individualName}
                </Text>
              )}

              {/* Availability Status Badge */}
              <View style={styles.availabilityRow}>
                <View
                  style={[
                    styles.statusIndicatorDot,
                    { backgroundColor: isAvailableNow ? '#10B981' : '#F59E0B' }
                  ]}
                />
                <Text
                  style={[
                    styles.statusIndicatorText,
                    { color: isAvailableNow ? '#065F46' : '#92400E' }
                  ]}
                >
                  {isAvailableNow ? 'Available for Bookings Today' : 'Advance Scheduling Only'}
                </Text>
              </View>

              {/* Verified Credential Tag */}
              {isVerified && (
                <View style={styles.verifiedTagRow}>
                  <MaterialIcons name="verified" size={14} color="#059669" />
                  <Text style={styles.verifiedTagText}>WorkLogy Verified Trade License & KYC</Text>
                </View>
              )}
            </View>
          </View>

          {/* Professional Tagline & Bio */}
          {vendor.tagline ? (
            <Text style={styles.taglineText}>"{vendor.tagline}"</Text>
          ) : null}

          {vendor.bio ? (
            <View style={styles.bioContainer}>
              <Text
                style={styles.bioText}
                numberOfLines={isBioExpanded ? undefined : 3}
              >
                {vendor.bio}
              </Text>
              {vendor.bio.length > 120 && (
                <TouchableOpacity
                  onPress={() => setIsBioExpanded(!isBioExpanded)}
                  style={styles.readMoreBtn}
                  activeOpacity={0.7}
                >
                  <Text style={styles.readMoreBtnText}>
                    {isBioExpanded ? 'Show less' : 'Read full bio'}
                  </Text>
                  <Feather
                    name={isBioExpanded ? 'chevron-up' : 'chevron-down'}
                    size={14}
                    color={COLORS.primary}
                  />
                </TouchableOpacity>
              )}
            </View>
          ) : null}

          {/* Service Area Coverage Chips */}
          <View style={styles.coverageRow}>
            <Feather name="map-pin" size={13} color="#64748B" style={{ marginTop: 2, marginRight: 5 }} />
            <Text style={styles.coverageLabel}>Serving:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }}>
              {serviceAreaTags.map((area: string, index: number) => (
                <View key={index} style={styles.areaChip}>
                  <Text style={styles.areaChipText}>{area}</Text>
                </View>
              ))}
            </ScrollView>
          </View>

          {/* Pricing Highlight & Quick Navigation */}
          <View style={styles.pricingBannerRow}>
            <View>
              <Text style={styles.startingRateLabel}>Service Rates</Text>
              <Text style={styles.startingRateValue}>
                Starting {formatCurrency(startingRate)}
                <Text style={styles.startingRateUnit}>
                  {vendor.hourlyRate ? ' / hour' : ' onwards'}
                </Text>
              </Text>
            </View>

            <View style={styles.quickActionGroup}>
              <TouchableOpacity
                style={styles.viewServicesBtn}
                onPress={scrollToServices}
                activeOpacity={0.8}
              >
                <Text style={styles.viewServicesBtnText}>
                  Services ({normalizedServices.length})
                </Text>
                <Feather name="arrow-down" size={13} color={COLORS.primary} style={{ marginLeft: 3 }} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.headerBookBtn}
                onPress={() => handleOpenBooking()}
                activeOpacity={0.8}
              >
                <Ionicons name="calendar-outline" size={15} color="#FFFFFF" style={{ marginRight: 5 }} />
                <Text style={styles.headerBookBtnText}>Book Now</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* ══════════════════════════════════════════════════════════════════
            2. PERFORMANCE & TRUST METRICS SECTION
        ══════════════════════════════════════════════════════════════════ */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionHeaderTitle}>Verified Performance & Trust</Text>
          <Text style={styles.sectionHeaderSubtitle}>
            Live metrics calculated from completed WorkLogy service dossiers
          </Text>

          <View style={styles.statsCardGrid}>
            <View style={styles.statBox}>
              <View style={styles.statIconBadge}>
                <Ionicons name="star" size={16} color="#F59E0B" />
              </View>
              <Text style={styles.statValueText}>{averageRating}</Text>
              <Text style={styles.statLabelText}>Rating ({totalReviews})</Text>
            </View>

            <View style={styles.statBox}>
              <View style={[styles.statIconBadge, { backgroundColor: '#ECFDF5' }]}>
                <Ionicons name="briefcase" size={16} color="#059669" />
              </View>
              <Text style={styles.statValueText}>{completedJobs}+</Text>
              <Text style={styles.statLabelText}>Completed Jobs</Text>
            </View>

            <View style={styles.statBox}>
              <View style={[styles.statIconBadge, { backgroundColor: '#EFF6FF' }]}>
                <Ionicons name="ribbon" size={16} color="#2563EB" />
              </View>
              <Text style={styles.statValueText}>{experienceYears} Yrs</Text>
              <Text style={styles.statLabelText}>Experience</Text>
            </View>

            <View style={styles.statBox}>
              <View style={[styles.statIconBadge, { backgroundColor: '#FDF2F8' }]}>
                <Ionicons name="flash" size={16} color="#DB2777" />
              </View>
              <Text style={styles.statValueText}>{isAvailableNow ? 'Active' : 'Scheduled'}</Text>
              <Text style={styles.statLabelText}>Response Status</Text>
            </View>
          </View>
        </View>

        {/* ══════════════════════════════════════════════════════════════════
            3. REAL SERVICES OFFERED BY THIS PROFESSIONAL
        ══════════════════════════════════════════════════════════════════ */}
        <View
          style={styles.sectionContainer}
          onLayout={(event) => {
            servicesSectionY.current = event.nativeEvent.layout.y;
          }}
        >
          <View style={styles.sectionTitleRow}>
            <View>
              <Text style={styles.sectionHeaderTitle}>Services Offered</Text>
              <Text style={styles.sectionHeaderSubtitle}>
                Genuine catalog offerings provided by {professionalName}
              </Text>
            </View>
            <View style={styles.serviceCountBadge}>
              <Text style={styles.serviceCountBadgeText}>{normalizedServices.length} Available</Text>
            </View>
          </View>

          {normalizedServices.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="construct-outline" size={32} color="#94A3B8" />
              <Text style={styles.emptyCardTitle}>No Custom Packages Published</Text>
              <Text style={styles.emptyCardSubtitle}>
                This professional operates primarily on custom quotes or direct labor booking.
              </Text>
              <TouchableOpacity
                style={styles.customQuoteBtn}
                onPress={() => handleOpenBooking()}
                activeOpacity={0.8}
              >
                <Text style={styles.customQuoteBtnText}>Request General Service Visit</Text>
              </TouchableOpacity>
            </View>
          ) : (
            normalizedServices.map((service, index) => {
              const isSelected = selectedService?._id === service._id;
              return (
                <View key={service._id || `svc-${index}`} style={styles.serviceCard}>
                  {/* Service Card Top Banner Image & Tag */}
                  <View style={styles.serviceImageBanner}>
                    <Image
                      source={service.image}
                      style={styles.serviceCoverImage}
                      resizeMode="cover"
                    />
                    <View style={styles.serviceCategoryTagOverlay}>
                      <Text style={styles.serviceCategoryTagText}>{service.category}</Text>
                    </View>
                    {service.warranty ? (
                      <View style={styles.serviceWarrantyTagOverlay}>
                        <Ionicons name="shield-checkmark" size={11} color="#FFFFFF" style={{ marginRight: 3 }} />
                        <Text style={styles.serviceWarrantyTagText}>{service.warranty}</Text>
                      </View>
                    ) : null}
                  </View>

                  <View style={styles.serviceCardBody}>
                    <Text style={styles.serviceCardTitle}>{service.title}</Text>
                    <Text style={styles.serviceCardDesc}>{service.description}</Text>

                    {/* Duration and Inclusions */}
                    <View style={styles.serviceMetaRow}>
                      <View style={styles.metaBadge}>
                        <Feather name="clock" size={12} color="#475569" style={{ marginRight: 4 }} />
                        <Text style={styles.metaBadgeText}>{service.duration}</Text>
                      </View>
                      <View style={styles.metaBadge}>
                        <Feather name="check-circle" size={12} color="#059669" style={{ marginRight: 4 }} />
                        <Text style={styles.metaBadgeText}>Tools & Labor Included</Text>
                      </View>
                    </View>

                    {/* Standard Inclusions Checklist */}
                    <View style={styles.inclusionsBox}>
                      <Text style={styles.inclusionsTitle}>What's Included:</Text>
                      {service.inclusions.map((inc, i) => (
                        <View key={i} style={styles.inclusionLine}>
                          <Ionicons name="checkmark" size={14} color="#059669" style={{ marginRight: 6 }} />
                          <Text style={styles.inclusionText}>{inc}</Text>
                        </View>
                      ))}
                      {service.exclusions.map((exc, e) => (
                        <View key={`exc-${e}`} style={styles.inclusionLine}>
                          <Ionicons name="close" size={14} color="#94A3B8" style={{ marginRight: 6 }} />
                          <Text style={[styles.inclusionText, { color: '#64748B' }]}>{exc}</Text>
                        </View>
                      ))}
                    </View>

                    {/* Pricing Footer and Book Button */}
                    <View style={styles.serviceCardFooter}>
                      <View>
                        <Text style={styles.priceBasisLabel}>
                          {service.pricingType === 'fixed'
                            ? 'Fixed Total Rate'
                            : service.pricingType === 'hourly'
                            ? 'Hourly Billing'
                            : service.pricingType === 'starting'
                            ? 'Starting Price'
                            : 'Quote on Inspection'}
                        </Text>
                        <Text style={styles.servicePriceText}>
                          {formatCurrency(service.price)}
                          <Text style={styles.servicePriceUnit}> / {service.unit}</Text>
                        </Text>
                      </View>

                      <TouchableOpacity
                        style={styles.bookServiceCardBtn}
                        onPress={() => handleOpenBooking(service)}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.bookServiceCardBtnText}>Book Service</Text>
                        <Feather name="arrow-right" size={14} color="#FFFFFF" style={{ marginLeft: 4 }} />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </View>

        {/* ══════════════════════════════════════════════════════════════════
            4. VERIFICATION, CREDENTIALS & ESCROW SAFETY
        ══════════════════════════════════════════════════════════════════ */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionHeaderTitle}>WorkLogy Safety & Verification</Text>
          <Text style={styles.sectionHeaderSubtitle}>
            Every booking is backed by WorkLogy platform escrow guarantees
          </Text>

          <View style={styles.safetyCard}>
            <View style={styles.safetyRowItem}>
              <View style={[styles.safetyIconBox, { backgroundColor: '#ECFDF5' }]}>
                <Ionicons name="shield-checkmark" size={20} color="#059669" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.safetyItemTitle}>WorkLogy Escrow Protection</Text>
                <Text style={styles.safetyItemDesc}>
                  Your payment is securely held in escrow and released to the professional only after you verify completion with your arrival and finish OTPs.
                </Text>
              </View>
            </View>

            <View style={styles.safetyDivider} />

            <View style={styles.safetyRowItem}>
              <View style={[styles.safetyIconBox, { backgroundColor: '#EFF6FF' }]}>
                <Ionicons name="person-circle" size={20} color="#2563EB" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.safetyItemTitle}>Government ID & Trade Check</Text>
                <Text style={styles.safetyItemDesc}>
                  {isVerified
                    ? 'Identity, address, and trade proficiency have been verified by WorkLogy platform administration.'
                    : 'Professional credentials and trade experience actively monitored under marketplace safety standards.'}
                </Text>
              </View>
            </View>

            <View style={styles.safetyDivider} />

            <View style={styles.safetyRowItem}>
              <View style={[styles.safetyIconBox, { backgroundColor: '#FEF3C7' }]}>
                <Ionicons name="refresh" size={20} color="#D97706" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.safetyItemTitle}>7-Day Workmanship Guarantee</Text>
                <Text style={styles.safetyItemDesc}>
                  If any workmanship defect arises within 7 days of service completion, the technician will return for a complimentary re-inspection.
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* ══════════════════════════════════════════════════════════════════
            5. RATINGS & CUSTOMER REVIEWS
        ══════════════════════════════════════════════════════════════════ */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionTitleRow}>
            <View>
              <Text style={styles.sectionHeaderTitle}>Verified Customer Reviews</Text>
              <Text style={styles.sectionHeaderSubtitle}>
                Genuine ratings from verified customers with completed bookings
              </Text>
            </View>
            <View style={styles.reviewScorePill}>
              <Ionicons name="star" size={14} color="#F59E0B" />
              <Text style={styles.reviewScorePillText}>{averageRating} / 5</Text>
            </View>
          </View>

          {/* Rating Breakdown Bars */}
          <View style={styles.ratingOverviewCard}>
            <View style={styles.ratingOverviewLeft}>
              <Text style={styles.bigRatingText}>{averageRating}</Text>
              <View style={styles.starsRow}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <View key={star}>
                    <Ionicons
                      name={star <= Math.round(averageRating) ? 'star' : 'star-outline'}
                      size={16}
                      color="#F59E0B"
                    />
                  </View>
                ))}
              </View>
              <Text style={styles.totalReviewsText}>Based on {totalReviews} reviews</Text>
            </View>

            <View style={styles.ratingBarsRight}>
              {[5, 4, 3, 2, 1].map((stars) => {
                const percent = percentages[stars] || 0;
                const count = breakdown[stars] || 0;
                return (
                  <View key={stars} style={styles.ratingBarRow}>
                    <Text style={styles.barStarLabel}>{stars}★</Text>
                    <View style={styles.barTrack}>
                      <View style={[styles.barFill, { width: `${percent}%` }]} />
                    </View>
                    <Text style={styles.barCountLabel}>{count}</Text>
                  </View>
                );
              })}
            </View>
          </View>

          {/* Reviews List */}
          {reviews.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="chatbubbles-outline" size={32} color="#94A3B8" />
              <Text style={styles.emptyCardTitle}>No Reviews Yet</Text>
              <Text style={styles.emptyCardSubtitle}>
                Be the first to hire this professional and submit a verified review after service completion!
              </Text>
            </View>
          ) : (
            reviews.map((rev: any, rIdx: number) => {
              const customerName = rev.customer?.name || 'Verified Customer';
              const serviceTitle = rev.booking?.serviceTitle || rev.job?.title || primaryCategoryName;
              return (
                <View key={rev._id || `rev-${rIdx}`} style={styles.reviewCard}>
                  <View style={styles.reviewCardHeader}>
                    <View style={styles.reviewerAvatar}>
                      {rev.customer?.avatar ? (
                        <Image source={{ uri: rev.customer.avatar }} style={styles.reviewerAvatarImg} />
                      ) : (
                        <Text style={styles.reviewerAvatarInitial}>
                          {customerName.charAt(0).toUpperCase()}
                        </Text>
                      )}
                    </View>

                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={styles.reviewerName}>{customerName}</Text>
                      <View style={styles.reviewDateRow}>
                        <View style={styles.starsInlineRow}>
                          {[1, 2, 3, 4, 5].map((s) => (
                            <View key={s}>
                              <Ionicons
                                name={s <= (rev.rating || 5) ? 'star' : 'star-outline'}
                                size={12}
                                color="#F59E0B"
                              />
                            </View>
                          ))}
                        </View>
                        <Text style={styles.reviewDateText}>
                          • {formatDate(rev.createdAt)}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.verifiedBookingTag}>
                      <Ionicons name="checkmark-circle" size={12} color="#059669" />
                      <Text style={styles.verifiedBookingTagText}>Verified Booking</Text>
                    </View>
                  </View>

                  {serviceTitle ? (
                    <View style={styles.reviewedServicePill}>
                      <Text style={styles.reviewedServicePillText}>
                        Service: {serviceTitle}
                      </Text>
                    </View>
                  ) : null}

                  <Text style={styles.reviewCommentText}>
                    "{rev.comment || 'Prompt, professional, and knowledgeable service executed neatly.'}"
                  </Text>
                </View>
              );
            })
          )}
        </View>

        {/* ══════════════════════════════════════════════════════════════════
            6. SIMILAR PROFESSIONALS (IF AVAILABLE)
        ══════════════════════════════════════════════════════════════════ */}
        {similarVendors && similarVendors.length > 0 && (
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionHeaderTitle}>Other Professionals in {primaryCategoryName}</Text>
            <Text style={styles.sectionHeaderSubtitle}>
              Compare verified specialists in your locality
            </Text>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12 }}>
              {similarVendors.map((sv: any) => (
                <TouchableOpacity
                  key={sv._id}
                  style={styles.similarCard}
                  activeOpacity={0.8}
                  onPress={() => {
                    navigation.navigate('ProfessionalProfile', { vendorId: sv._id, vendor: sv });
                  }}
                >
                  <View style={styles.similarAvatarContainer}>
                    {sv.user?.avatar ? (
                      <Image source={{ uri: sv.user.avatar }} style={styles.similarAvatarImg} />
                    ) : (
                      <View style={styles.similarAvatarFallback}>
                        <Text style={styles.similarAvatarFallbackText}>
                          {(sv.businessName || sv.user?.name || 'P').charAt(0).toUpperCase()}
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.similarName} numberOfLines={1}>
                    {sv.businessName || sv.user?.name}
                  </Text>
                  <Text style={styles.similarStats}>
                    ★ {sv.rating ? sv.rating.toFixed(1) : '4.9'} ({sv.reviewCount || 0})
                  </Text>
                  <Text style={styles.similarRate}>From ₹{sv.hourlyRate || 299}</Text>
                  <View style={styles.similarViewBtn}>
                    <Text style={styles.similarViewBtnText}>View Profile</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        <View style={{ height: 110 }} />
      </ScrollView>

      {/* ══════════════════════════════════════════════════════════════════
          7. STICKY BOTTOM ACTION DOCK
      ══════════════════════════════════════════════════════════════════ */}
      <View style={styles.bottomDock}>
        <View style={styles.dockPriceBox}>
          <Text style={styles.dockPriceLabel}>
            {selectedService ? selectedService.title : 'Standard Booking'}
          </Text>
          <Text style={styles.dockPriceValue}>
            {formatCurrency(basePrice)}
            <Text style={styles.dockPriceUnit}>
              {selectedService ? ` / ${selectedService.unit}` : ' starting'}
            </Text>
          </Text>
        </View>

        <TouchableOpacity
          style={styles.dockBookBtn}
          onPress={() => handleOpenBooking(selectedService || normalizedServices[0])}
          activeOpacity={0.85}
        >
          <Ionicons name="calendar-sharp" size={17} color="#FFFFFF" style={{ marginRight: 6 }} />
          <Text style={styles.dockBookBtnText}>Book Professional</Text>
        </TouchableOpacity>
      </View>

      {/* ══════════════════════════════════════════════════════════════════
          8. DIRECT BOOKING MODAL
      ══════════════════════════════════════════════════════════════════ */}
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
            {/* Modal Drag / Close Header */}
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalHeaderTitle}>Confirm Direct Booking</Text>
                <Text style={styles.modalHeaderSubtitle}>
                  With {professionalName} • {primaryCategoryName}
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
                  <Ionicons name="checkmark-done" size={42} color="#FFFFFF" />
                </View>
                <Text style={styles.successTitle}>Booking Request Submitted!</Text>
                <Text style={styles.successRef}>Reference: #{createdBookingRef}</Text>
                <Text style={styles.successMessage}>
                  {professionalName} has received your direct service appointment for{' '}
                  {availableDates[selectedDateIndex]?.dayName} ({selectedTimeSlot}). You will be notified as soon as they accept.
                </Text>
                <View style={styles.escrowNoticeBox}>
                  <Ionicons name="shield-checkmark" size={16} color="#059669" style={{ marginRight: 6 }} />
                  <Text style={styles.escrowNoticeText}>
                    WorkLogy Escrow Protection active. Payment will be verified upon arrival.
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

                {/* Selected Service Card in Modal */}
                <View style={styles.modalServiceCard}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalServiceTitle}>
                      {selectedService?.title || 'Direct Professional Service'}
                    </Text>
                    <Text style={styles.modalServiceCategory}>
                      {selectedService?.category || primaryCategoryName} • {selectedService?.duration || '1 - 2 hours'}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.modalServicePrice}>
                      {formatCurrency(basePrice)}
                    </Text>
                    <Text style={styles.modalServicePricingType}>
                      {selectedService?.pricingType === 'fixed' ? 'Fixed Price' : 'Estimated Base'}
                    </Text>
                  </View>
                </View>

                {/* Step 1: Schedule Date */}
                <Text style={styles.modalSectionHeading}>1. Select Service Date</Text>
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
                <Text style={styles.modalSectionHeading}>2. Select Arrival Window</Text>
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

                {/* Step 3: Service Address */}
                <Text style={styles.modalSectionHeading}>3. Service Location</Text>
                {savedAddresses.length > 0 && (
                  <View style={styles.addressTypeToggleRow}>
                    <TouchableOpacity
                      style={[
                        styles.addressTypeBtn,
                        !isCustomAddress && styles.addressTypeBtnActive
                      ]}
                      onPress={() => setIsCustomAddress(false)}
                    >
                      <Text
                        style={[
                          styles.addressTypeBtnText,
                          !isCustomAddress && styles.addressTypeBtnTextActive
                        ]}
                      >
                        Saved Addresses ({savedAddresses.length})
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.addressTypeBtn,
                        isCustomAddress && styles.addressTypeBtnActive
                      ]}
                      onPress={() => setIsCustomAddress(true)}
                    >
                      <Text
                        style={[
                          styles.addressTypeBtnText,
                          isCustomAddress && styles.addressTypeBtnTextActive
                        ]}
                      >
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
                  <View style={styles.addressInputForm}>
                    <View style={styles.formRow}>
                      <View style={{ flex: 1, marginRight: 8 }}>
                        <Text style={styles.inputLabel}>House / Flat / Unit #</Text>
                        <TextInput
                          style={styles.textInput}
                          placeholder="e.g. Flat 402, Tower B"
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

                    <Text style={styles.inputLabel}>Street / Building / Landmark</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="e.g. Near City Mall, Ring Road"
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
                <Text style={styles.modalSectionHeading}>4. Notes / Problem Details</Text>
                <TextInput
                  style={[styles.textInput, styles.notesInput]}
                  placeholder="Describe the issue, specific requirements, or landmarks for technician arrival..."
                  placeholderTextColor="#94A3B8"
                  multiline
                  numberOfLines={3}
                  value={notes}
                  onChangeText={setNotes}
                />

                {/* Step 5: Price Breakdown */}
                <View style={styles.priceBreakdownCard}>
                  <Text style={styles.breakdownHeaderTitle}>Charges & Payment Summary</Text>

                  <View style={styles.breakdownRow}>
                    <Text style={styles.breakdownLabel}>Service Package Amount</Text>
                    <Text style={styles.breakdownValue}>{formatCurrency(basePrice)}</Text>
                  </View>

                  <View style={styles.breakdownRow}>
                    <Text style={styles.breakdownLabel}>WorkLogy Convenience & Platform (5%)</Text>
                    <Text style={styles.breakdownValue}>{formatCurrency(convenienceFee)}</Text>
                  </View>

                  <View style={styles.breakdownRow}>
                    <Text style={styles.breakdownLabel}>Escrow Protection & 7-Day Guarantee</Text>
                    <Text style={[styles.breakdownValue, { color: '#059669' }]}>FREE</Text>
                  </View>

                  <View style={styles.breakdownDivider} />

                  <View style={styles.breakdownTotalRow}>
                    <View>
                      <Text style={styles.totalDueLabel}>Estimated Total</Text>
                      <Text style={styles.totalDueHint}>Pay after technician arrival via WorkLogy</Text>
                    </View>
                    <Text style={styles.totalDueAmount}>{formatCurrency(totalPayable)}</Text>
                  </View>
                </View>

                {/* Confirm Booking Action Button */}
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
                      <Ionicons name="lock-closed" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                      <Text style={styles.confirmBookingBtnText}>
                        Confirm Booking ({formatCurrency(totalPayable)})
                      </Text>
                    </>
                  )}
                </TouchableOpacity>

                <View style={{ height: 30 }} />
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// STYLES
// ═════════════════════════════════════════════════════════════════════════════

const { width } = Dimensions.get('window');

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
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24
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
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8
  },
  errorSubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 13
  },

  // 1. Profile Header Card
  profileHeaderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2
  },
  headerActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14
  },
  categoryPillHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#A7F3D0'
  },
  categoryPillHeaderText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#065F46',
    marginLeft: 5
  },
  headerButtonsGroup: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  iconCircleBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center'
  },
  identityRow: {
    flexDirection: 'row',
    alignItems: 'flex-start'
  },
  avatarContainer: {
    position: 'relative'
  },
  avatarImage: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#E2E8F0'
  },
  avatarFallback: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center'
  },
  avatarFallbackText: {
    fontSize: 26,
    fontWeight: '700',
    color: '#FFFFFF'
  },
  verifiedBadgeContainer: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#10B981',
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF'
  },
  identityTextContainer: {
    flex: 1,
    marginLeft: 14
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  businessNameText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
    lineHeight: 22
  },
  individualNameText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '500'
  },
  availabilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5
  },
  statusIndicatorDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    marginRight: 5
  },
  statusIndicatorText: {
    fontSize: 11.5,
    fontWeight: '600'
  },
  verifiedTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4
  },
  verifiedTagText: {
    fontSize: 11,
    color: '#059669',
    fontWeight: '600',
    marginLeft: 4
  },
  taglineText: {
    fontSize: 13,
    fontStyle: 'italic',
    color: '#334155',
    marginTop: 12,
    paddingHorizontal: 4
  },
  bioContainer: {
    marginTop: 8,
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 8
  },
  bioText: {
    fontSize: 12.5,
    color: '#475569',
    lineHeight: 18
  },
  readMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4
  },
  readMoreBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
    marginRight: 2
  },
  coverageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9'
  },
  coverageLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    marginRight: 6
  },
  areaChip: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginRight: 6
  },
  areaChipText: {
    fontSize: 11,
    color: '#334155'
  },
  pricingBannerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9'
  },
  startingRateLabel: {
    fontSize: 11,
    color: '#64748B',
    textTransform: 'uppercase',
    fontWeight: '600',
    letterSpacing: 0.5
  },
  startingRateValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A'
  },
  startingRateUnit: {
    fontSize: 12,
    fontWeight: '400',
    color: '#64748B'
  },
  quickActionGroup: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  viewServicesBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    marginRight: 8
  },
  viewServicesBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary
  },
  headerBookBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8
  },
  headerBookBtnText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#FFFFFF'
  },

  // 2. Sections Common
  sectionContainer: {
    marginBottom: 20
  },
  sectionTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10
  },
  sectionHeaderTitle: {
    fontSize: 15.5,
    fontWeight: '700',
    color: '#0F172A'
  },
  sectionHeaderSubtitle: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 2
  },
  serviceCountBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12
  },
  serviceCountBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#065F46'
  },

  // Trust Stats Grid
  statsCardGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10
  },
  statBox: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
    marginHorizontal: 3,
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  statIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6
  },
  statValueText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0F172A'
  },
  statLabelText: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
    textAlign: 'center'
  },

  // 3. Service Cards
  serviceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 5,
    elevation: 2
  },
  serviceImageBanner: {
    width: '100%',
    height: 120,
    position: 'relative'
  },
  serviceCoverImage: {
    width: '100%',
    height: '100%'
  },
  serviceCategoryTagOverlay: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6
  },
  serviceCategoryTagText: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#FFFFFF'
  },
  serviceWarrantyTagOverlay: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(5, 150, 105, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center'
  },
  serviceWarrantyTagText: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#FFFFFF'
  },
  serviceCardBody: {
    padding: 14
  },
  serviceCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    lineHeight: 20
  },
  serviceCardDesc: {
    fontSize: 12,
    color: '#475569',
    marginTop: 4,
    lineHeight: 17
  },
  serviceMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10
  },
  metaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginRight: 8
  },
  metaBadgeText: {
    fontSize: 11,
    color: '#334155',
    fontWeight: '500'
  },
  inclusionsBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 10,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9'
  },
  inclusionsTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.3
  },
  inclusionLine: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3
  },
  inclusionText: {
    fontSize: 11.5,
    color: '#1E293B',
    flex: 1
  },
  serviceCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9'
  },
  priceBasisLabel: {
    fontSize: 10.5,
    color: '#64748B',
    fontWeight: '500'
  },
  servicePriceText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A'
  },
  servicePriceUnit: {
    fontSize: 11.5,
    fontWeight: '400',
    color: '#64748B'
  },
  bookServiceCardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8
  },
  bookServiceCardBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 12.5
  },

  // 4. Safety & Verification Card
  safetyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 10
  },
  safetyRowItem: {
    flexDirection: 'row',
    alignItems: 'flex-start'
  },
  safetyIconBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  safetyItemTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A'
  },
  safetyItemDesc: {
    fontSize: 11.5,
    color: '#475569',
    marginTop: 2,
    lineHeight: 16
  },
  safetyDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 12
  },

  // 5. Ratings & Reviews
  reviewScorePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12
  },
  reviewScorePillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#92400E',
    marginLeft: 4
  },
  ratingOverviewCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 10,
    marginBottom: 12,
    alignItems: 'center'
  },
  ratingOverviewLeft: {
    alignItems: 'center',
    paddingRight: 16,
    borderRightWidth: 1,
    borderRightColor: '#F1F5F9',
    minWidth: 100
  },
  bigRatingText: {
    fontSize: 32,
    fontWeight: '800',
    color: '#0F172A'
  },
  starsRow: {
    flexDirection: 'row',
    marginTop: 2
  },
  totalReviewsText: {
    fontSize: 10.5,
    color: '#64748B',
    marginTop: 4
  },
  ratingBarsRight: {
    flex: 1,
    paddingLeft: 14
  },
  ratingBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 3
  },
  barStarLabel: {
    fontSize: 10.5,
    color: '#475569',
    width: 20
  },
  barTrack: {
    flex: 1,
    height: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
    marginHorizontal: 6,
    overflow: 'hidden'
  },
  barFill: {
    height: '100%',
    backgroundColor: '#F59E0B',
    borderRadius: 3
  },
  barCountLabel: {
    fontSize: 10,
    color: '#64748B',
    width: 18,
    textAlign: 'right'
  },

  reviewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 10
  },
  reviewCardHeader: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  reviewerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden'
  },
  reviewerAvatarImg: {
    width: '100%',
    height: '100%'
  },
  reviewerAvatarInitial: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary
  },
  reviewerName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A'
  },
  reviewDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2
  },
  starsInlineRow: {
    flexDirection: 'row'
  },
  reviewDateText: {
    fontSize: 11,
    color: '#64748B',
    marginLeft: 4
  },
  verifiedBookingTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6
  },
  verifiedBookingTagText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#059669',
    marginLeft: 3
  },
  reviewedServicePill: {
    alignSelf: 'flex-start',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 8
  },
  reviewedServicePillText: {
    fontSize: 10.5,
    color: '#475569',
    fontWeight: '500'
  },
  reviewCommentText: {
    fontSize: 12.5,
    color: '#334155',
    lineHeight: 18,
    marginTop: 8
  },

  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 10
  },
  emptyCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 10
  },
  emptyCardSubtitle: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 16
  },
  customQuoteBtn: {
    marginTop: 14,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8
  },
  customQuoteBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary
  },

  // 6. Similar Vendors
  similarCard: {
    width: 140,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center'
  },
  similarAvatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#E2E8F0',
    marginBottom: 8
  },
  similarAvatarImg: {
    width: '100%',
    height: '100%'
  },
  similarAvatarFallback: {
    width: '100%',
    height: '100%',
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center'
  },
  similarAvatarFallbackText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF'
  },
  similarName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center'
  },
  similarStats: {
    fontSize: 10.5,
    color: '#64748B',
    marginTop: 2
  },
  similarRate: {
    fontSize: 11,
    fontWeight: '600',
    color: '#059669',
    marginTop: 4
  },
  similarViewBtn: {
    marginTop: 8,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6
  },
  similarViewBtnText: {
    fontSize: 10.5,
    fontWeight: '600',
    color: COLORS.primary
  },

  // 7. Sticky Bottom Dock
  bottomDock: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 8
  },
  dockPriceBox: {
    flex: 1,
    paddingRight: 12
  },
  dockPriceLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500'
  },
  dockPriceValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A'
  },
  dockPriceUnit: {
    fontSize: 11,
    fontWeight: '400',
    color: '#64748B'
  },
  dockBookBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 10
  },
  dockBookBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13.5
  },

  // 8. Direct Booking Modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end'
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
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
    fontWeight: '700',
    color: '#0F172A'
  },
  modalHeaderSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2
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
  modalServiceCard: {
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
  modalServiceTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A'
  },
  modalServiceCategory: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2
  },
  modalServicePrice: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A'
  },
  modalServicePricingType: {
    fontSize: 10,
    color: '#059669',
    fontWeight: '600'
  },
  modalSectionHeading: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 8,
    marginTop: 6
  },

  // Date picker chips
  datePickerRow: {
    marginBottom: 16
  },
  dateChip: {
    width: 78,
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

  // Time slot chips
  timeSlotGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16
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

  // Address Selector
  addressTypeToggleRow: {
    flexDirection: 'row',
    marginBottom: 10
  },
  addressTypeBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    marginRight: 8
  },
  addressTypeBtnActive: {
    backgroundColor: COLORS.primaryLight
  },
  addressTypeBtnText: {
    fontSize: 11.5,
    color: '#64748B',
    fontWeight: '500'
  },
  addressTypeBtnTextActive: {
    color: COLORS.primary,
    fontWeight: '700'
  },
  savedAddressesList: {
    marginBottom: 14
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
  addressInputForm: {
    marginBottom: 14
  },
  formRow: {
    flexDirection: 'row'
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 4,
    marginTop: 6
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
    height: 64,
    textAlignVertical: 'top',
    marginBottom: 14
  },

  // Price Breakdown in Modal
  priceBreakdownCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16
  },
  breakdownHeaderTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.3
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5
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
    marginVertical: 8
  },
  breakdownTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  totalDueLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A'
  },
  totalDueHint: {
    fontSize: 10,
    color: '#64748B'
  },
  totalDueAmount: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A'
  },

  confirmBookingBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 12,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3
  },
  confirmBookingBtnDisabled: {
    opacity: 0.6
  },
  confirmBookingBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700'
  },

  // Booking Success
  bookingSuccessContainer: {
    padding: 24,
    alignItems: 'center'
  },
  successIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
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
    fontSize: 12.5,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 10
  },
  escrowNoticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    padding: 10,
    borderRadius: 8,
    marginTop: 16,
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
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 20
  },
  viewBookingsSuccessBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700'
  }
});
