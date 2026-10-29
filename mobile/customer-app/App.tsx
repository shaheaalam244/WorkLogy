import './src/utils/ignoreWarnings';
import React from 'react';
import { View, StatusBar, StyleSheet, Platform } from 'react-native';
import { registerRootComponent } from 'expo';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import CustomerAppContainer from './src/navigation/CustomerNavigator';
import { AuthProvider } from './src/context/AuthContext';
import { COLORS } from './src/theme/colors';

// Prevent the native splash screen from auto-hiding before app initialization completes
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <View style={styles.root}>
          <StatusBar barStyle="dark-content" />
          <CustomerAppContainer />
        </View>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.background
  }
});

registerRootComponent(App);
