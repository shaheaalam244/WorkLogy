import React, { createContext, useContext, useState, useEffect } from 'react';
import { api, getStoredAuthToken } from '../api/client';
import { secureStorage } from '../storage/secureStorage';
import { STORAGE_KEYS } from '../constants';
import type { User } from '../types';
import { pushNotificationService } from '../services/pushNotificationService';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (credentials: { email: string; password: string }) => Promise<void>;
  register: (data: { name: string; email: string; phone?: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  switchRole: (role: 'customer' | 'vendor') => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateLocalUser: (updated: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children?: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    restoreSession();
  }, []);

  const restoreSession = async () => {
    try {
      setIsLoading(true);
      const token = await getStoredAuthToken();
      if (token) {
        const res = await api.auth.getCurrentUser();
        if (res?.user) {
          setUser(res.user);
        }
      }
    } catch {
      await secureStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
      await secureStorage.removeItem(STORAGE_KEYS.AUTH_USER);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (credentials: { email: string; password: string }) => {
    setIsLoading(true);
    try {
      const res = await api.auth.login(credentials);
      setUser(res.user);
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: { name: string; email: string; phone?: string; password: string }) => {
    setIsLoading(true);
    try {
      const res = await api.auth.register(data);
      setUser(res.user);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await pushNotificationService.deregister();
    } catch (err) {
      console.warn('Push deregistration warning during logout:', err);
    }
    await api.auth.logout();
    setUser(null);
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
    }
  };

  const updateLocalUser = (updated: Partial<User>) => {
    setUser((prev) => (prev ? { ...prev, ...updated } : prev));
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout, switchRole, refreshProfile, updateLocalUser }}>
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
