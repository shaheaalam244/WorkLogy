import React, { useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  Animated,
  Easing,
  Platform,
  Image,
  Dimensions
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as SplashScreen from 'expo-splash-screen';

const CUSTOMER_SPLASH_IMAGE = require('../assets/worklogy-customer-splash-seamless.png');

interface WorklogySplashScreenProps {
  isReady?: boolean;
  onFinish?: () => void;
}

export const WorklogySplashScreen: React.FC<WorklogySplashScreenProps> = ({
  isReady = true,
  onFinish
}) => {
  const insets = useSafeAreaInsets();
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const isReadyRef = useRef(isReady);
  isReadyRef.current = isReady;

  const minTimerFinishedRef = useRef(false);
  const isTransitioningRef = useRef(false);
  const hasHiddenNativeSplashRef = useRef(false);

  // Responsive device dimensions calculation
  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

  // Adaptive font sizes & spacing based on device vertical real estate
  const isCompact = screenHeight < 720;
  const isMedium = screenHeight >= 720 && screenHeight < 880;

  const headingFontSize = isCompact ? 17 : isMedium ? 20 : 22;
  const headingLineHeight = isCompact ? 21 : isMedium ? 25 : 27;
  const subheadingFontSize = isCompact ? 12 : isMedium ? 13.5 : 14.5;
  const descriptionFontSize = isCompact ? 10.5 : isMedium ? 11.5 : 12.5;
  const descriptionLineHeight = isCompact ? 14.5 : isMedium ? 16 : 17;
  const bottomPadding = Math.max(insets.bottom + (isCompact ? 8 : 16), isCompact ? 16 : 28);

  const layout = useMemo(() => {
    const assetWidth = 1024;
    const assetHeight = 2275;
    const assetRatio = assetWidth / assetHeight; // ~0.4501
    const screenRatio = screenWidth / screenHeight;

    if (screenRatio > 0.65) {
      // Wide screens / Tablets: fit height, center horizontally
      const imgHeight = screenHeight;
      const imgWidth = Math.round(screenHeight * assetRatio);
      const left = Math.round((screenWidth - imgWidth) / 2);
      return { width: imgWidth, height: imgHeight, top: 0, left };
    }

    if (screenRatio >= assetRatio) {
      // Standard phones (9:16) to modern tall phones (19.5:9, 20:9):
      // Match screen width 100%, anchor from top (y=0) so the WorkLogy branding,
      // all 5 service trade bubbles, and the couple booking services remain in full prime view,
      // while the seamless warm living room floor naturally flows
      // all the way to the bottom edge with zero visible horizontal cut.
      const imgWidth = screenWidth;
      const imgHeight = Math.ceil(screenWidth / assetRatio);
      return { width: imgWidth, height: imgHeight, top: 0, left: 0 };
    }

    // Ultra-tall screens (21:9):
    // Match height, center horizontally
    const imgHeight = screenHeight;
    const imgWidth = Math.ceil(screenHeight * assetRatio);
    const left = Math.round((screenWidth - imgWidth) / 2);
    return { width: imgWidth, height: imgHeight, top: 0, left };
  }, [screenWidth, screenHeight]);

  const dismissNativeSplash = () => {
    if (!hasHiddenNativeSplashRef.current) {
      hasHiddenNativeSplashRef.current = true;
      SplashScreen.hideAsync().catch(() => {});
    }
  };

  const triggerFinish = () => {
    if (isTransitioningRef.current) return;
    isTransitioningRef.current = true;

    // Ensure native splash is hidden
    dismissNativeSplash();

    // Smooth professional fade out (250ms) into the main customer app destination
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 250,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true
    }).start(() => {
      if (onFinish) {
        onFinish();
      }
    });
  };

  useEffect(() => {
    // 1. Fallback timer to dismiss native splash quickly after React Native component mounts
    const nativeSplashFallback = setTimeout(() => {
      dismissNativeSplash();
    }, 120);

    // 2. Minimum display timer for promotional splash (2.2 seconds)
    const minDisplayTimer = setTimeout(() => {
      minTimerFinishedRef.current = true;
      if (isReadyRef.current) {
        triggerFinish();
      }
    }, 2200);

    // 3. Absolute maximum safety timeout (5 seconds) to avoid hanging if auth stalls
    const maxSafetyTimer = setTimeout(() => {
      minTimerFinishedRef.current = true;
      triggerFinish();
    }, 5000);

    return () => {
      clearTimeout(nativeSplashFallback);
      clearTimeout(minDisplayTimer);
      clearTimeout(maxSafetyTimer);
    };
  }, []);

  // When isReady becomes true (session restoration completes) and min display timer has elapsed
  useEffect(() => {
    if (isReady && minTimerFinishedRef.current) {
      triggerFinish();
    }
  }, [isReady]);

  return (
    <View style={styles.rootOverlay} pointerEvents="auto">
      <StatusBar
        barStyle="dark-content"
        backgroundColor="#E8D9CA"
        translucent={Platform.OS === 'android'}
      />
      <Animated.View style={[styles.imageContainer, { opacity: fadeAnim }]}>
        <Image
          source={CUSTOMER_SPLASH_IMAGE}
          style={[
            styles.splashImage,
            {
              width: layout.width,
              height: layout.height,
              top: layout.top,
              left: layout.left
            }
          ]}
          resizeMode="cover"
          onLoadEnd={dismissNativeSplash}
          fadeDuration={0}
        />

        {/* ── SEAMLESS BOTTOM BRANDING & VALUE PROPOSITION ── */}
        <View
          style={[
            styles.bottomContent,
            { paddingBottom: bottomPadding }
          ]}
          pointerEvents="none"
        >
          {/* Main Heading */}
          <Text
            style={[
              styles.mainHeading,
              { fontSize: headingFontSize, lineHeight: headingLineHeight }
            ]}
          >
            Your Home, Our Responsibility.
          </Text>

          {/* Subheading */}
          <Text
            style={[
              styles.subheading,
              { fontSize: subheadingFontSize }
            ]}
          >
            Trusted Help, Just a Tap Away.
          </Text>

          {/* Description */}
          <Text
            style={[
              styles.description,
              { fontSize: descriptionFontSize, lineHeight: descriptionLineHeight }
            ]}
          >
            From repairs to home care, find trusted professionals for every need.
          </Text>

          {/* Trust Highlights */}
          <View style={styles.trustRow}>
            <View style={styles.trustItem}>
              <View style={styles.trustIconWrapper}>
                <Ionicons name="shield-checkmark" size={isCompact ? 11 : 12} color="#16845D" />
              </View>
              <Text style={[styles.trustText, { fontSize: isCompact ? 10.5 : 11.5 }]}>Verified Professionals</Text>
            </View>

            <View style={styles.trustItem}>
              <View style={styles.trustIconWrapper}>
                <Ionicons name="flash" size={isCompact ? 11 : 12} color="#16845D" />
              </View>
              <Text style={[styles.trustText, { fontSize: isCompact ? 10.5 : 11.5 }]}>Quick & Easy Booking</Text>
            </View>

            <View style={styles.trustItem}>
              <View style={styles.trustIconWrapper}>
                <Ionicons name="home" size={isCompact ? 11 : 12} color="#16845D" />
              </View>
              <Text style={[styles.trustText, { fontSize: isCompact ? 10.5 : 11.5 }]}>Complete Home Solutions</Text>
            </View>
          </View>
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  rootOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#E8D9CA',
    zIndex: 999999,
    elevation: 999999
  },
  imageContainer: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#E8D9CA',
    overflow: 'hidden'
  },
  splashImage: {
    position: 'absolute'
  },
  bottomContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 20
  },
  mainHeading: {
    color: '#123D2C',
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.4
  },
  subheading: {
    color: '#16845D',
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: -0.2,
    marginTop: 4
  },
  description: {
    color: '#554B43',
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 6,
    maxWidth: 380,
    paddingHorizontal: 8
  },
  trustRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 12
  },
  trustItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5
  },
  trustIconWrapper: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(22, 132, 93, 0.12)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  trustText: {
    color: '#123D2C',
    fontSize: 11.5,
    fontWeight: '700',
    letterSpacing: -0.1
  }
});

export default WorklogySplashScreen;
