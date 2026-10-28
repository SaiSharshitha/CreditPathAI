import React, { createContext, useState, useEffect, useCallback } from 'react';
import api from '../api/client';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('creditpath_user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem('creditpath_token') || null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('creditpath_token');
    localStorage.removeItem('creditpath_user');
  }, []);

  // Listen for session expiry from API interceptor
  useEffect(() => {
    const handleAuthExpired = () => {
      logout();
    };
    window.addEventListener('auth:expired', handleAuthExpired);
    return () => window.removeEventListener('auth:expired', handleAuthExpired);
  }, [logout]);

  // Restore & verify session on mount
  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('creditpath_token');
      if (!storedToken) {
        setLoading(false);
        return;
      }

      try {
        const res = await api.get('/auth/me');
        if (res.data && (res.data.user || res.data.email)) {
          const profile = res.data.user || res.data;
          setUser(profile);
          localStorage.setItem('creditpath_user', JSON.stringify(profile));
        }
      } catch (err) {
        console.warn('Session verification error:', err);
        // If 401 or network failed, clear token if 401
        if (err.response && err.response.status === 401) {
          logout();
        }
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, [logout]);

  const login = async (email, password) => {
    try {
      const res = await api.post('/auth/login', { email, password });
      const authToken = res.data.token || res.data.access_token || 'demo-jwt-token';
      const authUser = res.data.user || {
        email,
        name: res.data.name || email.split('@')[0],
        role: res.data.role || 'Borrower',
      };

      setToken(authToken);
      setUser(authUser);
      localStorage.setItem('creditpath_token', authToken);
      localStorage.setItem('creditpath_user', JSON.stringify(authUser));

      return { success: true, user: authUser, token: authToken };
    } catch (err) {
      const message =
        err.response?.data?.detail ||
        err.response?.data?.message ||
        err.message ||
        'Login failed. Please check credentials.';
      return { success: false, message };
    }
  };

  const signup = async (name, email, password, role = 'Borrower') => {
    try {
      const res = await api.post('/auth/register', { name, email, password, role });
      return {
        success: true,
        data: res.data,
        message: 'Account created successfully! Please log in.',
      };
    } catch (err) {
      const message =
        err.response?.data?.detail ||
        err.response?.data?.message ||
        err.message ||
        'Registration failed. Please try again.';
      return { success: false, message };
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
