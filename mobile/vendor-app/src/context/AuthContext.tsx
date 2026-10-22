import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api/client';
import { secureStorage } from '../storage/secureStorage';
import { STORAGE_KEYS } from '../constants';
import type { User } from '../types';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (credentials: { email: string; password: string }) => Promise<void>;
  register: (data: { name: string; email: string; phone?: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  switchRole: (role: 'customer' | 'vendor') => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    restoreSession();
  }, []);

  const restoreSession = async () => {
    try {
      setIsLoading(true);
      const token = await secureStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
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

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout, switchRole, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
