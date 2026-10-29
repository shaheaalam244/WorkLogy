import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  Dimensions,
  Animated,
  Easing,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as SplashScreen from 'expo-splash-screen';

const WORKLOGY_LOGO = require('../assets/worklogy-logo.png');

interface WorklogySplashScreenProps {
  isReady?: boolean;
  onFinish?: () => void;
}

export const WorklogySplashScreen: React.FC<WorklogySplashScreenProps> = ({
  isReady = true,
  onFinish
}) => {
  const { width: screenWidth } = Dimensions.get('window');
  // Proportional logo size (approx 34-38% screen width, clamped between 130 and 160)
  const logoSize = Math.min(Math.max(Math.round(screenWidth * 0.36), 130), 160);

  // Animation values
  const containerOpacity = useRef(new Animated.Value(1)).current;
  const contentFade = useRef(new Animated.Value(0)).current;
  const contentTranslateY = useRef(new Animated.Value(6)).current;

  const isDismissingRef = useRef(false);

  useEffect(() => {
    // Hide native splash screen once React Native component is mounted
    SplashScreen.hideAsync().catch(() => {});

    // Quick subtle entrance
    Animated.parallel([
      Animated.timing(contentFade, {
        toValue: 1,
        duration: 350,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true
      }),
      Animated.timing(contentTranslateY, {
        toValue: 0,
        duration: 350,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true
      })
    ]).start();
  }, []);

  // When isReady becomes true (session restored), smoothly transition immediately without artificial delay
  useEffect(() => {
    if (isReady && !isDismissingRef.current) {
      isDismissingRef.current = true;
      Animated.timing(containerOpacity, {
        toValue: 0,
        duration: 220,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true
      }).start(() => {
        if (onFinish) {
          onFinish();
        }
      });
    }
  }, [isReady]);

  return (
    <Animated.View
      style={[styles.container, { opacity: containerOpacity }]}
      pointerEvents={isReady && isDismissingRef.current ? 'none' : 'auto'}
    >
      <StatusBar
        barStyle="dark-content"
        backgroundColor="#FFFFFF"
        translucent={Platform.OS === 'android'}
      />
      <Animated.View
        style={[
          styles.content,
          {
            opacity: contentFade,
            transform: [{ translateY: contentTranslateY }]
          }
        ]}
      >
        {/* Approved WorkLogy Handyman/House Logo (No Cards, No Shadows) */}
        <Animated.Image
          source={WORKLOGY_LOGO}
          style={[
            styles.logo,
            {
              width: logoSize,
              height: Math.round(logoSize * 0.95)
            }
          ]}
          resizeMode="contain"
          fadeDuration={0}
        />

        {/* Brand Name */}
        <Text style={styles.brandTitle}>WorkLogy Pro</Text>

        {/* Tagline */}
        <Text style={styles.tagline}>Your Skills. More Opportunities.</Text>

        {/* Supporting Message */}
        <Text style={styles.supportingText}>
          Connect with local customers. Grow your business.
        </Text>

        {/* Subtle Trust / Value Points */}
        <View style={styles.trustContainer}>
          <View style={styles.trustItem}>
            <View style={styles.iconCircle}>
              <Ionicons name="shield-checkmark" size={15} color="#059669" />
            </View>
            <Text style={styles.trustText}>Trusted Professionals</Text>
          </View>

          <View style={styles.trustItem}>
            <View style={styles.iconCircle}>
              <Ionicons name="briefcase" size={14} color="#059669" />
            </View>
            <Text style={styles.trustText}>Local Jobs. Real Opportunities.</Text>
          </View>
        </View>
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#FFFFFF',
    zIndex: 99999,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    maxWidth: 380,
    marginTop: -20
  },
  logo: {
    marginBottom: 20
  },
  brandTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.5,
    textAlign: 'center'
  },
  tagline: {
    fontSize: 16,
    fontWeight: '700',
    color: '#059669',
    marginTop: 8,
    letterSpacing: -0.2,
    textAlign: 'center'
  },
  supportingText: {
    fontSize: 13,
    fontWeight: '400',
    color: '#475569',
    marginTop: 6,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 12
  },
  trustContainer: {
    marginTop: 26,
    alignItems: 'center',
    gap: 10
  },
  trustItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8
  },
  iconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center'
  },
  trustText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#334155',
    letterSpacing: 0.1
  }
});

export default WorklogySplashScreen;
