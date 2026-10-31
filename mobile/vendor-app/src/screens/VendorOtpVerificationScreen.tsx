import React, { useState, useEffect, useRef } from 'react';
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

export default function VendorOtpVerificationScreen({ navigation, route }: any) {
  const { phone = '', purpose = 'login', cooldownSeconds = 60, debugCode } = route.params || {};
  const { verifyOtp, sendOtp } = useAuth();

  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [focusedIndex, setFocusedIndex] = useState<number>(0);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [countdown, setCountdown] = useState(cooldownSeconds);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [devOtp, setDevOtp] = useState<string | null>(debugCode || null);

  const inputsRef = useRef<Array<TextInput | null>>([]);
  const isSubmittingRef = useRef<boolean>(false);

  // Resend Countdown Timer
  useEffect(() => {
    let timer: any = null;
    if (countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [countdown]);

  // Focus first input on mount
  useEffect(() => {
    const focusTimer = setTimeout(() => {
      inputsRef.current[0]?.focus();
    }, 250);
    return () => clearTimeout(focusTimer);
  }, []);

  // Handle digit changes with multi-digit paste / SMS autofill support
  const handleChangeText = (text: string, index: number) => {
    if (errorMessage) setErrorMessage(null);
    const numeric = text.replace(/\D/g, '');

    // Case 1: Multi-digit text (Pasting or SMS AutoFill)
    if (numeric.length > 1) {
      const pasted = numeric.slice(0, 6).split('');
      const nextDigits = ['', '', '', '', '', ''];
      for (let i = 0; i < pasted.length; i++) {
        nextDigits[i] = pasted[i];
      }
      setDigits(nextDigits);

      // Focus the last filled box or next available box
      const targetFocus = Math.min(pasted.length, 5);
      inputsRef.current[targetFocus]?.focus();

      // If full 6 digits arrived, trigger automatic verification
      if (pasted.length === 6) {
        triggerSubmit(nextDigits.join(''));
      }
      return;
    }

    // Case 2: Single digit entered
    const nextDigits = [...digits];
    nextDigits[index] = numeric;
    setDigits(nextDigits);

    if (numeric) {
      // Auto-advance to next box
      if (index < 5) {
        inputsRef.current[index + 1]?.focus();
      }

      // Check if all 6 boxes are now filled
      const fullCode = nextDigits.join('');
      if (fullCode.length === 6 && !nextDigits.includes('')) {
        triggerSubmit(fullCode);
      }
    }
  };

  // Handle backspace navigation across boxes
  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace') {
      if (!digits[index] && index > 0) {
        // Current box is empty, clear previous box and focus it
        const nextDigits = [...digits];
        nextDigits[index - 1] = '';
        setDigits(nextDigits);
        inputsRef.current[index - 1]?.focus();
      } else if (digits[index]) {
        // Clear current box
        const nextDigits = [...digits];
        nextDigits[index] = '';
        setDigits(nextDigits);
      }
    }
  };

  // Submit OTP for verification
  const triggerSubmit = async (codeToVerify?: string) => {
    if (isSubmittingRef.current || isVerifying) return;
    const fullCode = (codeToVerify || digits.join('')).trim();

    if (!fullCode) {
      setErrorMessage('Please enter the 6-digit verification code sent to your phone.');
      return;
    }

    if (fullCode.length !== 6) {
      setErrorMessage('Please enter all 6 digits of the verification code.');
      return;
    }

    isSubmittingRef.current = true;
    setIsVerifying(true);
    setErrorMessage(null);

    try {
      const res = await verifyOtp({ phone, otp: fullCode });

      // Determine destination based on onboarding step
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
  };

  // Handle Resend OTP
  const handleResend = async () => {
    if (countdown > 0 || isResending) return;
    setIsResending(true);
    setErrorMessage(null);

    try {
      const res = await sendOtp(phone, purpose);
      setCountdown(res?.cooldownSeconds || 60);
      if (res?.debugCode) {
        setDevOtp(res.debugCode);
      }
      setDigits(['', '', '', '', '', '']);
      inputsRef.current[0]?.focus();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to resend code. Please try again.');
    } finally {
      setIsResending(false);
    }
  };

  const maskedPhone = phone.length >= 10
    ? `+91 ******${phone.slice(-4)}`
    : `+91 ${phone}`;

  const isOtpComplete = digits.join('').length === 6 && !digits.includes('');

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
            >
              <Text style={styles.changeNumberText}>Change number</Text>
            </TouchableOpacity>
          </View>

          {/* Six Individual OTP Boxes */}
          <View style={styles.otpBoxesRow}>
            {[0, 1, 2, 3, 4, 5].map((index) => {
              const digit = digits[index];
              const isFocused = focusedIndex === index;
              return (
                <View
                  key={index}
                  style={[
                    styles.otpBox,
                    digit ? styles.otpBoxFilled : null,
                    isFocused ? styles.otpBoxFocused : null,
                    errorMessage ? styles.otpBoxError : null
                  ]}
                >
                  <TextInput
                    ref={(el) => {
                      inputsRef.current[index] = el;
                    }}
                    style={styles.otpBoxInput}
                    value={digit}
                    onChangeText={(text) => handleChangeText(text, index)}
                    onKeyPress={(e) => handleKeyPress(e, index)}
                    onFocus={() => setFocusedIndex(index)}
                    keyboardType="number-pad"
                    maxLength={6} // Allow multi-digit paste/autofill into any box
                    selectTextOnFocus={true}
                    textContentType={index === 0 ? 'oneTimeCode' : undefined}
                    autoComplete={index === 0 ? 'sms-otp' : undefined}
                    editable={!isVerifying}
                  />
                </View>
              );
            })}
          </View>

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
            onPress={() => triggerSubmit()}
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

          {/* Resend Cooldown Section */}
          <View style={styles.resendContainer}>
            <Text style={styles.resendPreText}>Didn't receive code? </Text>
            {countdown > 0 ? (
              <Text style={styles.countdownText}>
                Resend in <Text style={{ fontWeight: '700' }}>{countdown}s</Text>
              </Text>
            ) : (
              <TouchableOpacity
                onPress={handleResend}
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
  otpBoxesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 20
  },
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
    borderWidth: 2,
    backgroundColor: '#FFFFFF',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2
  },
  otpBoxError: {
    borderColor: COLORS.error,
    backgroundColor: COLORS.errorBg
  },
  otpBoxInput: {
    width: '100%',
    height: '100%',
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    padding: 0
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
