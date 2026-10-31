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

export default function OtpVerificationScreen({ navigation, route }: any) {
  const { phone = '', cooldownSeconds = 60 } = route?.params || {};
  const { verifyOtp, sendOtp, pendingAction, clearPendingAction } = useAuth();

  const [otp, setOtp] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [countdown, setCountdown] = useState(cooldownSeconds);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const inputRef = useRef<TextInput>(null);

  // Countdown timer for resend cooldown
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

  // Handle OTP digit changes
  const handleOtpChange = (text: string) => {
    const cleaned = text.replace(/\D/g, '').slice(0, 6);
    setOtp(cleaned);
    if (errorMessage) setErrorMessage(null);

    // Auto submit when 6 digits are typed
    if (cleaned.length === 6) {
      submitOtp(cleaned);
    }
  };

  const submitOtp = async (codeToVerify?: string) => {
    const cleanCode = (codeToVerify || otp).trim();

    if (!cleanCode) {
      setErrorMessage('Please enter the 6-digit OTP sent to your phone.');
      return;
    }

    if (cleanCode.length !== 6) {
      setErrorMessage('Please enter all 6 digits of the verification code.');
      return;
    }

    setIsVerifying(true);
    setErrorMessage(null);

    try {
      const res = await verifyOtp({ phone, otp: cleanCode });
      const step = res?.onboardingStep;

      if (res?.isNewUser || step === 'profile_pending') {
        navigation.replace('CustomerOnboardingProfile');
      } else if (step === 'address_pending') {
        navigation.replace('CustomerOnboardingAddress');
      } else if (pendingAction?.screen) {
        const dest = pendingAction;
        clearPendingAction();
        if (navigation.resetTo) {
          navigation.resetTo(dest.screen, dest.params);
        } else {
          navigation.navigate(dest.screen, dest.params);
        }
      } else {
        navigation.resetTo('HomeTab');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Invalid or expired OTP. Please check and try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0 || isResending) return;

    setIsResending(true);
    setErrorMessage(null);

    try {
      const res = await sendOtp(phone, 'customer_login');
      setCountdown(res?.cooldownSeconds || 60);
      setOtp('');
      inputRef.current?.focus();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to resend verification code. Please try again.');
    } finally {
      setIsResending(false);
    }
  };

  // Masked phone: +91 ******9876
  const maskedPhone = phone.length >= 10
    ? `+91 ******${phone.slice(-4)}`
    : `+91 ${phone}`;

  return (
    <KeyboardAvoidingView
      style={styles.keyboardContainer}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Top Header with Back button */}
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
          {/* Security Shield Icon */}
          <View style={styles.iconCircle}>
            <Ionicons name="chatbubble-ellipses" size={32} color="#059669" />
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

          {/* Hidden Real TextInput with SMS Autofill Support */}
          <TextInput
            ref={inputRef}
            style={styles.hiddenInput}
            value={otp}
            onChangeText={handleOtpChange}
            keyboardType="number-pad"
            maxLength={6}
            autoFocus
            showSoftInputOnFocus={true}
            textContentType="oneTimeCode"
            autoComplete="sms-otp"
            editable={!isVerifying}
          />

          {/* Visual 6-Digit Cells */}
          <TouchableOpacity
            style={styles.otpBoxesRow}
            onPress={() => inputRef.current?.focus()}
            activeOpacity={1}
          >
            {[0, 1, 2, 3, 4, 5].map((index) => {
              const digit = otp[index] || '';
              const isFocused = otp.length === index;
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
                  <Text style={styles.otpDigit}>{digit}</Text>
                </View>
              );
            })}
          </TouchableOpacity>

          {/* Error Message */}
          {errorMessage ? (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={16} color="#EF4444" />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}

          {/* Primary Verify Button */}
          <TouchableOpacity
            style={[
              styles.primaryBtn,
              (isVerifying || otp.length !== 6) ? styles.primaryBtnDisabled : null
            ]}
            onPress={() => submitOtp()}
            disabled={isVerifying || otp.length !== 6}
            activeOpacity={0.8}
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
                  <ActivityIndicator size="small" color="#059669" />
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
    color: '#059669'
  },
  hiddenInput: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0
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
    borderColor: '#059669',
    backgroundColor: '#F0FDF4'
  },
  otpBoxFocused: {
    borderColor: '#059669',
    borderWidth: 2,
    backgroundColor: '#FFFFFF',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2
  },
  otpBoxError: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2'
  },
  otpDigit: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A'
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
    color: '#EF4444',
    fontWeight: '500',
    marginLeft: 6,
    flex: 1
  },
  primaryBtn: {
    backgroundColor: '#059669',
    borderRadius: 14,
    height: 52,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    shadowColor: '#059669',
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
    color: '#059669'
  }
});

