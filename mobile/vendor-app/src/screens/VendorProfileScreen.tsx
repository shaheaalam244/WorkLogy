import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Image,
  ActivityIndicator,
  RefreshControl,
  Platform,
  StatusBar
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../hooks/useAuth';
import { api } from '../api/client';
import { useNavigation } from '../context/NavigationContext';
import { COLORS } from '../theme/colors';
import type { VendorProfile } from '../types';

export default function VendorProfileScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const topInset = Math.max(
    insets.top,
    Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 0
  );

  const { user, logout } = useAuth();
  const appNav = useNavigation();

  const [profile, setProfile] = useState<VendorProfile | null>(null);
  const [dashboardStats, setDashboardStats] = useState<any | null>(null);
  const [isAvailable, setIsAvailable] = useState(true);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingAvailability, setUpdatingAvailability] = useState(false);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    setImageError(false);
  }, [user?.avatar]);

  useEffect(() => {
    loadProfileData();
  }, [user]);

  const loadProfileData = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      const [profRes, statsRes] = await Promise.all([
        api.vendors.getProfile().catch(() => null),
        api.vendors.getDashboardStats().catch(() => null)
      ]);

      if (profRes?.vendor) {
        setProfile(profRes.vendor);
        const avail = profRes.vendor.availability?.isAvailableNow ?? profRes.vendor.isAvailable ?? true;
        setIsAvailable(avail);
      }

      if (statsRes?.stats) {
        setDashboardStats(statsRes.stats);
      }
    } catch (err) {
      console.warn('Failed to load profile data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    loadProfileData(true);
  };

  const handleToggleAvailability = async (val: boolean) => {
    if (updatingAvailability) return;
    const prev = isAvailable;
    try {
      setUpdatingAvailability(true);
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
      setUpdatingAvailability(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Confirm Logout', 'Are you sure you want to sign out of WorkLogy?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await logout();
          navigation.resetTo ? navigation.resetTo('VendorLogin') : navigation.navigate('VendorLogin');
        }
      }
    ]);
  };

  // Derive display values from live data
  const displayName = profile?.businessName || user?.name || 'Professional Partner';
  const rating = profile?.rating ?? dashboardStats?.rating ?? 0;
  const reviewCount = profile?.reviewCount ?? profile?.reviewsCount ?? dashboardStats?.reviewCount ?? 0;
  const expYears = profile?.experienceYears || 0;
  const completedJobs = profile?.completedJobsCount ?? dashboardStats?.completedJobsCount ?? 0;
  const satisfactionRate = dashboardStats?.satisfactionRate ?? 100;

  const isVerified =
    profile?.isVerified === true ||
    profile?.verifiedBadge?.status === 'approved' ||
    profile?.verifiedBadge?.status === 'verified' ||
    profile?.verificationStatus === 'verified';

  const avatarUri =
    user?.avatar ||
    (profile as any)?.avatar ||
    (typeof profile?.user === 'object' && (profile?.user as any)?.avatar);

  return (
    <View style={styles.container}>
      {/* ── TOP HEADER (TITLE + SETTINGS GEAR) ── */}
      <View style={[styles.headerBar, { paddingTop: topInset + 6 }]}>
        <Text style={styles.headerTitle}>Profile</Text>
        <TouchableOpacity
          style={styles.settingsIconBtn}
          onPress={() => navigation.navigate('VendorSettings')}
          activeOpacity={0.7}
        >
          <Ionicons name="settings-outline" size={22} color="#111827" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[COLORS.primary]} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* ── A. DEEP-GREEN PROFILE HERO CARD ── */}
        <View style={styles.profileHeroCard}>
          {/* Top Row: Avatar + Name / Rating / Badge */}
          <View style={styles.profileHeroTopRow}>
            <TouchableOpacity
              style={styles.avatarWrap}
              onPress={() => navigation.navigate('VendorEditProfile')}
              activeOpacity={0.85}
            >
              {avatarUri && !imageError ? (
                <Image
                  source={{ uri: avatarUri }}
                  key={avatarUri}
                  style={styles.avatarImg}
                  resizeMode="cover"
                  onError={() => setImageError(true)}
                  onLoad={() => setImageError(false)}
                />
              ) : (
                <View style={styles.avatarFallback}>
                  <Text style={styles.avatarLetter}>
                    {displayName.charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
              {/* Edit Pencil Badge */}
              <View style={styles.pencilBadge}>
                <Ionicons name="pencil" size={11} color="#065F46" />
              </View>
            </TouchableOpacity>

            <View style={styles.profileHeroInfoCol}>
              <Text style={styles.profileHeroName} numberOfLines={1}>{displayName}</Text>
              <View style={styles.profileHeroRatingRow}>
                <Ionicons name="star" size={13} color="#F59E0B" />
                <Text style={styles.profileHeroRatingText}>
                  {Number(rating).toFixed(1)} ({reviewCount} reviews)
                </Text>
              </View>
              {/* Verified Badge Pill */}
              <View style={styles.verifiedVendorPill}>
                <Ionicons name="checkmark-circle" size={13} color="#065F46" />
                <Text style={styles.verifiedVendorPillText}>
                  {isVerified ? 'Verified Vendor' : 'Pending Verification'}
                </Text>
              </View>
            </View>
          </View>

          {/* Bottom Row: 3 Business Statistics */}
          <View style={styles.statsRow}>
            {/* Stat 1: Experience */}
            <View style={styles.statCol}>
              <Text style={styles.statNumber}>{expYears}+</Text>
              <Text style={styles.statLabel}>Years Experience</Text>
            </View>

            <View style={styles.statDivider} />

            {/* Stat 2: Jobs Completed */}
            <View style={styles.statCol}>
              <Text style={styles.statNumber}>{completedJobs}+</Text>
              <Text style={styles.statLabel}>Jobs Completed</Text>
            </View>

            <View style={styles.statDivider} />

            {/* Stat 3: Satisfaction */}
            <View style={styles.statCol}>
              <Text style={styles.statNumber}>{satisfactionRate}%</Text>
              <Text style={styles.statLabel}>Customer Satisfaction</Text>
            </View>
          </View>
        </View>

        {/* ── B. ONLINE FOR JOBS CARD ── */}
        <View style={styles.onlineJobsCard}>
          <View style={styles.onlineIconBox}>
            <Ionicons name="shield-checkmark" size={18} color="#059669" />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.onlineTitle}>Online for Jobs</Text>
            <Text style={styles.onlineSubtitle}>
              {isAvailable
                ? 'You will receive new job requests'
                : 'Turn on to receive new job requests'}
            </Text>
          </View>
          <Switch
            value={isAvailable}
            onValueChange={handleToggleAvailability}
            disabled={updatingAvailability}
            trackColor={{ false: '#CBD5E1', true: '#A7F3D0' }}
            thumbColor={isAvailable ? '#06684F' : '#94A3B8'}
          />
        </View>

        {/* ── C. PROFILE MENU LIST ── */}
        <View style={styles.menuCard}>
          {/* 1. My Services */}
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('VendorServices')}
            activeOpacity={0.75}
          >
            <View style={[styles.menuIconBox, { backgroundColor: '#EFF6FF' }]}>
              <Ionicons name="briefcase-outline" size={18} color="#2563EB" />
            </View>
            <View style={styles.menuContentCol}>
              <Text style={styles.menuTitle}>My Services</Text>
              <Text style={styles.menuSubtitle}>Manage your service listings</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
          </TouchableOpacity>

          <View style={styles.menuDivider} />

          {/* 1b. My Domains */}
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('VendorDomains')}
            activeOpacity={0.75}
          >
            <View style={[styles.menuIconBox, { backgroundColor: '#ECFDF5' }]}>
              <Ionicons name="layers-outline" size={18} color="#059669" />
            </View>
            <View style={styles.menuContentCol}>
              <Text style={styles.menuTitle}>My Domains</Text>
              <Text style={styles.menuSubtitle}>Manage your service categories</Text>
            </View>
            <View style={styles.domainBadge}>
              <Text style={styles.domainBadgeText}>
                {profile?.categories?.length || 0}/3
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
          </TouchableOpacity>

          <View style={styles.menuDivider} />

          {/* 2. Earnings & Payments */}
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('Earnings')}
            activeOpacity={0.75}
          >
            <View style={[styles.menuIconBox, { backgroundColor: '#FFF7ED' }]}>
              <Ionicons name="wallet-outline" size={18} color="#D97706" />
            </View>
            <View style={styles.menuContentCol}>
              <Text style={styles.menuTitle}>Earnings & Payments</Text>
              <Text style={styles.menuSubtitle}>Check your earnings and transactions</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
          </TouchableOpacity>

          <View style={styles.menuDivider} />

          {/* 3. KYC Verification */}
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('VendorKyc')}
            activeOpacity={0.75}
          >
            <View style={[styles.menuIconBox, { backgroundColor: '#ECFDF5' }]}>
              <Ionicons name="shield-checkmark-outline" size={18} color="#059669" />
            </View>
            <View style={styles.menuContentCol}>
              <Text style={styles.menuTitle}>KYC Verification</Text>
              <Text style={styles.menuSubtitle}>Upload and manage documents</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
          </TouchableOpacity>

          <View style={styles.menuDivider} />

          {/* 4. Reviews & Ratings */}
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('VendorReviews')}
            activeOpacity={0.75}
          >
            <View style={[styles.menuIconBox, { backgroundColor: '#FEF3C7' }]}>
              <Ionicons name="star-outline" size={18} color="#D97706" />
            </View>
            <View style={styles.menuContentCol}>
              <Text style={styles.menuTitle}>Reviews & Ratings</Text>
              <Text style={styles.menuSubtitle}>See what customers say about you</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
          </TouchableOpacity>

          <View style={styles.menuDivider} />

          {/* 5. Availability & Schedule */}
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('VendorSchedule')}
            activeOpacity={0.75}
          >
            <View style={[styles.menuIconBox, { backgroundColor: '#F3E8FF' }]}>
              <Ionicons name="calendar-outline" size={18} color="#7C3AED" />
            </View>
            <View style={styles.menuContentCol}>
              <Text style={styles.menuTitle}>Availability & Schedule</Text>
              <Text style={styles.menuSubtitle}>Set your working hours</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
          </TouchableOpacity>

          <View style={styles.menuDivider} />

          {/* 6. Service Area */}
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('VendorServiceArea')}
            activeOpacity={0.75}
          >
            <View style={[styles.menuIconBox, { backgroundColor: '#EFF6FF' }]}>
              <Ionicons name="location-outline" size={18} color="#2563EB" />
            </View>
            <View style={styles.menuContentCol}>
              <Text style={styles.menuTitle}>Service Area</Text>
              <Text style={styles.menuSubtitle}>Manage your coverage area</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
          </TouchableOpacity>

          <View style={styles.menuDivider} />

          {/* 7. Help & Support */}
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('VendorHelpSupport')}
            activeOpacity={0.75}
          >
            <View style={[styles.menuIconBox, { backgroundColor: '#ECFDF5' }]}>
              <Ionicons name="help-buoy-outline" size={18} color="#059669" />
            </View>
            <View style={styles.menuContentCol}>
              <Text style={styles.menuTitle}>Help & Support</Text>
              <Text style={styles.menuSubtitle}>Get help from our support team</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
          </TouchableOpacity>

          <View style={styles.menuDivider} />

          {/* 8. Settings & Account Security */}
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('VendorSettings')}
            activeOpacity={0.75}
          >
            <View style={[styles.menuIconBox, { backgroundColor: '#F1F5F9' }]}>
              <Ionicons name="settings-outline" size={18} color="#475569" />
            </View>
            <View style={styles.menuContentCol}>
              <Text style={styles.menuTitle}>Settings and Account Security</Text>
              <Text style={styles.menuSubtitle}>Security, notifications & preferences</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
          </TouchableOpacity>

          <View style={styles.menuDivider} />

          {/* 9. Sign Out */}
          <TouchableOpacity
            style={styles.menuItem}
            onPress={handleLogout}
            activeOpacity={0.75}
          >
            <View style={[styles.menuIconBox, { backgroundColor: '#FEE2E2' }]}>
              <Ionicons name="log-out-outline" size={18} color="#DC2626" />
            </View>
            <View style={styles.menuContentCol}>
              <Text style={[styles.menuTitle, { color: '#DC2626' }]}>Sign Out</Text>
              <Text style={styles.menuSubtitle}>Sign out from this device</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#DC2626" />
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC'
  },
  headerBar: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9'
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.3
  },
  settingsIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9'
  },
  scroll: {
    flex: 1
  },
  scrollContent: {
    padding: 16
  },

  // ── Hero Profile Card ──
  profileHeroCard: {
    backgroundColor: '#065F46', // Deep forest green
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
    shadowColor: '#065F46',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 10,
    elevation: 4
  },
  profileHeroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16
  },
  avatarWrap: {
    position: 'relative'
  },
  avatarImg: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    backgroundColor: '#047857'
  },
  avatarFallback: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF'
  },
  avatarLetter: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FFFFFF'
  },
  pencilBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2
  },
  profileHeroInfoCol: {
    flex: 1,
    marginLeft: 14
  },
  profileHeroName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 3
  },
  profileHeroRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6
  },
  profileHeroRatingText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#E2E8F0',
    marginLeft: 4
  },
  verifiedVendorPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 4
  },
  verifiedVendorPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#065F46'
  },

  // ── 3 Statistics Under Hero ──
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 8
  },
  statCol: {
    flex: 1,
    alignItems: 'center'
  },
  statNumber: {
    fontSize: 15,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 2
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#D1FAE5',
    textAlign: 'center'
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.25)'
  },

  // ── Online For Jobs Card ──
  onlineJobsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1
  },
  onlineIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center'
  },
  onlineTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2
  },
  onlineSubtitle: {
    fontSize: 12,
    color: '#64748B'
  },

  // ── Menu Card ──
  menuCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4
  },
  menuIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center'
  },
  menuContentCol: {
    flex: 1,
    marginLeft: 12
  },
  menuTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A'
  },
  menuSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginLeft: 48
  },
  domainBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    marginRight: 6
  },
  domainBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#065F46'
  }
});
