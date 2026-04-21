'use client';

import { useEffect, useState } from 'react';
import { ArrowLeft, Mail01, Lock01, Eye, EyeOff, CheckCircle, AlertCircle } from '@untitledui/icons';
import { Button } from '@/components/base/buttons/button';
import { createClient } from '@/lib/supabase/client';

export default function ResetPasswordPage() {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [hasSession, setHasSession] = useState<boolean | null>(null);

    // Verify the user has a valid recovery session before allowing reset
    useEffect(() => {
        const supabase = createClient();

        supabase.auth.getSession().then(({ data }) => {
            setHasSession(!!data.session);
        });

        // Supabase fires PASSWORD_RECOVERY when the user lands via the email link
        const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
                setHasSession(!!session);
            }
        });

        return () => {
            listener.subscription.unsubscribe();
        };
    }, []);

    const passwordRequirements = [
        { label: 'At least 8 characters', met: password.length >= 8 },
        { label: 'Contains uppercase letter', met: /[A-Z]/.test(password) },
        { label: 'Contains lowercase letter', met: /[a-z]/.test(password) },
        { label: 'Contains number', met: /[0-9]/.test(password) },
    ];

    const allRequirementsMet = passwordRequirements.every((req) => req.met);
    const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError(null);

        if (!allRequirementsMet) {
            setError('Please meet all password requirements');
            return;
        }

        if (!passwordsMatch) {
            setError('Passwords do not match');
            return;
        }

        setIsLoading(true);

        const supabase = createClient();

        try {
            const { error: updateError } = await supabase.auth.updateUser({ password });

            if (updateError) {
                setError(updateError.message);
                setIsLoading(false);
                return;
            }

            // Sign out the recovery session so the user logs in fresh with the new password
            await supabase.auth.signOut();
            setIsSuccess(true);
            setTimeout(() => {
                window.location.href = '/';
            }, 2500);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Something went wrong');
            setIsLoading(false);
        }
    };

    const AuthShell = ({ children }: { children: React.ReactNode }) => (
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
                    <div className="flex w-full flex-col gap-8 sm:max-w-90">{children}</div>
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

    // Success state
    if (isSuccess) {
        return (
            <AuthShell>
                <div className="flex flex-col gap-8 text-center">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success-primary/10">
                        <CheckCircle className="h-8 w-8 text-success-primary" />
                    </div>
                    <div className="flex flex-col gap-3">
                        <h1 className="text-display-xs font-semibold text-primary md:text-display-sm">
                            Password reset successful
                        </h1>
                        <p className="text-md text-tertiary">
                            Your password has been updated. Redirecting you to login...
                        </p>
                    </div>
                </div>
            </AuthShell>
        );
    }

    // Invalid/expired recovery link
    if (hasSession === false) {
        return (
            <AuthShell>
                <div className="flex flex-col gap-8 text-center">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-error-primary/10">
                        <AlertCircle className="h-8 w-8 text-error-primary" />
                    </div>
                    <div className="flex flex-col gap-3">
                        <h1 className="text-display-xs font-semibold text-primary md:text-display-sm">
                            Invalid or expired link
                        </h1>
                        <p className="text-md text-tertiary">
                            This password reset link is no longer valid. Please request a new one.
                        </p>
                    </div>
                    <Button href="/forgot-password" size="lg">
                        Request new reset link
                    </Button>
                    <Button href="/" color="link-color" size="md" iconLeading={ArrowLeft}>
                        Back to login
                    </Button>
                </div>
            </AuthShell>
        );
    }

    // Loading session check
    if (hasSession === null) {
        return (
            <AuthShell>
                <div className="flex flex-col gap-4 text-center">
                    <p className="text-md text-tertiary">Verifying reset link...</p>
                </div>
            </AuthShell>
        );
    }

    // Default form state
    return (
        <AuthShell>
            <div className="flex flex-col gap-6">
                {/* Mobile Logo */}
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-600 lg:hidden">
                    <span className="text-xl font-bold text-white">J</span>
                </div>

                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-brand-600/10 ring-1 ring-inset ring-brand-600/20">
                    <Lock01 className="h-7 w-7 text-brand-600" />
                </div>

                <div className="flex flex-col gap-2 md:gap-3">
                    <h1 className="text-display-xs font-semibold text-primary md:text-display-sm">
                        Set new password
                    </h1>
                    <p className="text-md text-tertiary">
                        Your new password must be different from previously used passwords.
                    </p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                <div className="flex flex-col gap-5">
                    <div className="flex flex-col gap-1.5">
                        <label htmlFor="password" className="text-sm font-medium text-secondary">
                            Password
                        </label>
                        <div className="relative">
                            <input
                                id="password"
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Create a password"
                                required
                                className="w-full rounded-lg border border-primary bg-primary px-3.5 py-2.5 pr-10 text-md text-primary placeholder:text-placeholder shadow-xs focus:outline-none focus:ring-2 focus:ring-brand"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-fg-quaternary hover:text-secondary"
                                aria-label={showPassword ? 'Hide password' : 'Show password'}
                            >
                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                        </div>
                    </div>

                    <ul className="flex flex-col gap-1.5">
                        {passwordRequirements.map((req) => (
                            <li key={req.label} className="flex items-center gap-2 text-sm">
                                <div
                                    className={`flex h-4 w-4 items-center justify-center rounded-full ${
                                        req.met ? 'bg-success-primary/15' : 'bg-secondary'
                                    }`}
                                >
                                    {req.met && <CheckCircle className="h-3 w-3 text-success-primary" />}
                                </div>
                                <span className={req.met ? 'text-success-primary' : 'text-tertiary'}>
                                    {req.label}
                                </span>
                            </li>
                        ))}
                    </ul>

                    <div className="flex flex-col gap-1.5">
                        <label htmlFor="confirmPassword" className="text-sm font-medium text-secondary">
                            Confirm password
                        </label>
                        <div className="relative">
                            <input
                                id="confirmPassword"
                                type={showConfirmPassword ? 'text' : 'password'}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="Confirm your password"
                                required
                                className="w-full rounded-lg border border-primary bg-primary px-3.5 py-2.5 pr-10 text-md text-primary placeholder:text-placeholder shadow-xs focus:outline-none focus:ring-2 focus:ring-brand"
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-fg-quaternary hover:text-secondary"
                                aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                            >
                                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                        </div>
                        {confirmPassword && !passwordsMatch && (
                            <p className="text-sm text-error-primary">Passwords do not match</p>
                        )}
                    </div>
                </div>

                {error && (
                    <div className="rounded-lg border border-error-primary/20 bg-error-primary/10 p-3">
                        <p className="text-sm text-error-primary">{error}</p>
                    </div>
                )}

                <Button
                    type="submit"
                    size="lg"
                    isDisabled={isLoading || !allRequirementsMet || !passwordsMatch}
                >
                    {isLoading ? 'Resetting...' : 'Reset password'}
                </Button>
            </form>

            <div className="flex justify-center">
                <Button href="/" color="link-color" size="md" iconLeading={ArrowLeft}>
                    Back to login
                </Button>
            </div>
        </AuthShell>
    );
}
