import React, { createContext, useContext, useState, useEffect } from 'react';
import { Platform } from 'react-native';
import { api, getStoredAuthToken } from '../api/client';
import { secureStorage } from '../storage/secureStorage';
import { STORAGE_KEYS } from '../constants';
import type { User, VendorProfile } from '../types';
import { pushNotificationService } from '../services/pushNotificationService';

interface AuthContextType {
  user: User | null;
  vendorProfile: VendorProfile | null;
  isLoading: boolean;
  sendOtp: (phone: string, purpose?: 'login' | 'register') => Promise<{
    success: boolean;
    message: string;
    phone: string;
    cooldownSeconds: number;
    expiresInSeconds: number;
    debugCode?: string;
  }>;
  verifyOtp: (params: { phone: string; otp: string }) => Promise<{
    user: User;
    profile?: any;
    isNewUser?: boolean;
    onboardingStep?: string;
  }>;
  login: (credentials: { email: string; password: string }) => Promise<any>;
  register: (data: {
    name: string;
    email: string;
    phone?: string;
    password: string;
    businessName?: string;
    selectedCategory?: string;
    category?: string;
    categories?: string[];
    serviceDomainIds?: string[];
    selectedCategories?: string[];
  }) => Promise<void>;
  logout: () => Promise<void>;
  switchRole: (role: 'customer' | 'vendor') => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateLocalUser: (updated: Partial<User>) => void;
  updateLocalProfile: (updated: Partial<VendorProfile>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children?: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [vendorProfile, setVendorProfile] = useState<VendorProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    restoreSession();
  }, []);

  const restoreSession = async () => {
    try {
      setIsLoading(true);
      const token = await getStoredAuthToken();
      const refreshToken = await secureStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);

      if (token || refreshToken) {
        // Try getting current user profile (client.ts auto-refreshes if access token is expired)
        const res = await api.auth.getCurrentUser();
        if (res?.user) {
          setUser(res.user);
          pushNotificationService.registerForPushNotifications().catch(() => {});

          // Fetch full vendor profile
          try {
            const vRes = await api.vendor.getProfile();
            if (vRes?.vendor) {
              setVendorProfile(vRes.vendor);
            }
          } catch {
            // ignore vendor profile load failure on startup
          }
        } else {
          setUser(null);
          setVendorProfile(null);
        }
      } else {
        setUser(null);
        setVendorProfile(null);
      }
    } catch (err: any) {
      console.warn('[AuthContext] Session restore note:', err?.message);
      // Only clear if the session is definitively revoked or unauthorized
      if (err?.data?.code === 'SESSION_REVOKED' || err?.data?.code === 'INVALID_REFRESH_TOKEN' || err?.status === 401) {
        await secureStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
        await secureStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
        await secureStorage.removeItem(STORAGE_KEYS.AUTH_USER);
        setUser(null);
        setVendorProfile(null);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const sendOtp = async (phone: string, purpose: 'login' | 'register' = 'login') => {
    return await api.auth.sendOtp(phone, purpose);
  };

  const verifyOtp = async (params: { phone: string; otp: string }) => {
    const res = await api.auth.verifyOtp({
      phone: params.phone,
      otp: params.otp,
      deviceInfo: {
        platform: Platform.OS,
        appVersion: '1.0.0'
      }
    });
    setUser(res.user);
    if (res.profile) {
      setVendorProfile(res.profile);
    }
    pushNotificationService.registerForPushNotifications().catch(() => {});
    return res;
  };

  const login = async (credentials: { email: string; password: string }) => {
    const res = await api.auth.login(credentials);
    setUser(res.user);
    if ((res as any)?.profile) {
      setVendorProfile((res as any).profile);
    } else {
      try {
        const vRes = await api.vendor.getProfile();
        if (vRes?.vendor) setVendorProfile(vRes.vendor);
      } catch {}
    }
    pushNotificationService.registerForPushNotifications().catch(() => {});
    return res;
  };

  const register = async (data: {
    name: string;
    email: string;
    phone?: string;
    password: string;
    businessName?: string;
    selectedCategory?: string;
    category?: string;
    categories?: string[];
    serviceDomainIds?: string[];
    selectedCategories?: string[];
  }) => {
    const res = await api.auth.register(data);
    setUser(res.user);
    try {
      const vRes = await api.vendor.getProfile();
      if (vRes?.vendor) setVendorProfile(vRes.vendor);
    } catch {}
    pushNotificationService.registerForPushNotifications().catch(() => {});
  };

  const logout = async () => {
    try {
      await pushNotificationService.deregister().catch(() => {});
    } catch (err) {
      console.warn('Push deregistration warning during logout:', err);
    }
    await api.auth.logout();
    setUser(null);
    setVendorProfile(null);
  };

  const switchRole = async (role: 'customer' | 'vendor') => {
    const res = await api.auth.switchRole(role);
    if (res?.user) {
      setUser(res.user);
    }
  };

  const refreshProfile = async () => {
    const res = await api.auth.getCurrentUser();
    if (res?.user) {
      setUser(res.user);
      try {
        const vRes = await api.vendor.getProfile();
        if (vRes?.vendor) setVendorProfile(vRes.vendor);
      } catch {}
    }
  };

  const updateLocalUser = (updated: Partial<User>) => {
    setUser((prev) => (prev ? { ...prev, ...updated } : prev));
  };

  const updateLocalProfile = (updated: Partial<VendorProfile>) => {
    setVendorProfile((prev) => (prev ? { ...prev, ...updated } : (updated as VendorProfile)));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        vendorProfile,
        isLoading,
        sendOtp,
        verifyOtp,
        login,
        register,
        logout,
        switchRole,
        refreshProfile,
        updateLocalUser,
        updateLocalProfile
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context as unknown as AuthContextType;
};

export default AuthContext;
