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
  Image,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../hooks/useAuth';
import { api } from '../api/client';
import { COLORS } from '../theme/colors';
import Header from '../components/Header';
import type { VendorProfile } from '../types';

export default function VendorProfileScreen({ navigation }: any) {
  const { user, logout, switchRole } = useAuth();
  const [profile, setProfile] = useState<VendorProfile | null>(null);
  const [isAvailable, setIsAvailable] = useState(true);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Verification Modal State
  const [verifyModalOpen, setVerifyModalOpen] = useState(false);
  const [idType, setIdType] = useState('Aadhaar Card');
  const [idNumber, setIdNumber] = useState('');
  const [consent, setConsent] = useState(true);
  const [submittingDocs, setSubmittingDocs] = useState(false);

  // Edit Profile Modal State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [businessName, setBusinessName] = useState('');
  const [bio, setBio] = useState('');
  const [serviceAreas, setServiceAreas] = useState('');
  const [experienceYears, setExperienceYears] = useState('5');
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    loadProfileData();
  }, [user]);

  const loadProfileData = async () => {
    try {
      setLoading(true);
      const [profRes, notifRes] = await Promise.all([
        api.vendors.getProfile().catch(() => null),
        api.notifications.getUnreadCount().catch(() => ({ count: 0 }))
      ]);

      if (profRes?.vendor) {
        setProfile(profRes.vendor);
        const avail = profRes.vendor.availability?.isAvailableNow ?? profRes.vendor.isAvailable ?? true;
        setIsAvailable(avail);
        setBusinessName(profRes.vendor.businessName || '');
        setBio(profRes.vendor.bio || '');
        setServiceAreas(profRes.vendor.serviceAreas?.join(', ') || 'Gomti Nagar, Aliganj, Lucknow');
        setExperienceYears(profRes.vendor.experienceYears?.toString() || '5');
      }
      if (notifRes?.count) {
        setUnreadCount(notifRes.count);
      }
    } catch (err) {
      console.warn('Failed to load vendor profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAvailability = async (val: boolean) => {
    if (updating) return;
    const prev = isAvailable;
    try {
      setUpdating(true);
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
      setUpdating(false);
    }
  };

  const handleSubmitVerification = async () => {
    if (!idNumber.trim()) {
      Alert.alert('Document Number Required', 'Please enter your government document identification number.');
      return;
    }

    try {
      setSubmittingDocs(true);
      await api.vendors.requestVerification({
        idType,
        documentUrl: `https://worklogy.in/docs/${idNumber.trim()}`,
        statutoryConsent: consent
      });

      Alert.alert(
        'Documents Submitted 📄',
        'Your identity documents have been submitted to the WorkLogy Compliance Team for administrative verification.'
      );
      setVerifyModalOpen(false);
      loadProfileData();
    } catch (err: any) {
      Alert.alert('Submission Error', err.message || 'Could not submit verification.');
    } finally {
      setSubmittingDocs(false);
    }
  };

  const handleSaveProfile = async () => {
    try {
      setSavingProfile(true);
      const areas = serviceAreas.split(',').map((s) => s.trim()).filter(Boolean);
      await api.vendors.updateProfile({
        businessName,
        bio,
        serviceAreas: areas,
        experienceYears: parseInt(experienceYears, 10) || 5
      });

      Alert.alert('Success', 'Your professional profile has been updated.');
      setEditModalOpen(false);
      loadProfileData();
    } catch (err: any) {
      Alert.alert('Update Failed', err.message || 'Could not update profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Confirm Logout', 'Are you sure you want to sign out of WorkLogy Pro?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await logout();
          navigation.navigate('VendorLogin');
        }
      }
    ]);
  };

  // Verification status mapping
  const getVerificationState = () => {
    if (profile?.isVerified) return { label: 'Verified', bg: '#ECFDF5', color: '#047857', icon: 'shield-checkmark' };
    if (profile?.verificationStatus === 'submitted' || profile?.verificationStatus === 'in_review') {
      return { label: 'Under Review', bg: '#FEF3C7', color: '#B45309', icon: 'time' };
    }
    if (profile?.verificationStatus === 'rejected') {
      return { label: 'Action Required', bg: '#FEE2E2', color: '#B91C1C', icon: 'alert-circle' };
    }
    return { label: 'Not Submitted', bg: '#F3F4F6', color: '#4B5563', icon: 'document-text-outline' };
  };

  const vState = getVerificationState();

  return (
    <View style={styles.container}>
      <Header
        unreadCount={unreadCount}
        userName={profile?.businessName || user?.name || 'Pro'}
        onPressNotifications={() => navigation.navigate('Notifications')}
        onPressProfile={() => {}}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── 1. VENDOR PROFILE CARD ── */}
        <View style={styles.profileCard}>
          <View style={styles.avatarRow}>
            <View style={styles.avatarWrapper}>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarLetter}>
                  {(profile?.businessName || user?.name || 'P').charAt(0).toUpperCase()}
                </Text>
              </View>
              {profile?.isVerified && (
                <View style={styles.verifiedPin}>
                  <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                </View>
              )}
            </View>

            <View style={styles.infoCol}>
              <Text style={styles.businessName}>
                {profile?.businessName || user?.name || 'Aalam Electrical Services'}
              </Text>
              <Text style={styles.tradeTitle}>
                {profile?.categories?.length
                  ? (profile.categories as any).map((c: any) => c.name || c).join(', ')
                  : 'Multi-Skilled Contractor'}
              </Text>
              <View style={styles.ratingRow}>
                <Ionicons name="star" size={14} color="#F59E0B" />
                <Text style={styles.ratingText}>
                  {profile?.rating ? profile.rating.toFixed(1) : '4.9'} ({profile?.reviewsCount || 42} reviews)
                </Text>
                <Text style={styles.bullet}>•</Text>
                <Text style={styles.expText}>{profile?.experienceYears || 6} yrs exp</Text>
              </View>
            </View>
          </View>

          {/* Territory & Verification Status Bar */}
          <View style={styles.territoryRow}>
            <Ionicons name="location-outline" size={14} color={COLORS.textMuted} />
            <Text style={styles.territoryText} numberOfLines={1}>
              {profile?.serviceAreas?.join(', ') || 'Gomti Nagar, Aliganj, Lucknow'}
            </Text>
          </View>

          <View style={styles.statusDivider} />

          <View style={styles.cardFooter}>
            <View style={[styles.verificationPill, { backgroundColor: vState.bg }]}>
              <Ionicons name={vState.icon as any} size={13} color={vState.color} />
              <Text style={[styles.verificationText, { color: vState.color }]}>
                {vState.label}
              </Text>
            </View>

            <TouchableOpacity style={styles.editBtn} onPress={() => setEditModalOpen(true)}>
              <Ionicons name="pencil" size={12} color={COLORS.textDark} />
              <Text style={styles.editBtnText}>Edit Profile</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── 2. AVAILABILITY & DISPATCH TOGGLE ── */}
        <View style={styles.sectionCard}>
          <View style={styles.toggleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.toggleTitle}>Availability for Service Dispatch</Text>
              <Text style={styles.toggleSubtitle}>
                {isAvailable
                  ? 'ONLINE: Receiving job opportunities and emergency calls'
                  : 'OFFLINE: Hidden from instant customer booking radars'}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              {updating && <ActivityIndicator size="small" color={COLORS.primary} />}
              <Switch
                value={isAvailable}
                onValueChange={handleToggleAvailability}
                disabled={updating}
                trackColor={{ false: '#CBD5E1', true: '#A7F3D0' }}
                thumbColor={isAvailable ? COLORS.primary : '#94A3B8'}
              />
            </View>
          </View>
        </View>

        {/* ── 3. MENU ITEMS ── */}
        <View style={styles.sectionCard}>
          <Text style={styles.menuGroupHeading}>Service Management</Text>

          <TouchableOpacity style={styles.menuItem} onPress={() => setEditModalOpen(true)}>
            <View style={[styles.menuIconBox, { backgroundColor: '#EFF6FF' }]}>
              <Ionicons name="person-outline" size={18} color="#2563EB" />
            </View>
            <Text style={styles.menuLabel}>Edit Business Profile</Text>
            <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('VendorServices')}
          >
            <View style={[styles.menuIconBox, { backgroundColor: '#ECFDF5' }]}>
              <Ionicons name="construct-outline" size={18} color="#059669" />
            </View>
            <Text style={styles.menuLabel}>My Services & Catalog</Text>
            <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => setVerifyModalOpen(true)}
          >
            <View style={[styles.menuIconBox, { backgroundColor: '#FEF3C7' }]}>
              <Ionicons name="shield-checkmark-outline" size={18} color="#D97706" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.menuLabel}>Verification Documents (KYC)</Text>
              <Text style={styles.menuSub}>{vState.label}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('EarningsTab')}
          >
            <View style={[styles.menuIconBox, { backgroundColor: '#F3E8FF' }]}>
              <Ionicons name="card-outline" size={18} color="#7C3AED" />
            </View>
            <Text style={styles.menuLabel}>Bank & Payout Details</Text>
            <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
          </TouchableOpacity>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.menuGroupHeading}>Support & Security</Text>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() =>
              Alert.alert('WorkLogy Pro Support', 'Need help with a job or payout? Call +91 800-WORKLOGY or email support@worklogy.in')
            }
          >
            <View style={[styles.menuIconBox, { backgroundColor: '#F1F5F9' }]}>
              <Ionicons name="help-buoy-outline" size={18} color="#334155" />
            </View>
            <Text style={styles.menuLabel}>Help & Support</Text>
            <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() =>
              Alert.alert('App Preferences', 'WorkLogy Pro v1.0.0 (Production Build). Location services: High Accuracy.')
            }
          >
            <View style={[styles.menuIconBox, { backgroundColor: '#F1F5F9' }]}>
              <Ionicons name="settings-outline" size={18} color="#334155" />
            </View>
            <Text style={styles.menuLabel}>Settings & Preferences</Text>
            <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.menuItem, { borderBottomWidth: 0 }]} onPress={handleLogout}>
            <View style={[styles.menuIconBox, { backgroundColor: '#FEE2E2' }]}>
              <Ionicons name="log-out-outline" size={18} color="#DC2626" />
            </View>
            <Text style={[styles.menuLabel, { color: '#DC2626' }]}>Sign Out</Text>
            <Ionicons name="chevron-forward" size={18} color="#DC2626" />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* ── 4. KYC VERIFICATION MODAL ── */}
      <Modal visible={verifyModalOpen} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Statutory KYC Verification</Text>
              <TouchableOpacity onPress={() => setVerifyModalOpen(false)}>
                <Ionicons name="close" size={24} color={COLORS.textDark} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ marginBottom: 16 }}>
              <Text style={styles.modalDesc}>
                In compliance with Indian hyperlocal service safety mandates, submit your government-issued identity proof to unlock the verified badge.
              </Text>

              <Text style={styles.fieldLabel}>Select ID Proof</Text>
              <View style={styles.idTypeRow}>
                {['Aadhaar Card', 'PAN Card', 'Voter ID', 'Trade License'].map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[styles.idTypePill, idType === type && styles.idTypePillActive]}
                    onPress={() => setIdType(type)}
                  >
                    <Text
                      style={[styles.idTypePillText, idType === type && styles.idTypePillTextActive]}
                    >
                      {type}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.fieldLabel}>Document / ID Number</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. 5432 1098 7654"
                value={idNumber}
                onChangeText={setIdNumber}
                autoCapitalize="characters"
              />

              <TouchableOpacity
                style={styles.consentRow}
                onPress={() => setConsent(!consent)}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={consent ? 'checkbox' : 'square-outline'}
                  size={20}
                  color={consent ? COLORS.primary : COLORS.textMuted}
                />
                <Text style={styles.consentText}>
                  I consent to WorkLogy conducting administrative identity checks for trust and customer safety.
                </Text>
              </TouchableOpacity>
            </ScrollView>

            <TouchableOpacity
              style={styles.submitModalBtn}
              onPress={handleSubmitVerification}
              disabled={submittingDocs}
            >
              {submittingDocs ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.submitModalBtnText}>Submit Documents for Review</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── 5. EDIT PROFILE MODAL ── */}
      <Modal visible={editModalOpen} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Business Profile</Text>
              <TouchableOpacity onPress={() => setEditModalOpen(false)}>
                <Ionicons name="close" size={24} color={COLORS.textDark} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ marginBottom: 16 }}>
              <Text style={styles.fieldLabel}>Business / Contractor Name</Text>
              <TextInput
                style={styles.textInput}
                value={businessName}
                onChangeText={setBusinessName}
                placeholder="e.g. Aalam Electrical Services"
              />

              <Text style={styles.fieldLabel}>Experience (Years)</Text>
              <TextInput
                style={styles.textInput}
                keyboardType="numeric"
                value={experienceYears}
                onChangeText={setExperienceYears}
                placeholder="6"
              />

              <Text style={styles.fieldLabel}>Service Territories (Comma Separated)</Text>
              <TextInput
                style={styles.textInput}
                value={serviceAreas}
                onChangeText={setServiceAreas}
                placeholder="Gomti Nagar, Aliganj, Hazratganj"
              />

              <Text style={styles.fieldLabel}>Bio & Specializations</Text>
              <TextInput
                style={[styles.textInput, { height: 70, textAlignVertical: 'top' }]}
                multiline
                numberOfLines={3}
                value={bio}
                onChangeText={setBio}
                placeholder="Licensed electrician offering residential and commercial installations..."
              />
            </ScrollView>

            <TouchableOpacity
              style={styles.submitModalBtn}
              onPress={handleSaveProfile}
              disabled={savingProfile}
            >
              {savingProfile ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.submitModalBtnText}>Save Changes</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background
  },
  scroll: {
    flex: 1
  },
  scrollContent: {
    paddingBottom: 100
  },
  profileCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  avatarWrapper: {
    position: 'relative'
  },
  avatarCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#E0E7FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#C7D2FE'
  },
  avatarLetter: {
    fontSize: 22,
    fontWeight: '800',
    color: '#3730A3'
  },
  verifiedPin: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#10B981',
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF'
  },
  infoCol: {
    flex: 1,
    marginLeft: 14
  },
  businessName: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textDark
  },
  tradeTitle: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#92400E'
  },
  bullet: {
    fontSize: 12,
    color: COLORS.textMuted
  },
  expText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '600'
  },
  territoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 4
  },
  territoryText: {
    fontSize: 12,
    color: COLORS.textMuted,
    flex: 1
  },
  statusDivider: {
    height: 1,
    backgroundColor: COLORS.borderLight,
    marginVertical: 12
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  verificationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4
  },
  verificationText: {
    fontSize: 11,
    fontWeight: '800'
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    gap: 4
  },
  editBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textDark
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  toggleTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textDark
  },
  toggleSubtitle: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
    lineHeight: 16,
    paddingRight: 8
  },
  menuGroupHeading: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight
  },
  menuIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12
  },
  menuLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textDark,
    flex: 1
  },
  menuSub: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 1
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end'
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    padding: 18
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.textDark
  },
  modalDesc: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 17,
    marginBottom: 12
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginBottom: 6,
    marginTop: 6
  },
  idTypeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8
  },
  idTypePill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: COLORS.border
  },
  idTypePillActive: {
    backgroundColor: '#152B3C',
    borderColor: '#152B3C'
  },
  idTypePillText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textDark
  },
  idTypePillTextActive: {
    color: '#FFFFFF'
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: COLORS.textDark,
    marginBottom: 8
  },
  consentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 8,
    gap: 8
  },
  consentText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    flex: 1,
    lineHeight: 16
  },
  submitModalBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10
  },
  submitModalBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF'
  }
});
