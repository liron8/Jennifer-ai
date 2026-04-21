'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Check, Loader2, XCircle } from 'lucide-react';

type VerificationStatus = 'verifying' | 'success' | 'error' | 'expired';

export default function VerifyPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<VerificationStatus>('verifying');
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    const token = searchParams.get('token');
    const type = searchParams.get('type'); // 'email' | 'invite' | 'recovery'

    const verifyToken = async () => {
      // TODO: Implement token verification with Supabase
      // const { error } = await supabase.auth.verifyOtp({ token_hash: token, type })
      
      // Simulate verification
      setTimeout(() => {
        if (token) {
          setStatus('success');
        } else {
          setStatus('error');
        }
      }, 2000);
    };

    verifyToken();
  }, [searchParams]);

  useEffect(() => {
    if (status === 'success') {
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            router.push('/login');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [status, router]);

  const renderContent = () => {
    switch (status) {
      case 'verifying':
        return (
          <div className="flex flex-col items-center space-y-6 text-center">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
              <Loader2 className="w-6 h-6 text-primary animate-spin" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Verifying your email</h1>
              <p className="text-muted-foreground mt-2">
                Please wait while we verify your email address...
              </p>
            </div>
          </div>
        );

      case 'success':
        return (
          <div className="flex flex-col items-center space-y-6 text-center">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <Check className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Email verified!</h1>
              <p className="text-muted-foreground mt-2">
                Your email has been successfully verified.<br />
                Redirecting to login in {countdown} seconds...
              </p>
            </div>
            <Link
              href="/login"
              className="w-full py-2 px-4 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 text-center"
            >
              Continue to login
            </Link>
          </div>
        );

      case 'error':
        return (
          <div className="flex flex-col items-center space-y-6 text-center">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
              <XCircle className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Verification failed</h1>
              <p className="text-muted-foreground mt-2">
                We couldn&apos;t verify your email. The link may be invalid or expired.
              </p>
            </div>
            <div className="space-y-3 w-full">
              <Link
                href="/signup"
                className="block w-full py-2 px-4 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 text-center"
              >
                Sign up again
              </Link>
              <Link
                href="/login"
                className="block w-full py-2 px-4 border rounded-lg font-medium hover:bg-muted text-center"
              >
                Back to login
              </Link>
            </div>
          </div>
        );

      case 'expired':
        return (
          <div className="flex flex-col items-center space-y-6 text-center">
            <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
              <XCircle className="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Link expired</h1>
              <p className="text-muted-foreground mt-2">
                This verification link has expired.<br />
                Please request a new one.
              </p>
            </div>
            <div className="space-y-3 w-full">
              <button
                className="w-full py-2 px-4 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90"
              >
                Resend verification email
              </button>
              <Link
                href="/login"
                className="inline-flex items-center justify-center text-sm text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to login
              </Link>
            </div>
          </div>
        );
    }
  };

  return renderContent();
}
