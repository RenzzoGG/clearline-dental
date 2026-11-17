import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";

import { api, refreshAccessToken, SESSION_EXPIRED_EVENT } from "../../lib/api";
import { tokens } from "../../lib/tokens";
import type { Me } from "../../lib/types";
import { AuthContext, type AuthState, type RegisterData } from "./auth-context";

/** Restores the session from the refresh token on load and exposes login/logout/register. */
export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<Me | null>(null);
  const [status, setStatus] = useState<AuthState["status"]>("loading");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const restored = tokens.getRefresh() ? await refreshAccessToken() : false;
      const me = restored ? await api.me().catch(() => null) : null;
      if (cancelled) return;
      if (!me) tokens.clear();
      setUser(me);
      setStatus(me ? "authenticated" : "anonymous");
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const reset = useCallback(() => {
    tokens.clear();
    setUser(null);
    setStatus("anonymous");
    queryClient.clear();
  }, [queryClient]);

  useEffect(() => {
    window.addEventListener(SESSION_EXPIRED_EVENT, reset);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, reset);
  }, [reset]);

  const login = useCallback(async (username: string, password: string) => {
    const pair = await api.login(username.trim(), password);
    tokens.set(pair.access, pair.refresh);
    const me = await api.me();
    setUser(me);
    setStatus("authenticated");
    return me;
  }, []);

  const register = useCallback(
    async (data: RegisterData) => {
      await api.register(data);
      return login(data.email, data.password);
    },
    [login],
  );

  const logout = useCallback(async () => {
    const refresh = tokens.getRefresh();
    if (refresh) await api.logout(refresh).catch(() => undefined);
    reset();
  }, [reset]);

  const value = useMemo<AuthState>(
    () => ({ user, status, login, register, logout }),
    [user, status, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
