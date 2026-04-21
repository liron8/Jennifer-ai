'use client';

/**
 * Auth Hooks
 * React hooks for authentication
 */

import { useAuthContext, type AuthContextValue, type AuthUser } from './provider';

/**
 * Hook to get the current user
 */
export function useUser(): { user: AuthUser | null; isLoading: boolean } {
  const { user, isLoading } = useAuthContext();
  return { user, isLoading };
}

/**
 * Hook to get the full auth context
 */
export function useAuth(): AuthContextValue {
  return useAuthContext();
}

/**
 * Hook to check if user is authenticated
 */
export function useIsAuthenticated(): boolean {
  const { isAuthenticated } = useAuthContext();
  return isAuthenticated;
}

/**
 * Hook to check if user has a specific role
 */
export function useHasRole(role: 'admin' | 'user'): boolean {
  const { user } = useAuthContext();
  return user?.role === role;
}

/**
 * Hook to check if user is admin
 */
export function useIsAdmin(): boolean {
  return useHasRole('admin');
}
