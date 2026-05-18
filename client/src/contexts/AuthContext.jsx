import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, setAuthHeader } from '../lib/api.js';

const AuthContext = createContext(null);

const TOKEN_KEY = 'animestream_token';

if (typeof window !== 'undefined') {
  const stored = localStorage.getItem(TOKEN_KEY);
  if (stored) setAuthHeader(stored);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    const stored = localStorage.getItem(TOKEN_KEY);
    if (stored) setAuthHeader(stored);
    try {
      const { data } = await api.get('/auth/me');
      setUser(data.user);
    } catch {
      setUser(null);
      localStorage.removeItem(TOKEN_KEY);
      setAuthHeader(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = useCallback(async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    if (data.token) {
      localStorage.setItem(TOKEN_KEY, data.token);
      setAuthHeader(data.token);
    }
    setUser(data.user);
    return data.user;
  }, []);

  const register = useCallback(async (payload) => {
    const { data } = await api.post('/auth/register', payload);
    if (data.token) {
      localStorage.setItem(TOKEN_KEY, data.token);
      setAuthHeader(data.token);
    }
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    await api.post('/auth/logout').catch(() => {});
    localStorage.removeItem(TOKEN_KEY);
    setAuthHeader(null);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      isAdmin: user?.role === 'admin',
      login,
      register,
      logout,
      refreshUser,
    }),
    [user, loading, login, register, logout, refreshUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
