import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Skip middleware if Supabase is not configured (development mode)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    // In development without Supabase, allow all routes
    return NextResponse.next();
  }

  // Import dynamically to avoid errors when env vars are missing
  const { updateSession } = await import('@/lib/supabase/middleware');
  const { supabaseResponse, user, supabase } = await updateSession(request);

  // Public routes that don't require authentication (auth route group)
  const publicRoutes = ['/', '/login', '/signup', '/forgot-password', '/reset-password', '/verify', '/invite'];
  const isPublicRoute = publicRoutes.some((route) => pathname === route || pathname.startsWith(route + '/'));

  // Onboarding route
  const isOnboardingRoute = pathname.startsWith('/onboarding');

  // Protected routes
  const protectedRoutes = ['/dashboard', '/ask-jenifer', '/scheduling', '/tasks', '/key-dates', '/reports', '/team', '/events', '/contacts', '/concierge', '/settings'];
  const isProtectedRoute = protectedRoutes.some((route) => pathname.startsWith(route));

  // Not logged in trying to access protected pages
  if (!user && isProtectedRoute) {
    const redirectUrl = new URL('/', request.url);
    redirectUrl.searchParams.set('next', pathname);
    const response = NextResponse.redirect(redirectUrl);
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    return response;
  }

  // Logged in user
  if (user) {
    // Check if onboarding is complete
    const { data: profile } = await supabase
      .from('users')
      .select('onboarding_completed')
      .eq('id', user.id)
      .single();

    const onboardingCompleted = profile?.onboarding_completed ?? false;

    // Logged in trying to access auth pages (except /reset-password, which
    // is reached via a temporary recovery session after clicking the email link)
    const isResetPasswordRoute = pathname === '/reset-password' || pathname.startsWith('/reset-password/');
    if (isPublicRoute && !isResetPasswordRoute) {
      if (!onboardingCompleted) {
        return NextResponse.redirect(new URL('/onboarding', request.url));
      }
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    // Not completed onboarding trying to access protected pages
    if (!onboardingCompleted && isProtectedRoute) {
      return NextResponse.redirect(new URL('/onboarding', request.url));
    }

    // Completed onboarding trying to access onboarding
    if (onboardingCompleted && isOnboardingRoute) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  // Prevent browser from caching protected/onboarding pages (back-button issues)
  if (isProtectedRoute || isOnboardingRoute) {
    supabaseResponse.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    supabaseResponse.headers.set('Pragma', 'no-cache');
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
