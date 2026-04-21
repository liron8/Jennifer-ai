'use client';

/**
 * Auth Provider
 * React context provider for authentication state
 */

import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { User, Session } from '@supabase/supabase-js';

export interface AuthUser {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  role: 'admin' | 'user';
  org_id: string;
  onboarding_completed: boolean;
}

export interface AuthContextValue {
  user: AuthUser | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

interface AuthProviderProps {
  children: ReactNode;
  initialSession?: Session | null;
  initialUser?: AuthUser | null;
}

export function AuthProvider({
  children,
  initialSession = null,
  initialUser = null,
}: AuthProviderProps): React.JSX.Element {
  const [user, setUser] = useState<AuthUser | null>(initialUser);
  const [session, setSession] = useState<Session | null>(initialSession);
  const [isLoading, setIsLoading] = useState(!initialSession);

  const signOut = async (): Promise<void> => {
    setUser(null);
    setSession(null);
    // Actual sign out will be handled by the app using supabase client
  };

  const refreshUser = async (): Promise<void> => {
    // Will be implemented with actual supabase client in the app
    setIsLoading(false);
  };

  useEffect(() => {
    if (!initialSession) {
      refreshUser();
    }
  }, []);

  const value: AuthContextValue = {
    user,
    session,
    isLoading,
    isAuthenticated: !!session && !!user,
    signOut,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
}
