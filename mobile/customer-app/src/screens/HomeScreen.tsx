import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  RefreshControl,
  ActivityIndicator
} from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { api } from '../api/client';
import { COLORS } from '../theme/colors';
import { formatCurrency, formatDate } from '../utils/formatters';
import type { ServiceCategory, Booking } from '../types';

export default function HomeScreen({ navigation }: any) {
  const { user } = useAuth();
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [activeBookings, setActiveBookings] = useState<Booking[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentCity, setCurrentCity] = useState('Noida, Sector 62');

  useEffect(() => {
    loadHomeData();
  }, [user]);

  const loadHomeData = async () => {
    try {
      setLoading(true);
      const [catRes, bookRes] = await Promise.all([
        api.categories.getAll().catch(() => ({ categories: [] })),
        user ? api.bookings.getMyBookings().catch(() => ({ bookings: [] })) : Promise.resolve({ bookings: [] })
      ]);

      if (catRes?.categories) {
        setCategories(catRes.categories.slice(0, 8));
      }
      if (bookRes?.bookings) {
        setActiveBookings(bookRes.bookings.filter((b) => b.status !== 'completed' && b.status !== 'cancelled'));
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

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
    >
      {/* 1. Header Bar with Brand & Location */}
      <View style={styles.header}>
        <View style={styles.brandRow}>
          <View>
            <Text style={styles.brandTitle}>WorkLogy</Text>
            <Text style={styles.brandSubtitle}>Verified Local Services Marketplace</Text>
          </View>
          <TouchableOpacity
            style={styles.locationPill}
            onPress={() => navigation.navigate('ProfileTab')}
          >
            <Text style={styles.locationIcon}>📍</Text>
            <Text style={styles.locationText} numberOfLines={1}>{currentCity}</Text>
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search electrician, plumber, AC repair..."
            placeholderTextColor={COLORS.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={() => navigation.navigate('ExploreTab', { search: searchQuery })}
          />
        </View>
      </View>

      {/* 2. Urgent Emergency Callout */}
      <View style={styles.emergencyCard}>
        <View style={styles.emergencyHeader}>
          <Text style={styles.emergencyIconBadge}>⚡</Text>
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={styles.emergencyTitle}>24/7 Rapid Emergency Dispatch</Text>
            <Text style={styles.emergencyDesc}>
              Water leak, power tripping, lock lockout? On-demand technician dispatch in 30-45 mins.
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.emergencyBtn}
          onPress={() => navigation.navigate('Emergency')}
        >
          <Text style={styles.emergencyBtnText}>Request Emergency Service (₹499 Diagnosis) 🚨</Text>
        </TouchableOpacity>
      </View>

      {/* 3. Popular Service Categories Grid */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Popular Trade Services</Text>
          <TouchableOpacity onPress={() => navigation.navigate('ExploreTab')}>
            <Text style={styles.seeAllText}>View All 30 Trades ›</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator size="small" color={COLORS.primary} style={{ marginVertical: 20 }} />
        ) : (
          <View style={styles.categoryGrid}>
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat._id || cat.slug}
                style={styles.categoryItem}
                onPress={() => navigation.navigate('CategoryDetail', { slug: cat.slug, name: cat.name })}
              >
                <View style={styles.categoryIconCircle}>
                  <Text style={styles.categoryEmoji}>{cat.icon || '🛠️'}</Text>
                </View>
                <Text style={styles.categoryName} numberOfLines={2}>
                  {cat.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* 4. Active Service Orders / OTP Tracker */}
      {activeBookings.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Active In-Progress Services</Text>
            <TouchableOpacity onPress={() => navigation.navigate('MyJobsTab')}>
              <Text style={styles.seeAllText}>View All ›</Text>
            </TouchableOpacity>
          </View>

          {activeBookings.slice(0, 2).map((booking) => (
            <TouchableOpacity
              key={booking._id}
              style={styles.bookingCard}
              onPress={() => navigation.navigate('JobDetail', { bookingId: booking._id })}
            >
              <View style={styles.bookingCardTop}>
                <View>
                  <Text style={styles.bookingTitle}>{booking.serviceTitle}</Text>
                  <Text style={styles.bookingDate}>
                    Scheduled: {formatDate(booking.scheduledDate || booking.createdAt)}
                  </Text>
                </View>
                <View style={styles.badgePending}>
                  <Text style={styles.badgeTextPending}>
                    {booking.status.replace('_', ' ').toUpperCase()}
                  </Text>
                </View>
              </View>

              {booking.arrivalOtp && (
                <View style={styles.otpBanner}>
                  <Text style={styles.otpLabel}>ARRIVAL SECURITY OTP:</Text>
                  <Text style={styles.otpValue}>{booking.arrivalOtp}</Text>
                  <Text style={styles.otpHint}>Share with technician only upon physical arrival</Text>
                </View>
              )}

              <View style={styles.bookingFooter}>
                <Text style={styles.bookingAmount}>{formatCurrency(booking.totalAmount)}</Text>
                <Text style={styles.bookingActionText}>Track Status ›</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* 5. Trust & Escrow Guarantee Banner */}
      <View style={styles.trustBanner}>
        <Text style={styles.trustTitle}>The WorkLogy Escrow Guarantee</Text>
        <Text style={styles.trustDesc}>
          ✓ 100% Verified Tradespeople  •  ✓ Funds Held in Escrow Until Satisfied  •  ✓ Standard Transparent Pricing
        </Text>
      </View>

      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC'
  },
  header: {
    backgroundColor: '#06684F',
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24
  },
  brandRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16
  },
  brandTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5
  },
  brandSubtitle: {
    fontSize: 11,
    color: '#D1FAE5',
    marginTop: 2
  },
  locationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    maxWidth: 140
  },
  locationIcon: {
    fontSize: 12,
    marginRight: 4
  },
  locationText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700'
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 48,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 8
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textDark
  },
  emergencyCard: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1.5,
    borderColor: '#FECACA',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 18,
    padding: 16
  },
  emergencyHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start'
  },
  emergencyIconBadge: {
    fontSize: 28
  },
  emergencyTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#991B1B'
  },
  emergencyDesc: {
    fontSize: 11,
    color: '#7F1D1D',
    marginTop: 4,
    lineHeight: 16
  },
  emergencyBtn: {
    backgroundColor: '#DC2626',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 12
  },
  emergencyBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900'
  },
  section: {
    marginTop: 22,
    paddingHorizontal: 16
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textDark
  },
  seeAllText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10
  },
  categoryItem: {
    width: '23%',
    alignItems: 'center',
    marginBottom: 10
  },
  categoryIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2
  },
  categoryEmoji: {
    fontSize: 24
  },
  categoryName: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textDark,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 13
  },
  bookingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 5,
    elevation: 2
  },
  bookingCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start'
  },
  bookingTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textDark
  },
  bookingDate: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2
  },
  badgePending: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6
  },
  badgeTextPending: {
    fontSize: 9,
    fontWeight: '800',
    color: '#2563EB'
  },
  otpBanner: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 10,
    padding: 10,
    marginTop: 10,
    alignItems: 'center'
  },
  otpLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#B45309',
    letterSpacing: 0.5
  },
  otpValue: {
    fontSize: 22,
    fontWeight: '900',
    color: '#92400E',
    letterSpacing: 4,
    marginVertical: 2
  },
  otpHint: {
    fontSize: 10,
    color: '#B45309'
  },
  bookingFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9'
  },
  bookingAmount: {
    fontSize: 14,
    fontWeight: '900',
    color: COLORS.primary
  },
  bookingActionText: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.primary
  },
  trustBanner: {
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 14,
    padding: 14,
    alignItems: 'center'
  },
  trustTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#166534'
  },
  trustDesc: {
    fontSize: 10,
    color: '#15803D',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 14
  }
});
