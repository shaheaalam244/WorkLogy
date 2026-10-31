import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api, getStoredAuthToken } from '../api/client';
import { secureStorage } from '../storage/secureStorage';
import { STORAGE_KEYS } from '../constants';
import { pushNotificationService } from '../services/pushNotificationService';
import type { User } from '../types';

export type CustomerOnboardingStep = 'profile_pending' | 'address_pending' | 'completed';

export interface PendingAction {
  screen: string;
  params?: any;
  description?: string;
}

export interface AuthGateState {
  visible: boolean;
  heading: string;
  message: string;
  pendingAction?: PendingAction | null;
}

interface AuthContextType {
  user: User | null;
  isGuest: boolean;
  customerProfile: any | null;
  onboardingStep: CustomerOnboardingStep;
  setOnboardingStep: (step: CustomerOnboardingStep) => void;
  isLoading: boolean;
  pendingAction: PendingAction | null;
  setPendingAction: (action: PendingAction | null) => void;
  clearPendingAction: () => void;
  authGateModal: AuthGateState;
  promptAuthGate: (options?: { screen?: string; params?: any; heading?: string; message?: string }) => void;
  closeAuthGate: () => void;
  sendOtp: (phone: string, purpose?: 'login' | 'register' | 'customer_login' | 'customer_register') => Promise<{
    success: boolean;
    message: string;
    phone: string;
    purpose?: string;
    cooldownSeconds: number;
    expiresInSeconds: number;
    provider?: string;
  }>;
  verifyOtp: (params: { phone: string; otp: string; deviceInfo?: any }) => Promise<{
    success: boolean;
    token: string;
    user: User;
    profile?: any;
    isNewUser?: boolean;
    onboardingStep?: CustomerOnboardingStep;
  }>;
  login: (credentials: { email: string; password: string }) => Promise<void>;
  register: (data: { name: string; email: string; phone?: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  switchRole: (role: 'customer' | 'vendor') => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateProfile: (data: { name?: string; email?: string; phone?: string; avatar?: string }) => Promise<void>;
  completeProfileStep: (data: { name: string; email?: string; avatar?: string }) => Promise<void>;
  saveAddressStep: (address: any) => Promise<void>;
  skipAddressStep: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children?: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [customerProfile, setCustomerProfile] = useState<any | null>(null);
  const [onboardingStep, setOnboardingStep] = useState<CustomerOnboardingStep>('completed');
  const [isLoading, setIsLoading] = useState(true);

  // Authentication Gate and Pending Action state
  const [pendingAction, setPendingActionState] = useState<PendingAction | null>(null);
  const [authGateModal, setAuthGateModal] = useState<AuthGateState>({
    visible: false,
    heading: 'Sign in to continue',
    message: 'Verify your mobile number to post a job or book a trusted professional.',
    pendingAction: null
  });

  const setPendingAction = useCallback((action: PendingAction | null) => {
    setPendingActionState(action);
  }, []);

  const clearPendingAction = useCallback(() => {
    setPendingActionState(null);
    setAuthGateModal((prev) => ({ ...prev, pendingAction: null }));
  }, []);

  const promptAuthGate = useCallback((options?: { screen?: string; params?: any; heading?: string; message?: string }) => {
    const action: PendingAction | null = options?.screen
      ? { screen: options.screen, params: options.params }
      : null;

    if (action) {
      setPendingActionState(action);
    }

    setAuthGateModal({
      visible: true,
      heading: options?.heading || 'Sign in to continue',
      message: options?.message || 'Verify your mobile number to post a job or book a trusted professional.',
      pendingAction: action
    });
  }, []);

  const closeAuthGate = useCallback(() => {
    setAuthGateModal((prev) => ({ ...prev, visible: false }));
  }, []);

  const determineOnboardingStep = (u: User | null, profile: any | null): CustomerOnboardingStep => {
    if (!u) return 'completed';
    if (profile?.onboardingStep) {
      return profile.onboardingStep as CustomerOnboardingStep;
    }
    // If user's name is missing or the temp placeholder name
    if (!u.name || u.name === 'New Customer') {
      return 'profile_pending';
    }
    return 'completed';
  };

  const restoreSession = useCallback(async () => {
    try {
      setIsLoading(true);
      let token = await getStoredAuthToken();

      if (!token) {
        // Attempt silent refresh if refresh token exists
        const refreshToken = await secureStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
        if (refreshToken) {
          try {
            const refreshRes = await api.auth.refreshToken();
            token = refreshRes?.token || null;
          } catch {
            token = null;
          }
        }
      }

      if (token) {
        try {
          const res = await api.auth.getCurrentUser();
          if (res?.user && res.user.role === 'customer') {
            setUser(res.user);

            // Fetch customer profile for onboarding state and saved addresses
            let prof: any = null;
            try {
              const profRes = await api.customer.getProfile();
              if (profRes?.profile) {
                prof = profRes.profile;
                setCustomerProfile(profRes.profile);
              }
            } catch {
              // Ignore background profile fetch failure
            }

            const step = determineOnboardingStep(res.user, prof);
            setOnboardingStep(step);

            pushNotificationService.registerForPushNotifications().catch(() => {});
          } else {
            setUser(null);
            setCustomerProfile(null);
          }
        } catch (fetchErr: any) {
          // If token expired, try one refresh before wiping
          if (fetchErr?.status === 401 || fetchErr?.isSessionExpired) {
            try {
              const refreshRes = await api.auth.refreshToken();
              if (refreshRes?.user && refreshRes.user.role === 'customer') {
                setUser(refreshRes.user);
                let prof: any = null;
                try {
                  const profRes = await api.customer.getProfile();
                  if (profRes?.profile) {
                    prof = profRes.profile;
                    setCustomerProfile(prof);
                  }
                } catch {}
                const step = determineOnboardingStep(refreshRes.user, prof);
                setOnboardingStep(step);
                pushNotificationService.registerForPushNotifications().catch(() => {});
                return;
              }
            } catch {}
          }
          await secureStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
          await secureStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
          await secureStorage.removeItem(STORAGE_KEYS.AUTH_USER);
          await secureStorage.removeItem('worklogy_token');
          await secureStorage.removeItem('token');
          setUser(null);
          setCustomerProfile(null);
        }
      } else {
        setUser(null);
        setCustomerProfile(null);
      }
    } catch {
      await secureStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
      await secureStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
      await secureStorage.removeItem(STORAGE_KEYS.AUTH_USER);
      await secureStorage.removeItem('worklogy_token');
      await secureStorage.removeItem('token');
      setUser(null);
      setCustomerProfile(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  const sendOtp = async (phone: string, purpose: 'login' | 'register' | 'customer_login' | 'customer_register' = 'login') => {
    return await api.auth.sendOtp(phone, purpose);
  };

  const verifyOtp = async (params: { phone: string; otp: string; deviceInfo?: any }) => {
    setIsLoading(true);
    try {
      const res = await api.auth.verifyOtp(params);
      setUser(res.user);
      if (res.profile) {
        setCustomerProfile(res.profile);
      }

      const step = (res.onboardingStep as CustomerOnboardingStep) ||
        (res.isNewUser ? 'profile_pending' : 'completed');
      setOnboardingStep(step);

      pushNotificationService.registerForPushNotifications().catch(() => {});
      return {
        ...res,
        onboardingStep: step
      };
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (credentials: { email: string; password: string }) => {
    setIsLoading(true);
    try {
      const res = await api.auth.login(credentials);
      setUser(res.user);

      let prof: any = null;
      try {
        const profRes = await api.customer.getProfile();
        if (profRes?.profile) {
          prof = profRes.profile;
          setCustomerProfile(prof);
        }
      } catch {}

      const step = determineOnboardingStep(res.user, prof);
      setOnboardingStep(step);

      pushNotificationService.registerForPushNotifications().catch(() => {});
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: { name: string; email: string; phone?: string; password: string }) => {
    setIsLoading(true);
    try {
      const res = await api.auth.register(data);
      setUser(res.user);
      setOnboardingStep('completed');
      pushNotificationService.registerForPushNotifications().catch(() => {});
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await pushNotificationService.deregister();
    } catch (e) {
      console.warn('Push token deregister error on logout:', e);
    }
    await api.auth.logout();
    setUser(null);
    setCustomerProfile(null);
    setOnboardingStep('completed');
    clearPendingAction();
    closeAuthGate();
  };

  const switchRole = async (role: 'customer' | 'vendor') => {
    const res = await api.auth.switchRole(role);
    if (res?.user) {
      setUser(res.user);
    }
  };

  const refreshProfile = async () => {
    try {
      const res = await api.auth.getCurrentUser();
      if (res?.user) {
        setUser(res.user);
      }
      const profRes = await api.customer.getProfile();
      if (profRes?.profile) {
        setCustomerProfile(profRes.profile);
      }
    } catch {
      // Ignore background refresh failure
    }
  };

  const updateProfile = async (data: { name?: string; email?: string; phone?: string; avatar?: string }) => {
    let res: any;
    if (data.email) {
      res = await api.auth.updateProfile(data);
    } else {
      res = await api.auth.updateDetails(data);
    }
    if (res?.user) {
      setUser(res.user);
    }
  };

  const completeProfileStep = async (data: { name: string; email?: string; avatar?: string }) => {
    await api.auth.updateProfile({
      name: data.name.trim(),
      ...(data.email && data.email.trim() ? { email: data.email.trim() } : {}),
      ...(data.avatar ? { avatar: data.avatar } : {})
    });

    await api.customer.updateProfile({ onboardingStep: 'address_pending' });
    setOnboardingStep('address_pending');
    await refreshProfile();
  };

  const saveAddressStep = async (address: any) => {
    await api.customer.addAddress(address);
    await api.customer.updateProfile({ onboardingStep: 'completed' });
    setOnboardingStep('completed');
    await refreshProfile();
  };

  const skipAddressStep = async () => {
    await api.customer.updateProfile({ onboardingStep: 'completed' });
    setOnboardingStep('completed');
    await refreshProfile();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isGuest: !user,
        customerProfile,
        onboardingStep,
        setOnboardingStep,
        isLoading,
        pendingAction,
        setPendingAction,
        clearPendingAction,
        authGateModal,
        promptAuthGate,
        closeAuthGate,
        sendOtp,
        verifyOtp,
        login,
        register,
        logout,
        switchRole,
        refreshProfile,
        updateProfile,
        completeProfileStep,
        saveAddressStep,
        skipAddressStep
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
