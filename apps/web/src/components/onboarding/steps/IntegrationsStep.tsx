'use client';

import { useState } from 'react';
import { ArrowLeft, Check, Loader2 } from 'lucide-react';
import type { OnboardingFormData } from '../OnboardingWizard';

interface IntegrationsStepProps {
  data: OnboardingFormData;
  onNext: (data: Record<string, unknown>) => void;
  onBack: () => void;
  isFirstStep: boolean;
  isLastStep: boolean;
}

interface Integration {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  connected: boolean;
  loading: boolean;
}

export function IntegrationsStep({ data, onNext, onBack }: IntegrationsStepProps) {
  const [integrations, setIntegrations] = useState<Integration[]>([
    {
      id: 'googleCalendar',
      name: 'Google Calendar',
      description: 'Sync your Google Calendar events',
      icon: (
        <svg className="w-6 h-6" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
        </svg>
      ),
      connected: data.integrations.googleCalendar || false,
      loading: false,
    },
    {
      id: 'outlookCalendar',
      name: 'Outlook Calendar',
      description: 'Sync your Microsoft Outlook calendar',
      icon: (
        <svg className="w-6 h-6" viewBox="0 0 23 23">
          <path fill="#f35325" d="M1 1h10v10H1z" />
          <path fill="#81bc06" d="M12 1h10v10H12z" />
          <path fill="#05a6f0" d="M1 12h10v10H1z" />
          <path fill="#ffba08" d="M12 12h10v10H12z" />
        </svg>
      ),
      connected: data.integrations.outlookCalendar || false,
      loading: false,
    },
    {
      id: 'gmail',
      name: 'Gmail',
      description: 'Connect your Gmail inbox',
      icon: (
        <svg className="w-6 h-6" viewBox="0 0 24 24">
          <path fill="#EA4335" d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z" />
        </svg>
      ),
      connected: data.integrations.gmail || false,
      loading: false,
    },
    {
      id: 'outlook',
      name: 'Outlook Mail',
      description: 'Connect your Outlook inbox',
      icon: (
        <svg className="w-6 h-6" viewBox="0 0 23 23">
          <path fill="#f35325" d="M1 1h10v10H1z" />
          <path fill="#81bc06" d="M12 1h10v10H12z" />
          <path fill="#05a6f0" d="M1 12h10v10H1z" />
          <path fill="#ffba08" d="M12 12h10v10H12z" />
        </svg>
      ),
      connected: data.integrations.outlook || false,
      loading: false,
    },
  ]);

  const handleConnect = async (id: string) => {
    setIntegrations((prev) =>
      prev.map((int) => (int.id === id ? { ...int, loading: true } : int))
    );

    // TODO: Implement OAuth connection
    await new Promise((resolve) => setTimeout(resolve, 1500));

    setIntegrations((prev) =>
      prev.map((int) =>
        int.id === id ? { ...int, loading: false, connected: true } : int
      )
    );
  };

  const handleSubmit = () => {
    const integrationData = integrations.reduce(
      (acc, int) => ({ ...acc, [int.id]: int.connected }),
      {}
    );
    onNext(integrationData);
  };

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <button
        onClick={onBack}
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back
      </button>

      {/* Heading */}
      <div className="text-center">
        <h1 className="text-2xl font-bold">Connect your tools</h1>
        <p className="text-muted-foreground mt-2">
          Integrate with your existing calendar and email. You can skip this and connect later.
        </p>
      </div>

      {/* Integrations List */}
      <div className="space-y-3">
        {integrations.map((integration) => (
          <div
            key={integration.id}
            className="flex items-center justify-between p-4 border rounded-lg"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 flex items-center justify-center">
                {integration.icon}
              </div>
              <div>
                <p className="font-medium">{integration.name}</p>
                <p className="text-sm text-muted-foreground">
                  {integration.description}
                </p>
              </div>
            </div>

            {integration.connected ? (
              <div className="flex items-center gap-2 text-green-600">
                <Check className="w-4 h-4" />
                <span className="text-sm font-medium">Connected</span>
              </div>
            ) : (
              <button
                onClick={() => handleConnect(integration.id)}
                disabled={integration.loading}
                className="px-4 py-2 border rounded-lg text-sm font-medium hover:bg-muted disabled:opacity-50 flex items-center gap-2"
              >
                {integration.loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  'Connect'
                )}
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="space-y-3">
        <button
          onClick={handleSubmit}
          className="w-full py-2 px-4 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90"
        >
          Continue
        </button>
        <button
          onClick={handleSubmit}
          className="w-full py-2 px-4 text-muted-foreground hover:text-foreground text-sm"
        >
          Skip for now
        </button>
      </div>
    </div>
  );
}
