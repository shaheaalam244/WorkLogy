import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../hooks/useAuth';
import { COLORS } from '../theme/colors';

type LoginTab = 'otp' | 'password';

export default function VendorLoginScreen({ navigation, route }: any) {
  const { login, sendOtp } = useAuth();

  // Active Login Tab: 'otp' | 'password' (persists or reads from route params)
  const [activeTab, setActiveTab] = useState<LoginTab>(route?.params?.initialTab === 'password' ? 'password' : 'otp');

  // Mobile OTP state
  const initialPhone = route?.params?.phone ? String(route.params.phone).replace(/\D/g, '').slice(0, 10) : '';
  const [phone, setPhone] = useState(initialPhone);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [newPartnerDetected, setNewPartnerDetected] = useState<string | null>(null);

  React.useEffect(() => {
    if (route?.params?.phone) {
      const p = String(route.params.phone).replace(/\D/g, '').slice(0, 10);
      if (p) {
        setPhone(p);
        setNewPartnerDetected(null);
        setErrorMessage(null);
      }
    }
  }, [route?.params?.phone]);

  // Email / Password state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Normalize phone digits
  const handlePhoneChange = (text: string) => {
    const cleaned = text.replace(/\D/g, '').slice(0, 10);
    setPhone(cleaned);
    if (errorMessage) setErrorMessage(null);
    if (newPartnerDetected) setNewPartnerDetected(null);
  };

  // Handle Send Login OTP
  const handleSendOtp = async () => {
    const cleanPhone = phone.trim();
    if (!cleanPhone) {
      setErrorMessage('Please enter your 10-digit mobile number.');
      setNewPartnerDetected(null);
      return;
    }

    if (cleanPhone.length !== 10 || !/^[6-9]\d{9}$/.test(cleanPhone)) {
      setErrorMessage('Please enter a valid 10-digit Indian mobile number starting with 6-9.');
      setNewPartnerDetected(null);
      return;
    }

    setIsSendingOtp(true);
    setErrorMessage(null);
    setNewPartnerDetected(null);

    try {
      const res = await sendOtp(cleanPhone, 'login');
      // Navigate to dedicated OTP verification screen
      navigation.navigate('VendorOtpVerification', {
        phone: cleanPhone,
        purpose: 'login',
        cooldownSeconds: res?.cooldownSeconds || 60,
        debugCode: res?.debugCode
      });
    } catch (err: any) {
      if (err?.data?.code === 'NOT_REGISTERED' || err?.status === 404) {
        // Distinguish new mobile number smoothly without hostile error banner
        setNewPartnerDetected(cleanPhone);
        setErrorMessage(null);
      } else if (err?.status === 403) {
        setNewPartnerDetected(null);
        setErrorMessage(err.message || 'Your contractor account is currently suspended. Please contact support.');
      } else if (err?.isNetworkError) {
        setNewPartnerDetected(null);
        setErrorMessage('Network connection error. Please check your internet connection and try again.');
      } else if (err?.status >= 500) {
        setNewPartnerDetected(null);
        setErrorMessage('Server error encountered. Please try again shortly or contact support.');
      } else {
        setNewPartnerDetected(null);
        setErrorMessage(err.message || 'Unable to send OTP. Please check your number and try again.');
      }
    } finally {
      setIsSendingOtp(false);
    }
  };

  // Direct registration trigger preserving mobile number
  const handleDirectRegister = async (targetPhone?: string) => {
    const cleanPhone = (targetPhone || phone).trim();
    if (!cleanPhone || cleanPhone.length !== 10) return;

    setIsSendingOtp(true);
    setErrorMessage(null);

    try {
      const res = await sendOtp(cleanPhone, 'register');
      navigation.navigate('VendorOtpVerification', {
        phone: cleanPhone,
        purpose: 'register',
        cooldownSeconds: res?.cooldownSeconds || 60,
        debugCode: res?.debugCode
      });
    } catch (err: any) {
      if (err?.data?.code === 'ALREADY_REGISTERED' || err?.status === 409) {
        setNewPartnerDetected(null);
        setErrorMessage('This number is already registered. Please tap "Continue with OTP" to log in.');
      } else if (err?.isNetworkError) {
        setErrorMessage('Network connection error. Please check your internet connection and try again.');
      } else {
        setErrorMessage(err.message || 'Unable to send registration OTP. Please try again.');
      }
    } finally {
      setIsSendingOtp(false);
    }
  };

  // Handle Password Login
  const handlePasswordLogin = async () => {
    const cleanIdentifier = email.trim();
    const cleanPassword = password.trim();

    if (!cleanIdentifier || !cleanPassword) {
      setErrorMessage('Please enter both your registered email/phone and password.');
      setActiveTab('password');
      return;
    }

    setIsLoggingIn(true);
    setErrorMessage(null);

    try {
      const res = await login({ email: cleanIdentifier, password: cleanPassword });

      // Determine destination based on onboarding step
      const step = res?.onboardingStep || 'completed';

      if (step === 'profile_pending') {
        navigation.resetTo ? navigation.resetTo('VendorOnboardingProfile') : navigation.navigate('VendorOnboardingProfile');
      } else if (step === 'domains_pending') {
        navigation.resetTo ? navigation.resetTo('VendorOnboardingDomains') : navigation.navigate('VendorOnboardingDomains');
      } else if (step === 'first_service_pending') {
        navigation.resetTo ? navigation.resetTo('VendorOnboardingService') : navigation.navigate('VendorOnboardingService');
      } else {
        navigation.resetTo ? navigation.resetTo('VendorHomeTab') : navigation.navigate('VendorHomeTab');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Invalid email or password. Please verify your credentials.');
      setActiveTab('password'); // Strictly retain password tab
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#F7F9FA" />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          {/* Header Brand */}
          <View style={styles.headerContainer}>
            <View style={styles.brandTitleRow}>
              <Text style={styles.brandWork}>Work</Text>
              <Text style={styles.brandLogy}>Logy</Text>
            </View>
            <View style={styles.proBadge}>
              <Text style={styles.proBadgeText}>PRO CONTRACTOR</Text>
            </View>

            <Text style={styles.welcomeTitle}>Welcome Back</Text>
            <Text style={styles.welcomeSubtitle}>
              Login to manage your services, bids, and bookings.
            </Text>
          </View>

          {/* Segmented Tab Switcher (Mobile OTP vs Email & Password) */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tabButton, activeTab === 'otp' && styles.tabButtonActive]}
              onPress={() => {
                setActiveTab('otp');
                setErrorMessage(null);
              }}
              activeOpacity={0.8}
            >
              <Ionicons
                name="phone-portrait-outline"
                size={16}
                color={activeTab === 'otp' ? COLORS.primary : COLORS.textSecondary}
                style={{ marginRight: 6 }}
              />
              <Text style={[styles.tabText, activeTab === 'otp' && styles.tabTextActive]}>
                Mobile OTP
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabButton, activeTab === 'password' && styles.tabButtonActive]}
              onPress={() => {
                setActiveTab('password');
                setErrorMessage(null);
              }}
              activeOpacity={0.8}
            >
              <Ionicons
                name="mail-outline"
                size={16}
                color={activeTab === 'password' ? COLORS.primary : COLORS.textSecondary}
                style={{ marginRight: 6 }}
              />
              <Text style={[styles.tabText, activeTab === 'password' && styles.tabTextActive]}>
                Email & Password
              </Text>
            </TouchableOpacity>
          </View>

          {/* ══════════ TAB 1: MOBILE OTP ══════════ */}
          {activeTab === 'otp' && (
            <View style={styles.formContainer}>
              <Text style={styles.fieldLabel}>Registered Mobile Number</Text>
              <View style={styles.phoneInputRow}>
                <View style={styles.countryCodeBadge}>
                  <Text style={styles.countryFlag}>🇮🇳</Text>
                  <Text style={styles.countryCodeText}>+91</Text>
                </View>
                <TextInput
                  style={styles.phoneInput}
                  placeholder="Enter 10-digit mobile number"
                  placeholderTextColor={COLORS.textLight}
                  keyboardType={Platform.OS === 'android' ? 'numeric' : 'number-pad'}
                  textContentType="telephoneNumber"
                  autoComplete="tel"
                  importantForAutofill="no"
                  showSoftInputOnFocus={true}
                  maxLength={10}
                  value={phone}
                  onChangeText={handlePhoneChange}
                  autoFocus={false}
                />
              </View>

              {/* Informative New Partner Card when unregistered number entered */}
              {newPartnerDetected && (
                <View style={styles.newPartnerCard}>
                  <View style={styles.newPartnerHeader}>
                    <View style={styles.newPartnerIconBox}>
                      <Ionicons name="sparkles" size={18} color="#06684F" />
                    </View>
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={styles.newPartnerTitle}>New to WorkLogy?</Text>
                      <Text style={styles.newPartnerSubtitle}>
                        +91 {newPartnerDetected} is not yet registered as a certified contractor. Register now to receive direct customer bookings and local job dispatches.
                      </Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={styles.registerCtaBtn}
                    onPress={() => handleDirectRegister(newPartnerDetected)}
                    disabled={isSendingOtp}
                    activeOpacity={0.85}
                  >
                    {isSendingOtp ? (
                      <View style={styles.btnLoadingRow}>
                        <ActivityIndicator size="small" color="#FFFFFF" />
                        <Text style={styles.registerCtaBtnText}>Sending Registration OTP...</Text>
                      </View>
                    ) : (
                      <View style={styles.btnLoadingRow}>
                        <Ionicons name="arrow-forward-circle" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                        <Text style={styles.registerCtaBtnText}>Register +91 {newPartnerDetected} as a Vendor</Text>
                      </View>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.registerSecondaryLink}
                    onPress={() => navigation.navigate('VendorRegister', { phone: newPartnerDetected })}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.registerSecondaryLinkText}>Or open complete partner registration</Text>
                  </TouchableOpacity>
                </View>
              )}

              {errorMessage && (
                <View style={styles.errorBanner}>
                  <Ionicons name="alert-circle" size={16} color={COLORS.error} style={{ marginRight: 6 }} />
                  <Text style={styles.errorBannerText}>{errorMessage}</Text>
                </View>
              )}

              {!newPartnerDetected && (
                <TouchableOpacity
                  style={[styles.primaryBtn, isSendingOtp && styles.btnDisabled]}
                  onPress={handleSendOtp}
                  disabled={isSendingOtp}
                  activeOpacity={0.85}
                >
                  {isSendingOtp ? (
                    <View style={styles.btnLoadingRow}>
                      <ActivityIndicator size="small" color="#FFFFFF" />
                      <Text style={styles.primaryBtnText}>Sending OTP...</Text>
                    </View>
                  ) : (
                    <Text style={styles.primaryBtnText}>Continue with OTP</Text>
                  )}
                </TouchableOpacity>
              )}

              <Text style={styles.helperNote}>
                We will send a 6-digit SMS verification code to your registered mobile number.
              </Text>
            </View>
          )}

          {/* ══════════ TAB 2: EMAIL & PASSWORD ══════════ */}
          {activeTab === 'password' && (
            <View style={styles.formContainer}>
              <Text style={styles.fieldLabel}>Registered Email or Mobile Number</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. contractor@worklogy.in or 9876543210"
                placeholderTextColor={COLORS.textLight}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                value={email}
                onChangeText={(val) => {
                  setEmail(val);
                  if (errorMessage) setErrorMessage(null);
                }}
              />

              <Text style={styles.fieldLabel}>Password</Text>
              <View style={styles.passwordInputWrapper}>
                <TextInput
                  style={[styles.textInput, { flex: 1, marginBottom: 0, borderWidth: 0 }]}
                  placeholder="Enter account password"
                  placeholderTextColor={COLORS.textLight}
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={(val) => {
                    setPassword(val);
                    if (errorMessage) setErrorMessage(null);
                  }}
                />
                <TouchableOpacity
                  style={styles.eyeBtn}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color={COLORS.textSecondary}
                  />
                </TouchableOpacity>
              </View>

              {errorMessage && (
                <View style={styles.errorBanner}>
                  <Ionicons name="alert-circle" size={16} color={COLORS.error} style={{ marginRight: 6 }} />
                  <Text style={styles.errorBannerText}>{errorMessage}</Text>
                </View>
              )}

              <TouchableOpacity
                style={[styles.primaryBtn, isLoggingIn && styles.btnDisabled]}
                onPress={handlePasswordLogin}
                disabled={isLoggingIn}
                activeOpacity={0.85}
              >
                {isLoggingIn ? (
                  <View style={styles.btnLoadingRow}>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                    <Text style={styles.primaryBtnText}>Signing In...</Text>
                  </View>
                ) : (
                  <Text style={styles.primaryBtnText}>Sign In to Pro Dashboard ⚡</Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* Footer Registration Link */}
          <View style={styles.footerRow}>
            <Text style={styles.footerText}>New professional partner? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('VendorRegister', { phone: newPartnerDetected || phone })}>
              <Text style={styles.registerLink}>Register as a Vendor</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 36
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 24,
    paddingVertical: 28,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#17212B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 3
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 22
  },
  brandTitleRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  brandWork: {
    fontSize: 28,
    fontWeight: '900',
    color: COLORS.primary,
    letterSpacing: -0.5
  },
  brandLogy: {
    fontSize: 28,
    fontWeight: '900',
    color: COLORS.navy,
    letterSpacing: -0.5
  },
  proBadge: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 6,
    marginBottom: 14
  },
  proBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.primary,
    letterSpacing: 0.5
  },
  welcomeTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.textDark,
    marginBottom: 6
  },
  welcomeSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 18
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#EDF1F3',
    borderRadius: 12,
    padding: 3,
    marginBottom: 20
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 9
  },
  tabButtonActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary
  },
  tabTextActive: {
    color: COLORS.primary,
    fontWeight: '800'
  },
  formContainer: {
    marginBottom: 8
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textDark,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  phoneInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
    height: 52
  },
  countryCodeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
    backgroundColor: '#F8FAFB',
    height: '100%'
  },
  countryFlag: {
    fontSize: 16,
    marginRight: 6
  },
  countryCodeText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textDark
  },
  phoneInput: {
    flex: 1,
    height: '100%',
    paddingHorizontal: 14,
    fontSize: 15,
    color: COLORS.textDark,
    fontWeight: '600'
  },
  textInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 12,
    height: 52,
    paddingHorizontal: 14,
    fontSize: 14,
    color: COLORS.textDark,
    marginBottom: 16
  },
  passwordInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden'
  },
  eyeBtn: {
    paddingHorizontal: 14,
    paddingVertical: 14
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.errorBg,
    borderWidth: 1,
    borderColor: COLORS.errorBorder,
    borderRadius: 10,
    padding: 12,
    marginBottom: 16
  },
  errorBannerText: {
    flex: 1,
    fontSize: 12,
    color: COLORS.error,
    fontWeight: '600',
    lineHeight: 16
  },
  newPartnerCard: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1.5,
    borderColor: '#86EFAC',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16
  },
  newPartnerHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12
  },
  newPartnerIconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center'
  },
  newPartnerTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#065F46',
    marginBottom: 2
  },
  newPartnerSubtitle: {
    fontSize: 12,
    color: '#166534',
    lineHeight: 17
  },
  registerCtaBtn: {
    backgroundColor: '#06684F',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#06684F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2
  },
  registerCtaBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800'
  },
  registerSecondaryLink: {
    marginTop: 10,
    alignItems: 'center'
  },
  registerSecondaryLinkText: {
    fontSize: 12,
    color: '#047857',
    fontWeight: '700',
    textDecorationLine: 'underline'
  },
  primaryBtn: {
    backgroundColor: COLORS.primaryAction,
    height: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    shadowColor: COLORS.primaryAction,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3
  },
  btnDisabled: {
    opacity: 0.65
  },
  btnLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    marginLeft: 6
  },
  helperNote: {
    fontSize: 11,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 16
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24
  },
  footerText: {
    fontSize: 13,
    color: COLORS.textSecondary
  },
  registerLink: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.primary
  }
});
