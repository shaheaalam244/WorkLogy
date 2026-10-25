import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Linking
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '../context/NavigationContext';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { COLORS } from '../theme/colors';
import { pushNotificationService } from '../services/pushNotificationService';

export default function VendorSettingsScreen({ navigation: navProp }: any) {
  const contextNav = useNavigation();
  const navigation = navProp || contextNav;
  const { user, logout } = useAuth();
  const insets = useSafeAreaInsets();
  const topInset = Math.max(insets.top, Platform.OS === 'android' ? 24 : 0);

  // Notification Preferences State
  const [loadingPrefs, setLoadingPrefs] = useState(false);
  const [savingPref, setSavingPref] = useState(false);
  const [sendingTestPush, setSendingTestPush] = useState(false);
  const [preferences, setPreferences] = useState({
    emailQuotations: true,
    emailBookings: true,
    emailStatusUpdates: true,
    emailCancellations: true,
    emailMarketing: false,
    pushMessages: true,
    pushJobLeads: true,
    pushBookings: true,
    pushStatusUpdates: true,
    pushCancellations: true
  });

  // Password Modal State
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Biometrics
  const [biometricsEnabled, setBiometricsEnabled] = useState(true);

  useEffect(() => {
    fetchNotificationPreferences();
  }, []);

  const fetchNotificationPreferences = async () => {
    try {
      setLoadingPrefs(true);
      const res = await api.notifications.getPreferences();
      if (res?.success && res.preferences) {
        setPreferences({
          emailQuotations: res.preferences.emailQuotations ?? true,
          emailBookings: res.preferences.emailBookings ?? true,
          emailStatusUpdates: res.preferences.emailStatusUpdates ?? true,
          emailCancellations: res.preferences.emailCancellations ?? true,
          emailMarketing: res.preferences.emailMarketing ?? false,
          pushMessages: res.preferences.pushMessages ?? true,
          pushJobLeads: res.preferences.pushJobLeads ?? true,
          pushBookings: res.preferences.pushBookings ?? true,
          pushStatusUpdates: res.preferences.pushStatusUpdates ?? true,
          pushCancellations: res.preferences.pushCancellations ?? true
        });
      }
    } catch {
      // Default preferences maintained
    } finally {
      setLoadingPrefs(false);
    }
  };

  const handleSendTestPush = async () => {
    try {
      setSendingTestPush(true);

      // Present an immediate system notification banner on phone with sound & vibration
      await pushNotificationService.presentLocalNotification({
        title: 'WorkLogy Pro Alert 🔔',
        body: 'Real-time phone notifications are active on this device!',
        channelId: 'general'
      });

      const res = await api.notifications.sendTestPush({
        title: 'WorkLogy Pro Test',
        body: 'Real-time push notifications are working smoothly on your device! 🔔'
      });

      if (res?.success) {
        Alert.alert(
          'Push Notification Sent',
          `Notification dispatched! Check your system notification tray.`
        );
      } else {
        Alert.alert(
          'Notice',
          res?.message || 'Notification triggered. Please ensure notification permissions are allowed.'
        );
      }
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to dispatch test push notification.');
    } finally {
      setSendingTestPush(false);
    }
  };

  const handleTogglePref = async (key: keyof typeof preferences, value: boolean) => {
    const updated = { ...preferences, [key]: value };
    setPreferences(updated);
    try {
      setSavingPref(true);
      await api.notifications.updatePreferences(updated);
    } catch {
      // Revert if request failed
      setPreferences(preferences);
      Alert.alert('Update Failed', 'Could not sync notification preferences. Please try again.');
    } finally {
      setSavingPref(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (!currentPassword) {
      Alert.alert('Required Field', 'Please enter your current password.');
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert('Invalid Password', 'New password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Password Mismatch', 'New password and confirmation do not match.');
      return;
    }

    try {
      setUpdatingPassword(true);
      const res = await api.auth.updatePassword(currentPassword, newPassword);
      if (res?.success) {
        Alert.alert('Password Updated', res.message || 'Your account password has been updated securely.');
        setPasswordModalVisible(false);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        Alert.alert('Update Failed', res?.message || 'Current password was incorrect.');
      }
    } catch (err: any) {
      Alert.alert('Security Error', err.message || 'Failed to update password. Please check your credentials.');
    } finally {
      setUpdatingPassword(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Sign Out of WorkLogy Pro',
      'Are you sure you want to log out? Your business listings and records will remain safely preserved in MongoDB.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
              if (navigation.resetTo) {
                navigation.resetTo('VendorLogin');
              } else {
                navigation.navigate('VendorLogin');
              }
            } catch (err: any) {
              Alert.alert('Sign Out Error', err.message || 'Error clearing session.');
            }
          }
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* ── HEADER ── */}
      <View style={[styles.headerBar, { paddingTop: topInset + 6 }]}>
        <TouchableOpacity
          onPress={() => (navigation.goBack ? navigation.goBack() : navigation.navigate('ProfileTab'))}
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={20} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings and Account Security</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── 1. ACCOUNT OVERVIEW CARD ── */}
        <View style={styles.sectionCard}>
          <Text style={styles.cardHeaderTitle}>Account Overview</Text>
          <View style={styles.infoRow}>
            <View style={styles.infoIconBox}>
              <Ionicons name="person-outline" size={18} color="#06684F" />
            </View>
            <View style={styles.infoTextCol}>
              <Text style={styles.infoLabel}>Registered Name</Text>
              <Text style={styles.infoValue}>{user?.name || 'Mohammad Aalam'}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <View style={styles.infoIconBox}>
              <Ionicons name="mail-outline" size={18} color="#06684F" />
            </View>
            <View style={styles.infoTextCol}>
              <Text style={styles.infoLabel}>Account Email</Text>
              <Text style={styles.infoValue}>{user?.email || 'aalamtech@example.com'}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <View style={styles.infoIconBox}>
              <Ionicons name="shield-outline" size={18} color="#06684F" />
            </View>
            <View style={styles.infoTextCol}>
              <Text style={styles.infoLabel}>Account Role</Text>
              <Text style={styles.infoValue}>Authorized WorkLogy Service Partner</Text>
            </View>
          </View>
        </View>

        {/* ── 2. NOTIFICATION PREFERENCES ── */}
        <View style={styles.sectionCard}>
          <View style={styles.cardHeaderRow}>
            <View>
              <Text style={styles.cardHeaderTitle}>Notification Preferences</Text>
              <Text style={styles.cardHeaderSub}>Control what alerts and messages you receive</Text>
            </View>
            {savingPref && <ActivityIndicator size="small" color="#06684F" />}
          </View>

          {loadingPrefs ? (
            <ActivityIndicator size="small" color="#06684F" style={{ marginVertical: 16 }} />
          ) : (
            <>
              <View style={styles.toggleRow}>
                <View style={styles.toggleTextCol}>
                  <Text style={styles.toggleTitle}>Job Leads & Quotations</Text>
                  <Text style={styles.toggleSub}>Real-time alerts when new jobs match your service radius</Text>
                </View>
                <Switch
                  value={preferences.emailQuotations}
                  onValueChange={(val) => handleTogglePref('emailQuotations', val)}
                  trackColor={{ false: '#E2E8F0', true: '#A7F3D0' }}
                  thumbColor={preferences.emailQuotations ? '#06684F' : '#94A3B8'}
                />
              </View>

              <View style={styles.divider} />

              <View style={styles.toggleRow}>
                <View style={styles.toggleTextCol}>
                  <Text style={styles.toggleTitle}>Customer Bookings & OTPs</Text>
                  <Text style={styles.toggleSub}>Instant notifications for customer orders and arrivals</Text>
                </View>
                <Switch
                  value={preferences.emailBookings}
                  onValueChange={(val) => handleTogglePref('emailBookings', val)}
                  trackColor={{ false: '#E2E8F0', true: '#A7F3D0' }}
                  thumbColor={preferences.emailBookings ? '#06684F' : '#94A3B8'}
                />
              </View>

              <View style={styles.divider} />

              <View style={styles.toggleRow}>
                <View style={styles.toggleTextCol}>
                  <Text style={styles.toggleTitle}>Earnings & Settlement Payouts</Text>
                  <Text style={styles.toggleSub}>Notifications when payouts are credited to your bank</Text>
                </View>
                <Switch
                  value={preferences.emailStatusUpdates}
                  onValueChange={(val) => handleTogglePref('emailStatusUpdates', val)}
                  trackColor={{ false: '#E2E8F0', true: '#A7F3D0' }}
                  thumbColor={preferences.emailStatusUpdates ? '#06684F' : '#94A3B8'}
                />
              </View>

              <View style={styles.divider} />

              <View style={styles.toggleRow}>
                <View style={styles.toggleTextCol}>
                  <Text style={styles.toggleTitle}>Cancellations & Reschedules</Text>
                  <Text style={styles.toggleSub}>Immediate alerts if a customer modifies or cancels a job</Text>
                </View>
                <Switch
                  value={preferences.emailCancellations}
                  onValueChange={(val) => handleTogglePref('emailCancellations', val)}
                  trackColor={{ false: '#E2E8F0', true: '#A7F3D0' }}
                  thumbColor={preferences.emailCancellations ? '#06684F' : '#94A3B8'}
                />
              </View>

              <View style={styles.divider} />

              <View style={styles.toggleRow}>
                <View style={styles.toggleTextCol}>
                  <Text style={styles.toggleTitle}>Promotions & Partner Updates</Text>
                  <Text style={styles.toggleSub}>Vendor incentives, platform bonuses and policy updates</Text>
                </View>
                <Switch
                  value={preferences.emailMarketing}
                  onValueChange={(val) => handleTogglePref('emailMarketing', val)}
                  trackColor={{ false: '#E2E8F0', true: '#A7F3D0' }}
                  thumbColor={preferences.emailMarketing ? '#06684F' : '#94A3B8'}
                />
              </View>
            </>
          )}
        </View>

        {/* ── REAL-TIME PUSH NOTIFICATIONS ── */}
        <View style={styles.sectionCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardHeaderTitle}>Device Push Notifications</Text>
              <Text style={styles.cardHeaderSub}>Real-time phone banners and alerts on Android</Text>
            </View>
            <TouchableOpacity
              style={{
                backgroundColor: '#ECFDF5',
                borderColor: '#A7F3D0',
                borderWidth: 1,
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 8,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6
              }}
              onPress={handleSendTestPush}
              disabled={sendingTestPush}
              activeOpacity={0.75}
            >
              {sendingTestPush ? (
                <ActivityIndicator size="small" color="#06684F" />
              ) : (
                <>
                  <Ionicons name="notifications" size={14} color="#06684F" />
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#06684F' }}>Test Push</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          <View style={[styles.toggleRow, { marginTop: 14 }]}>
            <View style={styles.toggleTextCol}>
              <Text style={styles.toggleTitle}>Customer Messages</Text>
              <Text style={styles.toggleSub}>Instant phone alerts when a customer sends a message</Text>
            </View>
            <Switch
              value={preferences.pushMessages}
              onValueChange={(val) => handleTogglePref('pushMessages', val)}
              trackColor={{ false: '#E2E8F0', true: '#A7F3D0' }}
              thumbColor={preferences.pushMessages ? '#06684F' : '#94A3B8'}
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.toggleRow}>
            <View style={styles.toggleTextCol}>
              <Text style={styles.toggleTitle}>New Job Leads Near You</Text>
              <Text style={styles.toggleSub}>Alerts for emergency and instant jobs in your territory</Text>
            </View>
            <Switch
              value={preferences.pushJobLeads}
              onValueChange={(val) => handleTogglePref('pushJobLeads', val)}
              trackColor={{ false: '#E2E8F0', true: '#A7F3D0' }}
              thumbColor={preferences.pushJobLeads ? '#06684F' : '#94A3B8'}
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.toggleRow}>
            <View style={styles.toggleTextCol}>
              <Text style={styles.toggleTitle}>Booking Confirmations & Inquiries</Text>
              <Text style={styles.toggleSub}>Notifications when jobs are awarded or requested</Text>
            </View>
            <Switch
              value={preferences.pushBookings}
              onValueChange={(val) => handleTogglePref('pushBookings', val)}
              trackColor={{ false: '#E2E8F0', true: '#A7F3D0' }}
              thumbColor={preferences.pushBookings ? '#06684F' : '#94A3B8'}
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.toggleRow}>
            <View style={styles.toggleTextCol}>
              <Text style={styles.toggleTitle}>Status Updates & Transitions</Text>
              <Text style={styles.toggleSub}>Work started, completion approval and verification</Text>
            </View>
            <Switch
              value={preferences.pushStatusUpdates}
              onValueChange={(val) => handleTogglePref('pushStatusUpdates', val)}
              trackColor={{ false: '#E2E8F0', true: '#A7F3D0' }}
              thumbColor={preferences.pushStatusUpdates ? '#06684F' : '#94A3B8'}
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.toggleRow}>
            <View style={styles.toggleTextCol}>
              <Text style={styles.toggleTitle}>Cancellations & Alerts</Text>
              <Text style={styles.toggleSub}>Immediate warnings if an assignment is modified or cancelled</Text>
            </View>
            <Switch
              value={preferences.pushCancellations}
              onValueChange={(val) => handleTogglePref('pushCancellations', val)}
              trackColor={{ false: '#E2E8F0', true: '#A7F3D0' }}
              thumbColor={preferences.pushCancellations ? '#06684F' : '#94A3B8'}
            />
          </View>
        </View>

        {/* ── 3. ACCOUNT SECURITY ── */}
        <View style={styles.sectionCard}>
          <Text style={styles.cardHeaderTitle}>Security & Access</Text>
          <Text style={styles.cardHeaderSub}>Manage credentials and sign-in verification</Text>

          {/* Change Password Button */}
          <TouchableOpacity
            style={styles.securityActionRow}
            onPress={() => setPasswordModalVisible(true)}
            activeOpacity={0.75}
          >
            <View style={[styles.infoIconBox, { backgroundColor: '#EFF6FF' }]}>
              <Ionicons name="key-outline" size={18} color="#2563EB" />
            </View>
            <View style={styles.infoTextCol}>
              <Text style={styles.securityTitle}>Change Account Password</Text>
              <Text style={styles.securitySub}>Update your password regularly for protection</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
          </TouchableOpacity>

          <View style={styles.divider} />

          {/* Biometrics Toggle */}
          <View style={styles.toggleRow}>
            <View style={[styles.infoIconBox, { backgroundColor: '#F0FDF4', marginRight: 12 }]}>
              <Ionicons name="finger-print-outline" size={18} color="#16A34A" />
            </View>
            <View style={styles.toggleTextCol}>
              <Text style={styles.toggleTitle}>Biometric App Unlock</Text>
              <Text style={styles.toggleSub}>Use fingerprint or Face ID for fast login</Text>
            </View>
            <Switch
              value={biometricsEnabled}
              onValueChange={setBiometricsEnabled}
              trackColor={{ false: '#E2E8F0', true: '#A7F3D0' }}
              thumbColor={biometricsEnabled ? '#06684F' : '#94A3B8'}
            />
          </View>

          <View style={styles.divider} />

          {/* Active Session Info */}
          <View style={styles.infoRow}>
            <View style={[styles.infoIconBox, { backgroundColor: '#FEF3C7' }]}>
              <Ionicons name="phone-portrait-outline" size={18} color="#D97706" />
            </View>
            <View style={styles.infoTextCol}>
              <Text style={styles.infoLabel}>Active Device Session</Text>
              <Text style={styles.infoValue}>
                {Platform.OS === 'android' ? 'Android Mobile App' : 'iOS Mobile App'} • Active Now
              </Text>
            </View>
            <View style={styles.onlineBadge}>
              <Text style={styles.onlineBadgeText}>Current</Text>
            </View>
          </View>
        </View>

        {/* ── 4. PRIVACY & LEGAL ── */}
        <View style={styles.sectionCard}>
          <Text style={styles.cardHeaderTitle}>Legal & Compliance</Text>

          <TouchableOpacity
            style={styles.legalRow}
            onPress={() => Linking.openURL('https://worklogy.in/privacy')}
            activeOpacity={0.7}
          >
            <Text style={styles.legalText}>Privacy Policy</Text>
            <Ionicons name="open-outline" size={16} color="#64748B" />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.legalRow}
            onPress={() => Linking.openURL('https://worklogy.in/terms')}
            activeOpacity={0.7}
          >
            <Text style={styles.legalText}>Partner Terms & Code of Conduct</Text>
            <Ionicons name="open-outline" size={16} color="#64748B" />
          </TouchableOpacity>

          <View style={styles.divider} />

          <View style={styles.legalRow}>
            <Text style={styles.legalText}>App Build Version</Text>
            <Text style={styles.legalVersion}>v2.4.0 (Production Release)</Text>
          </View>
        </View>

        {/* ── 5. LOGOUT BUTTON ── */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.85}>
          <Ionicons name="log-out-outline" size={20} color="#DC2626" />
          <Text style={styles.logoutBtnText}>Sign Out of WorkLogy Pro</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ── CHANGE PASSWORD MODAL ── */}
      <Modal visible={passwordModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Update Password</Text>
              <TouchableOpacity onPress={() => setPasswordModalVisible(false)} activeOpacity={0.7}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
              <Text style={styles.inputLabel}>Current Password</Text>
              <View style={styles.passwordInputContainer}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Enter current password"
                  placeholderTextColor="#94A3B8"
                  secureTextEntry={!showCurrentPassword}
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                />
                <TouchableOpacity
                  onPress={() => setShowCurrentPassword(!showCurrentPassword)}
                  style={styles.eyeBtn}
                >
                  <Ionicons
                    name={showCurrentPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color="#64748B"
                  />
                </TouchableOpacity>
              </View>

              <Text style={[styles.inputLabel, { marginTop: 14 }]}>New Password</Text>
              <View style={styles.passwordInputContainer}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Minimum 6 characters"
                  placeholderTextColor="#94A3B8"
                  secureTextEntry={!showNewPassword}
                  value={newPassword}
                  onChangeText={setNewPassword}
                />
                <TouchableOpacity onPress={() => setShowNewPassword(!showNewPassword)} style={styles.eyeBtn}>
                  <Ionicons
                    name={showNewPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color="#64748B"
                  />
                </TouchableOpacity>
              </View>

              <Text style={[styles.inputLabel, { marginTop: 14 }]}>Confirm New Password</Text>
              <View style={styles.passwordInputContainer}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Re-enter new password"
                  placeholderTextColor="#94A3B8"
                  secureTextEntry={!showNewPassword}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                />
              </View>

              <TouchableOpacity
                style={[styles.savePasswordBtn, updatingPassword && { opacity: 0.65 }]}
                onPress={handleUpdatePassword}
                disabled={updatingPassword}
                activeOpacity={0.85}
              >
                {updatingPassword ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.savePasswordBtnText}>Save New Password</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC'
  },
  headerBar: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    elevation: 2
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9'
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A'
  },
  scrollView: {
    flex: 1
  },
  scrollContent: {
    padding: 16
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 1
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12
  },
  cardHeaderTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A'
  },
  cardHeaderSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    marginBottom: 12
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10
  },
  infoIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12
  },
  infoTextCol: {
    flex: 1
  },
  infoLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600'
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 2
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 4
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10
  },
  toggleTextCol: {
    flex: 1,
    paddingRight: 12
  },
  toggleTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B'
  },
  toggleSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
    lineHeight: 16
  },
  securityActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10
  },
  securityTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A'
  },
  securitySub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2
  },
  onlineBadge: {
    backgroundColor: '#ECFDF5',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6
  },
  onlineBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#06684F'
  },
  legalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12
  },
  legalText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155'
  },
  legalVersion: {
    fontSize: 12,
    color: '#94A3B8'
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
    marginTop: 8
  },
  logoutBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#DC2626'
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end'
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '80%'
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A'
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6
  },
  passwordInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12
  },
  passwordInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 13,
    color: '#0F172A'
  },
  eyeBtn: {
    padding: 6
  },
  savePasswordBtn: {
    marginTop: 20,
    backgroundColor: '#06684F',
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center'
  },
  savePasswordBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800'
  }
});
