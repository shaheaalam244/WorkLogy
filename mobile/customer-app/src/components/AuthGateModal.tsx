import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TouchableWithoutFeedback,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../hooks/useAuth';

interface AuthGateModalProps {
  navigation: any;
}

export default function AuthGateModal({ navigation }: any) {
  const { authGateModal, closeAuthGate } = useAuth();
  const { visible, heading, message } = authGateModal;

  if (!visible) return null;

  const handleContinueWithOtp = () => {
    closeAuthGate();
    navigation.navigate('Login');
  };

  const handleMaybeLater = () => {
    closeAuthGate();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={handleMaybeLater}
    >
      <TouchableWithoutFeedback onPress={handleMaybeLater}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback onPress={() => {}}>
            <View style={styles.sheetContainer}>
              {/* Drag Handle Indicator */}
              <View style={styles.dragHandle} />

              {/* Security Shield Icon Header */}
              <View style={styles.iconCircle}>
                <Ionicons name="shield-checkmark" size={32} color="#059669" />
              </View>

              {/* Title & Message */}
              <Text style={styles.heading}>{heading || 'Sign in to continue'}</Text>
              <Text style={styles.message}>
                {message || 'Verify your mobile number to post a job or book a trusted professional.'}
              </Text>

              {/* Trust Badges Minimal Row */}
              <View style={styles.trustRow}>
                <View style={styles.trustBadge}>
                  <Ionicons name="lock-closed" size={13} color="#059669" />
                  <Text style={styles.trustBadgeText}>Escrow Protection</Text>
                </View>
                <View style={styles.trustDot} />
                <View style={styles.trustBadge}>
                  <Ionicons name="checkmark-circle" size={13} color="#059669" />
                  <Text style={styles.trustBadgeText}>Verified Pros</Text>
                </View>
              </View>

              {/* Primary CTA: Continue with OTP */}
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={handleContinueWithOtp}
                activeOpacity={0.85}
              >
                <View style={styles.btnContent}>
                  <Text style={styles.primaryBtnText}>Continue with OTP</Text>
                  <Ionicons name="arrow-forward" size={18} color="#FFFFFF" style={{ marginLeft: 6 }} />
                </View>
              </TouchableOpacity>

              {/* Secondary CTA: Maybe Later */}
              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={handleMaybeLater}
                activeOpacity={0.7}
              >
                <Text style={styles.secondaryBtnText}>Maybe later</Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end'
  },
  sheetContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 36 : 28,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 10
  },
  dragHandle: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#CBD5E1',
    marginBottom: 20
  },
  iconCircle: {
    width: 68,
    height: 68,
    borderRadius: 22,
    backgroundColor: '#F0FDF4',
    borderWidth: 1.5,
    borderColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16
  },
  heading: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
    letterSpacing: -0.4,
    marginBottom: 8
  },
  message: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 18,
    paddingHorizontal: 12
  },
  trustRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 22
  },
  trustBadge: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  trustBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
    marginLeft: 4
  },
  trustDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
    marginHorizontal: 10
  },
  primaryBtn: {
    backgroundColor: '#059669',
    borderRadius: 14,
    height: 52,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3
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
  secondaryBtn: {
    width: '100%',
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6
  },
  secondaryBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#64748B'
  }
});

