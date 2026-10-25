import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
  Dimensions,
  Platform,
  StatusBar
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, Feather, MaterialIcons } from '@expo/vector-icons';
import { api } from '../api/client';
import { COLORS } from '../theme/colors';
import { formatCurrency } from '../utils/formatters';
import { renderCategoryIcon } from '../utils/categoryIcons';
import { getServiceImage } from '../utils/serviceImages';
import LocationModal from '../components/LocationModal';
import { secureStorage } from '../storage/secureStorage';
import { STORAGE_KEYS } from '../constants';
import { getStoredLocation, saveLocation } from '../services/locationService';
import type { ServiceCategory, ServiceAddress } from '../types';

const STATUSBAR_HEIGHT = Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : (Platform.OS === 'ios' ? 44 : 0);

interface VerifiedVendor {
  _id: string;
  businessName?: string;
  user?: {
    _id?: string;
    name?: string;
    avatar?: string;
    phone?: string;
  };
  name?: string;
  tagline?: string;
  bio?: string;
  rating?: number;
  reviewCount?: number;
  experienceYears?: number;
  completedJobsCount?: number;
  hourlyRate?: number;
  city?: string;
  categories?: Array<{ _id: string; name: string; slug: string; icon?: string }>;
  services?: Array<{ title: string; price?: number }>;
  serviceAreas?: Array<{ name?: string; city?: string }>;
  verifiedBadge?: { status?: string };
  availability?: { isAvailableNow?: boolean };
}

type TabMode = 'all' | 'categories' | 'professionals';
type TradeGroup = 'all' | 'repairs' | 'maintenance' | 'moving' | 'personal';
type SortOption = 'rating' | 'experience' | 'price_asc';

export default function ExploreScreen({ navigation, route }: any) {
  const insets = useSafeAreaInsets();
  const topInset = Math.max(
    insets.top,
    Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 0
  );
  const initialSearch = route?.params?.search || '';
  const initialCategory = route?.params?.category || '';

  // Data states
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [vendors, setVendors] = useState<VerifiedVendor[]>([]);
  const [unreadNotifications, setUnreadNotifications] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingVendors, setLoadingVendors] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter states
  const [searchQuery, setSearchQuery] = useState<string>(initialSearch);
  const [debouncedQuery, setDebouncedQuery] = useState<string>(initialSearch);
  const [tabMode, setTabMode] = useState<TabMode>('all');
  const [activeGroup, setActiveGroup] = useState<TradeGroup>('all');
  const [selectedTradeSlug, setSelectedTradeSlug] = useState<string>(initialCategory);
  const [sortBy, setSortBy] = useState<SortOption>('rating');

  // Location states
  const [currentLocation, setCurrentLocation] = useState<string>('Lucknow, Uttar Pradesh');
  const [currentCity, setCurrentCity] = useState<string>('Lucknow');
  const [showLocationModal, setShowLocationModal] = useState<boolean>(false);

  // Pagination for vendors
  const [vendorPage, setVendorPage] = useState<number>(1);
  const [vendorTotal, setVendorTotal] = useState<number>(0);
  const [loadingMoreVendors, setLoadingMoreVendors] = useState<boolean>(false);

  const searchTimerRef = useRef<any>(null);

  // 1. Debounce Search Input (300ms)
  useEffect(() => {
    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current);
    }
    searchTimerRef.current = setTimeout(() => {
      setDebouncedQuery(searchQuery.trim());
    }, 300);

    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, [searchQuery]);

  // 2. Load Saved Location or Auto-Detect on Mount
  useEffect(() => {
    const loadLocation = async () => {
      try {
        const loc = await getStoredLocation(true);
        if (loc) {
          if (loc.city) setCurrentCity(loc.city);
          if (loc.fullAddress) setCurrentLocation(loc.fullAddress);
        }
      } catch {
        // Fallback default Lucknow
      }
    };
    loadLocation();
  }, []);

  // 3. Intercept back button to dismiss LocationModal first
  useEffect(() => {
    const unregister = navigation?.registerBackHandler?.(() => {
      if (showLocationModal) {
        setShowLocationModal(false);
        return true;
      }
      return false;
    });

    return () => {
      unregister?.();
    };
  }, [showLocationModal, navigation]);

  // 4. Fetch Categories & Notifications
  const loadInitialData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [catRes, notifRes] = await Promise.all([
        api.categories.getAll().catch(() => null),
        api.notifications.getUnreadCount().catch(() => null)
      ]);

      if (catRes?.categories && Array.isArray(catRes.categories)) {
        setCategories(catRes.categories);
      } else {
        setError('Could not load service categories.');
      }

      if (typeof notifRes?.count === 'number') {
        setUnreadNotifications(notifRes.count);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load explore data. Please check your network.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // 5. Fetch Verified Professionals (Debounced, Category, Location, Sort)
  const fetchVendors = useCallback(async (pageToLoad: number = 1, append: boolean = false) => {
    try {
      if (append) {
        setLoadingMoreVendors(true);
      } else {
        setLoadingVendors(true);
      }

      const params: any = {
        city: currentCity && currentCity !== 'All' ? currentCity : undefined,
        category: selectedTradeSlug || undefined,
        search: debouncedQuery || undefined,
        sortBy: sortBy,
        page: pageToLoad,
        limit: 12
      };

      const res = await api.vendors.getVendors(params);

      if (res?.success && Array.isArray(res.vendors)) {
        if (append) {
          setVendors((prev) => [...prev, ...res.vendors]);
        } else {
          setVendors(res.vendors);
        }
        setVendorTotal(res.total ?? (res.vendors.length));
        setVendorPage(pageToLoad);
      } else {
        if (!append) setVendors([]);
      }
    } catch (err) {
      console.warn('Failed to fetch professionals:', err);
      if (!append) setVendors([]);
    } finally {
      setLoadingVendors(false);
      setLoadingMoreVendors(false);
    }
  }, [currentCity, selectedTradeSlug, debouncedQuery, sortBy]);

  useEffect(() => {
    fetchVendors(1, false);
  }, [fetchVendors]);

  // Handle Location Selection from LocationModal
  const handleSelectLocation = async (locStr: string, addressDetails?: ServiceAddress) => {
    setShowLocationModal(false);
    const city = addressDetails?.city || locStr.split(',')[0].trim() || 'Lucknow';
    setCurrentCity(city);
    setCurrentLocation(locStr);
    await saveLocation(locStr, addressDetails);
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadInitialData();
    fetchVendors(1, false);
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setDebouncedQuery('');
    setActiveGroup('all');
    setSelectedTradeSlug('');
    setSortBy('rating');
  };

  // Filter Categories by group and search query
  const filteredCategories = categories.filter((cat) => {
    const q = debouncedQuery.toLowerCase();
    const subMatches = Array.isArray(cat.subcategories)
      ? cat.subcategories.some((s) => {
          const str = typeof s === 'string' ? s : s?.name || '';
          return str.toLowerCase().includes(q);
        })
      : false;

    const matchesSearch = !q || cat.name.toLowerCase().includes(q) || subMatches;
    if (!matchesSearch) return false;

    if (activeGroup === 'all') return true;
    if (activeGroup === 'repairs') {
      return ['electrician', 'appliance', 'ac-repair', 'carpentry', 'locksmith', 'tv-mounting', 'geyser', 'computer'].some((k) => cat.slug?.includes(k));
    }
    if (activeGroup === 'maintenance') {
      return ['cleaning', 'plumbing', 'pest-control', 'waterproofing', 'sanitization', 'ro-water'].some((k) => cat.slug?.includes(k));
    }
    if (activeGroup === 'moving') {
      return ['packers-movers', 'masonry', 'painting', 'flooring', 'construction', 'interior'].some((k) => cat.slug?.includes(k));
    }
    if (activeGroup === 'personal') {
      return ['gardening', 'disinfection', 'solar', 'beauty', 'driving', 'photography'].some((k) => cat.slug?.includes(k));
    }
    return true;
  });

  return (
    <View style={styles.screenWrapper}>
      <StatusBar barStyle="dark-content" />

      {/* ══════════════════════════════════════════════════════════════════
          1. HEADER (Explore Title, Location Selector, Notification Bell)
      ══════════════════════════════════════════════════════════════════ */}
      <View style={[styles.headerContainer, { paddingTop: topInset + (Platform.OS === 'ios' ? 10 : 8) }]}>
        {/* 1. Screen heading and notification icon */}
        <View style={styles.headerTopRow}>
          <Text style={styles.screenMainTitle}>Explore Services</Text>

          {/* Notifications Shortcut */}
          <TouchableOpacity
            style={styles.notifBtn}
            onPress={() => navigation.navigate('Notifications')}
            activeOpacity={0.8}
            accessibilityLabel="Notifications"
          >
            <Ionicons name="notifications-outline" size={20} color="#0F172A" />
            {unreadNotifications > 0 && (
              <View style={styles.notifBadge}>
                <Text style={styles.notifBadgeText}>
                  {unreadNotifications > 99 ? '99+' : unreadNotifications}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* 2. Selected service location */}
        <View style={styles.locationRow}>
          <TouchableOpacity
            style={styles.locationSelectorBtn}
            onPress={() => setShowLocationModal(true)}
            activeOpacity={0.75}
          >
            <Ionicons name="location" size={13.5} color={COLORS.primary} style={{ marginRight: 4 }} />
            <Text style={styles.locationSelectorText} numberOfLines={1}>
              {currentLocation}
            </Text>
            <Feather name="chevron-down" size={14} color="#64748B" style={{ marginLeft: 3 }} />
          </TouchableOpacity>
        </View>

        {/* 2. Prominent Search Bar */}
        <View style={styles.searchBarWrapper}>
          <Ionicons name="search" size={18} color="#64748B" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search electricians, plumbers, AC repair..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery('')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={styles.clearSearchBtn}
            >
              <Ionicons name="close-circle" size={18} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>

        {/* 3. Segmented Navigation Tabs */}
        <View style={styles.segmentedTabRow}>
          <TouchableOpacity
            style={[styles.segmentBtn, tabMode === 'all' && styles.segmentBtnActive]}
            onPress={() => setTabMode('all')}
            activeOpacity={0.8}
          >
            <Text style={[styles.segmentBtnText, tabMode === 'all' && styles.segmentBtnTextActive]}>
              All in One
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.segmentBtn, tabMode === 'categories' && styles.segmentBtnActive]}
            onPress={() => setTabMode('categories')}
            activeOpacity={0.8}
          >
            <Text style={[styles.segmentBtnText, tabMode === 'categories' && styles.segmentBtnTextActive]}>
              Categories ({filteredCategories.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.segmentBtn, tabMode === 'professionals' && styles.segmentBtnActive]}
            onPress={() => setTabMode('professionals')}
            activeOpacity={0.8}
          >
            <Text style={[styles.segmentBtnText, tabMode === 'professionals' && styles.segmentBtnTextActive]}>
              Professionals ({vendors.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* 4. Horizontal Trade Group Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterChipScroll}
        >
          {[
            { id: 'all', label: 'All Trades' },
            { id: 'repairs', label: 'Repairs & Fix' },
            { id: 'maintenance', label: 'Home Care' },
            { id: 'moving', label: 'Moving & Civil' },
            { id: 'personal', label: 'Personal & Care' }
          ].map((chip) => {
            const isPicked = activeGroup === chip.id;
            return (
              <TouchableOpacity
                key={chip.id}
                style={[styles.filterChip, isPicked && styles.filterChipActive]}
                onPress={() => setActiveGroup(chip.id as any)}
                activeOpacity={0.75}
              >
                <Text style={[styles.filterChipText, isPicked && styles.filterChipTextActive]}>
                  {chip.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* ══════════════════════════════════════════════════════════════════
          MAIN SCROLL CONTENT
      ══════════════════════════════════════════════════════════════════ */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.centerLoadingText}>Loading marketplace catalog...</Text>
        </View>
      ) : error ? (
        <View style={styles.centerContainer}>
          <View style={styles.errorIconBox}>
            <Feather name="alert-circle" size={32} color="#DC2626" />
          </View>
          <Text style={styles.errorTitle}>Could Not Load Catalog</Text>
          <Text style={styles.errorSubtitle}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={loadInitialData} activeOpacity={0.8}>
            <Feather name="refresh-cw" size={15} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollBody}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[COLORS.primary]} />}
        >
          {/* ════════════════════════════════════════════════════════════
              6. DIVIDER is provided by headerContainer borderBottom
              7. VERIFIED PROFESSIONALS DISCOVERY (Section 7 in Visual Hierarchy)
          ════════════════════════════════════════════════════════════ */}
          {tabMode !== 'categories' && (
            <View style={styles.professionalsSection}>
              {/* Header with Title and Sorting Controls */}
              <View style={styles.proSectionHeader}>
                <View>
                  <Text style={styles.sectionMainHeading}>Verified Professionals Near You</Text>
                  <Text style={styles.sectionSubHeading}>
                    Licensed specialists serving {currentCity || 'your area'}
                  </Text>
                </View>

                <View style={styles.proCountPill}>
                  <Text style={styles.proCountPillText}>{vendors.length} Available</Text>
                </View>
              </View>

              {/* Sort By Filter Chips */}
              <View style={styles.sortRow}>
                <Text style={styles.sortLabel}>Sort by:</Text>
                <TouchableOpacity
                  style={[styles.sortChip, sortBy === 'rating' && styles.sortChipActive]}
                  onPress={() => setSortBy('rating')}
                >
                  <Ionicons name="star" size={11} color={sortBy === 'rating' ? '#FFFFFF' : '#F59E0B'} style={{ marginRight: 3 }} />
                  <Text style={[styles.sortChipText, sortBy === 'rating' && styles.sortChipTextActive]}>
                    Top Rated
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.sortChip, sortBy === 'experience' && styles.sortChipActive]}
                  onPress={() => setSortBy('experience')}
                >
                  <Ionicons name="ribbon" size={11} color={sortBy === 'experience' ? '#FFFFFF' : '#2563EB'} style={{ marginRight: 3 }} />
                  <Text style={[styles.sortChipText, sortBy === 'experience' && styles.sortChipTextActive]}>
                    Experience
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.sortChip, sortBy === 'price_asc' && styles.sortChipActive]}
                  onPress={() => setSortBy('price_asc')}
                >
                  <Ionicons name="pricetag" size={11} color={sortBy === 'price_asc' ? '#FFFFFF' : '#059669'} style={{ marginRight: 3 }} />
                  <Text style={[styles.sortChipText, sortBy === 'price_asc' && styles.sortChipTextActive]}>
                    Affordable
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Professionals List */}
              {loadingVendors ? (
                <View style={{ paddingVertical: 30, alignItems: 'center' }}>
                  <ActivityIndicator size="small" color={COLORS.primary} />
                  <Text style={styles.loadingProsText}>Searching verified contractors...</Text>
                </View>
              ) : vendors.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Ionicons name="people-outline" size={32} color="#94A3B8" />
                  <Text style={styles.emptyCardTitle}>No Professionals Found</Text>
                  <Text style={styles.emptyCardSubtitle}>
                    We couldn't find matching specialists in {currentCity}. Try selecting a different trade or changing your city location.
                  </Text>
                  <View style={{ flexDirection: 'row', marginTop: 12 }}>
                    <TouchableOpacity
                      style={styles.changeLocBtn}
                      onPress={() => setShowLocationModal(true)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="location-outline" size={14} color="#FFFFFF" style={{ marginRight: 4 }} />
                      <Text style={styles.changeLocBtnText}>Change Location</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.changeLocBtn, { backgroundColor: '#F1F5F9', marginLeft: 8 }]}
                      onPress={handleResetFilters}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.changeLocBtnText, { color: '#0F172A' }]}>Reset Filters</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <View style={styles.professionalsList}>
                  {vendors.map((pro) => {
                    const proName = pro.businessName || pro.user?.name || pro.name || 'Verified Professional';
                    const isVerified = pro.verifiedBadge?.status === 'verified' || pro.verifiedBadge?.status === 'approved';
                    const rating = pro.rating ? pro.rating.toFixed(1) : '4.9';
                    const reviewsCount = pro.reviewCount || 0;
                    const jobsCount = pro.completedJobsCount || 0;
                    const primaryCat = pro.categories?.[0]?.name || 'Home Maintenance';
                    const hourlyRate = pro.hourlyRate || 299;
                    const isAvailable = pro.availability?.isAvailableNow !== false;

                    return (
                      <View key={pro._id} style={styles.proDossierCard}>
                        {/* Top: Avatar, Name, Verification, Availability */}
                        <View style={styles.proCardTopRow}>
                          <View style={styles.proAvatarWrapper}>
                            {pro.user?.avatar ? (
                              <Image source={{ uri: pro.user.avatar }} style={styles.proAvatarImg} />
                            ) : (
                              <View style={styles.proAvatarFallback}>
                                <Text style={styles.proAvatarInitial}>
                                  {proName.charAt(0).toUpperCase()}
                                </Text>
                              </View>
                            )}
                            {isVerified && (
                              <View style={styles.verifiedCheckBadge}>
                                <Ionicons name="checkmark" size={10} color="#FFFFFF" />
                              </View>
                            )}
                          </View>

                          <View style={styles.proDetailsCol}>
                            <View style={styles.proNameAndStatusRow}>
                              <Text style={styles.proBusinessName} numberOfLines={1}>
                                {proName}
                              </Text>
                            </View>

                            <View style={styles.proCategoryRow}>
                              <View style={styles.categoryBadge}>
                                <Text style={styles.categoryBadgeText}>{primaryCat}</Text>
                              </View>
                              <View style={[styles.availBadge, isAvailable ? styles.availBadgeGreen : styles.availBadgeAmber]}>
                                <View style={[styles.statusDot, { backgroundColor: isAvailable ? '#10B981' : '#F59E0B' }]} />
                                <Text style={[styles.availBadgeText, { color: isAvailable ? '#065F46' : '#92400E' }]}>
                                  {isAvailable ? 'Available Today' : 'Scheduled Visits'}
                                </Text>
                              </View>
                            </View>
                          </View>
                        </View>

                        {/* Bio / Tagline if available */}
                        {pro.tagline ? (
                          <Text style={styles.proTaglineText} numberOfLines={1}>
                            "{pro.tagline}"
                          </Text>
                        ) : null}

                        {/* Stats Row: Rating, Completed Jobs, Experience */}
                        <View style={styles.proStatsStrip}>
                          <View style={styles.statMetricItem}>
                            <Ionicons name="star" size={13} color="#F59E0B" />
                            <Text style={styles.statMetricValue}> {rating}</Text>
                            <Text style={styles.statMetricLabel}> ({reviewsCount})</Text>
                          </View>

                          <View style={styles.statMetricDivider} />

                          <View style={styles.statMetricItem}>
                            <Ionicons name="briefcase-outline" size={13} color="#059669" />
                            <Text style={styles.statMetricValue}> {jobsCount}+</Text>
                            <Text style={styles.statMetricLabel}> jobs</Text>
                          </View>

                          <View style={styles.statMetricDivider} />

                          <View style={styles.statMetricItem}>
                            <Ionicons name="ribbon-outline" size={13} color="#2563EB" />
                            <Text style={styles.statMetricValue}> {pro.experienceYears || 5}y</Text>
                            <Text style={styles.statMetricLabel}> exp</Text>
                          </View>
                        </View>

                        {/* Locality & Coverage */}
                        <View style={styles.proCoverageRow}>
                          <Feather name="map-pin" size={12} color="#64748B" style={{ marginRight: 4 }} />
                          <Text style={styles.proCoverageText} numberOfLines={1}>
                            {pro.city || currentCity || 'Lucknow'}
                            {Array.isArray(pro.serviceAreas) && pro.serviceAreas.length > 0
                              ? ` • ${pro.serviceAreas.map((a: any) => a.name || a.city || a).slice(0, 2).join(', ')}`
                              : ' • All Localities'}
                          </Text>
                        </View>

                        {/* Footer: Price & Direct Actions */}
                        <View style={styles.proCardFooterRow}>
                          <View>
                            <Text style={styles.proStartingLabel}>Rates From</Text>
                            <Text style={styles.proStartingRate}>
                              {formatCurrency(hourlyRate)}
                              <Text style={styles.proStartingUnit}> onwards</Text>
                            </Text>
                          </View>

                          <View style={styles.proActionsGroup}>
                            <TouchableOpacity
                              style={styles.viewProfileBtn}
                              onPress={() => {
                                navigation.navigate('ProfessionalProfile', { vendorId: pro._id, vendor: pro });
                              }}
                              activeOpacity={0.8}
                            >
                              <Text style={styles.viewProfileBtnText}>View Profile</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                              style={styles.bookProBtn}
                              onPress={() => {
                                navigation.navigate('ProfessionalProfile', {
                                  vendorId: pro._id,
                                  vendor: pro,
                                  openBooking: true
                                });
                              }}
                              activeOpacity={0.85}
                            >
                              <Ionicons name="calendar-outline" size={14} color="#FFFFFF" style={{ marginRight: 4 }} />
                              <Text style={styles.bookProBtnText}>Book</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      </View>
                    );
                  })}

                  {/* Load More Button */}
                  {vendorTotal > vendors.length && (
                    <TouchableOpacity
                      style={styles.loadMoreBtn}
                      onPress={() => fetchVendors(vendorPage + 1, true)}
                      disabled={loadingMoreVendors}
                      activeOpacity={0.8}
                    >
                      {loadingMoreVendors ? (
                        <ActivityIndicator size="small" color={COLORS.primary} />
                      ) : (
                        <Text style={styles.loadMoreBtnText}>
                          Load More Professionals ({vendors.length} of {vendorTotal})
                        </Text>
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          )}

          {/* ════════════════════════════════════════════════════════════
              SECTION A: TRADE CATEGORIES (30 Available Categories)
          ════════════════════════════════════════════════════════════ */}
          {tabMode !== 'professionals' && (
            <View style={[styles.categoriesSection, tabMode === 'all' && styles.categoriesSectionWithBorder]}>
              <View style={styles.sectionHeaderRow}>
                <View>
                  <Text style={styles.sectionMainHeading}>Trade Categories</Text>
                  <Text style={styles.sectionSubHeading}>
                    {filteredCategories.length} verified trade categories available
                  </Text>
                </View>
                {selectedTradeSlug ? (
                  <TouchableOpacity
                    style={styles.clearFilterBadge}
                    onPress={() => setSelectedTradeSlug('')}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.clearFilterBadgeText}>Clear Trade Filter</Text>
                    <Ionicons name="close" size={12} color="#059669" />
                  </TouchableOpacity>
                ) : null}
              </View>

              {filteredCategories.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Ionicons name="search-outline" size={30} color="#94A3B8" />
                  <Text style={styles.emptyCardTitle}>No Categories Match "{searchQuery}"</Text>
                  <Text style={styles.emptyCardSubtitle}>
                    Try searching by trade keyword such as "electrical", "cleaning", or "plumber".
                  </Text>
                  <TouchableOpacity style={styles.resetSearchBtn} onPress={handleResetFilters} activeOpacity={0.8}>
                    <Text style={styles.resetSearchBtnText}>Reset Search</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.categoriesGrid}>
                  {filteredCategories.map((item) => {
                    const isSelectedTrade = selectedTradeSlug === item.slug;
                    const subcount = Array.isArray(item.subcategories) ? item.subcategories.length : 0;
                    const subList = Array.isArray(item.subcategories)
                      ? item.subcategories.slice(0, 3).map((s) => (typeof s === 'string' ? s : s?.name || ''))
                      : [];

                    return (
                      <TouchableOpacity
                        key={item._id}
                        style={[styles.categoryCard, isSelectedTrade && styles.categoryCardSelected]}
                        activeOpacity={0.85}
                        onPress={() => {
                          navigation.navigate('CategoryDetail', { slug: item.slug, name: item.name });
                        }}
                      >
                        <View style={styles.cardImageContainer}>
                          <Image
                            source={getServiceImage(item.slug || item.name)}
                            style={styles.cardThumbnail}
                            resizeMode="cover"
                          />
                          <View style={styles.cardIconBadge}>
                            {renderCategoryIcon(item.slug || item.icon, 13, '#FFFFFF')}
                          </View>
                          {subcount > 0 && (
                            <View style={styles.tasksPill}>
                              <Text style={styles.tasksPillText}>{subcount} tasks</Text>
                            </View>
                          )}
                        </View>

                        <View style={styles.cardContent}>
                          <View style={styles.cardTitleRow}>
                            <Text style={styles.cardTitleText} numberOfLines={1}>
                              {item.name}
                            </Text>
                            <Feather name="arrow-up-right" size={14} color="#64748B" />
                          </View>

                          <Text style={styles.cardDescText} numberOfLines={2}>
                            {item.description || 'Verified licensed technicians with upfront standardized rates.'}
                          </Text>

                          {/* Subcategory Pills */}
                          {subList.length > 0 && (
                            <View style={styles.subtagsRow}>
                              {subList.map((tagStr, tIdx) => (
                                <View key={tIdx} style={styles.subtagPill}>
                                  <Text style={styles.subtagPillText} numberOfLines={1}>{tagStr}</Text>
                                </View>
                              ))}
                              {subcount > 3 && (
                                <View style={[styles.subtagPill, styles.subtagMorePill]}>
                                  <Text style={styles.subtagMoreText}>+{subcount - 3}</Text>
                                </View>
                              )}
                            </View>
                          )}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>
          )}

          <View style={{ height: 16 }} />
        </ScrollView>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          LOCATION MODAL (Reused from existing components)
      ══════════════════════════════════════════════════════════════════ */}
      <LocationModal
        visible={showLocationModal}
        currentLocation={currentLocation}
        onClose={() => setShowLocationModal(false)}
        onSelectLocation={handleSelectLocation}
      />
    </View>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// STYLES
// ═════════════════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  screenWrapper: {
    flex: 1,
    backgroundColor: '#F8FAFC'
  },
  scrollView: {
    flex: 1
  },
  scrollBody: {
    paddingBottom: 20
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#FFFFFF'
  },
  centerLoadingText: {
    marginTop: 12,
    fontSize: 13.5,
    color: '#64748B',
    fontWeight: '500'
  },
  errorIconBox: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12
  },
  errorTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4
  },
  errorSubtitle: {
    fontSize: 12.5,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 14
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 8
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 13
  },

  // 1. Header Styles
  headerContainer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6
  },
  screenMainTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.4
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10
  },
  locationSelectorBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 2
  },
  locationSelectorText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#334155',
    maxWidth: 240
  },
  notifBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative'
  },
  notifBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#DC2626',
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#FFFFFF'
  },
  notifBadgeText: {
    color: '#FFFFFF',
    fontSize: 9.5,
    fontWeight: '700'
  },

  // Search Bar
  searchBarWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 42,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 10
  },
  searchIcon: {
    marginRight: 8
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
    height: '100%'
  },
  clearSearchBtn: {
    padding: 4
  },

  // Segmented Tabs
  segmentedTabRow: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    padding: 3,
    marginBottom: 8
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 6,
    alignItems: 'center',
    borderRadius: 8
  },
  segmentBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1
  },
  segmentBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B'
  },
  segmentBtnTextActive: {
    color: COLORS.primary,
    fontWeight: '700'
  },

  // Filter Chips Scroll
  filterChipScroll: {
    paddingVertical: 2
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginRight: 6
  },
  filterChipActive: {
    backgroundColor: '#ECFDF5',
    borderColor: '#10B981'
  },
  filterChipText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#64748B'
  },
  filterChipTextActive: {
    color: '#065F46',
    fontWeight: '700'
  },

  // Section Common
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  sectionMainHeading: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.2
  },
  sectionSubHeading: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 1
  },
  clearFilterBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#A7F3D0'
  },
  clearFilterBadgeText: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#065F46',
    marginRight: 3
  },

  // Section A: Categories
  categoriesSection: {
    paddingHorizontal: 16,
    paddingTop: 18
  },
  categoriesSectionWithBorder: {
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    marginTop: 16,
    paddingTop: 20
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between'
  },
  categoryCard: {
    width: '48.5%',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 2
  },
  categoryCardSelected: {
    borderColor: COLORS.primary,
    borderWidth: 2
  },
  cardImageContainer: {
    width: '100%',
    height: 94,
    position: 'relative'
  },
  cardThumbnail: {
    width: '100%',
    height: '100%'
  },
  cardIconBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center'
  },
  tasksPill: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4
  },
  tasksPillText: {
    fontSize: 9.5,
    fontWeight: '600',
    color: '#FFFFFF'
  },
  cardContent: {
    padding: 10
  },
  cardTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 3
  },
  cardTitleText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    flex: 1
  },
  cardDescText: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 15,
    marginBottom: 6
  },
  subtagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 2
  },
  subtagPill: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 4,
    marginBottom: 3,
    maxWidth: '85%'
  },
  subtagPillText: {
    fontSize: 9.5,
    color: '#475569',
    fontWeight: '500'
  },
  subtagMorePill: {
    backgroundColor: '#E2E8F0'
  },
  subtagMoreText: {
    fontSize: 9,
    fontWeight: '600',
    color: '#334155'
  },

  // Section B: Verified Professionals
  professionalsSection: {
    paddingHorizontal: 16,
    paddingTop: 16
  },
  proSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10
  },
  proCountPill: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#A7F3D0'
  },
  proCountPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#065F46'
  },
  sortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    flexWrap: 'wrap'
  },
  sortLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    marginRight: 6
  },
  sortChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    marginRight: 8,
    marginBottom: 4
  },
  sortChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary
  },
  sortChipText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '600'
  },
  sortChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700'
  },
  loadingProsText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 8
  },

  // Professional Dossier Card
  professionalsList: {
    marginTop: 4
  },
  proDossierCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 5,
    elevation: 2
  },
  proCardTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start'
  },
  proAvatarWrapper: {
    position: 'relative'
  },
  proAvatarImg: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E2E8F0'
  },
  proAvatarFallback: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center'
  },
  proAvatarInitial: {
    fontSize: 19,
    fontWeight: '800',
    color: '#FFFFFF'
  },
  verifiedCheckBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 17,
    height: 17,
    borderRadius: 8.5,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF'
  },
  proDetailsCol: {
    flex: 1,
    marginLeft: 12
  },
  proNameAndStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  proBusinessName: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#0F172A',
    flex: 1
  },
  proCategoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    flexWrap: 'wrap',
    gap: 4
  },
  categoryBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4
  },
  categoryBadgeText: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#334155'
  },
  availBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4
  },
  availBadgeGreen: {
    backgroundColor: '#ECFDF5'
  },
  availBadgeAmber: {
    backgroundColor: '#FEF3C7'
  },
  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginRight: 4
  },
  availBadgeText: {
    fontSize: 10,
    fontWeight: '600'
  },
  proTaglineText: {
    fontSize: 11.5,
    fontStyle: 'italic',
    color: '#475569',
    marginTop: 8,
    paddingHorizontal: 2
  },
  proStatsStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginTop: 10
  },
  statMetricItem: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  statMetricValue: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#0F172A'
  },
  statMetricLabel: {
    fontSize: 10.5,
    color: '#64748B'
  },
  statMetricDivider: {
    width: 1,
    height: 12,
    backgroundColor: '#CBD5E1',
    marginHorizontal: 8
  },
  proCoverageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8
  },
  proCoverageText: {
    fontSize: 11,
    color: '#64748B',
    flex: 1
  },
  proCardFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9'
  },
  proStartingLabel: {
    fontSize: 10,
    color: '#64748B',
    textTransform: 'uppercase',
    fontWeight: '600'
  },
  proStartingRate: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A'
  },
  proStartingUnit: {
    fontSize: 11,
    fontWeight: '400',
    color: '#64748B'
  },
  proActionsGroup: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  viewProfileBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    marginRight: 6
  },
  viewProfileBtnText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#334155'
  },
  bookProBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8
  },
  bookProBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 11.5
  },

  // Load More Button
  loadMoreBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 12
  },
  loadMoreBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: COLORS.primary
  },

  // Empty State
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
  resetSearchBtn: {
    marginTop: 12,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8
  },
  resetSearchBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600'
  },
  changeLocBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8
  },
  changeLocBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600'
  }
});
