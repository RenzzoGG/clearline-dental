import { createContext, useContext } from "react";

import type { Me } from "../../lib/types";

export interface RegisterData {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  phone: string;
}

export interface AuthState {
  user: Me | null;
  status: "loading" | "authenticated" | "anonymous";
  login: (username: string, password: string) => Promise<Me>;
  register: (data: RegisterData) => Promise<Me>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthState | null>(null);

export function useAuth(): AuthState {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside <AuthProvider>");
  return context;
}
