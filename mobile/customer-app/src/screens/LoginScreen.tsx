import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Pressable,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../hooks/useAuth';

const WORKLOGY_LOGO = require('../assets/worklogybgremove.png');

export default function LoginScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { sendOtp } = useAuth();
  const phoneInputRef = useRef<TextInput>(null);

  const [phone, setPhone] = useState('');
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [termsModalVisible, setTermsModalVisible] = useState(false);
  const [modalContentType, setModalContentType] = useState<'terms' | 'privacy'>('terms');

  const isValidPhone = phone.length === 10 && /^[6-9]\d{9}$/.test(phone);

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

    if (cleanPhone.length !== 10) {
      setErrorMessage('Mobile number must be exactly 10 digits.');
      return;
    }

    if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
      setErrorMessage('Please enter a valid 10-digit Indian mobile number starting with 6-9.');
      return;
    }

    setIsSendingOtp(true);
    setErrorMessage(null);

    try {
      const res = await sendOtp(cleanPhone, 'customer_login');
      navigation.navigate('OtpVerification', {
        phone: cleanPhone,
        purpose: 'customer_login',
        cooldownSeconds: res?.cooldownSeconds || 60
      });
    } catch (err: any) {
      setErrorMessage(err.message || 'Unable to send OTP. Please check your number and try again.');
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleSkipForNow = () => {
    if (navigation.resetTo) {
      navigation.resetTo('HomeTab');
    } else {
      navigation.navigate('HomeTab');
    }
  };

  const openModal = (type: 'terms' | 'privacy') => {
    setModalContentType(type);
    setTermsModalVisible(true);
  };

  return (
    <KeyboardAvoidingView
      style={styles.keyboardContainer}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: Math.max(insets.top + 16, 32),
            paddingBottom: Math.max(insets.bottom + 16, 24)
          }
        ]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <View style={styles.cardContainer}>
          {/* WorkLogy Official Logo */}
          <View style={styles.logoWrapper}>
            <Image
              source={WORKLOGY_LOGO}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>

          {/* Heading & Subtitle */}
          <Text style={styles.heading}>Welcome to WorkLogy</Text>
          <Text style={styles.subtitle}>
            Book trusted local professionals in just a few simple steps.
          </Text>

          {/* Mobile Number Input Card */}
          <View style={styles.inputCard}>
            <Text style={styles.inputLabel}>Mobile number</Text>

            <View
              style={[
                styles.phoneInputRow,
                isFocused ? styles.phoneInputRowFocused : null,
                errorMessage ? styles.phoneInputRowError : null
              ]}
            >
              {/* Country Code Pill */}
              <TouchableOpacity
                style={styles.countryCodePill}
                onPress={() => phoneInputRef.current?.focus()}
                activeOpacity={0.7}
              >
                <Text style={styles.flagEmoji}>🇮🇳</Text>
                <Text style={styles.countryCodeText}>+91</Text>
              </TouchableOpacity>

              <View style={styles.verticalDivider} />

              {/* Number Input */}
              <TextInput
                ref={phoneInputRef}
                style={styles.phoneInput}
                placeholder="Enter your 10-digit mobile number"
                placeholderTextColor="#94A3B8"
                keyboardType="number-pad"
                textContentType="telephoneNumber"
                autoComplete="tel"
                importantForAutofill="no"
                maxLength={10}
                value={phone}
                onChangeText={handlePhoneChange}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                editable={!isSendingOtp}
                focusable={true}
                showSoftInputOnFocus={true}
                selectionColor="#059669"
                cursorColor="#059669"
                returnKeyType="done"
                autoFocus={false}
                autoCorrect={false}
                autoCapitalize="none"
                selectTextOnFocus={false}
              />

              {isValidPhone && (
                <View style={styles.checkIcon}>
                  <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                </View>
              )}
            </View>

            {/* Error Message */}
            {errorMessage ? (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={15} color="#EF4444" />
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            ) : null}

            {/* Primary Action Button */}
            <TouchableOpacity
              style={[
                styles.primaryBtn,
                isValidPhone && !isSendingOtp ? styles.primaryBtnActive : styles.primaryBtnDisabled
              ]}
              onPress={handleSendOtp}
              disabled={isSendingOtp || !isValidPhone}
              activeOpacity={0.85}
            >
              {isSendingOtp ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <View style={styles.btnContent}>
                  <Text style={styles.primaryBtnText}>Continue with OTP</Text>
                  <Ionicons name="arrow-forward" size={18} color="#FFFFFF" style={{ marginLeft: 6 }} />
                </View>
              )}
            </TouchableOpacity>

            {/* OTP Explanation */}
            <Text style={styles.disclaimerText}>
              We'll send a 6-digit code to verify your mobile number.
            </Text>
          </View>

          {/* Guest Action: Skip for now */}
          <View style={styles.guestSection}>
            <TouchableOpacity
              style={styles.skipBtn}
              onPress={handleSkipForNow}
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 14, right: 14 }}
            >
              <Text style={styles.skipBtnText}>Skip for now</Text>
              <Ionicons name="chevron-forward" size={16} color="#059669" style={{ marginLeft: 2 }} />
            </TouchableOpacity>

            <Text style={styles.guestHelperText}>
              Explore services without signing in. Sign-in is required when you book or post a job.
            </Text>
          </View>

          {/* Trust Badges Row */}
          <View style={styles.trustRow}>
            <View style={styles.trustItem}>
              <Ionicons name="shield-checkmark" size={15} color="#059669" />
              <Text style={styles.trustText}>Verified Experts</Text>
            </View>
            <View style={styles.trustDot} />
            <View style={styles.trustItem}>
              <Ionicons name="lock-closed" size={14} color="#059669" />
              <Text style={styles.trustText}>Escrow Protected</Text>
            </View>
            <View style={styles.trustDot} />
            <View style={styles.trustItem}>
              <Ionicons name="time" size={14} color="#059669" />
              <Text style={styles.trustText}>Instant Quotes</Text>
            </View>
          </View>

          {/* Terms & Privacy Links */}
          <View style={styles.termsRow}>
            <Text style={styles.termsPreText}>By continuing, you agree to our </Text>
            <TouchableOpacity onPress={() => openModal('terms')} hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}>
              <Text style={styles.termsLink}>Terms of Service</Text>
            </TouchableOpacity>
            <Text style={styles.termsPreText}> & </Text>
            <TouchableOpacity onPress={() => openModal('privacy')} hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}>
              <Text style={styles.termsLink}>Privacy Policy</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Terms & Privacy Modal */}
      <Modal
        visible={termsModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setTermsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {modalContentType === 'terms' ? 'Terms of Service' : 'Privacy Policy'}
              </Text>
              <TouchableOpacity onPress={() => setTermsModalVisible(false)}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              {modalContentType === 'terms' ? (
                <Text style={styles.modalText}>
                  Welcome to WorkLogy. By using our application, you agree to these terms:
                  {'\n\n'}
                  1. WorkLogy acts as a hyperlocal marketplace connecting customers with verified local service contractors.
                  {'\n\n'}
                  2. All payments for bookings are held in secure escrow protection until the customer inspects and approves the job.
                  {'\n\n'}
                  3. Users must provide accurate mobile numbers for communication, quotes, and emergency technician dispatch.
                  {'\n\n'}
                  4. Cancellation before technician dispatch is 100% refundable without penalty.
                </Text>
              ) : (
                <Text style={styles.modalText}>
                  Your privacy is our priority at WorkLogy:
                  {'\n\n'}
                  1. We collect your mobile number solely for account security, SMS OTP verification, and booking coordination.
                  {'\n\n'}
                  2. Your location is requested only when searching for nearby services or specifying a service address.
                  {'\n\n'}
                  3. We never sell or share your personal data with third-party telemarketers.
                  {'\n\n'}
                  4. All authentication sessions are encrypted and protected with industry-standard JWT and rotating tokens.
                </Text>
              )}
            </ScrollView>
            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={() => setTermsModalVisible(false)}
            >
              <Text style={styles.modalCloseBtnText}>I Understand</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF'
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 22
  },
  cardContainer: {
    alignItems: 'center',
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center'
  },
  logoWrapper: {
    width: 76,
    height: 76,
    borderRadius: 20,
    backgroundColor: '#F0FDF4',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
    borderWidth: 1.5,
    borderColor: '#DCFCE7',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2
  },
  logo: {
    width: 52,
    height: 52
  },
  heading: {
    fontSize: 26,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
    letterSpacing: -0.5,
    marginBottom: 6
  },
  subtitle: {
    fontSize: 15,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 26,
    paddingHorizontal: 12
  },
  inputCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 14,
    elevation: 2,
    marginBottom: 16
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 10,
    letterSpacing: 0.2
  },
  phoneInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    height: 54,
    marginBottom: 10
  },
  phoneInputRowFocused: {
    borderColor: '#059669',
    backgroundColor: '#FFFFFF'
  },
  phoneInputRowError: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2'
  },
  countryCodePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 8,
    height: '100%',
    justifyContent: 'center'
  },
  flagEmoji: {
    fontSize: 18,
    marginRight: 6
  },
  countryCodeText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A'
  },
  verticalDivider: {
    width: 1,
    height: 22,
    backgroundColor: '#CBD5E1',
    marginRight: 10
  },
  phoneInput: {
    flex: 1,
    height: '100%',
    minHeight: 48,
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
    paddingHorizontal: 4,
    paddingVertical: 0,
    textAlignVertical: 'center'
  },
  checkIcon: {
    marginLeft: 6
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 2
  },
  errorText: {
    fontSize: 13,
    color: '#EF4444',
    fontWeight: '500',
    marginLeft: 5,
    flex: 1
  },
  primaryBtn: {
    borderRadius: 14,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4
  },
  primaryBtnActive: {
    backgroundColor: '#059669',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
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
  disclaimerText: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 17,
    marginTop: 12
  },
  guestSection: {
    alignItems: 'center',
    width: '100%',
    paddingVertical: 10,
    marginBottom: 16
  },
  skipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#DCFCE7',
    marginBottom: 8
  },
  skipBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#059669'
  },
  guestHelperText: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 17,
    paddingHorizontal: 20
  },
  trustRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    paddingHorizontal: 6
  },
  trustItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 2
  },
  trustDot: {
    width: 3.5,
    height: 3.5,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
    marginHorizontal: 8
  },
  trustText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    marginLeft: 4
  },
  termsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12
  },
  termsPreText: {
    fontSize: 12,
    color: '#94A3B8'
  },
  termsLink: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669'
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end'
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '75%'
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9'
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A'
  },
  modalBody: {
    marginBottom: 20
  },
  modalText: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 22
  },
  modalCloseBtn: {
    backgroundColor: '#059669',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center'
  },
  modalCloseBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF'
  }
});