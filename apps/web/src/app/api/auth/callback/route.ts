import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  // If Supabase passed a `next` param (e.g. /reset-password), use it;
  // otherwise default to the dashboard.
  const next = requestUrl.searchParams.get('next') || '/dashboard';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // IMPORTANT: always honor `next` if it exists.
      // For password recovery, this will be `/reset-password`.
      return NextResponse.redirect(new URL(next, requestUrl.origin));
    }
  }

  // If anything goes wrong, send back to login with an error flag.
  return NextResponse.redirect(
    new URL('/login?error=auth_callback_error', requestUrl.origin),
  );
}
