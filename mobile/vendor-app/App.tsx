import './src/utils/ignoreWarnings';
import React from 'react';
import { View, StatusBar, StyleSheet, Platform } from 'react-native';
import { registerRootComponent } from 'expo';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import VendorAppContainer from './src/navigation/VendorNavigator';
import { AuthProvider } from './src/context/AuthContext';
import { COLORS } from './src/theme/colors';

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <View style={styles.root}>
          <StatusBar
            barStyle="dark-content"
            backgroundColor="transparent"
            translucent={Platform.OS === 'android'}
          />
          <VendorAppContainer />
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
