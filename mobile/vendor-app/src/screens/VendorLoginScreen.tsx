import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { COLORS } from '../theme/colors';

export default function VendorLoginScreen({ navigation }: any) {
  const { login, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Fields Required', 'Please enter your registered professional email and password.');
      return;
    }

    try {
      await login({ email: email.trim(), password: password.trim() });
      navigation.navigate('VendorHomeTab');
    } catch (err: any) {
      Alert.alert('Login Failed', err.message || 'Invalid contractor credentials.');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.card}>
        <View style={styles.brandRow}>
          <Text style={styles.brandTitle}>WorkLogy Pro</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>CONTRACTOR</Text>
          </View>
        </View>

        <Text style={styles.welcomeTitle}>Tradesperson Sign In</Text>
        <Text style={styles.welcomeSubtitle}>
          Access your live dispatch radar, bid on local service tenders, and verify jobs.
        </Text>

        <Text style={styles.label}>Email Address</Text>
        <TextInput
          style={styles.input}
          placeholder="pro.electrician@example.com"
          placeholderTextColor={COLORS.textMuted}
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
        />

        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          placeholder="••••••••"
          placeholderTextColor={COLORS.textMuted}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <TouchableOpacity
          style={styles.loginBtn}
          onPress={handleLogin}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.loginBtnText}>Sign In to Pro Dashboard ⚡</Text>
          )}
        </TouchableOpacity>

        <View style={styles.footerRow}>
          <Text style={styles.footerText}>New professional partner? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('VendorRegister')}>
            <Text style={styles.registerLink}>Register as a Contractor</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#064E3B',
    justifyContent: 'center',
    padding: 20
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8
  },
  brandTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#065F46'
  },
  roleBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#B45309',
    letterSpacing: 0.5
  },
  welcomeTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textDark,
    marginTop: 4
  },
  welcomeSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
    marginBottom: 20,
    lineHeight: 16
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textDark,
    marginBottom: 6,
    textTransform: 'uppercase'
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 14,
    color: COLORS.textDark,
    marginBottom: 14,
    backgroundColor: '#F8FAFC'
  },
  loginBtn: {
    backgroundColor: COLORS.primary,
    height: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8
  },
  loginBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800'
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 18
  },
  footerText: {
    fontSize: 12,
    color: COLORS.textSecondary
  },
  registerLink: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.primary
  }
});
