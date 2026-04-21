/**
 * Sign Out API Route
 * POST /api/auth/signout - Signs out the current user
 * GET /api/auth/signout - Signs out and redirects to login
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
  'Pragma': 'no-cache',
  'Expires': '0',
};

export async function POST() {
  try {
    const supabase = await createClient();
    await supabase.auth.signOut({ scope: 'global' });
    
    const response = NextResponse.json({ success: true });
    Object.entries(NO_CACHE_HEADERS).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    return response;
  } catch (error) {
    console.error('Sign out error:', error);
    return NextResponse.json({ success: false, error: 'Failed to sign out' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const supabase = await createClient();
    await supabase.auth.signOut({ scope: 'global' });
  } catch (error) {
    console.error('Sign out error:', error);
  }
  
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3005';
  const response = NextResponse.redirect(new URL('/login', appUrl));
  Object.entries(NO_CACHE_HEADERS).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  return response;
}
