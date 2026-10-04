"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { User, Profile } from "@/types";
import { authApi } from "@/lib/api";
import { getToken } from "@/lib/api-client";

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  refreshAuth: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshAuth = async () => {
    const token = getToken();
    
    if (!token) {
      setUser(null);
      setProfile(null);
      setLoading(false);
      return;
    }

    try {
      const data = await authApi.getMe();
      setUser(data.user);
      setProfile(data.profile || null);
    } catch (error: any) {
      console.error('[Auth] Auth refresh failed:', error.message);
      // A 401 token is cleared by api-client; other errors (e.g. backend
      // unreachable) leave the token intact so a reload can recover.
      setUser(null);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshAuth();
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, loading, refreshAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

