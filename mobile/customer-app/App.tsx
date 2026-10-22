import React from 'react';
import { SafeAreaView, StatusBar, StyleSheet } from 'react-native';
import CustomerAppContainer from './src/navigation/CustomerNavigator';
import { AuthProvider } from './src/context/AuthContext';
import { COLORS } from './src/theme/colors';

export default function App() {
  return (
    <AuthProvider>
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
        <CustomerAppContainer />
      </SafeAreaView>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background
  }
});
