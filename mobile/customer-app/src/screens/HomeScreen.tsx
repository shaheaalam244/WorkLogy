import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Image,
  StatusBar,
  Platform,
  Dimensions
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../hooks/useAuth';
import { api } from '../api/client';
import { STORAGE_KEYS } from '../constants';
import { COLORS } from '../theme/colors';
import { getStoredLocation, saveLocation, resolveActiveLocation, DEFAULT_LOCATION, type DetectedLocation } from '../services/locationService';
import { formatCurrency, formatDate, getStatusColor, formatStatusText } from '../utils/formatters';
import { getServiceImage } from '../utils/serviceImages';
import { dataSyncService } from '../services/dataSyncService';
import LocationModal from '../components/LocationModal';
import type { ServiceCategory, Booking, ServiceAddress } from '../types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BANNER_WIDTH = SCREEN_WIDTH - 32;

// ── 9 Canonical Categories for 3x3 Grid (Matching Screenshot 5) ──
const GRID_CATEGORIES = [
  { id: '1', name: 'AC & Appliance', slug: 'ac-hvac-services', image: require('../assets/services/Air Conditioner Maintenance in a Modern Home.png') },
  { id: '2', name: 'Electrician', slug: 'electrical-services', image: require('../assets/services/Electrician Repairing Home Electrical Panel.png') },
  { id: '3', name: 'Plumbing', slug: 'plumbing-services', image: require('../assets/services/Plumber Repairing Under Kitchen Sink.png') },
  { id: '4', name: 'Carpenter', slug: 'carpentry-furniture', image: require('../assets/services/Skilled Handyman Repairing a Wooden Cabinet.png') },
  { id: '5', name: 'Cleaning', slug: 'home-cleaning', image: require('../assets/services/Professional Cleaning in a Bright Living Room.png') },
  { id: '6', name: 'Painting', slug: 'painting-services', image: require('../assets/services/Apartment Wall Painting in Progress.png') },
  { id: '7', name: 'Pest Control', slug: 'pest-control', image: require('../assets/services/Kitchen Pest Control Inspection.png') },
  { id: '8', name: 'Home Maintenance', slug: 'home-installation', image: require('../assets/services/Handyman Repairing a Home Door Lock.png') },
  { id: '9', name: 'More', slug: 'all', isMore: true, image: require('../assets/services/TV Installation with Spirit Level.png') }
];

// ── Promotional Service Banner Carousel Slides (Matching Screenshot 5) ──
const PROMO_SLIDES = [
  {
    id: 'slide-1',
    badge: 'EXPERT REPAIRS',
    title: 'Instant AC & Appliance Servicing',
    subtitle: '30 min arrival • Transparent rates • Warranty',
    ctaText: 'Book Repair',
    categorySlug: 'ac-hvac-services',
    image: require('../assets/services/Air Conditioner Maintenance in a Modern Home.png'),
    bgTint: '#FFF1EE',
    borderTint: '#FDE0D7',
    badgeBg: '#FFEDD5',
    badgeColor: '#EA580C',
    btnBg: '#EA580C'
  },
  {
    id: 'slide-2',
    badge: 'VERIFIED PROS',
    title: 'Home Wiring & Switchboard Fixes',
    subtitle: 'Safety inspected • Licensed electricians • Standard rates',
    ctaText: 'Book Electrician',
    categorySlug: 'electrical-services',
    image: require('../assets/services/Electrician Repairing Home Electrical Panel.png'),
    bgTint: '#EFF6FF',
    borderTint: '#DBEAFE',
    badgeBg: '#DBEAFE',
    badgeColor: '#2563EB',
    btnBg: '#2563EB'
  },
  {
    id: 'slide-3',
    badge: 'SAME-DAY VISITS',
    title: 'Kitchen & Sanitary Leakage Repairs',
    subtitle: 'Drain unclogging • Pipe replacement • 100% Guaranteed',
    ctaText: 'Book Plumber',
    categorySlug: 'plumbing-services',
    image: require('../assets/services/Plumber Repairing Under Kitchen Sink.png'),
    bgTint: '#ECFDF5',
    borderTint: '#D1FAE5',
    badgeBg: '#D1FAE5',
    badgeColor: '#059669',
    btnBg: '#059669'
  }
];


interface VerifiedVendor {
  _id: string;
  businessName: string;
  name?: string;
  user?: { name?: string; avatar?: string; phone?: string };
  categories?: { name: string; slug: string }[];
  rating?: number;
  reviewCount?: number;
  experienceYears?: number;
  city?: string;
  locality?: string;
  zoneId?: string;
  zoneName?: string;
  distanceKm?: number;
  distanceText?: string;
  isNearest?: boolean;
  isApproximateDistance?: boolean;
  verifiedBadge?: { status?: string };
  hourlyRate?: number;
  isAvailable?: boolean;
}

const VERIFIED_FALLBACK_PROS: VerifiedVendor[] = [
  {
    _id: '6ad8929d4bd0f2c1cd3f31ac',
    businessName: 'Vikram Power Solutions',
    name: 'Vikram Electrician',
    user: { name: 'Vikram Electrician', phone: '9876500003' },
    categories: [{ name: 'Electrical Services', slug: 'electrical-services' }],
    rating: 5.0,
    reviewCount: 38,
    experienceYears: 6,
    city: 'Lucknow',
    hourlyRate: 299,
    isAvailable: true
  },
  {
    _id: '6ad8929d4bd0f2c1cd3f31a5',
    businessName: 'Suresh Expert Pipes',
    name: 'Suresh Plumber',
    user: { name: 'Suresh Plumber', phone: '9876500002' },
    categories: [{ name: 'Plumbing Services', slug: 'plumbing-services' }],
    rating: 4.9,
    reviewCount: 52,
    experienceYears: 5,
    city: 'Lucknow',
    hourlyRate: 249,
    isAvailable: true
  },
  {
    _id: '6accc342d9a98de465ce847f',
    businessName: 'FlowPro Master Plumbing',
    name: 'Elena Rostova',
    user: { name: 'Elena Rostova', phone: '+1 (555) 456-7890' },
    categories: [{ name: 'Plumbing Services', slug: 'plumbing-services' }],
    rating: 4.92,
    reviewCount: 98,
    experienceYears: 9,
    city: 'Lucknow',
    hourlyRate: 350,
    isAvailable: true
  },
  {
    _id: '6accc343d9a98de465ce8480',
    businessName: 'Precision Carpentry & Millwork',
    name: 'Carlos Mendez',
    user: { name: 'Carlos Mendez', phone: '+1 (555) 567-8901' },
    categories: [{ name: 'Carpentry & Furniture', slug: 'carpentry-furniture' }],
    rating: 4.88,
    reviewCount: 76,
    experienceYears: 10,
    city: 'Lucknow',
    hourlyRate: 399,
    isAvailable: true
  }
];

export default function HomeScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const topInset = Math.max(
    insets.top,
    Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 0
  );
  const { user } = useAuth();
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [activeBookings, setActiveBookings] = useState<Booking[]>([]);
  const [nearbyVendors, setNearbyVendors] = useState<VerifiedVendor[]>(VERIFIED_FALLBACK_PROS);
  const [publishedServices, setPublishedServices] = useState<any[]>([]);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentLocation, setCurrentLocation] = useState('Lucknow, Gomti Nagar');
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activePromoIndex, setActivePromoIndex] = useState(0);
  const [favoritedVendors, setFavoritedVendors] = useState<Record<string, boolean>>({});

  const promoScrollRef = useRef<any>(null);
  const promoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const initHome = async () => {
      const activeLoc = await restoreLocation();
      await loadHomeData({
        city: activeLoc.city || 'Lucknow',
        locality: activeLoc.locality,
        zoneId: activeLoc.zoneId,
        lat: activeLoc.coordinates?.lat,
        lng: activeLoc.coordinates?.lng,
        mode: 'nearby'
      });
    };
    initHome();
  }, [user]);

  // Periodic and focus-based unread notification count sync
  useEffect(() => {
    if (!user) {
      setUnreadNotifications(0);
      return;
    }
    const syncUnread = async () => {
      try {
        const res = await api.notifications.getUnreadCount();
        const count = typeof res?.unreadCount === 'number' ? res.unreadCount : (typeof res?.count === 'number' ? res.count : 0);
        setUnreadNotifications(count);
      } catch {
        // ignore background fetch failures
      }
    };
    syncUnread();
    const interval = setInterval(syncUnread, 15000);
    return () => clearInterval(interval);
  }, [user, navigation?.currentRoute]);

  // Intercept back button to dismiss LocationModal first if open
  useEffect(() => {
    if (!showLocationModal) return;
    const unregister = navigation?.registerBackHandler?.(() => {
      setShowLocationModal(false);
      return true;
    });
    return () => {
      unregister?.();
    };
  }, [showLocationModal, navigation]);

  // Auto-slide banner carousel every 5 seconds
  useEffect(() => {
    promoTimerRef.current = setInterval(() => {
      setActivePromoIndex((prev) => {
        const nextIndex = (prev + 1) % PROMO_SLIDES.length;
        promoScrollRef.current?.scrollTo({ x: nextIndex * BANNER_WIDTH, animated: true });
        return nextIndex;
      });
    }, 5000);

    return () => {
      if (promoTimerRef.current) clearInterval(promoTimerRef.current);
    };
  }, []);

  // Real-time synchronization of active bookings banner and orders
  useEffect(() => {
    const unsub = dataSyncService.subscribe('BOOKINGS_CHANGED', () => {
      if (user) {
        api.bookings.getMyBookings()
          .then((res) => {
            if (res?.bookings) {
              setActiveBookings(res.bookings.filter((b) => b.status !== 'completed' && b.status !== 'cancelled'));
            }
          })
          .catch(() => {});
      }
    });
    return () => {
      unsub();
    };
  }, [user?._id]);

  const restoreLocation = async (): Promise<DetectedLocation> => {
    try {
      const activeLoc = await resolveActiveLocation({ allowGpsDetect: false });
      if (activeLoc?.fullAddress) {
        setCurrentLocation(activeLoc.fullAddress);
        return activeLoc;
      }
    } catch {
      // fallback
    }
    setCurrentLocation(DEFAULT_LOCATION.fullAddress);
    return DEFAULT_LOCATION;
  };

  const loadHomeData = async (
    locationOverride?:
      | {
          city?: string;
          locality?: string;
          zoneId?: string;
          lat?: number;
          lng?: number;
          mode?: 'nearby' | 'job';
        }
      | string
  ) => {
    try {
      setLoading(true);
      let locParams: {
        city?: string;
        locality?: string;
        zoneId?: string;
        lat?: number;
        lng?: number;
        mode?: 'nearby' | 'job';
      } = {};

      if (typeof locationOverride === 'string') {
        locParams.city = locationOverride;
      } else if (locationOverride) {
        locParams = { ...locationOverride };
      } else {
        const stored = await getStoredLocation(false);
        if (stored) {
          locParams.city = stored.city || 'Lucknow';
          locParams.locality = stored.locality;
          locParams.lat = stored.coordinates?.lat;
          locParams.lng = stored.coordinates?.lng;
          locParams.zoneId = (stored as any).zoneId;
          locParams.mode = (stored as any).mode || 'nearby';
        }
      }

      const city = locParams.city || currentLocation.split(',')[0].trim() || 'Lucknow';

      const [catRes, bookRes, vendorRes, notifRes, servicesRes] = await Promise.all([
        api.categories.getAll().catch(() => ({ categories: [] })),
        user ? api.bookings.getMyBookings().catch(() => ({ bookings: [] })) : Promise.resolve({ bookings: [] }),
        api.vendors.getVendors({
          city,
          locality: locParams.locality,
          zoneId: locParams.zoneId,
          lat: locParams.lat,
          lng: locParams.lng,
          mode: locParams.mode,
          limit: 12
        }).catch(() => ({ vendors: [] })),
        user ? api.notifications.getUnreadCount().catch(() => ({ count: 0, unreadCount: 0 })) : Promise.resolve({ count: 0, unreadCount: 0 }),
        api.services.getServices({ limit: 10 }).catch(() => ({ services: [] }))
      ]);

      if (catRes?.categories && catRes.categories.length > 0) {
        setCategories(catRes.categories);
      }
      if (bookRes?.bookings) {
        setActiveBookings(bookRes.bookings.filter((b) => b.status !== 'completed' && b.status !== 'cancelled'));
      }
      let loadedVendors = (vendorRes?.vendors && vendorRes.vendors.length > 0) ? vendorRes.vendors : [];
      if (loadedVendors.length === 0) {
        try {
          const fallbackRes = await api.vendors.getVendors({ limit: 12 });
          if (fallbackRes?.vendors && fallbackRes.vendors.length > 0) {
            loadedVendors = fallbackRes.vendors;
          }
        } catch {
          // ignore
        }
      }
      if (loadedVendors.length > 0) {
        setNearbyVendors(loadedVendors);
      }
      if (servicesRes?.services && servicesRes.services.length > 0) {
        setPublishedServices(servicesRes.services);
      }
      const unread = typeof notifRes?.unreadCount === 'number'
        ? notifRes.unreadCount
        : (typeof notifRes?.count === 'number' ? notifRes.count : 0);
      setUnreadNotifications(unread);
    } catch (err) {
      console.warn('Failed to load live home data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    api.cache?.clear?.();
    const activeLoc = await restoreLocation();
    await loadHomeData({
      city: activeLoc.city || 'Lucknow',
      locality: activeLoc.locality,
      zoneId: activeLoc.zoneId,
      lat: activeLoc.coordinates?.lat,
      lng: activeLoc.coordinates?.lng,
      mode: 'nearby'
    });
  };

  const handleLocationSelected = async (
    loc: string,
    details?: ServiceAddress & { mode?: 'nearby' | 'job'; zoneId?: string; zoneName?: string }
  ) => {
    setCurrentLocation(loc);
    await saveLocation(loc, { ...details, isExplicit: true });
    loadHomeData({
      city: details?.city || loc.split(',')[0].trim(),
      locality: details?.locality || details?.street,
      zoneId: details?.zoneId,
      lat: details?.coordinates?.lat,
      lng: details?.coordinates?.lng,
      mode: details?.mode || 'nearby'
    });
  };

  const handleSearchSubmit = () => {
    if (searchQuery.trim().length > 0) {
      navigation.navigate('SearchTab', { search: searchQuery.trim() });
    } else {
      navigation.navigate('SearchTab');
    }
  };

  const toggleFavorite = (vendorId: string) => {
    setFavoritedVendors((prev) => ({
      ...prev,
      [vendorId]: !prev[vendorId]
    }));
  };

  const currentCity = currentLocation.split(',')[0].trim() || 'Lucknow';

  return (
    <View style={styles.screenWrapper}>
      <StatusBar barStyle="dark-content" />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[COLORS.primary]} />}
        showsVerticalScrollIndicator={false}
      >
        {/* ════════════════════════════════════════════════════════════════════
            1. COMPACT TOP HEADER (Matching Screenshot 5)
        ════════════════════════════════════════════════════════════════════ */}
        <View style={[styles.compactHeader, { paddingTop: topInset + 6 }]}>
          {/* Logo & Brand Name */}
          <View style={styles.brandContainer}>
            <View style={styles.logoEmblem}>
              <Ionicons name="home" size={13} color="#2563EB" />
              <View style={styles.logoPinDot} />
            </View>
            <Text style={styles.brandTitleText}>WorkLogy</Text>
          </View>

          {/* Right Action Icons: Notification Bell with Badge & User Avatar */}
          <View style={styles.headerIconsRow}>
            <TouchableOpacity
              style={styles.iconCircleButton}
              activeOpacity={0.7}
              onPress={() => navigation.navigate('Notifications')}
            >
              <Ionicons name="notifications-outline" size={20} color="#0F172A" />
              {unreadNotifications > 0 && (
                <View style={styles.notificationBadge}>
                  <Text style={styles.notificationBadgeText}>
                    {unreadNotifications > 9 ? '9+' : unreadNotifications}
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.avatarCircleButton}
              activeOpacity={0.7}
              onPress={() => navigation.navigate('ProfileTab')}
            >
              {user?.avatar && user.avatar.startsWith('http') ? (
                <Image source={{ uri: user.avatar }} style={styles.headerAvatarImg} />
              ) : (
                <Ionicons name="person-outline" size={18} color="#0F172A" />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* ════════════════════════════════════════════════════════════════════
            2. SERVICE LOCATION SELECTOR PILL
        ════════════════════════════════════════════════════════════════════ */}
        <TouchableOpacity
          style={styles.locationSelectorRow}
          onPress={() => setShowLocationModal(true)}
          activeOpacity={0.8}
        >
          <View style={styles.locationLeftGroup}>
            <Ionicons name="location-sharp" size={15} color="#10B981" />
            <Text style={styles.locationCityText} numberOfLines={1}>
              {currentLocation}
            </Text>
          </View>
          <View style={styles.locationChangePill}>
            <Text style={styles.locationChangePillText}>Change ▾</Text>
          </View>
        </TouchableOpacity>

        {/* ════════════════════════════════════════════════════════════════════
            3. PROMINENT SEARCH INPUT WITH FILTER ACTION (Matching Screenshot 5)
        ════════════════════════════════════════════════════════════════════ */}
        <View style={styles.searchBarContainer}>
          <Ionicons name="search" size={18} color="#64748B" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search services, experts near me..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearchSubmit}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={{ marginRight: 6 }}>
              <Ionicons name="close-circle" size={18} color="#94A3B8" />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.filterSquareButton}
            onPress={() => navigation.navigate('SearchTab')}
            activeOpacity={0.75}
          >
            <Ionicons name="options-outline" size={17} color="#2563EB" />
          </TouchableOpacity>
        </View>

        {/* ════════════════════════════════════════════════════════════════════
            ACTIVE SERVICE ORDERS BANNER & ARRIVAL OTP (When Booking is Active)
        ════════════════════════════════════════════════════════════════════ */}
        {activeBookings.length > 0 && (
          <View style={styles.activeOrdersSection}>
            <View style={styles.activeHeaderRow}>
              <View style={styles.livePulseDot} />
              <Text style={styles.activeHeading}>Active Booking in Progress</Text>
              <TouchableOpacity onPress={() => navigation.navigate('MyJobs')} style={{ marginLeft: 'auto' }}>
                <Text style={styles.activeViewLink}>View All ({activeBookings.length}) ›</Text>
              </TouchableOpacity>
            </View>

            {activeBookings.slice(0, 1).map((booking) => (
              <TouchableOpacity
                key={booking._id}
                style={styles.activeBookingCard}
                onPress={() => navigation.navigate('JobDetail', {
                  bookingId: booking._id,
                  jobId: booking.jobId || booking._id,
                  id: booking._id,
                  bookingReference: booking.bookingReference
                })}
                activeOpacity={0.88}
              >
                <View style={styles.activeTopRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.activeBookingTitle} numberOfLines={1}>{booking.serviceTitle}</Text>
                    <Text style={styles.activeBookingDate}>📅 {formatDate(booking.scheduledDate || booking.createdAt)}</Text>
                  </View>
                  <View style={[styles.statusTag, { backgroundColor: getStatusColor(booking.status) + '15' }]}>
                    <Text style={[styles.statusTagText, { color: getStatusColor(booking.status) }]}>
                      {formatStatusText(booking.status)}
                    </Text>
                  </View>
                </View>

                {/* 6-Digit Cryptographic Arrival OTP Display */}
                {booking.arrivalOtp && !booking.isOtpVerified && (
                  <View style={styles.otpBannerBox}>
                    <View style={styles.otpTagRow}>
                      <Ionicons name="shield-checkmark" size={13} color="#065F46" />
                      <Text style={styles.otpTagText}>ARRIVAL SECURITY PIN (OTP)</Text>
                    </View>
                    <Text style={styles.otpDigitsDisplay}>{booking.arrivalOtp}</Text>
                    <Text style={styles.otpInstructionText}>
                      Share in person only when technician physically arrives at your doorstep.
                    </Text>
                  </View>
                )}

                <View style={styles.activeFooterRow}>
                  <Text style={styles.activePriceText}>{formatCurrency(booking.totalAmount)}</Text>
                  <View style={styles.trackTechnicianPill}>
                    <Text style={styles.trackTechnicianText}>Track Details ›</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* ════════════════════════════════════════════════════════════════════
            4. 3x3 SERVICE CATEGORY IMAGE GRID (Matching Screenshot 5)
        ════════════════════════════════════════════════════════════════════ */}
        <View style={styles.categoryGridSection}>
          <View style={styles.gridContainer}>
            {GRID_CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                style={styles.gridItem}
                activeOpacity={0.8}
                onPress={() => {
                  if (cat.isMore) {
                    navigation.navigate('SearchTab');
                  } else {
                    navigation.navigate('CategoryDetail', { slug: cat.slug, name: cat.name });
                  }
                }}
              >
                <View style={styles.gridImageWrapper}>
                  <Image source={cat.image} style={styles.gridImage} resizeMode="cover" />
                </View>
                <Text style={styles.gridLabel} numberOfLines={1}>{cat.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ════════════════════════════════════════════════════════════════════
            5. PROMOTIONAL SERVICE BANNER CAROUSEL (Matching Screenshot 5)
        ════════════════════════════════════════════════════════════════════ */}
        <View style={styles.promoCarouselContainer}>
          <ScrollView
            ref={promoScrollRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            decelerationRate="fast"
            snapToInterval={BANNER_WIDTH + 12}
            snapToAlignment="center"
            contentContainerStyle={styles.promoScrollContent}
            onMomentumScrollEnd={(e) => {
              const offsetX = e.nativeEvent.contentOffset.x;
              const index = Math.round(offsetX / (BANNER_WIDTH + 12));
              setActivePromoIndex(index);
            }}
          >
            {PROMO_SLIDES.map((slide) => (
              <View
                key={slide.id}
                style={[
                  styles.promoBannerCard,
                  { backgroundColor: slide.bgTint, borderColor: slide.borderTint, width: BANNER_WIDTH }
                ]}
              >
                <View style={styles.promoContentLeft}>
                  <View style={[styles.promoBadge, { backgroundColor: slide.badgeBg }]}>
                    <Ionicons name="shield-checkmark" size={11} color={slide.badgeColor} />
                    <Text style={[styles.promoBadgeText, { color: slide.badgeColor }]}>{slide.badge}</Text>
                  </View>
                  <Text style={styles.promoHeading}>{slide.title}</Text>
                  <Text style={styles.promoSubtitle}>{slide.subtitle}</Text>
                  <TouchableOpacity
                    style={[styles.promoCtaBtn, { backgroundColor: slide.btnBg }]}
                    activeOpacity={0.85}
                    onPress={() => navigation.navigate('CreateJob', { categorySlug: slide.categorySlug, title: slide.title })}
                  >
                    <Text style={styles.promoCtaText}>{slide.ctaText}</Text>
                    <Ionicons name="arrow-forward" size={14} color="#FFFFFF" style={{ marginLeft: 4 }} />
                  </TouchableOpacity>
                </View>
                <View style={styles.promoImageRight}>
                  <Image source={slide.image} style={styles.promoHeroImage} resizeMode="cover" />
                </View>
              </View>
            ))}
          </ScrollView>

          {/* Pagination Indicators */}
          <View style={styles.paginationDotsRow}>
            {PROMO_SLIDES.map((_, idx) => (
              <View
                key={idx}
                style={[
                  styles.paginationDot,
                  activePromoIndex === idx ? styles.paginationDotActive : styles.paginationDotInactive
                ]}
              />
            ))}
          </View>
        </View>

        {/* ════════════════════════════════════════════════════════════════════
            6. POPULAR SERVICES (Horizontal Carousel - Matching Screenshot 4 & 5)
        ════════════════════════════════════════════════════════════════════ */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Popular Services</Text>
              <Text style={styles.sectionSubtitle}>Most requested home services in {currentCity}</Text>
            </View>
            <TouchableOpacity onPress={() => navigation.navigate('SearchTab')} activeOpacity={0.7}>
              <View style={styles.seeAllPill}>
                <Text style={styles.seeAllText}>See all</Text>
                <Ionicons name="chevron-forward" size={12} color="#0F172A" />
              </View>
            </TouchableOpacity>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalCardList}
          >
            {publishedServices.length > 0 ? (
              publishedServices.map((srv) => (
                <TouchableOpacity
                  key={srv._id}
                  style={styles.serviceCard}
                  activeOpacity={0.85}
                  onPress={() => navigation.navigate('CreateJob', {
                    categorySlug: srv.category?.slug,
                    title: srv.title,
                    serviceId: srv._id
                  })}
                >
                  <Image
                    source={getServiceImage(srv.category?.slug || 'electrical-services')}
                    style={styles.serviceCardThumb}
                  />
                  <View style={styles.serviceCardBody}>
                    <Text style={styles.serviceCategoryTag} numberOfLines={1}>
                      {(srv.category?.name || srv.categoryName || 'TRADE').toUpperCase()}
                    </Text>
                    <Text style={styles.serviceCardTitle} numberOfLines={1}>
                      {srv.title}
                    </Text>
                    <View style={styles.ratingRow}>
                      <Text style={styles.ratingStar}>★</Text>
                      <Text style={styles.ratingText}>
                        {srv.vendor?.rating ? srv.vendor.rating.toFixed(1) : '5.0'}
                        <Text style={styles.reviewCount}> ({srv.vendor?.reviewCount || 12})</Text>
                      </Text>
                    </View>
                    <Text style={styles.servicePrice}>
                      ₹{srv.pricing?.amount || srv.price || 499} onwards
                    </Text>
                  </View>
                </TouchableOpacity>
              ))
            ) : (
              <>
                {/* Fallback canonical service items */}
                <TouchableOpacity
                  style={styles.serviceCard}
                  activeOpacity={0.85}
                  onPress={() => navigation.navigate('CreateJob', { categorySlug: 'carpentry-furniture', title: 'Lucknow Carpenter Expert' })}
                >
                  <Image source={require('../assets/services/Skilled Handyman Repairing a Wooden Cabinet.png')} style={styles.serviceCardThumb} />
                  <View style={styles.serviceCardBody}>
                    <Text style={styles.serviceCategoryTag}>CARPENTER</Text>
                    <Text style={styles.serviceCardTitle} numberOfLines={1}>{currentCity} Carpenter Ex...</Text>
                    <View style={styles.ratingRow}>
                      <Text style={styles.ratingStar}>★</Text>
                      <Text style={styles.ratingText}>4.8 <Text style={styles.reviewCount}>(42)</Text></Text>
                    </View>
                    <Text style={styles.servicePrice}>₹249 onwards</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.serviceCard}
                  activeOpacity={0.85}
                  onPress={() => navigation.navigate('CreateJob', { categorySlug: 'home-cleaning', title: 'Lucknow Cleaner Expert' })}
                >
                  <Image source={require('../assets/services/Professional Cleaning in a Bright Living Room.png')} style={styles.serviceCardThumb} />
                  <View style={styles.serviceCardBody}>
                    <Text style={styles.serviceCategoryTag}>CLEANER</Text>
                    <Text style={styles.serviceCardTitle} numberOfLines={1}>{currentCity} Cleaner Exper...</Text>
                    <View style={styles.ratingRow}>
                      <Text style={styles.ratingStar}>★</Text>
                      <Text style={styles.ratingText}>4.8 <Text style={styles.reviewCount}>(42)</Text></Text>
                    </View>
                    <Text style={styles.servicePrice}>₹249 onwards</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.serviceCard}
                  activeOpacity={0.85}
                  onPress={() => navigation.navigate('CreateJob', { categorySlug: 'ac-hvac-services', title: 'AC Jet Servicing & Foam Wash' })}
                >
                  <Image source={require('../assets/services/Air Conditioner Maintenance in a Modern Home.png')} style={styles.serviceCardThumb} />
                  <View style={styles.serviceCardBody}>
                    <Text style={styles.serviceCategoryTag}>AC & APPLIANCE</Text>
                    <Text style={styles.serviceCardTitle} numberOfLines={1}>AC Jet Deep Cleaning</Text>
                    <View style={styles.ratingRow}>
                      <Text style={styles.ratingStar}>★</Text>
                      <Text style={styles.ratingText}>4.9 <Text style={styles.reviewCount}>(118)</Text></Text>
                    </View>
                    <Text style={styles.servicePrice}>₹499 onwards</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.serviceCard}
                  activeOpacity={0.85}
                  onPress={() => navigation.navigate('CreateJob', { categorySlug: 'electrical-services', title: 'Electrical Panel & Fan Repair' })}
                >
                  <Image source={require('../assets/services/Electrician Repairing Home Electrical Panel.png')} style={styles.serviceCardThumb} />
                  <View style={styles.serviceCardBody}>
                    <Text style={styles.serviceCategoryTag}>ELECTRICIAN</Text>
                    <Text style={styles.serviceCardTitle} numberOfLines={1}>Switchboard Repair</Text>
                    <View style={styles.ratingRow}>
                      <Text style={styles.ratingStar}>★</Text>
                      <Text style={styles.ratingText}>4.8 <Text style={styles.reviewCount}>(96)</Text></Text>
                    </View>
                    <Text style={styles.servicePrice}>₹199 onwards</Text>
                  </View>
                </TouchableOpacity>
              </>
            )}
          </ScrollView>
        </View>

        {/* ════════════════════════════════════════════════════════════════════
            7. SAME-DAY SERVICE BANNER (Dark Navy - Matching Screenshot 4)
        ════════════════════════════════════════════════════════════════════ */}
        <View style={styles.sameDayBannerContainer}>
          <View style={styles.sameDayCard}>
            <View style={styles.sameDayLeft}>
              <View style={styles.sameDayBadge}>
                <Ionicons name="sparkles" size={11} color="#F59E0B" />
                <Text style={styles.sameDayBadgeText}>SAME DAY SERVICE</Text>
              </View>
              <Text style={styles.sameDayHeading}>Need help today?</Text>
              <Text style={styles.sameDaySubtitle}>
                Book a verified professional near you in under 2 minutes.
              </Text>
              <TouchableOpacity
                style={styles.sameDayButton}
                activeOpacity={0.85}
                onPress={() => navigation.navigate('CreateJob', { urgency: 'high', title: 'Same-Day Urgent Home Service' })}
              >
                <Text style={styles.sameDayButtonText}>Book now</Text>
                <Ionicons name="arrow-forward" size={13} color="#FFFFFF" style={{ marginLeft: 4 }} />
              </TouchableOpacity>
            </View>
            <View style={styles.sameDayRight}>
              <Image source={require('../assets/services/SmilingHomepage.png')} style={styles.sameDayTechnicianPhoto} resizeMode="cover" />
            </View>
          </View>
        </View>

        {/* ════════════════════════════════════════════════════════════════════
            8. NEW & NOTEWORTHY (Horizontal Carousel - Matching Screenshot 4)
        ════════════════════════════════════════════════════════════════════ */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>New & noteworthy</Text>
              <Text style={styles.sectionSubtitle}>Newly launched services & trending fixes</Text>
            </View>
            <TouchableOpacity onPress={() => navigation.navigate('SearchTab')} activeOpacity={0.7}>
              <View style={styles.seeAllPill}>
                <Text style={styles.seeAllText}>See all</Text>
                <Ionicons name="chevron-forward" size={12} color="#0F172A" />
              </View>
            </TouchableOpacity>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalCardList}>
            {/* Item 1: Full House Deep Cleaning */}
            <TouchableOpacity
              style={styles.noteworthyCard}
              activeOpacity={0.85}
              onPress={() => navigation.navigate('CreateJob', { categorySlug: 'home-cleaning', title: 'Full House Deep Cleaning' })}
            >
              <View style={styles.noteworthyImageContainer}>
                <Image source={require('../assets/services/Professional Cleaning in a Bright Living Room.png')} style={styles.noteworthyThumb} />
                <View style={styles.tagOverlay}>
                  <Text style={styles.tagOverlayText}>NEW</Text>
                </View>
              </View>
              <View style={styles.noteworthyBody}>
                <Text style={styles.noteworthyTitle} numberOfLines={1}>Full House Deep Cleani...</Text>
                <Text style={styles.noteworthyDesc} numberOfLines={1}>Includes 3 rooms + hall</Text>
                <Text style={styles.noteworthyPrice}>₹1,499 onwards</Text>
              </View>
            </TouchableOpacity>

            {/* Item 2: Kitchen Chimney Service */}
            <TouchableOpacity
              style={styles.noteworthyCard}
              activeOpacity={0.85}
              onPress={() => navigation.navigate('CreateJob', { categorySlug: 'appliance-repair', title: 'Kitchen Chimney Servicing' })}
            >
              <View style={styles.noteworthyImageContainer}>
                <Image source={require('../assets/services/Modern Kitchen Consultation.png')} style={styles.noteworthyThumb} />
                <View style={styles.tagOverlay}>
                  <Text style={styles.tagOverlayText}>POPULAR</Text>
                </View>
              </View>
              <View style={styles.noteworthyBody}>
                <Text style={styles.noteworthyTitle} numberOfLines={1}>Kitchen Chimney Servi...</Text>
                <Text style={styles.noteworthyDesc} numberOfLines={1}>Foam wash + motor check</Text>
                <Text style={styles.noteworthyPrice}>₹499 onwards</Text>
              </View>
            </TouchableOpacity>

            {/* Item 3: Smart Door Lock Install */}
            <TouchableOpacity
              style={styles.noteworthyCard}
              activeOpacity={0.85}
              onPress={() => navigation.navigate('CreateJob', { categorySlug: 'home-installation', title: 'Smart Door Lock Installation' })}
            >
              <View style={styles.noteworthyImageContainer}>
                <Image source={require('../assets/services/Indian Locksmith Repairing Door Lock.png')} style={styles.noteworthyThumb} />
                <View style={styles.tagOverlay}>
                  <Text style={styles.tagOverlayText}>TRENDING</Text>
                </View>
              </View>
              <View style={styles.noteworthyBody}>
                <Text style={styles.noteworthyTitle} numberOfLines={1}>Smart Digital Door Lock</Text>
                <Text style={styles.noteworthyDesc} numberOfLines={1}>Installation & Setup</Text>
                <Text style={styles.noteworthyPrice}>₹799 onwards</Text>
              </View>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* ════════════════════════════════════════════════════════════════════
            9. MOST BOOKED SERVICES (Horizontal Carousel - Matching Screenshot 3)
        ════════════════════════════════════════════════════════════════════ */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Most booked services</Text>
              <Text style={styles.sectionSubtitle}>Highest rated services booked by homeowners</Text>
            </View>
            <TouchableOpacity onPress={() => navigation.navigate('SearchTab')} activeOpacity={0.7}>
              <View style={styles.seeAllPill}>
                <Text style={styles.seeAllText}>See all</Text>
                <Ionicons name="chevron-forward" size={12} color="#0F172A" />
              </View>
            </TouchableOpacity>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalCardList}>
            <TouchableOpacity
              style={styles.serviceCard}
              activeOpacity={0.85}
              onPress={() => navigation.navigate('CreateJob', { categorySlug: 'ac-hvac-services', title: 'AC Servicing & Jet Wash' })}
            >
              <Image source={require('../assets/services/Air Conditioner Maintenance in a Modern Home.png')} style={styles.serviceCardThumb} />
              <View style={styles.serviceCardBody}>
                <Text style={styles.serviceCardTitle} numberOfLines={1}>AC Servicing & Jet Wash</Text>
                <View style={styles.ratingRow}>
                  <Text style={styles.ratingStar}>★</Text>
                  <Text style={styles.ratingText}>4.8 <Text style={styles.reviewCount}>(1.2k)</Text></Text>
                </View>
                <Text style={styles.servicePrice}>₹299 onwards</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.serviceCard}
              activeOpacity={0.85}
              onPress={() => navigation.navigate('CreateJob', { categorySlug: 'plumbing-services', title: 'Kitchen Plumbing Fixes' })}
            >
              <Image source={require('../assets/services/Plumber Repairing Under Kitchen Sink.png')} style={styles.serviceCardThumb} />
              <View style={styles.serviceCardBody}>
                <Text style={styles.serviceCardTitle} numberOfLines={1}>Kitchen Plumbing Fixes</Text>
                <View style={styles.ratingRow}>
                  <Text style={styles.ratingStar}>★</Text>
                  <Text style={styles.ratingText}>4.7 <Text style={styles.reviewCount}>(980)</Text></Text>
                </View>
                <Text style={styles.servicePrice}>₹249 onwards</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.serviceCard}
              activeOpacity={0.85}
              onPress={() => navigation.navigate('CreateJob', { categorySlug: 'electrical-services', title: 'Electrician Panel Diagnostics' })}
            >
              <Image source={require('../assets/services/Electrician Repairing Home Electrical Panel.png')} style={styles.serviceCardThumb} />
              <View style={styles.serviceCardBody}>
                <Text style={styles.serviceCardTitle} numberOfLines={1}>Electrician Diagnostics</Text>
                <View style={styles.ratingRow}>
                  <Text style={styles.ratingStar}>★</Text>
                  <Text style={styles.ratingText}>4.9 <Text style={styles.reviewCount}>(1.4k)</Text></Text>
                </View>
                <Text style={styles.servicePrice}>₹199 onwards</Text>
              </View>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* ════════════════════════════════════════════════════════════════════
            10. 24/7 EMERGENCY ASSISTANCE (Red Card - Matching Screenshot 3)
        ════════════════════════════════════════════════════════════════════ */}
        <View style={styles.emergencyCardContainer}>
          <View style={styles.emergencyCard}>
            <View style={styles.emergencyPillBadge}>
              <Ionicons name="shield-checkmark" size={12} color="#DC2626" />
              <Text style={styles.emergencyPillText}>24/7 EMERGENCY ASSISTANCE</Text>
            </View>
            <Text style={styles.emergencyTitleText}>Need help right now?</Text>
            <Text style={styles.emergencySubtitleText}>
              Find verified technicians nearby who can arrive at your doorstep immediately.
            </Text>
            <TouchableOpacity
              style={styles.emergencyRedBtn}
              activeOpacity={0.85}
              onPress={() => navigation.navigate('Emergency')}
            >
              <Text style={styles.emergencyRedBtnText}>Find Available Pros Now</Text>
              <Ionicons name="arrow-forward" size={15} color="#FFFFFF" style={{ marginLeft: 6 }} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ════════════════════════════════════════════════════════════════════
            11. FEATURED PROFESSIONALS (Horizontal Cards - Matching Screenshot 2 & 3)
        ════════════════════════════════════════════════════════════════════ */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Featured professionals</Text>
              <Text style={styles.sectionSubtitle}>Top-rated & verified experts near you</Text>
            </View>
            <TouchableOpacity onPress={() => navigation.navigate('SearchTab')} activeOpacity={0.7}>
              <View style={styles.seeAllPill}>
                <Text style={styles.seeAllText}>See all</Text>
                <Ionicons name="chevron-forward" size={12} color="#0F172A" />
              </View>
            </TouchableOpacity>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalCardList}>
            {(nearbyVendors.length > 0 ? nearbyVendors : VERIFIED_FALLBACK_PROS).map((pro) => (
              <TouchableOpacity
                key={pro._id}
                style={styles.proCard}
                activeOpacity={0.9}
                onPress={() => navigation.navigate('ProfessionalProfile', { vendorId: pro._id, vendor: pro })}
              >
                <View style={styles.proCardHeader}>
                  <View style={styles.proAvatarContainer}>
                    <View style={styles.proAvatarCircle}>
                      <Text style={styles.proAvatarText}>
                        {(pro.businessName || pro.name || 'P').charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    {(pro.verifiedBadge?.status === 'verified' || pro.verifiedBadge?.status === 'approved' || (pro as any).isVerified) && (
                      <View style={styles.verifiedCheckBadge}>
                        <Ionicons name="checkmark" size={10} color="#FFFFFF" />
                      </View>
                    )}
                  </View>

                  <View style={styles.proHeaderRight}>
                    {pro.isNearest ? (
                      <View style={styles.nearestBadge}>
                        <Ionicons name="sparkles" size={10} color="#065F46" />
                        <Text style={styles.nearestBadgeText}>Nearest</Text>
                      </View>
                    ) : (
                      <View style={styles.availablePill}>
                        <View style={styles.availableDot} />
                        <Text style={styles.availableText}>Available Now</Text>
                      </View>
                    )}
                    <TouchableOpacity
                      onPress={(e) => {
                        e.stopPropagation?.();
                        toggleFavorite(pro._id);
                      }}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      style={{ marginLeft: 8 }}
                    >
                      <Ionicons
                        name={favoritedVendors[pro._id] ? 'heart' : 'heart-outline'}
                        size={19}
                        color={favoritedVendors[pro._id] ? '#EF4444' : '#94A3B8'}
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                <Text style={styles.proBusinessName} numberOfLines={1}>{pro.businessName || pro.name}</Text>
                
                <View style={styles.proCategoryPill}>
                  <Text style={styles.proCategoryText}>{pro.categories?.[0]?.name || 'Professional'}</Text>
                </View>

                <Text style={styles.proMetaStats}>
                  ★ {pro.rating ? pro.rating.toFixed(1) : '5.0'} ({pro.reviewCount ?? 0}) • {pro.experienceYears || 3} yrs exp
                </Text>

                <View style={styles.proDistanceRow}>
                  <Ionicons name="navigate-circle" size={13} color="#059669" />
                  <Text style={styles.proDistanceText} numberOfLines={1}>
                    {pro.distanceText || (pro.locality ? `${pro.locality} • ${pro.city || currentCity}` : pro.city || currentCity)}
                  </Text>
                </View>

                {pro.zoneId ? (
                  <View style={styles.proZoneBadge}>
                    <Text style={styles.proZoneBadgeText}>{pro.zoneId} • {pro.locality || pro.zoneName || 'Lucknow'}</Text>
                  </View>
                ) : null}

                <View style={styles.proCardDivider} />

                <Text style={styles.proStartingLabel}>Starting from</Text>
                <Text style={styles.proStartingPrice}>₹{pro.hourlyRate || 299} onwards</Text>

                <TouchableOpacity
                  style={styles.proBookButton}
                  onPress={() => navigation.navigate('ProfessionalProfile', { vendorId: pro._id, vendor: pro })}
                  activeOpacity={0.8}
                >
                  <Text style={styles.proBookButtonText}>View Services & Book</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* ════════════════════════════════════════════════════════════════════
            12. CLEANING ESSENTIALS (Horizontal Carousel - Matching Screenshot 2)
        ════════════════════════════════════════════════════════════════════ */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Cleaning Essentials</Text>
              <Text style={styles.sectionSubtitle}>Top rated home hygiene & deep wash</Text>
            </View>
            <TouchableOpacity onPress={() => navigation.navigate('CategoryDetail', { slug: 'home-cleaning', name: 'Cleaning' })} activeOpacity={0.7}>
              <View style={styles.seeAllPill}>
                <Text style={styles.seeAllText}>See all</Text>
                <Ionicons name="chevron-forward" size={12} color="#0F172A" />
              </View>
            </TouchableOpacity>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalCardList}>
            <TouchableOpacity
              style={styles.serviceCard}
              activeOpacity={0.85}
              onPress={() => navigation.navigate('CreateJob', { categorySlug: 'home-cleaning', title: 'Furnished Apartment Cleaning' })}
            >
              <Image source={require('../assets/services/Professional Cleaning in a Bright Living Room.png')} style={styles.serviceCardThumb} />
              <View style={styles.serviceCardBody}>
                <Text style={styles.serviceCardTitle} numberOfLines={1}>Furnished Apartment Cleaning</Text>
                <View style={styles.ratingRow}>
                  <Text style={styles.ratingStar}>★</Text>
                  <Text style={styles.ratingText}>4.8 <Text style={styles.reviewCount}>(720)</Text></Text>
                </View>
                <Text style={styles.servicePrice}>₹2,299 onwards</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.serviceCard}
              activeOpacity={0.85}
              onPress={() => navigation.navigate('CreateJob', { categorySlug: 'home-cleaning', title: 'Unfurnished Apartment Deep Clean' })}
            >
              <Image source={require('../assets/services/Tiling a Bright Modern Interior.png')} style={styles.serviceCardThumb} />
              <View style={styles.serviceCardBody}>
                <Text style={styles.serviceCardTitle} numberOfLines={1}>Unfurnished Apartment Deep Clean</Text>
                <View style={styles.ratingRow}>
                  <Text style={styles.ratingStar}>★</Text>
                  <Text style={styles.ratingText}>4.7 <Text style={styles.reviewCount}>(510)</Text></Text>
                </View>
                <Text style={styles.servicePrice}>₹1,799 onwards</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.serviceCard}
              activeOpacity={0.85}
              onPress={() => navigation.navigate('CreateJob', { categorySlug: 'home-cleaning', title: 'Sofa & Carpet Deep Shampoo' })}
            >
              <Image source={require('../assets/services/Installing Curtains in a Bright Modern Room.png')} style={styles.serviceCardThumb} />
              <View style={styles.serviceCardBody}>
                <Text style={styles.serviceCardTitle} numberOfLines={1}>Sofa & Carpet Shampoo</Text>
                <View style={styles.ratingRow}>
                  <Text style={styles.ratingStar}>★</Text>
                  <Text style={styles.ratingText}>4.9 <Text style={styles.reviewCount}>(930)</Text></Text>
                </View>
                <Text style={styles.servicePrice}>₹599 onwards</Text>
              </View>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* ════════════════════════════════════════════════════════════════════
            13. APPLIANCE REPAIR & SERVICE (Horizontal Carousel - Matching Screenshot 2)
        ════════════════════════════════════════════════════════════════════ */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Appliance Repair & Service</Text>
              <Text style={styles.sectionSubtitle}>Doorstep troubleshooting by specialists</Text>
            </View>
            <TouchableOpacity onPress={() => navigation.navigate('CategoryDetail', { slug: 'appliance-repair', name: 'Appliances' })} activeOpacity={0.7}>
              <View style={styles.seeAllPill}>
                <Text style={styles.seeAllText}>See all</Text>
                <Ionicons name="chevron-forward" size={12} color="#0F172A" />
              </View>
            </TouchableOpacity>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalCardList}>
            <TouchableOpacity
              style={styles.serviceCard}
              activeOpacity={0.85}
              onPress={() => navigation.navigate('CreateJob', { categorySlug: 'home-installation', title: 'TV Check-up & Installation' })}
            >
              <Image source={require('../assets/services/TV Installation with Spirit Level.png')} style={styles.serviceCardThumb} />
              <View style={styles.serviceCardBody}>
                <Text style={styles.serviceCardTitle} numberOfLines={1}>TV Check-up & Installation</Text>
                <View style={styles.ratingRow}>
                  <Text style={styles.ratingStar}>★</Text>
                  <Text style={styles.ratingText}>4.7 <Text style={styles.reviewCount}>(1.1k)</Text></Text>
                </View>
                <Text style={styles.servicePrice}>₹249 onwards</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.serviceCard}
              activeOpacity={0.85}
              onPress={() => navigation.navigate('CreateJob', { categorySlug: 'appliance-repair', title: 'Deep Chimney Service' })}
            >
              <Image source={require('../assets/services/Modern Kitchen Consultation.png')} style={styles.serviceCardThumb} />
              <View style={styles.serviceCardBody}>
                <Text style={styles.serviceCardTitle} numberOfLines={1}>Deep Chimney Service</Text>
                <View style={styles.ratingRow}>
                  <Text style={styles.ratingStar}>★</Text>
                  <Text style={styles.ratingText}>4.8 <Text style={styles.reviewCount}>(890)</Text></Text>
                </View>
                <Text style={styles.servicePrice}>₹499 onwards</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.serviceCard}
              activeOpacity={0.85}
              onPress={() => navigation.navigate('CreateJob', { categorySlug: 'appliance-repair', title: 'Refrigerator Check & Gas Refill' })}
            >
              <Image source={require('../assets/services/Appliance Repair Workshop Scene.png')} style={styles.serviceCardThumb} />
              <View style={styles.serviceCardBody}>
                <Text style={styles.serviceCardTitle} numberOfLines={1}>Single/Double Refrigerator</Text>
                <View style={styles.ratingRow}>
                  <Text style={styles.ratingStar}>★</Text>
                  <Text style={styles.ratingText}>4.9 <Text style={styles.reviewCount}>(1.4k)</Text></Text>
                </View>
                <Text style={styles.servicePrice}>₹349 onwards</Text>
              </View>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* ════════════════════════════════════════════════════════════════════
            14. DIRECT QUOTATION BANNER (Dark Navy - Matching Screenshot 1)
        ════════════════════════════════════════════════════════════════════ */}
        <View style={styles.directQuoteContainer}>
          <View style={styles.directQuoteCard}>
            <View style={styles.quotePillBadge}>
              <Ionicons name="sparkles" size={11} color="#38BDF8" />
              <Text style={styles.quotePillText}>INSTANT DIRECT QUOTES</Text>
            </View>
            <Text style={styles.quoteHeading}>Can't find what you need?</Text>
            <Text style={styles.quoteSubtitle}>
              Post your job requirements in 30 seconds. Nearby verified local experts will contact you directly with exact pricing.
            </Text>
            <TouchableOpacity
              style={styles.quoteSubmitBtn}
              activeOpacity={0.85}
              onPress={() => navigation.navigate('CreateJob')}
            >
              <Text style={styles.quoteSubmitBtnText}>Post a Job Now</Text>
              <Ionicons name="arrow-forward" size={14} color="#FFFFFF" style={{ marginLeft: 6 }} />
            </TouchableOpacity>
          </View>
        </View>


        {/* ════════════════════════════════════════════════════════════════════
            16. FINAL CALL-TO-ACTION CARD (Matching Screenshot 1 Bottom)
        ════════════════════════════════════════════════════════════════════ */}
        <View style={styles.finalCtaContainer}>
          <View style={styles.finalCtaCard}>
            <Text style={styles.finalCtaTitle}>Ready to get your work done?</Text>
            <Text style={styles.finalCtaSubtitle}>
              Connect with {currentCity}'s top rated local technicians today.
            </Text>
            <TouchableOpacity
              style={styles.finalCtaButton}
              activeOpacity={0.85}
              onPress={() => navigation.navigate('CreateJob')}
            >
              <Ionicons name="add" size={17} color="#0F172A" style={{ marginRight: 4 }} />
              <Text style={styles.finalCtaButtonText}>Post a Job</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Location Selector Modal */}
      <LocationModal
        visible={showLocationModal}
        currentLocation={currentLocation}
        onClose={() => setShowLocationModal(false)}
        onSelectLocation={handleLocationSelected}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screenWrapper: {
    flex: 1,
    backgroundColor: '#F7F6F2'
  },
  container: {
    flex: 1
  },
  scrollContent: {
    paddingBottom: 20
  },

  // ── 1. Compact Header (Matching Screenshot 5) ──
  compactHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 8,
    backgroundColor: '#F7F6F2'
  },
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  logoEmblem: {
    width: 28,
    height: 28,
    borderRadius: 7,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#BAE6FD'
  },
  logoPinDot: {
    position: 'absolute',
    bottom: 2,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#0284C7'
  },
  brandTitleText: {
    fontSize: 21,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: 0.2
  },
  headerIconsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  iconCircleButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#EAE6DF',
    alignItems: 'center',
    justifyContent: 'center'
  },
  notificationBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#EF4444',
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: '#F7F6F2'
  },
  notificationBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900'
  },
  avatarCircleButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#EAE6DF',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden'
  },
  headerAvatarImg: {
    width: 38,
    height: 38,
    borderRadius: 19
  },

  // ── 2. Location Selector ──
  locationSelectorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 4,
    marginBottom: 8
  },
  locationLeftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flex: 1
  },
  locationCityText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155'
  },
  locationChangePill: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  locationChangePillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0F172A'
  },

  // ── 3. Search Bar with Filter (Matching Screenshot 5) ──
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 10 : 4,
    borderWidth: 1,
    borderColor: '#EFECE6',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    marginBottom: 16
  },
  searchIcon: {
    marginRight: 8
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: '#0F172A',
    paddingVertical: 6
  },
  filterSquareButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#F0F9FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E0F2FE'
  },

  // ── Active Booking Banner ──
  activeOrdersSection: {
    marginHorizontal: 16,
    marginBottom: 16
  },
  activeHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6
  },
  livePulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
    marginRight: 6
  },
  activeHeading: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A'
  },
  activeViewLink: {
    fontSize: 12,
    fontWeight: '700',
    color: '#086B52'
  },
  activeBookingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 2
  },
  activeTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start'
  },
  activeBookingTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A'
  },
  activeBookingDate: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2
  },
  statusTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6
  },
  statusTagText: {
    fontSize: 11,
    fontWeight: '800'
  },
  otpBannerBox: {
    backgroundColor: '#F0FDF4',
    borderRadius: 8,
    padding: 10,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#BBF7D0'
  },
  otpTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  otpTagText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#065F46'
  },
  otpDigitsDisplay: {
    fontSize: 22,
    fontWeight: '900',
    color: '#065F46',
    letterSpacing: 6,
    marginVertical: 4
  },
  otpInstructionText: {
    fontSize: 11,
    color: '#047857'
  },
  activeFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9'
  },
  activePriceText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A'
  },
  trackTechnicianPill: {
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  trackTechnicianText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#086B52'
  },

  // ── 4. 3x3 Service Category Grid (Matching Screenshot 5) ──
  categoryGridSection: {
    paddingHorizontal: 16,
    marginBottom: 16
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 12
  },
  gridItem: {
    width: '31%',
    alignItems: 'center'
  },
  gridImageWrapper: {
    width: '100%',
    height: 72,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#EAE6DF',
    borderWidth: 1,
    borderColor: '#EFECE6'
  },
  gridImage: {
    width: '100%',
    height: '100%'
  },
  gridLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 6,
    textAlign: 'center'
  },

  // ── 5. Promotional Service Banner (Matching Screenshot 5) ──
  promoCarouselContainer: {
    marginBottom: 22
  },
  promoScrollContent: {
    paddingHorizontal: 16,
    gap: 12
  },
  promoBannerCard: {
    borderRadius: 18,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    overflow: 'hidden',
    minHeight: 146
  },
  promoContentLeft: {
    flex: 1.1,
    paddingRight: 6
  },
  promoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    marginBottom: 6
  },
  promoBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.3
  },
  promoHeading: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0F172A',
    lineHeight: 20,
    marginBottom: 4
  },
  promoSubtitle: {
    fontSize: 11,
    fontWeight: '500',
    color: '#64748B',
    lineHeight: 15,
    marginBottom: 10
  },
  promoCtaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20
  },
  promoCtaText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800'
  },
  promoImageRight: {
    flex: 0.9,
    height: 120,
    borderRadius: 14,
    overflow: 'hidden'
  },
  promoHeroImage: {
    width: '100%',
    height: '100%'
  },
  paginationDotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    gap: 5
  },
  paginationDot: {
    height: 4,
    borderRadius: 2
  },
  paginationDotActive: {
    width: 20,
    backgroundColor: '#EA580C'
  },
  paginationDotInactive: {
    width: 6,
    backgroundColor: '#CBD5E1'
  },

  // ── Common Section Structure ──
  sectionContainer: {
    marginBottom: 22
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.2
  },
  sectionSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748B',
    marginTop: 1
  },
  seeAllPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 2
  },
  seeAllText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A'
  },
  horizontalCardList: {
    paddingHorizontal: 16,
    gap: 12
  },

  // ── Standard Service Card (Matching Screenshot 2, 3, 4, 5) ──
  serviceCard: {
    width: 190,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#EFECE6',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2
  },
  serviceCardThumb: {
    width: '100%',
    height: 120,
    backgroundColor: '#EAE6DF'
  },
  serviceCardBody: {
    padding: 10
  },
  serviceCategoryTag: {
    fontSize: 9,
    fontWeight: '900',
    color: '#64748B',
    letterSpacing: 0.5,
    marginBottom: 2
  },
  serviceCardTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginBottom: 4
  },
  ratingStar: {
    color: '#0F172A',
    fontSize: 12
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A'
  },
  reviewCount: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500'
  },
  servicePrice: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A'
  },

  // ── 7. Same-Day Service Card (Dark Navy - Matching Screenshot 4) ──
  sameDayBannerContainer: {
    paddingHorizontal: 16,
    marginBottom: 22
  },
  sameDayCard: {
    backgroundColor: '#1E1B4B',
    borderRadius: 18,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    overflow: 'hidden'
  },
  sameDayLeft: {
    flex: 1.2,
    paddingRight: 8
  },
  sameDayBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    marginBottom: 8
  },
  sameDayBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#F59E0B',
    letterSpacing: 0.3
  },
  sameDayHeading: {
    fontSize: 19,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 4
  },
  sameDaySubtitle: {
    fontSize: 12,
    color: '#CBD5E1',
    lineHeight: 16,
    marginBottom: 12
  },
  sameDayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#F59E0B',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16
  },
  sameDayButtonText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#FFFFFF'
  },
  sameDayRight: {
    flex: 0.8,
    height: 110,
    borderRadius: 14,
    overflow: 'hidden'
  },
  sameDayTechnicianPhoto: {
    width: '100%',
    height: '100%'
  },

  // ── 8. New & Noteworthy Card (Matching Screenshot 4) ──
  noteworthyCard: {
    width: 170,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#EFECE6',
    elevation: 2
  },
  noteworthyImageContainer: {
    width: '100%',
    height: 110,
    backgroundColor: '#EAE6DF'
  },
  noteworthyThumb: {
    width: '100%',
    height: '100%'
  },
  tagOverlay: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#0F172A',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2
  },
  tagOverlayText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900'
  },
  noteworthyBody: {
    padding: 10
  },
  noteworthyTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 2
  },
  noteworthyDesc: {
    fontSize: 11,
    color: '#64748B',
    marginBottom: 4
  },
  noteworthyPrice: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A'
  },

  // ── 10. Emergency Card (Matching Screenshot 3) ──
  emergencyCardContainer: {
    paddingHorizontal: 16,
    marginBottom: 22
  },
  emergencyCard: {
    backgroundColor: '#FEF2F2',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FECACA'
  },
  emergencyPillBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    marginBottom: 8
  },
  emergencyPillText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#DC2626',
    letterSpacing: 0.3
  },
  emergencyTitleText: {
    fontSize: 19,
    fontWeight: '900',
    color: '#991B1B',
    marginBottom: 4
  },
  emergencySubtitleText: {
    fontSize: 12,
    color: '#4B5563',
    lineHeight: 16,
    marginBottom: 12
  },
  emergencyRedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DC2626',
    paddingVertical: 10,
    borderRadius: 12
  },
  emergencyRedBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800'
  },

  // ── 11. Featured Professionals (Matching Screenshot 2 & 3) ──
  proCard: {
    width: 230,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#EFECE6',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2
  },
  proCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10
  },
  proAvatarContainer: {
    position: 'relative'
  },
  proAvatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E0E7FF',
    alignItems: 'center',
    justifyContent: 'center'
  },
  proAvatarText: {
    fontSize: 17,
    fontWeight: '900',
    color: '#3730A3'
  },
  verifiedCheckBadge: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 15,
    height: 15,
    borderRadius: 8,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF'
  },
  proHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  availablePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 10
  },
  availableDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#15803D'
  },
  availableText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#15803D'
  },
  proBusinessName: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 4
  },
  proCategoryPill: {
    alignSelf: 'flex-start',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginBottom: 6
  },
  proCategoryText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569'
  },
  proMetaStats: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 3
  },
  proLocationText: {
    fontSize: 11,
    color: '#64748B',
    marginBottom: 10
  },
  nearestBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    gap: 3
  },
  nearestBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#065F46'
  },
  proDistanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4
  },
  proDistanceText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669'
  },
  proZoneBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#DBEAFE'
  },
  proZoneBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#1D4ED8'
  },
  proCardDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginBottom: 8
  },
  proStartingLabel: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600'
  },
  proStartingPrice: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 10
  },
  proBookButton: {
    backgroundColor: '#0F172A',
    paddingVertical: 7,
    borderRadius: 10,
    alignItems: 'center'
  },
  proBookButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800'
  },

  // ── 14. Direct Quotation Banner (Dark Navy - Matching Screenshot 1) ──
  directQuoteContainer: {
    paddingHorizontal: 16,
    marginBottom: 22
  },
  directQuoteCard: {
    backgroundColor: '#1E293B',
    borderRadius: 18,
    padding: 18
  },
  quotePillBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    marginBottom: 8
  },
  quotePillText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#38BDF8',
    letterSpacing: 0.3
  },
  quoteHeading: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 6
  },
  quoteSubtitle: {
    fontSize: 12,
    color: '#94A3B8',
    lineHeight: 17,
    marginBottom: 14
  },
  quoteSubmitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155',
    paddingVertical: 10,
    borderRadius: 12
  },
  quoteSubmitBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800'
  },


  // ── 16. Final CTA Card (Matching Screenshot 1 Bottom) ──
  finalCtaContainer: {
    paddingHorizontal: 16,
    marginBottom: 0
  },
  finalCtaCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center'
  },
  finalCtaTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 4
  },
  finalCtaSubtitle: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 14
  },
  finalCtaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingVertical: 9,
    paddingHorizontal: 22
  },
  finalCtaButtonText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A'
  },
  emptyVendorCard: {
    width: 280,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14
  },
  emptyVendorTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
    marginTop: 8,
    textAlign: 'center'
  },
  emptyVendorSub: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 12
  },
  emptyVendorBtn: {
    backgroundColor: '#06684F',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16
  },
  emptyVendorBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF'
  }
});
