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

export default function VendorRegisterScreen({ navigation }: any) {
  const { sendOtp } = useAuth();
  const [phone, setPhone] = useState('');
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handlePhoneChange = (text: string) => {
    const cleaned = text.replace(/\D/g, '').slice(0, 10);
    setPhone(cleaned);
    if (errorMessage) setErrorMessage(null);
  };

  const handleSendOtp = async () => {
    const cleanPhone = phone.trim();
    if (!cleanPhone) {
      setErrorMessage('Please enter your 10-digit mobile number.');
      return;
    }

    if (cleanPhone.length !== 10 || !/^[6-9]\d{9}$/.test(cleanPhone)) {
      setErrorMessage('Please enter a valid 10-digit Indian mobile number starting with 6-9.');
      return;
    }

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
        setErrorMessage(
          'An account is already registered with this mobile number. Please sign in instead.'
        );
      } else {
        setErrorMessage(err.message || 'Unable to send registration OTP. Please check your number.');
      }
    } finally {
      setIsSendingOtp(false);
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
              <Text style={styles.proBadgeText}>NEW PARTNER</Text>
            </View>

            <Text style={styles.welcomeTitle}>Join as a Certified Pro</Text>
            <Text style={styles.welcomeSubtitle}>
              Receive direct leads, guaranteed escrow payouts, and local job dispatches.
            </Text>
          </View>

          {/* Form */}
          <View style={styles.formContainer}>
            <Text style={styles.fieldLabel}>Mobile Number</Text>
            <View style={styles.phoneInputRow}>
              <View style={styles.countryCodeBadge}>
                <Text style={styles.countryFlag}>🇮🇳</Text>
                <Text style={styles.countryCodeText}>+91</Text>
              </View>
              <TextInput
                style={styles.phoneInput}
                placeholder="Enter 10-digit mobile number"
                placeholderTextColor={COLORS.textLight}
                keyboardType="number-pad"
                maxLength={10}
                value={phone}
                onChangeText={handlePhoneChange}
                autoFocus={true}
              />
            </View>

            {errorMessage && (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle" size={16} color={COLORS.error} style={{ marginRight: 6 }} />
                <Text style={styles.errorBannerText}>{errorMessage}</Text>
              </View>
            )}

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

            <Text style={styles.helperNote}>
              We will send a 6-digit verification code to verify your mobile number before setting up your profile.
            </Text>
          </View>

          {/* Footer Back to Login */}
          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Already registered? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('VendorLogin')}>
              <Text style={styles.loginLink}>Sign In Here</Text>
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
    marginBottom: 24
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
    marginBottom: 6,
    textAlign: 'center'
  },
  welcomeSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 18
  },
  formContainer: {
    marginBottom: 10
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
  helperNote: {
    fontSize: 11,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 14,
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
  loginLink: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.primary
  }
});
