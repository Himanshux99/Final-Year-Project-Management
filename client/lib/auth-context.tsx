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
    console.log('[Auth] Refreshing auth, token exists:', !!token);
    
    if (!token) {
      console.log('[Auth] No token found, clearing state');
      setUser(null);
      setProfile(null);
      setLoading(false);
      return;
    }

    try {
      console.log('[Auth] Fetching user data...');
      const data = await authApi.getMe();
      console.log('[Auth] Got user data:', data.user?.email);
      setUser(data.user);
      setProfile(data.profile || null);
    } catch (error: any) {
      console.error('[Auth] Auth refresh failed:', error.message);
      // If token is invalid (401), it will be cleared by api-client
      // Only clear state here
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

