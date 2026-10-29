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
  // Prominent, well-balanced logo size (38-42% screen width, clamped)
  const logoSize = Math.min(Math.max(Math.round(screenWidth * 0.40), 150), 180);

  // Animation values
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.92)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const textTranslateY = useRef(new Animated.Value(8)).current;
  const containerOpacity = useRef(new Animated.Value(1)).current;

  const animFinishedRef = useRef(false);
  const isReadyRef = useRef(isReady);
  isReadyRef.current = isReady;

  useEffect(() => {
    // Hide native splash screen as soon as React component is mounted
    SplashScreen.hideAsync().catch(() => {});

    // Run entrance animation
    Animated.parallel([
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 650,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true
      }),
      Animated.timing(logoScale, {
        toValue: 1,
        duration: 750,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true
      }),
      Animated.sequence([
        Animated.delay(220),
        Animated.parallel([
          Animated.timing(textOpacity, {
            toValue: 1,
            duration: 550,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true
          }),
          Animated.timing(textTranslateY, {
            toValue: 0,
            duration: 550,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true
          })
        ])
      ])
    ]).start();

    // Enforce 1.4s minimum animation duration before allowing transition
    const timer = setTimeout(() => {
      animFinishedRef.current = true;
      if (isReadyRef.current) {
        dismissSplash();
      }
    }, 1400);

    return () => clearTimeout(timer);
  }, []);

  // When isReady becomes true after animation finished, dismiss
  useEffect(() => {
    if (isReady && animFinishedRef.current) {
      dismissSplash();
    }
  }, [isReady]);

  const dismissSplash = () => {
    Animated.timing(containerOpacity, {
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

  return (
    <Animated.View style={[styles.container, { opacity: containerOpacity }]} pointerEvents={isReady && animFinishedRef.current ? 'none' : 'auto'}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="#FFFFFF"
        translucent={Platform.OS === 'android'}
      />
      <View style={styles.content}>
        <Animated.Image
          source={WORKLOGY_LOGO}
          style={[
            styles.logo,
            {
              width: logoSize,
              height: logoSize,
              opacity: logoOpacity,
              transform: [{ scale: logoScale }]
            }
          ]}
          resizeMode="contain"
          fadeDuration={0}
        />

        <Animated.View
          style={[
            styles.textContainer,
            {
              opacity: textOpacity,
              transform: [{ translateY: textTranslateY }]
            }
          ]}
        >
          <Text style={styles.brandTitle}>WorkLogy</Text>
          <Text style={styles.tagline}>Trusted Local Services</Text>
        </Animated.View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#FFFFFF',
    zIndex: 99999,
    alignItems: 'center',
    justifyContent: 'center'
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center'
  },
  logo: {
    // Sizing handled dynamically
  },
  textContainer: {
    alignItems: 'center',
    marginTop: 18
  },
  brandTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.5
  },
  tagline: {
    fontSize: 13,
    fontWeight: '500',
    color: '#64748B',
    marginTop: 6,
    letterSpacing: 0.3
  }
});

export default WorklogySplashScreen;
