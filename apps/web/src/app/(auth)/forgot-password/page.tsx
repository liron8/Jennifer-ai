'use client';

import { useState } from 'react';
import { ArrowLeft, Mail01, Key01 } from '@untitledui/icons';
import { Button } from '@/components/base/buttons/button';
import { createClient } from '@/lib/supabase/client';

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        const supabase = createClient();

        try {
            const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/api/auth/callback?next=/reset-password`,
            });

            if (resetError) {
                setError(resetError.message);
                setIsLoading(false);
                return;
            }

            setIsSubmitted(true);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Something went wrong');
        } finally {
            setIsLoading(false);
        }
    };

    // Success state — email sent confirmation
    if (isSubmitted) {
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
                            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success-primary/10">
                                <Mail01 className="h-8 w-8 text-success-primary" />
                            </div>
                            <div className="flex flex-col gap-3">
                                <h1 className="text-display-xs font-semibold text-primary md:text-display-sm">
                                    Check your email
                                </h1>
                                <p className="text-md text-tertiary">
                                    We sent a password reset link to{' '}
                                    <span className="font-medium text-primary">{email}</span>
                                </p>
                            </div>
                            <div className="flex flex-col gap-3">
                                <p className="text-sm text-tertiary">
                                    Didn&apos;t receive the email? Check your spam folder or
                                </p>
                                <Button
                                    onClick={() => {
                                        setIsSubmitted(false);
                                        setError(null);
                                    }}
                                    color="secondary"
                                    size="md"
                                >
                                    Click to resend
                                </Button>
                            </div>
                            <Button href="/" color="link-color" size="md" iconLeading={ArrowLeft}>
                                Back to login
                            </Button>
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

    // Default state — email input form
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
                    <div className="flex w-full flex-col gap-8 sm:max-w-90">
                        <div className="flex flex-col gap-6">
                            {/* Mobile Logo */}
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-600 lg:hidden">
                                <span className="text-xl font-bold text-white">J</span>
                            </div>

                            {/* Key icon */}
                            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-brand-600/10 ring-1 ring-inset ring-brand-600/20">
                                <Key01 className="h-7 w-7 text-brand-600" />
                            </div>

                            <div className="flex flex-col gap-2 md:gap-3">
                                <h1 className="text-display-xs font-semibold text-primary md:text-display-sm">
                                    Forgot password?
                                </h1>
                                <p className="text-md text-tertiary">
                                    No worries, we&apos;ll send you reset instructions.
                                </p>
                            </div>
                        </div>

                        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                            <div className="flex flex-col gap-1.5">
                                <label htmlFor="email" className="text-sm font-medium text-secondary">
                                    Email
                                </label>
                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="Enter your email"
                                    className="w-full rounded-lg border border-primary bg-primary px-3.5 py-2.5 text-md text-primary placeholder:text-placeholder shadow-xs focus:outline-none focus:ring-2 focus:ring-brand"
                                />
                            </div>

                            {error && (
                                <div className="rounded-lg border border-error-primary/20 bg-error-primary/10 p-3">
                                    <p className="text-sm text-error-primary">{error}</p>
                                </div>
                            )}

                            <Button type="submit" size="lg" isDisabled={isLoading}>
                                {isLoading ? 'Sending...' : 'Reset password'}
                            </Button>
                        </form>

                        <div className="flex justify-center">
                            <Button href="/" color="link-color" size="md" iconLeading={ArrowLeft}>
                                Back to login
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
