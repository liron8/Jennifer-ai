/**
 * Signup Page - Redirects to combined auth page
 */

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SignupPage() {
  const router = useRouter();
  
  useEffect(() => {
    // Client-side redirect to avoid server-side redirect loop
    router.replace('/');
  }, [router]);

  return null;
}
