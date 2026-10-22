import React from 'react';
import { SafeAreaView, StatusBar, StyleSheet } from 'react-native';
import VendorAppContainer from './src/navigation/VendorNavigator';
import { AuthProvider } from './src/context/AuthContext';
import { COLORS } from './src/theme/colors';

export default function App() {
  return (
    <AuthProvider>
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor="#064E3B" />
        <VendorAppContainer />
      </SafeAreaView>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC'
  }
});
