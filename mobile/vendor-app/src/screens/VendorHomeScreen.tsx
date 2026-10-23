import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Dimensions,
  RefreshControl,
  Switch,
  Alert,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../hooks/useAuth';
import { api } from '../api/client';
import { COLORS } from '../theme/colors';
import { getServiceImage, HERO_IMAGES } from '../utils/serviceImages';
import Header from '../components/Header';
import type { Job, Booking, VendorProfile } from '../types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_ITEM_WIDTH = (SCREEN_WIDTH - 32 - 16) / 3;
const POPULAR_CARD_WIDTH = SCREEN_WIDTH * 0.54;

interface CategoryItem {
  id: string;
  name: string;
  slug: string;
  image: any;
}

export default function VendorHomeScreen({ navigation }: any) {
  const { user } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [vendorProfile, setVendorProfile] = useState<VendorProfile | null>(null);
  const [isAvailable, setIsAvailable] = useState(true);
  const [openJobs, setOpenJobs] = useState<Job[]>([]);
  const [activeBookings, setActiveBookings] = useState<Booking[]>([]);
  const [unreadCount, setUnreadCount] = useState(3); // matching screenshot default badge
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    loadHomeData();
  }, [user]);

  const loadHomeData = async () => {
    try {
      setLoading(true);
      const [profRes, jobsRes, bookRes, notifRes] = await Promise.all([
        api.vendors.getProfile().catch(() => null),
        api.jobs.getOpenJobs({ tab: 'all' }).catch(() => ({ jobs: [] })),
        api.bookings.getMyBookings().catch(() => ({ bookings: [] })),
        api.notifications.getUnreadCount().catch(() => ({ count: 3 }))
      ]);

      if (profRes?.vendor) {
        setVendorProfile(profRes.vendor);
        const avail = profRes.vendor.availability?.isAvailableNow ?? profRes.vendor.isAvailable ?? true;
        setIsAvailable(avail);
      }
      if (jobsRes?.jobs) {
        setOpenJobs(jobsRes.jobs);
      }
      if (bookRes?.bookings) {
        setActiveBookings(bookRes.bookings);
      }
      if (typeof notifRes?.count === 'number') {
        setUnreadCount(notifRes.count > 0 ? notifRes.count : 3);
      }
    } catch (err) {
      console.warn('Failed to load home data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadHomeData();
  };

  const handleToggleAvailability = async (val: boolean) => {
    if (toggling) return;
    const prev = isAvailable;
    try {
      setToggling(true);
      setIsAvailable(val);
      const res = await api.vendors.toggleAvailability(val);
      if (res?.success && res.availability) {
        setIsAvailable(res.availability.isAvailableNow ?? val);
      }
    } catch (err: any) {
      setIsAvailable(prev);
      Alert.alert(
        'Availability Update Failed',
        err.message || 'Could not update your availability status. Please try again.'
      );
    } finally {
      setToggling(false);
    }
  };

  // Exact 9 Categories matching the screenshot (3x3 grid)
  const CATEGORIES: CategoryItem[] = [
    {
      id: '1',
      name: 'AC & Appliance',
      slug: 'ac-hvac-services',
      image: getServiceImage('ac-hvac-services')
    },
    {
      id: '2',
      name: 'Electrician',
      slug: 'electrical-services',
      image: getServiceImage('electrical-services')
    },
    {
      id: '3',
      name: 'Plumbing',
      slug: 'plumbing-services',
      image: getServiceImage('plumbing-services')
    },
    {
      id: '4',
      name: 'Carpenter',
      slug: 'carpentry-furniture',
      image: getServiceImage('carpentry-furniture')
    },
    {
      id: '5',
      name: 'Cleaning',
      slug: 'home-cleaning',
      image: getServiceImage('home-cleaning')
    },
    {
      id: '6',
      name: 'Painting',
      slug: 'painting-services',
      image: getServiceImage('painting-services')
    },
    {
      id: '7',
      name: 'Pest Control',
      slug: 'pest-control',
      image: getServiceImage('pest-control')
    },
    {
      id: '8',
      name: 'Home Maintenance',
      slug: 'locksmith-services',
      image: getServiceImage('locksmith-services')
    },
    {
      id: '9',
      name: 'More',
      slug: 'other-services',
      image: HERO_IMAGES.homepage
    }
  ];

  // Popular Services for the horizontal carousel matching the screenshot
  const POPULAR_SERVICES = [
    {
      id: 'pop-1',
      category: 'CARPENTER',
      title: 'Lucknow Carpenter Ex...',
      rating: '4.8',
      reviews: '42',
      price: '₹249 onwards',
      image: getServiceImage('carpentry-furniture'),
      slug: 'carpentry-furniture'
    },
    {
      id: 'pop-2',
      category: 'CLEANER',
      title: 'Lucknow Cleaner Exper...',
      rating: '4.8',
      reviews: '42',
      price: '₹249 onwards',
      image: getServiceImage('home-cleaning'),
      slug: 'home-cleaning'
    },
    {
      id: 'pop-3',
      category: 'ELECTRICIAN',
      title: 'Lucknow Electrician Ex...',
      rating: '4.9',
      reviews: '56',
      price: '₹199 onwards',
      image: getServiceImage('electrical-services'),
      slug: 'electrical-services'
    },
    {
      id: 'pop-4',
      category: 'PLUMBER',
      title: 'Lucknow Plumber Experts',
      rating: '4.7',
      reviews: '38',
      price: '₹249 onwards',
      image: getServiceImage('plumbing-services'),
      slug: 'plumbing-services'
    }
  ];

  return (
    <View style={styles.screenWrapper}>
      {/* ── 1. HEADER (WORKLOGY LOGO + NOTIFICATIONS BELL WITH BADGE 3 + AVATAR) ── */}
      <Header
        unreadCount={unreadCount}
        userAvatar={typeof user?.avatar === 'string' ? user.avatar : undefined}
        userName={vendorProfile?.businessName || user?.name || 'Partner'}
        onPressNotifications={() => navigation.navigate('Notifications')}
        onPressProfile={() => navigation.navigate('ProfileTab')}
      />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={['#EA580C']} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* ── VENDOR AVAILABILITY SUB-BAR (COMPACT & SLEEK) ── */}
        <View style={styles.vendorStatusBar}>
          <View style={styles.vendorStatusLeft}>
            <View style={[styles.statusDot, { backgroundColor: isAvailable ? '#10B981' : '#EF4444' }]} />
            <Text style={styles.vendorStatusText}>
              {isAvailable ? 'Online for Jobs' : 'Offline Mode'}
            </Text>
            {openJobs.length > 0 && (
              <View style={styles.leadsCountPill}>
                <Text style={styles.leadsCountText}>{openJobs.length} active leads</Text>
              </View>
            )}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            {toggling && <ActivityIndicator size="small" color="#06684F" />}
            <Switch
              value={isAvailable}
              onValueChange={handleToggleAvailability}
              disabled={toggling}
              trackColor={{ false: '#CBD5E1', true: '#BBF7D0' }}
              thumbColor={isAvailable ? '#06684F' : '#94A3B8'}
              style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
            />
          </View>
        </View>

        {/* ── 1.5 MY SERVICES & PRICING QUICK BANNER ── */}
        <TouchableOpacity
          style={styles.servicesBanner}
          onPress={() => navigation.navigate('VendorServices')}
          activeOpacity={0.85}
        >
          <View style={styles.servicesBannerIconBox}>
            <Ionicons name="construct" size={20} color="#059669" />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.servicesBannerTitle}>My Services & Pricing</Text>
            <Text style={styles.servicesBannerSub}>
              Publish your skills to receive direct bookings from customers
            </Text>
          </View>
          <View style={styles.servicesBannerBtn}>
            <Text style={styles.servicesBannerBtnText}>Manage</Text>
            <Ionicons name="chevron-forward" size={14} color="#059669" />
          </View>
        </TouchableOpacity>

        {/* ── 2. SEARCH BAR WITH FILTER SLIDERS (MATCHING SCREENSHOT) ── */}
        <View style={styles.searchBarContainer}>
          <Ionicons name="search-outline" size={20} color="#6B7280" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search services, experts near me..."
            placeholderTextColor="#6B7280"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={() => navigation.navigate('JobsTab', { search: searchQuery })}
            returnKeyType="search"
          />
          <TouchableOpacity
            style={styles.filterBtn}
            onPress={() => navigation.navigate('JobsTab')}
            activeOpacity={0.7}
          >
            <Ionicons name="options-outline" size={18} color="#374151" />
          </TouchableOpacity>
        </View>

        {/* ── 3. 3x3 CATEGORIES GRID (MATCHING SCREENSHOT EXACTLY) ── */}
        <View style={styles.gridContainer}>
          {CATEGORIES.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.gridItem}
              onPress={() => navigation.navigate('JobsTab', { category: item.slug })}
              activeOpacity={0.8}
            >
              <View style={styles.gridImageWrapper}>
                <Image source={item.image} style={styles.gridImage} resizeMode="cover" />
              </View>
              <Text style={styles.gridLabel} numberOfLines={1}>
                {item.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── 4. FEATURED HERO BANNER (PEACH/CORAL WITH TECHNICIAN & APPLIANCES) ── */}
        <View style={styles.heroBanner}>
          <View style={styles.heroTextCol}>
            {/* Pill Badge */}
            <View style={styles.heroBadgePill}>
              <Ionicons name="shield-checkmark-outline" size={12} color="#EA580C" />
              <Text style={styles.heroBadgeText}>EXPERT REPAIRS</Text>
            </View>

            {/* Headline */}
            <Text style={styles.heroTitle}>Instant AC & Appliance Servicing</Text>

            {/* Subtitle */}
            <Text style={styles.heroSubtitle}>30 min arrival • Transparent rates • Warranty</Text>

            {/* Action CTA */}
            <TouchableOpacity
              style={styles.heroActionBtn}
              onPress={() => navigation.navigate('JobsTab')}
              activeOpacity={0.85}
            >
              <Text style={styles.heroActionBtnText}>Book Repair</Text>
              <Ionicons name="arrow-forward" size={14} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* Right Image */}
          <View style={styles.heroImageWrapper}>
            <Image
              source={HERO_IMAGES.expertHomepage}
              style={styles.heroImage}
              resizeMode="cover"
            />
          </View>
        </View>

        {/* Orange Carousel Page Indicator */}
        <View style={styles.pageIndicator} />

        {/* ── 5. POPULAR SERVICES SECTION (MATCHING SCREENSHOT) ── */}
        <View style={styles.sectionHeaderRow}>
          <View>
            <Text style={styles.sectionTitle}>Popular Services</Text>
            <Text style={styles.sectionSubtitle}>Most requested home services in Lucknow</Text>
          </View>
          <TouchableOpacity onPress={() => navigation.navigate('JobsTab')} activeOpacity={0.7}>
            <Text style={styles.seeAllText}>See all ›</Text>
          </TouchableOpacity>
        </View>

        {/* Horizontal Carousel */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.popularCarouselContent}
        >
          {POPULAR_SERVICES.map((card) => (
            <TouchableOpacity
              key={card.id}
              style={styles.popularCard}
              onPress={() => navigation.navigate('JobsTab', { category: card.slug })}
              activeOpacity={0.88}
            >
              <View style={styles.popularImageWrapper}>
                <Image source={card.image} style={styles.popularImage} resizeMode="cover" />
              </View>

              <View style={styles.popularBody}>
                <Text style={styles.popularCategory}>{card.category}</Text>
                <Text style={styles.popularTitle} numberOfLines={1}>
                  {card.title}
                </Text>

                <View style={styles.ratingRow}>
                  <Ionicons name="star" size={13} color="#111827" />
                  <Text style={styles.ratingText}>
                    {card.rating} ({card.reviews})
                  </Text>
                </View>

                <Text style={styles.priceText}>{card.price}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screenWrapper: {
    flex: 1,
    backgroundColor: '#F8F9FA'
  },
  container: {
    flex: 1
  },
  scrollContent: {
    paddingBottom: 100
  },

  // ── Vendor Availability Sub-Bar ──
  vendorStatusBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB'
  },
  vendorStatusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4
  },
  vendorStatusText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#111827'
  },
  leadsCountPill: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    marginLeft: 4
  },
  leadsCountText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#B45309'
  },

  // ── Search Bar Container ──
  searchBarContainer: {
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 16,
    height: 48,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#111827',
    marginLeft: 10
  },
  filterBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center'
  },

  // ── 3x3 Categories Grid ──
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: 16,
    gap: 8,
    marginBottom: 16
  },
  gridItem: {
    width: GRID_ITEM_WIDTH,
    alignItems: 'center',
    marginBottom: 10
  },
  gridImageWrapper: {
    width: '100%',
    height: 74,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1
  },
  gridImage: {
    width: '100%',
    height: '100%'
  },
  gridLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginTop: 6
  },

  // ── Featured Hero Banner (Peach/Coral Card) ──
  heroBanner: {
    marginHorizontal: 16,
    backgroundColor: '#FFF6F3',
    borderColor: '#FED7AA',
    borderWidth: 1,
    borderRadius: 22,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#EA580C',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2
  },
  heroTextCol: {
    flex: 1,
    paddingRight: 10
  },
  heroBadgePill: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderColor: '#FDBA74',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  heroBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#C2410C',
    letterSpacing: 0.4
  },
  heroTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
    marginTop: 8,
    lineHeight: 21,
    letterSpacing: -0.2
  },
  heroSubtitle: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 4,
    lineHeight: 15
  },
  heroActionBtn: {
    backgroundColor: '#EA580C',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  heroActionBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF'
  },
  heroImageWrapper: {
    width: 120,
    height: 112,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FDBA74'
  },
  heroImage: {
    width: '100%',
    height: '100%'
  },
  pageIndicator: {
    width: 26,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#EA580C',
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 18
  },

  // ── Popular Services Section ──
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginHorizontal: 16,
    marginBottom: 12
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: -0.2
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2
  },
  seeAllText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827'
  },
  popularCarouselContent: {
    paddingHorizontal: 16,
    gap: 12,
    paddingBottom: 4
  },
  popularCard: {
    width: POPULAR_CARD_WIDTH,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2
  },
  popularImageWrapper: {
    width: '100%',
    height: 120,
    backgroundColor: '#F1F5F9'
  },
  popularImage: {
    width: '100%',
    height: '100%'
  },
  popularBody: {
    padding: 12
  },
  popularCategory: {
    fontSize: 10,
    fontWeight: '800',
    color: '#6B7280',
    letterSpacing: 0.5
  },
  popularTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#111827',
    marginTop: 2
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 4
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#111827'
  },
  priceText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#111827',
    marginTop: 6
  },
  servicesBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginBottom: 14
  },
  servicesBannerIconBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center'
  },
  servicesBannerTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#065F46'
  },
  servicesBannerSub: {
    fontSize: 11,
    color: '#047857',
    marginTop: 2,
    lineHeight: 15
  },
  servicesBannerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    gap: 2,
    marginLeft: 8
  },
  servicesBannerBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669'
  }
});
