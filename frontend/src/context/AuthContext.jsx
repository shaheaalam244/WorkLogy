import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/axios';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('worklogy_user');
    if (saved) {
      try { return JSON.parse(saved); } catch { return null; }
    }
    return null;
  });

  const [token, setToken] = useState(() => localStorage.getItem('worklogy_token') || null);
  const [loading, setLoading] = useState(false);

  // Sync token & user to localStorage and api header
  useEffect(() => {
    if (user) {
      localStorage.setItem('worklogy_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('worklogy_user');
    }
  }, [user]);

  useEffect(() => {
    if (token) {
      localStorage.setItem('worklogy_token', token);
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      localStorage.removeItem('worklogy_token');
      delete api.defaults.headers.common['Authorization'];
    }
  }, [token]);

  // Initial check: if no token exists, log in as real seeded demo customer
  useEffect(() => {
    const initAuth = async () => {
      // If user explicitly chose Guest mode, do not auto-login
      if (localStorage.getItem('worklogy_guest') === 'true') {
        return;
      }

      const storedToken = localStorage.getItem('worklogy_token');
      if (storedToken) {
        try {
          const res = await api.get('/auth/me');
          if (res.data?.success) {
            setUser(res.data.user);
            return;
          }
        } catch {
          // Token invalid or expired, continue to fallback
        }
      }

      // Automatically sign in as default customer from MongoDB
      try {
        const res = await api.post('/auth/login', {
          email: 'customer@worklogy.com',
          password: 'password123'
        });
        if (res.data?.success) {
          setUser(res.data.user);
          setToken(res.data.token);
        }
      } catch (err) {
        console.error('Initial login attempt failed:', err?.message);
      }
    };

    initAuth();
  }, []);

  const login = async (userData, authToken) => {
    localStorage.removeItem('worklogy_guest');
    setUser(userData);
    setToken(authToken);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('worklogy_user');
    localStorage.removeItem('worklogy_token');
  };

  // Real database role switch via real backend API authentication
  const switchRole = async (role) => {
    setLoading(true);
    try {
      if (role === 'guest') {
        logout();
        localStorage.setItem('worklogy_guest', 'true');
        return true;
      }

      localStorage.removeItem('worklogy_guest');

      let email = 'customer@worklogy.com';
      if (role === 'vendor') email = 'vendor@worklogy.com';
      if (role === 'admin') email = 'admin@worklogy.com';

      const res = await api.post('/auth/login', {
        email,
        password: 'password123'
      });

      if (res.data?.success) {
        setUser(res.data.user);
        setToken(res.data.token);
        return true;
      }
      return false;
    } catch (err) {
      console.error(`Failed to switch to role ${role}:`, err?.message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const updateUser = (updatedUser) => {
    setUser(prev => {
      const nextUser = { ...prev, ...updatedUser };
      localStorage.setItem('worklogy_user', JSON.stringify(nextUser));
      return nextUser;
    });
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, switchRole, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuthContext = () => useContext(AuthContext);
