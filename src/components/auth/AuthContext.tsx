import { createContext, useContext, type ReactNode } from "react";

type AuthContextValue = {
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({
  signOut,
  children,
}: {
  signOut: () => Promise<void>;
  children: ReactNode;
}) {
  return <AuthContext.Provider value={{ signOut }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthGate");
  }
  return context;
}
