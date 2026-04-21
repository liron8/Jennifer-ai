'use client';

/**
 * Auth Guards
 * Components for protecting routes based on authentication state
 */

import React, { useEffect, type ReactNode } from 'react';
import { useAuthContext } from './provider';

interface AuthGuardProps {
  children: ReactNode;
  requiredRole?: 'admin' | 'user';
  fallback?: ReactNode;
  redirectTo?: string;
}

export function AuthGuard({
  children,
  requiredRole,
  fallback = null,
}: AuthGuardProps): React.JSX.Element | null {
  const { user, isLoading, isAuthenticated } = useAuthContext();

  if (isLoading) {
    return <>{fallback}</>;
  }

  if (!isAuthenticated) {
    return null;
  }

  if (requiredRole && user?.role !== requiredRole) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">
          You don&apos;t have permission to access this page.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}

export function AdminGuard({ children }: { children: ReactNode }): React.JSX.Element | null {
  return <AuthGuard requiredRole="admin">{children}</AuthGuard>;
}

export function UserGuard({ children }: { children: ReactNode }): React.JSX.Element | null {
  return <AuthGuard>{children}</AuthGuard>;
}
