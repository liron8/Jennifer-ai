/**
 * Invitation Acceptance Page
 * Displays invitation details and allows user to accept
 */

'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/base/buttons/button';
import { createClient } from '@/lib/supabase/client';

interface InvitationData {
  id: string;
  email: string;
  role: string;
  status: string;
  expires_at: string;
  organizations: {
    id: string;
    name: string;
    logo_url: string | null;
  };
  inviter: {
    full_name: string | null;
    email: string;
  };
}

export default function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const router = useRouter();
  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAccepting, setIsAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<{ email: string } | null>(null);

  useEffect(() => {
    async function fetchInvitation() {
      try {
        // Check if user is logged in
        const supabase = createClient();
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        setUser(currentUser ? { email: currentUser.email! } : null);

        // Fetch invitation details
        const response = await fetch(`/api/invitations/${token}`);
        const data = await response.json();

        if (!response.ok) {
          setError(data.error || 'Failed to load invitation');
          return;
        }

        setInvitation(data.data);
      } catch (err) {
        setError('Failed to load invitation');
      } finally {
        setIsLoading(false);
      }
    }

    fetchInvitation();
  }, [token]);

  const handleAccept = async () => {
    if (!user) {
      // Redirect to signup with invitation token
      router.push(`/?invite=${token}&email=${encodeURIComponent(invitation?.email || '')}`);
      return;
    }

    setIsAccepting(true);
    setError(null);

    try {
      const response = await fetch(`/api/invitations/${token}`, {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to accept invitation');
        return;
      }

      // Redirect to onboarding
      router.push('/onboarding');
    } catch (err) {
      setError('Failed to accept invitation');
    } finally {
      setIsAccepting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-primary">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-tertiary">Loading invitation...</p>
        </div>
      </div>
    );
  }

  if (error && !invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-primary p-4">
        <div className="max-w-md w-full text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-error-primary/10 mx-auto mb-6">
            <span className="text-2xl">❌</span>
          </div>
          <h1 className="text-display-xs font-semibold text-primary mb-2">
            Invalid Invitation
          </h1>
          <p className="text-tertiary mb-8">{error}</p>
          <Button href="/" size="lg">
            Go to Home
          </Button>
        </div>
      </div>
    );
  }

  if (!invitation) return null;

  const emailMismatch = user && user.email.toLowerCase() !== invitation.email.toLowerCase();

  return (
    <div className="min-h-screen flex items-center justify-center bg-primary p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          {/* Organization Logo or Default */}
          <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-brand-600 mx-auto mb-6">
            {invitation.organizations.logo_url ? (
              <img 
                src={invitation.organizations.logo_url} 
                alt={invitation.organizations.name}
                className="w-full h-full object-cover rounded-xl"
              />
            ) : (
              <span className="text-2xl font-bold text-white">
                {invitation.organizations.name.charAt(0).toUpperCase()}
              </span>
            )}
          </div>

          <h1 className="text-display-xs font-semibold text-primary mb-2">
            You&apos;re invited to join
          </h1>
          <p className="text-xl font-semibold text-brand-600 mb-2">
            {invitation.organizations.name}
          </p>
          <p className="text-tertiary">
            {invitation.inviter.full_name || invitation.inviter.email} has invited you to join their team on JeniferAI.
          </p>
        </div>

        <div className="bg-secondary rounded-xl p-6 mb-6">
          <div className="flex flex-col gap-4">
            <div>
              <p className="text-sm text-tertiary">Invited as</p>
              <p className="font-medium text-primary capitalize">{invitation.role}</p>
            </div>
            <div>
              <p className="text-sm text-tertiary">Email</p>
              <p className="font-medium text-primary">{invitation.email}</p>
            </div>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-error-primary/10 border border-error-primary/20 mb-6">
            <p className="text-sm text-error-primary">{error}</p>
          </div>
        )}

        {emailMismatch && (
          <div className="p-3 rounded-lg bg-warning-primary/10 border border-warning-primary/20 mb-6">
            <p className="text-sm text-warning-primary">
              You&apos;re logged in as {user.email}, but this invitation was sent to {invitation.email}. 
              Please log out and sign up with the correct email.
            </p>
          </div>
        )}

        <div className="flex flex-col gap-3">
          {!user ? (
            <>
              <Button onClick={handleAccept} size="lg" className="w-full">
                Create Account & Join
              </Button>
              <p className="text-sm text-tertiary text-center">
                Already have an account?{' '}
                <Button 
                  href={`/?mode=login&invite=${token}`} 
                  color="link-color" 
                  size="sm"
                >
                  Log in
                </Button>
              </p>
            </>
          ) : emailMismatch ? (
            <Button href="/api/auth/signout" color="secondary" size="lg" className="w-full">
              Log out and use correct email
            </Button>
          ) : (
            <Button 
              onClick={handleAccept} 
              size="lg" 
              className="w-full"
              isDisabled={isAccepting}
            >
              {isAccepting ? 'Accepting...' : 'Accept Invitation'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
