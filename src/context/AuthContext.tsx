import React, { createContext, useContext, useState } from "react";
import { User } from "../types";

interface AuthContextValue {
  user: User | null;
  login: (user: User) => void;
  logout: () => void;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const STORAGE_KEY = "community_hero_user";

function readStoredUser(): User | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? (JSON.parse(saved) as User) : null;
  } catch (e) {
    console.error("Failed to parse saved session", e);
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Read synchronously on first render so ProtectedRoute never flash-redirects
  // a logged-in user on a hard reload of a deep /app/* URL.
  const [user, setUser] = useState<User | null>(() => readStoredUser());

  const persist = (u: User) => {
    setUser(u);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
  };

  const login = (u: User) => persist(u);
  const updateUser = (u: User) => persist(u);

  const logout = () => {
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem("community_hero_token");
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
