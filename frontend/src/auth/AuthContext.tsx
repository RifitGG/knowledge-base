import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api, getToken, setToken } from "../api/client";
import type { User } from "../types";

interface AuthState {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string, remember: boolean) => Promise<void>;
  logout: () => void;
  refresh: () => Promise<void>;
}

const AuthCtx = createContext<AuthState | null>(null);

interface LoginResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!getToken()) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const me = await api.get<User>("/api/auth/me");
      setUser(me);
    } catch {
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = useCallback(async (email: string, password: string, remember: boolean) => {
    const resp = await api.post<LoginResponse>("/api/auth/login", { email, password, remember });
    setToken(resp.access_token);
    setUser(resp.user);
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
  }, []);

  const value = useMemo(() => ({ user, loading, login, logout, refresh }), [user, loading, login, logout, refresh]);
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
