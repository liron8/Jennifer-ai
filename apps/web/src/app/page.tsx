'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Mail01 } from "@untitledui/icons";
import { Button } from "@/components/base/buttons/button";
import { SocialButton } from "@/components/base/buttons/social-button";
import { PasswordStrength } from "@/components/base/input/password-strength";
import { createClient } from '@/lib/supabase/client';
import { notify, authNotifications } from '@/lib/notifications';

type AuthMode = 'login' | 'signup';

export default function AuthPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    
    // Get invitation params from URL
    const inviteToken = searchParams.get('invite');
    const inviteEmail = searchParams.get('email');
    const initialMode = searchParams.get('mode') as AuthMode | null;
    
    const [mode, setMode] = useState<AuthMode>(initialMode || 'signup');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [prefillEmail, setPrefillEmail] = useState(inviteEmail || '');
    const [showVerificationMessage, setShowVerificationMessage] = useState(false);
    const [verificationEmail, setVerificationEmail] = useState('');
    const [password, setPassword] = useState('');

    // Update mode if URL param changes
    useEffect(() => {
        if (initialMode) {
            setMode(initialMode);
        }
    }, [initialMode]);

    const toggleMode = () => {
        setMode(mode === 'login' ? 'signup' : 'login');
        setError(null);
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        console.log('Form submitted!');
        setIsLoading(true);
        setError(null);
        
        const formData = new FormData(e.currentTarget);
        const email = formData.get('email') as string;
        const passwordValue = formData.get('password') as string;
        const name = formData.get('name') as string;
        
        console.log('Form data:', { email, name, hasPassword: !!passwordValue, passwordLength: passwordValue?.length });
        
        if (!email || !passwordValue) {
            setError('Please fill in all required fields');
            notify.error('Missing fields', 'Please fill in all required fields');
            setIsLoading(false);
            return;
        }
        
        const supabase = createClient();
        
        try {
            if (mode === 'signup') {
                console.log('Attempting signup with email:', email);
                
                const { data, error: signUpError } = await supabase.auth.signUp({
                    email,
                    password: passwordValue,
                    options: {
                        data: {
                            full_name: name,
                        },
                        emailRedirectTo: `${window.location.origin}/api/auth/callback`,
                    },
                });
                
                console.log('Signup response:', { data, error: signUpError });
                
                if (signUpError) {
                    console.error('Signup error:', signUpError);
                    // Handle specific error cases
                    if (signUpError.message.includes('already registered')) {
                        authNotifications.emailExists();
                    } else if (signUpError.message.includes('password')) {
                        authNotifications.passwordTooWeak();
                    } else {
                        authNotifications.signupError(signUpError.message);
                    }
                    setError(signUpError.message);
                    return;
                }
                
                if (data.user) {
                    console.log('User created:', data.user.id, 'Session:', !!data.session);
                    
                    // Check if email confirmation is required
                    // Supabase returns a user but no session when email confirmation is enabled
                    if (!data.session) {
                        // Email confirmation required
                        console.log('Email confirmation required');
                        setVerificationEmail(email);
                        setShowVerificationMessage(true);
                        setIsLoading(false);
                        return;
                    }
                    
                    // If there's an invitation token, accept it first
                    if (inviteToken) {
                        try {
                            const acceptResponse = await fetch(`/api/invitations/${inviteToken}`, {
                                method: 'POST',
                            });
                            if (!acceptResponse.ok) {
                                console.warn('Failed to auto-accept invitation');
                            }
                        } catch (err) {
                            console.warn('Error accepting invitation:', err);
                        }
                    }
                    window.location.href = '/onboarding';
                }
            } else {
                const { data, error: signInError } = await supabase.auth.signInWithPassword({
                    email,
                    password: passwordValue,
                });
                
                if (signInError) {
                    // Handle specific error cases
                    if (signInError.message.includes('Invalid login credentials')) {
                        authNotifications.invalidCredentials();
                    } else {
                        authNotifications.loginError(signInError.message);
                    }
                    setError(signInError.message);
                    return;
                }
                
                if (data.user) {
                    // If there's an invitation token, accept it first
                    if (inviteToken) {
                        try {
                            const acceptResponse = await fetch(`/api/invitations/${inviteToken}`, {
                                method: 'POST',
                            });
                            if (acceptResponse.ok) {
                                window.location.href = '/onboarding';
                                return;
                            }
                        } catch (err) {
                            console.warn('Error accepting invitation:', err);
                        }
                    }
                    
                    // Check onboarding status
                    try {
                        const { data: profile } = await supabase
                            .from('users')
                            .select('onboarding_completed')
                            .eq('id', data.user.id)
                            .single();
                        
                        // Use window.location.href for a full page reload so
                        // auth cookies are properly sent to the middleware
                        if (profile?.onboarding_completed) {
                            window.location.href = '/dashboard';
                        } else {
                            window.location.href = '/onboarding';
                        }
                    } catch {
                        // If profile query fails, default to dashboard
                        window.location.href = '/dashboard';
                    }
                    return;
                }
            }
        } catch (err) {
            console.error('Unexpected auth error:', err);
            const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred. Please try again.';
            setError(errorMessage);
            notify.error('Error', errorMessage);
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleGoogleSignIn = async () => {
        setIsLoading(true);
        setError(null);
        
        const supabase = createClient();
        
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${window.location.origin}/api/auth/callback`,
            },
        });
        
        if (error) {
            setError(error.message);
            setIsLoading(false);
        }
    };

    // Show email verification message
    if (showVerificationMessage) {
        return (
            <section className="grid min-h-screen grid-cols-1 bg-primary lg:grid-cols-2">
                <div className="flex flex-col bg-primary">
                    <header className="hidden p-8 md:block">
                        <div className="flex items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600">
                                <span className="text-lg font-bold text-white">J</span>
                            </div>
                            <span className="text-xl font-semibold text-primary">JeniferAI</span>
                        </div>
                    </header>
                    <div className="flex flex-1 justify-center px-4 py-12 md:items-center md:px-8 md:py-0">
                        <div className="flex w-full flex-col gap-8 sm:max-w-90 text-center">
                            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-success-primary/10 mx-auto">
                                <Mail01 className="h-8 w-8 text-success-primary" />
                            </div>
                            <div className="flex flex-col gap-3">
                                <h1 className="text-display-xs font-semibold text-primary md:text-display-sm">
                                    Check your email
                                </h1>
                                <p className="text-md text-tertiary">
                                    We&apos;ve sent a verification link to <strong>{verificationEmail}</strong>. 
                                    Click the link in the email to verify your account and continue.
                                </p>
                            </div>
                            <div className="flex flex-col gap-3">
                                <p className="text-sm text-tertiary">
                                    Didn&apos;t receive the email? Check your spam folder or
                                </p>
                                <Button 
                                    onClick={() => {
                                        setShowVerificationMessage(false);
                                        setMode('signup');
                                    }} 
                                    color="secondary" 
                                    size="md"
                                >
                                    Try again with a different email
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="relative hidden h-full flex-1 items-center justify-center overflow-hidden rounded-l-[80px] bg-[url(/shared-assets/spirals-blue.webp)] bg-cover bg-center lg:flex" />
            </section>
        );
    }

    return (
        <section className="grid min-h-screen grid-cols-1 bg-primary lg:grid-cols-2">
            <div className="flex flex-col bg-primary">
                <header className="hidden p-8 md:block">
                    {/* JeniferAI Logo */}
                    <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600">
                            <span className="text-lg font-bold text-white">J</span>
                        </div>
                        <span className="text-xl font-semibold text-primary">JeniferAI</span>
                    </div>
                </header>
                <div className="flex flex-1 justify-center px-4 py-12 md:items-center md:px-8 md:py-0">
                    <div className="flex w-full flex-col gap-8 sm:max-w-90">
                        <div className="flex flex-col gap-6">
                            {/* Mobile Logo */}
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-600 lg:hidden">
                                <span className="text-xl font-bold text-white">J</span>
                            </div>

                            <div className="flex flex-col gap-2 md:gap-3">
                                <h1 className="text-display-xs font-semibold text-primary md:text-display-sm">
                                    {mode === 'signup' ? 'Sign up' : 'Log in'}
                                </h1>
                                <p className="text-md text-tertiary">
                                    {mode === 'signup' 
                                        ? 'Start your 14-day free trial.' 
                                        : 'Welcome back! Please enter your details.'}
                                </p>
                            </div>
                        </div>

                        <form
                            onSubmit={handleSubmit}
                            className="flex flex-col gap-6"
                        >
                            <div className="flex flex-col gap-5">
                                {mode === 'signup' && (
                                    <div className="flex flex-col gap-1.5">
                                        <label htmlFor="name" className="text-sm font-medium text-secondary">Name</label>
                                        <input 
                                            id="name"
                                            name="name" 
                                            type="text"
                                            required
                                            placeholder="Enter your name" 
                                            className="w-full rounded-lg border border-primary bg-primary px-3.5 py-2.5 text-md text-primary placeholder:text-placeholder shadow-xs focus:outline-none focus:ring-2 focus:ring-brand"
                                        />
                                    </div>
                                )}
                                <div className="flex flex-col gap-1.5">
                                    <label htmlFor="email" className="text-sm font-medium text-secondary">Email</label>
                                    <input 
                                        id="email"
                                        name="email" 
                                        type="email"
                                        required
                                        placeholder="Enter your email" 
                                        defaultValue={prefillEmail}
                                        disabled={!!inviteEmail}
                                        className="w-full rounded-lg border border-primary bg-primary px-3.5 py-2.5 text-md text-primary placeholder:text-placeholder shadow-xs focus:outline-none focus:ring-2 focus:ring-brand disabled:bg-disabled_subtle disabled:cursor-not-allowed"
                                    />
                                </div>
                                <div className="flex flex-col gap-2">
                                    <div className="flex flex-col gap-1.5">
                                        <label htmlFor="password" className="text-sm font-medium text-secondary">Password</label>
                                        <input
                                            id="password"
                                            name="password"
                                            type="password"
                                            required
                                            minLength={8}
                                            placeholder={mode === 'signup' ? 'Create a password' : 'Enter your password'}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="w-full rounded-lg border border-primary bg-primary px-3.5 py-2.5 text-md text-primary placeholder:text-placeholder shadow-xs focus:outline-none focus:ring-2 focus:ring-brand"
                                        />
                                    </div>
                                    {mode === 'signup' && <PasswordStrength password={password} />}
                                </div>
                            </div>

                            {mode === 'login' && (
                                <div className="flex items-center justify-end">
                                    <Button href="/forgot-password" color="link-color" size="md">
                                        Forgot password?
                                    </Button>
                                </div>
                            )}

                            {error && (
                                <div className="p-3 rounded-lg bg-error-primary/10 border border-error-primary/20">
                                    <p className="text-sm text-error-primary">{error}</p>
                                </div>
                            )}

                            <div className="flex flex-col gap-4">
                                <Button type="submit" size="lg" isDisabled={isLoading}>
                                    {isLoading ? 'Please wait...' : (mode === 'signup' ? 'Get started' : 'Sign in')}
                                </Button>
                                <SocialButton 
                                    social="google" 
                                    theme="color" 
                                    onClick={handleGoogleSignIn}
                                    disabled={isLoading}
                                >
                                    {mode === 'signup' ? 'Sign up with Google' : 'Sign in with Google'}
                                </SocialButton>
                            </div>
                        </form>

                        <div className="flex justify-center gap-1 text-center">
                            <span className="text-sm text-tertiary">
                                {mode === 'signup' ? 'Already have an account?' : "Don't have an account?"}
                            </span>
                            <Button onClick={toggleMode} color="link-color" size="md">
                                {mode === 'signup' ? 'Log in' : 'Sign up'}
                            </Button>
                        </div>
                    </div>
                </div>

                <footer className="hidden justify-between p-8 pt-11 lg:flex">
                    <p className="text-sm text-tertiary">© JeniferAI {new Date().getFullYear()}</p>

                    <a href="mailto:support@jeniferai.com" className="flex items-center gap-2 text-sm text-tertiary">
                        <Mail01 className="size-4 text-fg-quaternary" />
                        support@jeniferai.com
                    </a>
                </footer>
            </div>

            <div className="relative hidden h-full flex-1 items-center justify-center overflow-hidden rounded-l-[80px] bg-[url(/shared-assets/spirals-blue.webp)] bg-cover bg-center lg:flex" />
        </section>
    );
}
