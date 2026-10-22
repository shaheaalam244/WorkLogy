import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  RefreshControl,
  ActivityIndicator,
  Alert
} from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { api } from '../api/client';
import { COLORS } from '../theme/colors';
import { formatCurrency, formatDate } from '../utils/formatters';
import type { Booking, VendorProfile } from '../types';

export default function VendorHomeScreen({ navigation }: any) {
  const { user } = useAuth();

  const [vendorProfile, setVendorProfile] = useState<VendorProfile | null>(null);
  const [isAvailable, setIsAvailable] = useState(true);
  const [activeBookings, setActiveBookings] = useState<Booking[]>([]);
  const [earnings, setEarnings] = useState<any | null>(null);
  const [activeEmergencyLead, setActiveEmergencyLead] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    loadVendorDashboard();
  }, [user]);

  const loadVendorDashboard = async () => {
    try {
      setLoading(true);
      const [profRes, bookRes, earnRes] = await Promise.all([
        api.vendors.getProfile().catch(() => null),
        api.bookings.getMyBookings().catch(() => ({ bookings: [] })),
        api.vendors.getEarnings().catch(() => null)
      ]);

      if (profRes?.vendor) {
        setVendorProfile(profRes.vendor);
        setIsAvailable(profRes.vendor.isAvailable ?? true);
      }
      if (bookRes?.bookings) {
        setActiveBookings(bookRes.bookings);
      }
      if (earnRes?.earnings) {
        setEarnings(earnRes.earnings);
      }
    } catch (err) {
      console.warn('Failed to load vendor dashboard:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadVendorDashboard();
  };

  const handleToggleAvailability = async (val: boolean) => {
    try {
      setToggling(true);
      setIsAvailable(val);
      await api.vendors.toggleAvailability(val);
    } catch (err: any) {
      setIsAvailable(!val);
      Alert.alert('Error', err.message || 'Could not update availability.');
    } finally {
      setToggling(false);
    }
  };

  const handleClaimEmergencyLead = async (lead: any) => {
    try {
      const res = await api.jobs.claimEmergencyLead(lead.jobId || lead._id);
      Alert.alert('Emergency Call Accepted! ⚡', 'You won the emergency tender. Navigate to Confirmed Jobs to contact the customer and verify Arrival OTP.');
      setActiveEmergencyLead(null);
      navigation.navigate('ConfirmedTab');
    } catch (err: any) {
      Alert.alert('Claim Failed', err.message || 'Another nearby technician claimed this job first.');
      setActiveEmergencyLead(null);
    }
  };

  const inProgressWork = activeBookings.find(
    (b) => ['confirmed', 'on_the_way', 'arrived', 'in_progress'].includes(b.status)
  );

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
    >
      {/* 1. Header Bar: Profile Status & Dispatch Toggle */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={{ flex: 1 }}>
            <View style={styles.nameRow}>
              <Text style={styles.vendorName}>
                {vendorProfile?.businessName || user?.name || 'Technician Pro'}
              </Text>
              {vendorProfile?.isVerified && (
                <View style={styles.verifiedBadge}>
                  <Text style={styles.verifiedBadgeText}>VERIFIED ✓</Text>
                </View>
              )}
            </View>
            <Text style={styles.vendorCategory}>
              ⭐ {vendorProfile?.rating ? vendorProfile.rating.toFixed(1) : '5.0'} ({vendorProfile?.reviewsCount || 12} reviews)
            </Text>
          </View>

          {/* Availability Toggle */}
          <View style={styles.availBox}>
            <Text style={[styles.availLabel, { color: isAvailable ? '#10B981' : '#DC2626' }]}>
              {isAvailable ? 'ONLINE' : 'OFFLINE'}
            </Text>
            <Switch
              value={isAvailable}
              onValueChange={handleToggleAvailability}
              disabled={toggling}
              trackColor={{ false: '#CBD5E1', true: '#BBF7D0' }}
              thumbColor={isAvailable ? COLORS.primary : '#94A3B8'}
            />
          </View>
        </View>

        <Text style={styles.serviceAreaText}>
          📍 Territory: {vendorProfile?.serviceAreas?.join(', ') || 'Noida, Greater Noida, Delhi NCR'}
        </Text>
      </View>

      {/* 2. Real-Time Emergency Incoming Lead Banner */}
      {activeEmergencyLead && (
        <View style={styles.emergencyLeadBanner}>
          <View style={styles.emergencyLeadHeader}>
            <Text style={styles.emergencyLeadPill}>⚡ NEW EMERGENCY SERVICE CALL</Text>
            <Text style={styles.emergencyLeadFee}>₹499 Diagnosis</Text>
          </View>
          <Text style={styles.emergencyLeadTitle}>
            {activeEmergencyLead.title || 'Urgent Electrical/Plumbing Breakdown'}
          </Text>
          <Text style={styles.emergencyLeadDesc}>
            {activeEmergencyLead.description || 'Customer reported urgent issue. First technician to accept gets the job.'}
          </Text>
          <Text style={styles.emergencyLeadLoc}>
            📍 Near {activeEmergencyLead.location?.city || 'Your Area'} (~2.4 km away)
          </Text>

          <View style={styles.emergencyLeadBtnRow}>
            <TouchableOpacity
              style={styles.claimBtn}
              onPress={() => handleClaimEmergencyLead(activeEmergencyLead)}
            >
              <Text style={styles.claimBtnText}>Accept Emergency Call Now ⚡</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.dismissBtn}
              onPress={() => setActiveEmergencyLead(null)}
            >
              <Text style={styles.dismissBtnText}>✕</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* 3. Urgent Active Work Widget */}
      {inProgressWork && (
        <View style={styles.activeJobWidget}>
          <View style={styles.activeJobHeader}>
            <Text style={styles.activeJobPill}>CURRENT IN-PROGRESS SERVICE</Text>
            <Text style={styles.activeJobStatus}>{inProgressWork.status.replace('_', ' ').toUpperCase()}</Text>
          </View>
          <Text style={styles.activeJobTitle}>{inProgressWork.serviceTitle}</Text>
          <Text style={styles.activeJobAddress}>📍 {inProgressWork.address?.street}</Text>

          <TouchableOpacity
            style={styles.activeJobBtn}
            onPress={() => navigation.navigate('ConfirmedTab')}
          >
            <Text style={styles.activeJobBtnText}>Open Field Actions & Verify Arrival OTP ›</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 4. KPI Performance Summary */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Dashboard Overview</Text>
        <View style={styles.kpiGrid}>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Net Available Payout</Text>
            <Text style={styles.kpiValue}>
              {formatCurrency(earnings?.availableForPayout || earnings?.netTotal || 3820)}
            </Text>
          </View>

          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Jobs Completed</Text>
            <Text style={styles.kpiValue}>
              {earnings?.completedJobsCount || vendorProfile?.completedJobsCount || 12}
            </Text>
          </View>

          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Held in Escrow</Text>
            <Text style={[styles.kpiValue, { color: '#D97706' }]}>
              {formatCurrency(earnings?.pendingEscrow || 1650)}
            </Text>
          </View>

          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Active Bookings</Text>
            <Text style={[styles.kpiValue, { color: '#2563EB' }]}>
              {activeBookings.filter((b) => b.status !== 'completed' && b.status !== 'cancelled').length}
            </Text>
          </View>
        </View>
      </View>

      {/* 5. Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('AvailableTab')}
          >
            <Text style={styles.actionEmoji}>📡</Text>
            <Text style={styles.actionTitle}>Find Available Tenders</Text>
            <Text style={styles.actionDesc}>Browse open customer service requests in your locality</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('EarningsTab')}
          >
            <Text style={styles.actionEmoji}>💰</Text>
            <Text style={styles.actionTitle}>Financial Ledger & Bank NEFT</Text>
            <Text style={styles.actionDesc}>Inspect escrow releases and weekly Monday payout details</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC'
  },
  header: {
    backgroundColor: '#064E3B',
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  vendorName: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF'
  },
  verifiedBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6
  },
  verifiedBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#065F46'
  },
  vendorCategory: {
    fontSize: 11,
    color: '#A7F3D0',
    marginTop: 2
  },
  availBox: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 6
  },
  availLabel: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
    marginBottom: 2
  },
  serviceAreaText: {
    fontSize: 11,
    color: '#D1FAE5',
    marginTop: 12
  },
  emergencyLeadBanner: {
    backgroundColor: '#FEF2F2',
    borderWidth: 2,
    borderColor: '#DC2626',
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: 18,
    padding: 16
  },
  emergencyLeadHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  emergencyLeadPill: {
    fontSize: 10,
    fontWeight: '900',
    color: '#DC2626'
  },
  emergencyLeadFee: {
    fontSize: 13,
    fontWeight: '900',
    color: '#991B1B'
  },
  emergencyLeadTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#7F1D1D',
    marginTop: 6
  },
  emergencyLeadDesc: {
    fontSize: 11,
    color: '#991B1B',
    lineHeight: 15,
    marginVertical: 4
  },
  emergencyLeadLoc: {
    fontSize: 11,
    color: '#7F1D1D',
    fontWeight: '700',
    marginBottom: 12
  },
  emergencyLeadBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  claimBtn: {
    flex: 1,
    backgroundColor: '#DC2626',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center'
  },
  claimBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900'
  },
  dismissBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center'
  },
  dismissBtnText: {
    color: '#991B1B',
    fontSize: 14,
    fontWeight: 'bold'
  },
  activeJobWidget: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1.5,
    borderColor: '#93C5FD',
    borderRadius: 18,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 14
  },
  activeJobHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4
  },
  activeJobPill: {
    fontSize: 9,
    fontWeight: '900',
    color: '#1E40AF',
    letterSpacing: 0.5
  },
  activeJobStatus: {
    fontSize: 9,
    fontWeight: '900',
    color: '#1E3A8A'
  },
  activeJobTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1E3A8A'
  },
  activeJobAddress: {
    fontSize: 11,
    color: '#3B82F6',
    marginVertical: 4
  },
  activeJobBtn: {
    backgroundColor: '#2563EB',
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: 'center',
    marginTop: 6
  },
  activeJobBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800'
  },
  section: {
    paddingHorizontal: 16,
    marginTop: 18
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textDark,
    marginBottom: 10
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10
  },
  kpiCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border
  },
  kpiLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textMuted,
    textTransform: 'uppercase'
  },
  kpiValue: {
    fontSize: 20,
    fontWeight: '900',
    color: COLORS.textDark,
    marginTop: 4
  },
  quickActions: {
    gap: 10
  },
  actionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border
  },
  actionEmoji: {
    fontSize: 24,
    marginBottom: 4
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textDark
  },
  actionDesc: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2
  }
});
