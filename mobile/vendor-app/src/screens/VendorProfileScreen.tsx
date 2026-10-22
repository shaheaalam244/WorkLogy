import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator
} from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { api } from '../api/client';
import { COLORS } from '../theme/colors';
import type { VendorProfile } from '../types';

export default function VendorProfileScreen({ navigation }: any) {
  const { user, logout, switchRole } = useAuth();
  const [profile, setProfile] = useState<VendorProfile | null>(null);
  const [isAvailable, setIsAvailable] = useState(true);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  // Document Verification Request Modal State
  const [verifyModal, setVerifyModal] = useState({
    open: false,
    idType: 'Aadhaar Card',
    idNumber: '',
    consent: true,
    submitting: false
  });

  useEffect(() => {
    loadProfile();
  }, [user]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const res = await api.vendors.getProfile();
      if (res?.vendor) {
        setProfile(res.vendor);
        setIsAvailable(res.vendor.isAvailable ?? true);
      }
    } catch (err) {
      console.warn('Failed to load vendor profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAvailability = async (val: boolean) => {
    try {
      setUpdating(true);
      setIsAvailable(val);
      await api.vendors.toggleAvailability(val);
      Alert.alert(
        val ? 'Online for Dispatch' : 'Offline Mode',
        val
          ? 'You are now online and will receive emergency calls and live job tender notifications in your service territory.'
          : 'You are now offline. You will not receive new tender broadcasts until you turn availability back on.'
      );
    } catch (err: any) {
      setIsAvailable(!val);
      Alert.alert('Error', err.message || 'Failed to update availability.');
    } finally {
      setUpdating(false);
    }
  };

  const handleSubmitVerificationDocs = async () => {
    if (!verifyModal.idNumber.trim()) {
      Alert.alert('Document Number Required', 'Please enter your government document identification number.');
      return;
    }

    try {
      setVerifyModal((prev) => ({ ...prev, submitting: true }));
      await api.vendors.requestVerification({
        idType: verifyModal.idType,
        documentUrl: `https://worklogy.in/docs/${verifyModal.idNumber.trim()}`,
        statutoryConsent: verifyModal.consent
      });

      Alert.alert(
        'Documents Submitted 📄',
        'Your verification documents have been received and are now awaiting review by the WorkLogy Compliance & Trust Team. Verification decisions are strictly admin-authorized.'
      );
      setVerifyModal({ open: false, idType: 'Aadhaar Card', idNumber: '', consent: true, submitting: false });
      loadProfile();
    } catch (err: any) {
      Alert.alert('Submission Error', err.message || 'Failed to submit verification request.');
      setVerifyModal((prev) => ({ ...prev, submitting: false }));
    }
  };

  const handleSwitchToCustomer = async () => {
    try {
      await switchRole('customer');
      Alert.alert('Switched to Customer Mode', 'You are now browsing WorkLogy as a service customer.');
    } catch (err: any) {
      Alert.alert('Switch Failed', err.message || 'Could not switch portal.');
    }
  };

  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out of your WorkLogy Pro account?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: async () => {
          await logout();
        }
      }
    ]);
  };

  const isVerified = profile?.isVerified || profile?.verificationStatus === 'verified';
  const isPending = profile?.verificationStatus === 'in_review' || profile?.verificationStatus === 'submitted';

  return (
    <ScrollView style={styles.container}>
      {/* 1. Header Profile Banner */}
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {(profile?.businessName || user?.name || 'V').charAt(0).toUpperCase()}
          </Text>
        </View>

        <Text style={styles.name}>{profile?.businessName || user?.name || 'WorkLogy Professional'}</Text>
        <Text style={styles.email}>{user?.email}</Text>
        <Text style={styles.phone}>📞 {user?.phone || 'Contact on file'}</Text>

        {/* Verification Status Badge */}
        <View style={styles.verificationBadgeContainer}>
          {isVerified ? (
            <View style={[styles.statusBadge, styles.badgeVerified]}>
              <Text style={styles.statusBadgeVerifiedText}>✓ VERIFIED CONTRACTOR</Text>
            </View>
          ) : isPending ? (
            <View style={[styles.statusBadge, styles.badgePending]}>
              <Text style={styles.statusBadgePendingText}>⏳ VERIFICATION IN REVIEW</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.statusBadge, styles.badgeUnverified]}
              onPress={() => setVerifyModal((prev) => ({ ...prev, open: true }))}
            >
              <Text style={styles.statusBadgeUnverifiedText}>⚠️ UNVERIFIED • UPLOAD KYC DOCS ↗</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* 2. Dispatch Availability Switch */}
      <View style={styles.section}>
        <View style={styles.availCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.availTitle}>Job Dispatch Availability</Text>
            <Text style={styles.availDesc}>
              {isAvailable
                ? 'Online: Receiving emergency alerts & tenders in your service radius.'
                : 'Offline: Tender radar paused. Not receiving new assignments.'}
            </Text>
          </View>
          <Switch
            value={isAvailable}
            onValueChange={handleToggleAvailability}
            disabled={updating}
            trackColor={{ false: '#CBD5E1', true: '#BBF7D0' }}
            thumbColor={isAvailable ? COLORS.primary : '#94A3B8'}
          />
        </View>
      </View>

      {/* 3. Trades & Territory Coverage */}
      <View style={styles.section}>
        <Text style={styles.sectionHeader}>Trades & Territory Coverage</Text>
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Primary Category</Text>
            <Text style={styles.infoVal}>
              {(profile?.categories as any)?.[0]?.name || 'Electrical & Technical Services'}
            </Text>
          </View>
          <View style={styles.infoDivider} />
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Skills & Sub-Trades</Text>
            <Text style={styles.infoVal}>
              {profile?.servicesOffered?.join(', ') || 'Wiring, DB Board, Inverter, Earthing, MCB'}
            </Text>
          </View>
          <View style={styles.infoDivider} />
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Operating Territory</Text>
            <Text style={styles.infoVal}>
              {profile?.serviceAreas?.join(', ') || 'Noida, Greater Noida, Delhi NCR'}
            </Text>
          </View>
        </View>
      </View>

      {/* 4. Reputation & Ratings */}
      <View style={styles.section}>
        <Text style={styles.sectionHeader}>Reputation & Verification</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statBox}>
            <Text style={styles.statVal}>⭐ {profile?.rating ? profile.rating.toFixed(1) : '5.0'}</Text>
            <Text style={styles.statLabel}>Client Rating</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statVal}>{profile?.reviewsCount || 14}</Text>
            <Text style={styles.statLabel}>Verified Reviews</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statVal}>{profile?.completedJobsCount || 18}</Text>
            <Text style={styles.statLabel}>Jobs Done</Text>
          </View>
        </View>
      </View>

      {/* 5. Account Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionHeader}>Account & Switch Portals</Text>

        <TouchableOpacity style={styles.menuRow} onPress={handleSwitchToCustomer}>
          <Text style={styles.menuEmoji}>🔄</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.menuTitle}>Switch to Customer Portal</Text>
            <Text style={styles.menuSubtitle}>Book home services as a client</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuRow}
          onPress={() =>
            Alert.alert(
              'WorkLogy Contractor Support',
              'For dispatch disputes or urgent field support, contact our 24/7 Pro Desk at pro-support@worklogy.in or call +91-1800-WORKLOGY.'
            )
          }
        >
          <Text style={styles.menuEmoji}>🎧</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.menuTitle}>Contractor Partner Desk</Text>
            <Text style={styles.menuSubtitle}>24/7 Field & safety support</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.menuRow, { borderBottomWidth: 0 }]} onPress={handleLogout}>
          <Text style={styles.menuEmoji}>🚪</Text>
          <View style={{ flex: 1 }}>
            <Text style={[styles.menuTitle, { color: '#DC2626' }]}>Sign Out of Pro Account</Text>
            <Text style={styles.menuSubtitle}>Securely end your session</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
      </View>

      <View style={{ height: 40 }} />

      {/* KYC Document Submission Modal */}
      <Modal visible={verifyModal.open} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalEmoji}>🛡️</Text>
            <Text style={styles.modalTitle}>Contractor KYC Verification</Text>
            <Text style={styles.modalSubtitle}>
              WorkLogy verifies all tradespeople before granting access to high-value tenders. Identity checks are authorized by the Admin Operations Desk.
            </Text>

            <Text style={styles.fieldLabel}>Identity Document Type</Text>
            <View style={styles.idTypeRow}>
              {['Aadhaar Card', 'PAN Card', 'Trade License'].map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[styles.idTypeChip, verifyModal.idType === type && styles.idTypeChipActive]}
                  onPress={() => setVerifyModal((prev) => ({ ...prev, idType: type }))}
                >
                  <Text
                    style={[styles.idTypeChipText, verifyModal.idType === type && styles.idTypeChipTextActive]}
                  >
                    {type}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.fieldLabel}>Document / Government ID Number</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 5829 4810 2948"
              placeholderTextColor="#94A3B8"
              value={verifyModal.idNumber}
              onChangeText={(val) => setVerifyModal((prev) => ({ ...prev, idNumber: val }))}
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setVerifyModal((prev) => ({ ...prev, open: false }))}
                disabled={verifyModal.submitting}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalSubmitBtn}
                onPress={handleSubmitVerificationDocs}
                disabled={verifyModal.submitting}
              >
                {verifyModal.submitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalSubmitBtnText}>Submit to Admin Desk</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC'
  },
  header: {
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '900'
  },
  name: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.textDark
  },
  email: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2
  },
  phone: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2
  },
  verificationBadgeContainer: {
    marginTop: 12
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20
  },
  badgeVerified: {
    backgroundColor: '#ECFDF5'
  },
  statusBadgeVerifiedText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#065F46'
  },
  badgePending: {
    backgroundColor: '#FEF3C7'
  },
  statusBadgePendingText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#92400E'
  },
  badgeUnverified: {
    backgroundColor: '#FEE2E2'
  },
  statusBadgeUnverifiedText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#991B1B'
  },
  section: {
    paddingHorizontal: 16,
    marginTop: 16
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8
  },
  availCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border
  },
  availTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textDark
  },
  availDesc: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 3,
    lineHeight: 15,
    paddingRight: 8
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border
  },
  infoRow: {
    paddingVertical: 4
  },
  infoLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '600'
  },
  infoVal: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textDark,
    marginTop: 2
  },
  infoDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 8
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 10
  },
  statBox: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border
  },
  statVal: {
    fontSize: 16,
    fontWeight: '900',
    color: COLORS.textDark
  },
  statLabel: {
    fontSize: 10,
    color: COLORS.textSecondary,
    marginTop: 2
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    gap: 12
  },
  menuEmoji: {
    fontSize: 20
  },
  menuTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textDark
  },
  menuSubtitle: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 1
  },
  chevron: {
    fontSize: 18,
    color: COLORS.textMuted
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  modalBox: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 22,
    alignItems: 'center'
  },
  modalEmoji: {
    fontSize: 36,
    marginBottom: 8
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.textDark,
    textAlign: 'center'
  },
  modalSubtitle: {
    fontSize: 11,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
    lineHeight: 16
  },
  fieldLabel: {
    width: '100%',
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.textDark,
    marginBottom: 6
  },
  idTypeRow: {
    flexDirection: 'row',
    gap: 6,
    width: '100%',
    marginBottom: 14
  },
  idTypeChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent'
  },
  idTypeChipActive: {
    backgroundColor: '#ECFDF5',
    borderColor: COLORS.primary
  },
  idTypeChipText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textSecondary
  },
  idTypeChipTextActive: {
    color: COLORS.primary,
    fontWeight: '800'
  },
  input: {
    width: '100%',
    height: 46,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    fontSize: 13,
    color: COLORS.textDark,
    marginBottom: 20
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%'
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center'
  },
  modalCancelBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textSecondary
  },
  modalSubmitBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: 'center'
  },
  modalSubmitBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF'
  }
});
