import React, { useState, useEffect, useRef, useCallback } from 'react';
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

// ── ISOLATED RESEND COUNTDOWN COMPONENT ──────────────────────────────
// Keeps 1-second interval re-renders completely isolated from the main screen
interface ResendSectionProps {
  cooldownSeconds: number;
  onResend: () => Promise<void>;
  isResending: boolean;
}

const ResendCountdownSection = React.memo<ResendSectionProps>(({
  cooldownSeconds,
  onResend,
  isResending
}) => {
  const [countdown, setCountdown] = useState(cooldownSeconds);

  useEffect(() => {
    setCountdown(cooldownSeconds);
  }, [cooldownSeconds]);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  return (
    <View style={styles.resendContainer}>
      <Text style={styles.resendPreText}>Didn't receive code? </Text>
      {countdown > 0 ? (
        <Text style={styles.countdownText}>
          Resend in <Text style={{ fontWeight: '700' }}>{countdown}s</Text>
        </Text>
      ) : (
        <TouchableOpacity
          onPress={onResend}
          disabled={isResending}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          {isResending ? (
            <ActivityIndicator size="small" color={COLORS.primary} />
          ) : (
            <Text style={styles.resendLink}>Resend OTP</Text>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
});

// ── ISOLATED 6-CELL OTP DISPLAY COMPONENT ────────────────────────────
// Visual representation of the 6 digits; eliminates multiple native EditText switches
interface OtpBoxesProps {
  otp: string;
  isInputFocused: boolean;
  hasError: boolean;
  onPress: () => void;
}

const OtpBoxes = React.memo<OtpBoxesProps>(({
  otp,
  isInputFocused,
  hasError,
  onPress
}) => {
  return (
    <TouchableOpacity
      style={styles.otpBoxesRow}
      onPress={onPress}
      activeOpacity={1}
      accessible={true}
      accessibilityLabel="OTP Entry"
    >
      {[0, 1, 2, 3, 4, 5].map((index) => {
        const digit = otp[index] || '';
        const isFocused = isInputFocused && (otp.length === index || (otp.length === 6 && index === 5));

        return (
          <View
            key={index}
            style={[
              styles.otpBox,
              digit ? styles.otpBoxFilled : null,
              isFocused ? styles.otpBoxFocused : null,
              hasError ? styles.otpBoxError : null
            ]}
          >
            <Text style={styles.otpDigit}>{digit}</Text>
          </View>
        );
      })}
    </TouchableOpacity>
  );
});

// ── MAIN VENDOR OTP VERIFICATION SCREEN ─────────────────────────────
export default function VendorOtpVerificationScreen({ navigation, route }: any) {
  const { phone = '', purpose = 'login', cooldownSeconds = 60, debugCode } = route?.params || {};
  const { verifyOtp, sendOtp } = useAuth();

  // Authoritative single 6-digit OTP state
  const [otp, setOtp] = useState('');
  const [isInputFocused, setIsInputFocused] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [currentCooldown, setCurrentCooldown] = useState(cooldownSeconds);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [devOtp, setDevOtp] = useState<string | null>(debugCode || null);

  const inputRef = useRef<TextInput>(null);
  const isSubmittingRef = useRef<boolean>(false);

  // Auto-focus the single native input on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 200);
    return () => clearTimeout(timer);
  }, []);

  // Handle single digit, rapid entry, paste, and Android SMS autofill
  const handleOtpChange = useCallback((text: string) => {
    const cleaned = text.replace(/\D/g, '').slice(0, 6);
    setOtp(cleaned);
    setErrorMessage(null);

    // Auto-verify as soon as all 6 digits are populated
    if (cleaned.length === 6) {
      submitOtp(cleaned);
    }
  }, [phone]);

  // Submit OTP for verification with duplicate request prevention
  const submitOtp = useCallback(async (codeToVerify?: string) => {
    if (isSubmittingRef.current || isVerifying) return;
    const cleanCode = (codeToVerify || otp).trim();

    if (!cleanCode) {
      setErrorMessage('Please enter the 6-digit verification code sent to your phone.');
      return;
    }

    if (cleanCode.length !== 6) {
      setErrorMessage('Please enter all 6 digits of the verification code.');
      return;
    }

    isSubmittingRef.current = true;
    setIsVerifying(true);
    setErrorMessage(null);

    try {
      const res = await verifyOtp({ phone, otp: cleanCode });
      const step = res?.onboardingStep || 'completed';

      if (res?.isNewUser || step === 'profile_pending') {
        navigation.resetTo ? navigation.resetTo('VendorOnboardingProfile') : navigation.navigate('VendorOnboardingProfile');
      } else if (step === 'domains_pending') {
        navigation.resetTo ? navigation.resetTo('VendorOnboardingDomains') : navigation.navigate('VendorOnboardingDomains');
      } else if (step === 'first_service_pending') {
        navigation.resetTo ? navigation.resetTo('VendorOnboardingService') : navigation.navigate('VendorOnboardingService');
      } else {
        navigation.resetTo ? navigation.resetTo('VendorHomeTab') : navigation.navigate('VendorHomeTab');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Invalid or expired OTP. Please check and try again.');
    } finally {
      setIsVerifying(false);
      isSubmittingRef.current = false;
    }
  }, [otp, phone, isVerifying, verifyOtp, navigation]);

  // Handle Resend OTP action
  const handleResend = useCallback(async () => {
    if (isResending) return;
    setIsResending(true);
    setErrorMessage(null);

    try {
      const res = await sendOtp(phone, purpose);
      setCurrentCooldown(res?.cooldownSeconds || 60);
      if (res?.debugCode) {
        setDevOtp(res.debugCode);
      }
      setOtp('');
      inputRef.current?.focus();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to resend code. Please try again.');
    } finally {
      setIsResending(false);
    }
  }, [isResending, phone, purpose, sendOtp]);

  const focusInput = useCallback(() => {
    inputRef.current?.focus();
  }, []);

  const maskedPhone = phone.length >= 10
    ? `+91 ******${phone.slice(-4)}`
    : `+91 ${phone}`;

  const isOtpComplete = otp.length === 6;

  return (
    <KeyboardAvoidingView
      style={styles.keyboardContainer}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Top Header with Back button and centered title */}
      <View style={styles.topHeader}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.topHeaderTitle}>Verification</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.cardContainer}>
          {/* Security Message Icon */}
          <View style={styles.iconCircle}>
            <Ionicons name="chatbubble-ellipses" size={32} color={COLORS.primary} />
          </View>

          <Text style={styles.heading}>Verify your mobile number</Text>
          <Text style={styles.subheading}>
            Enter the 6-digit code sent via SMS to
          </Text>

          {/* Masked Phone Badge with Change Number Action */}
          <View style={styles.phoneBadgeRow}>
            <Text style={styles.phoneBadgeText}>{maskedPhone}</Text>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              activeOpacity={0.7}
            >
              <Text style={styles.changeNumberText}>Change number</Text>
            </TouchableOpacity>
          </View>

          {/* Single Hidden Real TextInput for Native Keyboard & SMS AutoFill */}
          {/* Using 1 native input completely prevents soft-keyboard flickering, IME restarts, and focus jumps */}
          <TextInput
            ref={inputRef}
            style={styles.hiddenInput}
            value={otp}
            onChangeText={handleOtpChange}
            keyboardType="number-pad"
            maxLength={6}
            autoFocus={true}
            showSoftInputOnFocus={true}
            textContentType="oneTimeCode"
            autoComplete="sms-otp"
            editable={!isVerifying}
            onFocus={() => setIsInputFocused(true)}
            onBlur={() => setIsInputFocused(false)}
            caretHidden={true}
          />

          {/* 6 Visual OTP Cells */}
          <OtpBoxes
            otp={otp}
            isInputFocused={isInputFocused}
            hasError={Boolean(errorMessage)}
            onPress={focusInput}
          />

          {/* Development/Testing helper (visible only in __DEV__ when debugCode exists) */}
          {devOtp && __DEV__ && (
            <View style={styles.devBanner}>
              <Ionicons name="construct-outline" size={14} color={COLORS.primary} style={{ marginRight: 6 }} />
              <Text style={styles.devBannerText}>
                Dev test OTP: <Text style={{ fontWeight: '800' }}>{devOtp}</Text>
              </Text>
            </View>
          )}

          {/* Error Message */}
          {errorMessage && (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={16} color={COLORS.error} />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          )}

          {/* Primary Verify Button */}
          <TouchableOpacity
            style={[
              styles.primaryBtn,
              (isVerifying || !isOtpComplete) ? styles.primaryBtnDisabled : null
            ]}
            onPress={() => submitOtp()}
            disabled={isVerifying || !isOtpComplete}
            activeOpacity={0.85}
          >
            {isVerifying ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <View style={styles.btnContent}>
                <Text style={styles.primaryBtnText}>Verify & Continue</Text>
                <Ionicons name="arrow-forward" size={18} color="#FFFFFF" style={{ marginLeft: 6 }} />
              </View>
            )}
          </TouchableOpacity>

          {/* Resend Cooldown Section (Isolated timer, zero screen re-renders) */}
          <ResendCountdownSection
            cooldownSeconds={currentCooldown}
            onResend={handleResend}
            isResending={isResending}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF'
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 16 : 8,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9'
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center'
  },
  topHeaderTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A'
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingVertical: 28,
    alignItems: 'center'
  },
  cardContainer: {
    width: '100%',
    maxWidth: 440,
    alignItems: 'center'
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: '#F0FDF4',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#DCFCE7'
  },
  heading: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
    letterSpacing: -0.4,
    marginBottom: 8
  },
  subheading: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20
  },
  phoneBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 10,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  phoneBadgeText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginRight: 10
  },
  changeNumberText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary
  },
  // Single hidden native input (off-screen, never causes keyboard flicker)
  hiddenInput: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0.01,
    left: -100
  },
  otpBoxesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 20
  },
  // Fixed dimensions and border width prevent layout shifts
  otpBox: {
    flex: 1,
    height: 56,
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4
  },
  otpBoxFilled: {
    borderColor: COLORS.primary,
    backgroundColor: '#F0FDF4'
  },
  otpBoxFocused: {
    borderColor: COLORS.primary,
    backgroundColor: '#FFFFFF'
  },
  otpBoxError: {
    borderColor: COLORS.error,
    backgroundColor: COLORS.errorBg
  },
  otpDigit: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A'
  },
  devBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primaryLight,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 14
  },
  devBannerText: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '600'
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    alignSelf: 'flex-start',
    paddingHorizontal: 4
  },
  errorText: {
    fontSize: 13,
    color: COLORS.error,
    fontWeight: '500',
    marginLeft: 6,
    flex: 1
  },
  primaryBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    height: 52,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3
  },
  primaryBtnDisabled: {
    backgroundColor: '#94A3B8',
    shadowOpacity: 0,
    elevation: 0
  },
  btnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center'
  },
  primaryBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.2
  },
  resendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24
  },
  resendPreText: {
    fontSize: 14,
    color: '#64748B'
  },
  countdownText: {
    fontSize: 14,
    color: '#94A3B8'
  },
  resendLink: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary
  }
});
