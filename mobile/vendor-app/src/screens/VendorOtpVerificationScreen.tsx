import React, { useState, useEffect } from 'react';
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

  const [otpCode, setOtpCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [countdown, setCountdown] = useState(cooldownSeconds);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [devOtp, setDevOtp] = useState<string | null>(debugCode || null);

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

  // Handle Verify OTP
  const handleVerify = async () => {
    const cleanOtp = otpCode.trim();
    if (!cleanOtp) {
      setErrorMessage('Please enter the 6-digit verification code.');
      return;
    }

    if (cleanOtp.length !== 6) {
      setErrorMessage('Please enter the complete 6-digit OTP.');
      return;
    }

    setIsVerifying(true);
    setErrorMessage(null);

    try {
      const res = await verifyOtp({ phone, otp: cleanOtp });

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
      setOtpCode('');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to resend code. Please try again.');
    } finally {
      setIsResending(false);
    }
  };

  const maskedPhone = phone.length >= 10
    ? `+91 ******${phone.slice(-4)}`
    : `+91 ${phone}`;

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
          {/* Back to Phone Input */}
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={20} color={COLORS.textDark} />
            <Text style={styles.backBtnText}>Change number</Text>
          </TouchableOpacity>

          {/* Icon Header */}
          <View style={styles.iconCircle}>
            <Ionicons name="shield-checkmark-outline" size={30} color={COLORS.primary} />
          </View>

          <Text style={styles.title}>Verify your mobile number</Text>
          <Text style={styles.subtitle}>
            Enter the 6-digit code sent via SMS to{' '}
            <Text style={styles.phoneHighlight}>{maskedPhone}</Text>
          </Text>

          {/* OTP Input */}
          <View style={styles.otpInputWrapper}>
            <TextInput
              style={styles.otpInput}
              placeholder="• • • • • •"
              placeholderTextColor={COLORS.textLight}
              keyboardType="number-pad"
              maxLength={6}
              value={otpCode}
              onChangeText={(val) => {
                setOtpCode(val.replace(/\D/g, '').slice(0, 6));
                if (errorMessage) setErrorMessage(null);
              }}
              autoFocus={true}
            />
          </View>

          {/* Development/Testing helper (only visible if dev debug code exists) */}
          {devOtp && __DEV__ && (
            <View style={styles.devBanner}>
              <Ionicons name="construct-outline" size={14} color={COLORS.primary} style={{ marginRight: 6 }} />
              <Text style={styles.devBannerText}>
                Dev test OTP: <Text style={{ fontWeight: '800' }}>{devOtp}</Text>
              </Text>
            </View>
          )}

          {/* Error Banner */}
          {errorMessage && (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={16} color={COLORS.error} style={{ marginRight: 6 }} />
              <Text style={styles.errorBannerText}>{errorMessage}</Text>
            </View>
          )}

          {/* Primary Verify Button */}
          <TouchableOpacity
            style={[styles.primaryBtn, isVerifying && styles.btnDisabled]}
            onPress={handleVerify}
            disabled={isVerifying}
            activeOpacity={0.85}
          >
            {isVerifying ? (
              <View style={styles.btnLoadingRow}>
                <ActivityIndicator size="small" color="#FFFFFF" />
                <Text style={styles.primaryBtnText}>Verifying...</Text>
              </View>
            ) : (
              <Text style={styles.primaryBtnText}>Verify & Continue</Text>
            )}
          </TouchableOpacity>

          {/* Resend Cooldown Row */}
          <View style={styles.resendContainer}>
            {countdown > 0 ? (
              <Text style={styles.timerText}>
                Resend code in <Text style={styles.timerBold}>{countdown}s</Text>
              </Text>
            ) : (
              <TouchableOpacity
                onPress={handleResend}
                disabled={isResending}
                activeOpacity={0.7}
              >
                <Text style={styles.resendBtnText}>
                  {isResending ? 'Sending...' : 'Resend OTP'}
                </Text>
              </TouchableOpacity>
            )}
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
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginBottom: 16
  },
  backBtnText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '600',
    marginLeft: 6
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 16
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.textDark,
    textAlign: 'center',
    marginBottom: 8
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 24
  },
  phoneHighlight: {
    color: COLORS.textDark,
    fontWeight: '700'
  },
  otpInputWrapper: {
    marginBottom: 18
  },
  otpInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    borderRadius: 14,
    height: 56,
    paddingHorizontal: 16,
    fontSize: 24,
    letterSpacing: 10,
    textAlign: 'center',
    color: COLORS.textDark,
    fontWeight: '800'
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
  primaryBtn: {
    backgroundColor: COLORS.primaryAction,
    height: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
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
  resendContainer: {
    alignItems: 'center',
    marginTop: 20
  },
  timerText: {
    fontSize: 13,
    color: COLORS.textSecondary
  },
  timerBold: {
    color: COLORS.primary,
    fontWeight: '700'
  },
  resendBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.primary,
    textDecorationLine: 'underline'
  }
});
