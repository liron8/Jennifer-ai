import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next') ?? '/dashboard';

  if (code) {
    const supabase = await createClient();
    
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!error) {
      // Password recovery flow — always send user to the reset page,
      // bypassing onboarding checks. The user has a temporary session
      // just to update their password.
      if (next === '/reset-password') {
        return NextResponse.redirect(new URL('/reset-password', requestUrl.origin));
      }

      // Check if user has completed onboarding
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { data: profile } = await supabase
          .from('users')
          .select('onboarding_completed')
          .eq('id', user.id)
          .single();
        
        // Redirect to onboarding if not completed
        if (!profile?.onboarding_completed) {
          return NextResponse.redirect(new URL('/onboarding', requestUrl.origin));
        }
      }
      
      return NextResponse.redirect(new URL(next, requestUrl.origin));
    }
  }

  // Return to login page with error
  return NextResponse.redirect(new URL('/login?error=auth_callback_error', requestUrl.origin));
}
