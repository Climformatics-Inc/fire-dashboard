import { createContext, useContext, type ReactNode } from "react";
import type { SessionUser } from "../../data/authTypes";

type AuthContextValue = {
  user: SessionUser;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({
  user,
  signOut,
  children,
}: {
  user: SessionUser;
  signOut: () => Promise<void>;
  children: ReactNode;
}) {
  return <AuthContext.Provider value={{ user, signOut }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthGate");
  }
  return context;
}
