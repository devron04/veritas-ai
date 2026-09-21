import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import axios from "axios";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface AuthUser {
  user_id: string;
  email: string;
  full_name: string;
  role: string;
  access_token: string;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, fullName: string, password: string) => Promise<void>;
  logout: () => void;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------
const AuthContext = createContext<AuthContextType | null>(null);

const STORAGE_KEY = "veritas_ai_token";
const API_BASE = "http://localhost:8000/api";

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // On mount — restore session from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed: AuthUser = JSON.parse(stored);
        setUser(parsed);
        setAxiosAuth(parsed.access_token);
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
    setLoading(false);
  }, []);

  const setAxiosAuth = (token: string) => {
    axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  };

  const clearAxiosAuth = () => {
    delete axios.defaults.headers.common["Authorization"];
  };

  const saveUser = (data: AuthUser) => {
    setUser(data);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    setAxiosAuth(data.access_token);
  };

  const login = useCallback(async (email: string, password: string) => {
    const form = new FormData();
    form.append("username", email); // OAuth2 form uses "username"
    form.append("password", password);
    const { data } = await axios.post(`${API_BASE}/auth/login`, form);
    saveUser(data);
  }, []);

  const register = useCallback(async (email: string, fullName: string, password: string) => {
    const { data } = await axios.post(`${API_BASE}/auth/register`, {
      email,
      full_name: fullName,
      password,
    });
    saveUser(data);
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
    clearAxiosAuth();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------
export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
};
