/**
 * Onboarding Page
 * Split layout with vertical progress steps on left, form content on right
 * Using Untitled UI components
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import confetti from 'canvas-confetti';
import { Calendar, Link01, Users01, CheckCircle, Trash01 } from '@untitledui/icons';
import { GoogleCalendarIcon, MicrosoftAzureIcon } from '@trigger.dev/companyicons';
import { Button } from '@/components/base/buttons/button';
import { Input } from '@/components/base/input/input';
import { Select } from '@/components/base/select/select';
import { Form } from '@/components/base/form/form';
import { Progress } from '@/components/application/progress-steps/progress-steps';
import type { ProgressIconType } from '@/components/application/progress-steps/progress-types';
import { useOnboarding, type OnboardingData } from '@/hooks/use-onboarding';
import { createClient } from '@/lib/supabase/client';

export default function OnboardingPage() {
  const router = useRouter();
  const [setupComplete, setSetupComplete] = useState(false);
  const onboarding = useOnboarding();
  
  // For invited users, skip company setup (steps 0-1) and go straight to role setup
  const TOTAL_STEPS = onboarding.isInvitedUser ? 4 : 6;
  const startStep = onboarding.isInvitedUser ? 2 : 0; // Start at role step for invited users
  const [currentStep, setCurrentStep] = useState(startStep);
  
  // Update starting step when invited status is determined
  useEffect(() => {
    if (!onboarding.isCheckingStatus && onboarding.isInvitedUser) {
      setCurrentStep(2); // Skip to "Your Role" step
    }
  }, [onboarding.isCheckingStatus, onboarding.isInvitedUser]);

  const handleComplete = () => {
    router.push('/dashboard');
  };

  const handleSetupComplete = async () => {
    const success = await onboarding.completeOnboarding();
    if (success) {
      setSetupComplete(true);
    }
  };

  // Early-save org and user before the integrations step so OAuth works
  const [earlySaved, setEarlySaved] = useState(false);
  const handlePreIntegrationSave = useCallback(async () => {
    if (earlySaved || onboarding.isInvitedUser) {
      setCurrentStep(4);
      return;
    }
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setCurrentStep(4); return; }

      // Check if user already exists
      const { data: existing } = await supabase
        .from('users')
        .select('id')
        .eq('id', user.id)
        .single();

      if (existing) {
        setEarlySaved(true);
        setCurrentStep(4);
        return;
      }

      const d = onboarding.data;
      const slug = d.companyName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '') + '-' + Date.now().toString(36);

      // Create org
      const { data: org, error: orgErr } = await supabase
        .from('organizations')
        .insert({
          name: d.companyName,
          slug,
          size: d.companySize,
          industry: d.industry,
          website: d.website || null,
          subscription_tier: 'trial',
          subscription_status: 'active',
          trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        })
        .select()
        .single();

      if (orgErr || !org) {
        console.error('Early org creation error:', orgErr);
        setCurrentStep(4);
        return;
      }

      // Create user
      await supabase.from('users').upsert({
        id: user.id,
        org_id: org.id,
        email: user.email!,
        full_name: d.fullName,
        job_title: d.jobTitle,
        phone: d.phone || null,
        role: 'admin',
        onboarding_completed: false,
        onboarding_step: 4,
      });

      // Create executives
      const validExecs = d.executives.filter(e => e.fullName.trim());
      if (validExecs.length > 0) {
        const { data: created } = await supabase
          .from('executive_profiles')
          .insert(validExecs.map(e => ({
            org_id: org.id,
            full_name: e.fullName,
            title: e.title || null,
            email: e.email || null,
            is_active: true,
          })))
          .select();

        if (created?.length) {
          await supabase.from('user_executive_assignments').insert(
            created.map((ex, i) => ({
              user_id: user.id,
              executive_id: ex.id,
              is_primary: i === 0,
              role: 'assistant',
            }))
          );
        }
      }

      setEarlySaved(true);
    } catch (err) {
      console.error('Early save error:', err);
    }
    setCurrentStep(4);
  }, [earlySaved, onboarding.isInvitedUser, onboarding.data]);

  const getStepStatus = (stepIndex: number): 'complete' | 'current' | 'incomplete' => {
    if (stepIndex < currentStep) return 'complete';
    if (stepIndex === currentStep) {
      // Special case: mark Finalization as complete when setup is done
      if (stepIndex === 5 && setupComplete) return 'complete';
      return 'current';
    }
    return 'incomplete';
  };

  // Different steps for invited users vs new users
  const progressSteps: ProgressIconType[] = onboarding.isInvitedUser
    ? [
        { 
          title: 'Your role', 
          description: 'Help us understand your role to personalize your dashboard and workflows', 
          status: getStepStatus(2)
        },
        { 
          title: 'Add executives', 
          description: 'Add the executives you support to enable smart calendar management', 
          status: getStepStatus(3)
        },
        { 
          title: 'Connect tools', 
          description: 'Link your calendars and email accounts for seamless integration', 
          status: getStepStatus(4)
        },
        { 
          title: 'Finalization', 
          description: 'We\'ll configure your workspace and get everything ready for you', 
          status: getStepStatus(5)
        },
      ]
    : [
        { 
          title: 'Welcome', 
          description: 'Get started with JeniferAI and explore what your AI assistant can do for you', 
          status: getStepStatus(0)
        },
        { 
          title: 'Company details', 
          description: 'Tell us about your organization so we can tailor the experience to your needs', 
          status: getStepStatus(1)
        },
        { 
          title: 'Your role', 
          description: 'Help us understand your role to personalize your dashboard and workflows', 
          status: getStepStatus(2)
        },
        { 
          title: 'Add executives', 
          description: 'Add the executives you support to enable smart calendar management', 
          status: getStepStatus(3)
        },
        { 
          title: 'Connect tools', 
          description: 'Link your calendars and email accounts for seamless integration', 
          status: getStepStatus(4)
        },
        { 
          title: 'Finalization', 
          description: 'We\'ll configure your workspace and get everything ready for you', 
          status: getStepStatus(5)
        },
      ];

  return (
    <div className="min-h-screen bg-primary flex">
      {/* Left Side - Progress Steps with Purple Gradient */}
      <div className="hidden lg:flex lg:w-[340px] xl:w-[400px] flex-col p-8 py-10 bg-gradient-to-b from-brand-600 to-brand-800">
        {/* Logo */}
        <div className="flex items-center gap-2 mb-6">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20">
            <span className="text-lg font-bold text-white">J</span>
          </div>
          <span className="text-xl font-semibold text-white">JeniferAI</span>
        </div>

        {/* Progress indicator text */}
        <p className="text-sm text-white/80 mb-8">
          Get started by setting up your workspace and company email.
        </p>

        {/* Vertical Progress Steps - stretched */}
        <div className="flex-1 flex flex-col">
          <Progress.IconsWithText 
            type="number" 
            items={progressSteps} 
            size="sm" 
            orientation="vertical" 
            className="flex-1 [&>div]:flex-1 [&>div]:justify-between [&_p.text-secondary]:text-white [&_p.text-secondary]:font-bold [&_p.text-tertiary]:text-white/70 [&_p.text-tertiary]:font-normal [&_p.text-disabled]:text-white/50 [&_.ring-secondary]:ring-white/30"
          />
        </div>

        {/* Help link */}
        <div className="pt-6 mt-6 border-t border-white/20">
          <p className="text-sm text-white/70">
            Need help?{' '}
            <a href="mailto:support@jeniferai.com" className="text-white hover:underline">
              Contact support
            </a>
          </p>
        </div>
      </div>

      {/* Right Side - Form Content */}
      <div className="flex-1 flex flex-col">
        {/* Mobile Header */}
        <div className="lg:hidden p-4 border-b border-secondary">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600">
                <span className="text-lg font-bold text-white">J</span>
              </div>
              <span className="text-lg font-semibold text-primary">JeniferAI</span>
            </div>
            <span className="text-sm text-tertiary">Step {currentStep + 1} of {TOTAL_STEPS}</span>
          </div>
          {/* Mobile Progress Bar */}
          <div className="mt-4 w-full h-1 bg-secondary rounded-full">
            <div
              className="h-full bg-brand-600 rounded-full transition-all duration-300"
              style={{ width: `${((currentStep + 1) / TOTAL_STEPS) * 100}%` }}
            />
          </div>
        </div>

        {/* Step Content */}
        <div className="flex-1 flex items-center justify-center p-6 lg:p-12 overflow-y-auto">
          <div className="w-full max-w-xl flex flex-col min-h-full justify-center">
            {/* Step indicator for desktop */}
            <p className="hidden lg:block text-sm font-medium text-brand-secondary mb-3">
              STEP {currentStep + 1} OF {TOTAL_STEPS}
            </p>

            {currentStep === 0 && (
              <WelcomeStep onNext={() => setCurrentStep(1)} />
            )}
            {currentStep === 1 && (
              <CompanyStep 
                onNext={() => setCurrentStep(2)} 
                onBack={() => setCurrentStep(0)}
                data={onboarding.data}
                updateData={onboarding.updateData}
              />
            )}
            {currentStep === 2 && (
              <RoleStep 
                onNext={() => setCurrentStep(3)} 
                onBack={() => setCurrentStep(1)}
                data={onboarding.data}
                updateData={onboarding.updateData}
              />
            )}
            {currentStep === 3 && (
              <ExecutivesStep 
                onNext={handlePreIntegrationSave} 
                onBack={() => setCurrentStep(2)}
                data={onboarding.data}
                updateExecutive={onboarding.updateExecutive}
                addExecutive={onboarding.addExecutive}
                removeExecutive={onboarding.removeExecutive}
              />
            )}
            {currentStep === 4 && (
              <IntegrationsStep 
                onBack={() => setCurrentStep(3)}
                onNext={() => setCurrentStep(5)}
              />
            )}
            {currentStep === 5 && (
              <SetupStep 
                onSetupComplete={handleSetupComplete}
                isLoading={onboarding.isLoading}
                error={onboarding.error}
              />
            )}
          </div>
        </div>

        {/* Footer with Dashboard Button - only show when setup is complete */}
        {setupComplete && (
          <div className="border-t border-secondary p-6 flex justify-end">
            <Button onClick={handleComplete} size="lg">
              Take me to the dashboard
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function WelcomeStep({ onNext }: { onNext: () => void }) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 flex flex-col justify-center">
        <div className="flex flex-col gap-3 mb-8">
          <h1 className="text-display-sm font-semibold text-primary">Welcome to JeniferAI</h1>
          <p className="text-tertiary text-md leading-relaxed">
            Your AI-powered command center for executive support. Let&apos;s get you set up in just a few minutes.
          </p>
        </div>
        
        <div className="flex flex-col gap-5">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
              <Calendar className="h-6 w-6" />
            </div>
            <div className="flex flex-col gap-1">
              <p className="font-semibold text-primary">Smart Calendar Management</p>
              <p className="text-sm text-tertiary leading-relaxed">AI-powered scheduling and meeting coordination that saves you hours every week</p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
              <Users01 className="h-6 w-6" />
            </div>
            <div className="flex flex-col gap-1">
              <p className="font-semibold text-primary">Executive Support</p>
              <p className="text-sm text-tertiary leading-relaxed">Manage multiple executives with ease and keep everyone organized effortlessly</p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
              <Link01 className="h-6 w-6" />
            </div>
            <div className="flex flex-col gap-1">
              <p className="font-semibold text-primary">Seamless Integrations</p>
              <p className="text-sm text-tertiary leading-relaxed">Connect with Google Calendar, Outlook, and all your favorite productivity tools</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-8 mt-auto">
        <Button onClick={onNext} size="lg">
          Get started
        </Button>
      </div>
    </div>
  );
}

const COMPANY_SIZES = [
  { id: '1-10', label: '1-10 employees' },
  { id: '11-50', label: '11-50 employees' },
  { id: '51-200', label: '51-200 employees' },
  { id: '201-500', label: '201-500 employees' },
  { id: '500+', label: '500+ employees' },
];

const INDUSTRIES = [
  { id: 'technology', label: 'Technology' },
  { id: 'finance', label: 'Finance' },
  { id: 'healthcare', label: 'Healthcare' },
  { id: 'legal', label: 'Legal' },
  { id: 'real-estate', label: 'Real Estate' },
  { id: 'manufacturing', label: 'Manufacturing' },
  { id: 'consulting', label: 'Consulting' },
  { id: 'non-profit', label: 'Non-Profit' },
  { id: 'government', label: 'Government' },
  { id: 'other', label: 'Other' },
];

interface CompanyStepProps {
  onNext: () => void;
  onBack: () => void;
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
}

function CompanyStep({ onNext, onBack, data, updateData }: CompanyStepProps) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onNext();
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 flex flex-col justify-center">
        <div className="flex flex-col gap-3 mb-8">
          <h2 className="text-display-xs font-semibold text-primary">Tell us about your company</h2>
          <p className="text-tertiary leading-relaxed">This helps us customize your experience and provide relevant features for your organization.</p>
        </div>
        <Form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <Input 
            label="Company Name" 
            placeholder="Acme Inc." 
            isRequired 
            hideRequiredIndicator
            size="md"
            value={data.companyName}
            onChange={(value) => updateData({ companyName: value })}
          />
          <Select 
            label="Company Size" 
            placeholder="Select size" 
            isRequired
            size="md"
            items={COMPANY_SIZES}
            selectedKey={data.companySize || undefined}
            onSelectionChange={(key) => updateData({ companySize: key as string })}
          >
            {(item) => <Select.Item id={item.id} label={item.label} />}
          </Select>
          <Select 
            label="Industry" 
            placeholder="Select industry" 
            isRequired
            size="md"
            items={INDUSTRIES}
            selectedKey={data.industry || undefined}
            onSelectionChange={(key) => updateData({ industry: key as string })}
          >
            {(item) => <Select.Item id={item.id} label={item.label} />}
          </Select>
          <Input 
            label="Company Website" 
            placeholder="https://example.com" 
            type="url"
            size="md"
            value={data.website || ''}
            onChange={(value) => updateData({ website: value })}
          />
          <div className="flex justify-between pt-8">
            <Button type="button" onClick={onBack} color="tertiary" size="lg">
              Back
            </Button>
            <Button type="submit" size="lg">
              Save and continue
            </Button>
          </div>
        </Form>
      </div>
    </div>
  );
}

const ROLES = [
  { id: 'executive_assistant', label: 'Executive Assistant' },
  { id: 'chief_of_staff', label: 'Chief of Staff' },
  { id: 'office_manager', label: 'Office Manager' },
  { id: 'executive', label: 'Executive' },
  { id: 'other', label: 'Other' },
];

interface RoleStepProps {
  onNext: () => void;
  onBack: () => void;
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
}

function RoleStep({ onNext, onBack, data, updateData }: RoleStepProps) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onNext();
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 flex flex-col justify-center">
        <div className="flex flex-col gap-3 mb-8">
          <h2 className="text-display-xs font-semibold text-primary">Tell us about yourself</h2>
          <p className="text-tertiary leading-relaxed">Help us personalize your dashboard and tailor the experience to your workflow.</p>
        </div>
        <Form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <Input 
            label="Full Name" 
            placeholder="Jane Smith" 
            isRequired 
            hideRequiredIndicator
            size="md"
            value={data.fullName}
            onChange={(value) => updateData({ fullName: value })}
          />
          <Input 
            label="Job Title" 
            placeholder="Executive Assistant" 
            isRequired 
            hideRequiredIndicator
            size="md"
            value={data.jobTitle}
            onChange={(value) => updateData({ jobTitle: value })}
          />
          <Select 
            label="Your Role" 
            placeholder="Select role" 
            isRequired
            size="md"
            items={ROLES}
            selectedKey={data.role || undefined}
            onSelectionChange={(key) => updateData({ role: key as string })}
          >
            {(item) => <Select.Item id={item.id} label={item.label} />}
          </Select>
          <Input 
            label="Phone Number" 
            placeholder="+1 (555) 000-0000" 
            type="tel"
            size="md"
            value={data.phone || ''}
            onChange={(value) => updateData({ phone: value })}
          />
          <div className="flex justify-between pt-8">
            <Button type="button" onClick={onBack} color="tertiary" size="lg">
              Back
            </Button>
            <Button type="submit" size="lg">
              Save and continue
            </Button>
          </div>
        </Form>
      </div>
    </div>
  );
}

interface ExecutivesStepProps {
  onNext: () => void;
  onBack: () => void;
  data: OnboardingData;
  updateExecutive: (index: number, updates: Partial<OnboardingData['executives'][0]>) => void;
  addExecutive: () => void;
  removeExecutive: (index: number) => void;
}

function ExecutivesStep({ onNext, onBack, data, updateExecutive, addExecutive, removeExecutive }: ExecutivesStepProps) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onNext();
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 flex flex-col justify-center">
        <div className="flex flex-col gap-3 mb-8">
          <h2 className="text-display-xs font-semibold text-primary">Add your executives</h2>
          <p className="text-tertiary leading-relaxed">Who will you be supporting? You can add more executives later from your dashboard.</p>
        </div>
        <Form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {data.executives.map((exec, index) => (
            <div key={index} className="p-5 rounded-xl ring-1 ring-primary ring-inset flex flex-col gap-4 relative">
              {data.executives.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeExecutive(index)}
                  className="absolute top-3 right-3 p-1 text-tertiary hover:text-error-primary transition-colors"
                >
                  <Trash01 className="w-4 h-4" />
                </button>
              )}
              <Input 
                label="Executive Name" 
                placeholder="John Doe" 
                isRequired 
                hideRequiredIndicator
                size="md"
                value={exec.fullName}
                onChange={(value) => updateExecutive(index, { fullName: value })}
              />
              <Input 
                label="Title" 
                placeholder="CEO" 
                isRequired 
                hideRequiredIndicator
                size="md"
                value={exec.title}
                onChange={(value) => updateExecutive(index, { title: value })}
              />
              <Input 
                label="Email" 
                placeholder="john@company.com" 
                type="email"
                size="md"
                value={exec.email || ''}
                onChange={(value) => updateExecutive(index, { email: value })}
              />
            </div>
          ))}
          <Button type="button" color="secondary" size="lg" className="w-full" onClick={addExecutive}>
            + Add Another Executive
          </Button>
          <div className="flex justify-between pt-4">
            <Button type="button" onClick={onBack} color="tertiary" size="lg">
              Back
            </Button>
            <Button type="submit" size="lg">
              Save and continue
            </Button>
          </div>
        </Form>
      </div>
    </div>
  );
}

function IntegrationsStep({ onBack, onNext }: { onBack: () => void; onNext: () => void }) {
  const [connectedProviders, setConnectedProviders] = useState<string[]>([]);

  useEffect(() => {
    const fetchIntegrations = async () => {
      try {
        const response = await fetch('/api/integrations');
        if (response.ok) {
          const result = await response.json();
          const list = result.data?.data ?? result.data ?? [];
          const active = Array.isArray(list)
            ? list.filter((i: any) => i.status === 'active').map((i: any) => i.provider)
            : [];
          setConnectedProviders(active);
        }
      } catch (err) {
        console.error('Failed to fetch integrations:', err);
      }
    };
    fetchIntegrations();

    // Check for OAuth redirect success
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('success') === 'true') {
      fetchIntegrations();
      window.history.replaceState({}, '', '/onboarding');
    }
  }, []);

  const handleConnectGoogle = () => {
    window.location.href = '/api/integrations/google/connect?redirect=/onboarding';
  };

  const handleConnectMicrosoft = () => {
    window.location.href = '/api/integrations/microsoft/connect?redirect=/onboarding';
  };

  const isGoogleConnected = connectedProviders.includes('google');
  const isMicrosoftConnected = connectedProviders.includes('microsoft');

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 flex flex-col justify-center">
        <div className="flex flex-col gap-3 mb-8">
          <h2 className="text-display-xs font-semibold text-primary">Connect your tools</h2>
          <p className="text-tertiary leading-relaxed">Sync your calendars and email for seamless scheduling. You can skip this for now and connect later.</p>
        </div>
        <div className="flex flex-col gap-3">
          <button
            onClick={isGoogleConnected ? undefined : handleConnectGoogle}
            className={`w-full flex items-center justify-between px-5 py-4 rounded-xl ring-1 ring-inset transition-colors ${isGoogleConnected ? 'ring-success-300 bg-success-50 dark:ring-success-700 dark:bg-success-500/10' : 'ring-primary hover:bg-primary_hover'}`}
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg flex items-center justify-center overflow-hidden">
                <GoogleCalendarIcon className="w-10 h-10" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-primary">Google Calendar</p>
                <p className="text-sm text-tertiary">Sync your Google Calendar events and meetings</p>
              </div>
            </div>
            {isGoogleConnected ? (
              <span className="text-success-600 font-semibold flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                Connected
              </span>
            ) : (
              <span className="text-brand-secondary font-semibold">Connect</span>
            )}
          </button>
          <button
            onClick={isMicrosoftConnected ? undefined : handleConnectMicrosoft}
            className={`w-full flex items-center justify-between px-5 py-4 rounded-xl ring-1 ring-inset transition-colors ${isMicrosoftConnected ? 'ring-success-300 bg-success-50 dark:ring-success-700 dark:bg-success-500/10' : 'ring-primary hover:bg-primary_hover'}`}
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg flex items-center justify-center overflow-hidden">
                <MicrosoftAzureIcon className="w-10 h-10" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-primary">Outlook Calendar</p>
                <p className="text-sm text-tertiary">Sync your Outlook Calendar events and meetings</p>
              </div>
            </div>
            {isMicrosoftConnected ? (
              <span className="text-success-600 font-semibold flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                Connected
              </span>
            ) : (
              <span className="text-brand-secondary font-semibold">Connect</span>
            )}
          </button>
        </div>
      </div>
      <div className="flex justify-between pt-8 mt-auto">
        <Button onClick={onBack} color="tertiary" size="lg">
          Back
        </Button>
        <div className="flex gap-3">
          <Button onClick={onNext} color="tertiary" size="lg">
            Skip for now
          </Button>
          <Button onClick={onNext} size="lg">
            Continue
          </Button>
        </div>
      </div>
    </div>
  );
}

const SETUP_TASKS = [
  { id: 'workspace', label: 'Setting up your workspace', duration: 800 },
  { id: 'calendar', label: 'Connecting your calendars', duration: 1000 },
  { id: 'data', label: 'Fetching your data', duration: 1200 },
  { id: 'ai', label: 'Configuring AI assistant', duration: 1000 },
  { id: 'final', label: 'Finalizing your environment', duration: 1000 },
];

interface SetupStepProps {
  onSetupComplete: () => void;
  isLoading?: boolean;
  error?: string | null;
}

function SetupStep({ onSetupComplete, isLoading: externalLoading, error: externalError }: SetupStepProps) {
  const [completedTasks, setCompletedTasks] = useState<string[]>([]);
  const [currentTask, setCurrentTask] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [hasTriggeredComplete, setHasTriggeredComplete] = useState(false);

  useEffect(() => {
    // All animated tasks finished
    if (currentTask >= SETUP_TASKS.length) {
      if (!hasTriggeredComplete) {
        setHasTriggeredComplete(true);
        onSetupComplete();
        // Trigger confetti
        const duration = 3 * 1000;
        const animationEnd = Date.now() + duration;
        const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

        const randomInRange = (min: number, max: number) =>
          Math.random() * (max - min) + min;

        const interval = window.setInterval(() => {
          const timeLeft = animationEnd - Date.now();

          if (timeLeft <= 0) {
            return clearInterval(interval);
          }

          const particleCount = 50 * (timeLeft / duration);
          confetti({
            ...defaults,
            particleCount,
            origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
          });
          confetti({
            ...defaults,
            particleCount,
            origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
          });
        }, 250);

        return () => clearInterval(interval);
      }
      // Already triggered — nothing left to animate, just return
      return;
    }

    const task = SETUP_TASKS[currentTask];
    const timer = setTimeout(() => {
      setCompletedTasks(prev => [...prev, task.id]);
      setCurrentTask(prev => prev + 1);
    }, task.duration);

    return () => clearTimeout(timer);
  }, [currentTask, onSetupComplete, hasTriggeredComplete]);

  // Update isComplete based on external loading state
  useEffect(() => {
    if (hasTriggeredComplete && !externalLoading && !externalError) {
      setIsComplete(true);
    }
  }, [hasTriggeredComplete, externalLoading, externalError]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 flex flex-col justify-center items-center">
        <div className="text-center flex flex-col gap-3 mb-10">
          <h2 className="text-display-xs font-semibold text-primary">
            {externalError 
              ? 'Something went wrong' 
              : isComplete 
                ? 'You\'re all set!' 
                : 'Setting up your workspace'}
          </h2>
          <p className="text-tertiary leading-relaxed max-w-md">
            {externalError 
              ? externalError
              : isComplete 
                ? 'Your JeniferAI workspace is ready. Start managing your executives\' schedules with ease.' 
                : 'Please wait while we prepare everything for you. This will only take a moment...'}
          </p>
        </div>

        <div className="w-full max-w-md flex flex-col gap-4">
          {SETUP_TASKS.map((task) => {
            const isTaskComplete = completedTasks.includes(task.id);
            const isCurrentTask = SETUP_TASKS[currentTask]?.id === task.id;

            return (
              <div
                key={task.id}
                className={`flex items-center gap-4 p-4 rounded-xl transition-all duration-300 ${
                  isTaskComplete 
                    ? 'bg-success-primary/10' 
                    : isCurrentTask 
                      ? 'bg-brand-50' 
                      : 'bg-secondary'
                }`}
              >
                <div className="w-6 h-6 flex items-center justify-center">
                  {isTaskComplete ? (
                    <CheckCircle className="w-5 h-5 text-success-primary" />
                  ) : isCurrentTask ? (
                    <div className="w-5 h-5 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <div className="w-5 h-5 rounded-full border-2 border-quaternary" />
                  )}
                </div>
                <span className={`text-sm font-medium ${
                  isTaskComplete 
                    ? 'text-primary' 
                    : isCurrentTask 
                      ? 'text-primary' 
                      : 'text-tertiary'
                }`}>
                  {task.label}
                </span>
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
}
