/**
 * API Middleware
 * Authentication and authorization middleware for API routes
 */

import { createClient } from '@/lib/supabase/server';
import { unauthorizedResponse, forbiddenResponse } from './utils';
import type { NextRequest, NextResponse } from 'next/server';

export interface AuthContext {
  user: {
    id: string;
    email: string;
    full_name?: string;
    role: 'admin' | 'user';
    org_id: string;
    timezone: string;
  };
  org: {
    id: string;
    name: string;
    subscription_tier: string;
  };
}

export type AuthenticatedHandler = (
  request: NextRequest,
  context: AuthContext
) => Promise<NextResponse>;

export type AdminHandler = (
  request: NextRequest,
  context: AuthContext
) => Promise<NextResponse>;

/**
 * Wraps an API handler with authentication
 */
export function withAuth(handler: AuthenticatedHandler): (request: NextRequest) => Promise<NextResponse> {
  return async (request: NextRequest) => {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return unauthorizedResponse();
    }

    // Get user data with organization
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select(`
        id,
        email,
        full_name,
        role,
        org_id,
        timezone,
        organizations (
          id,
          name,
          subscription_tier
        )
      `)
      .eq('id', user.id)
      .single();

    if (userError || !userData) {
      return unauthorizedResponse('User not found');
    }

    const context: AuthContext = {
      user: {
        id: userData.id,
        email: userData.email,
        full_name: userData.full_name,
        role: userData.role,
        org_id: userData.org_id,
        timezone: userData.timezone || 'UTC',
      },
      org: {
        id: (userData.organizations as any)?.id,
        name: (userData.organizations as any)?.name,
        subscription_tier: (userData.organizations as any)?.subscription_tier,
      },
    };

    return handler(request, context);
  };
}

/**
 * Wraps an API handler with admin-only authentication
 */
export function withAdmin(handler: AdminHandler): (request: NextRequest) => Promise<NextResponse> {
  return withAuth(async (request, context) => {
    if (context.user.role !== 'admin') {
      return forbiddenResponse('Admin access required');
    }
    return handler(request, context);
  });
}

/**
 * Check if user has access to a specific tier feature
 */
export function checkTierAccess(
  currentTier: string,
  requiredTier: 'starter' | 'professional' | 'enterprise'
): boolean {
  const tierOrder = ['trial', 'starter', 'professional', 'enterprise'];
  const currentIndex = tierOrder.indexOf(currentTier);
  const requiredIndex = tierOrder.indexOf(requiredTier);
  
  return currentIndex >= requiredIndex;
}

/**
 * Middleware to check subscription tier
 */
export function withTier(
  requiredTier: 'starter' | 'professional' | 'enterprise',
  handler: AuthenticatedHandler
): (request: NextRequest) => Promise<NextResponse> {
  return withAuth(async (request, context) => {
    if (!checkTierAccess(context.org.subscription_tier, requiredTier)) {
      return forbiddenResponse(`This feature requires ${requiredTier} plan or higher`);
    }
    return handler(request, context);
  });
}
