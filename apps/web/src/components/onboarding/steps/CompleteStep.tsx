'use client';

import { CheckCircle2 } from 'lucide-react';
import type { OnboardingFormData } from '../OnboardingWizard';

interface CompleteStepProps {
  data: OnboardingFormData;
  onNext: () => void;
  onBack: () => void;
  isFirstStep: boolean;
  isLastStep: boolean;
}

export function CompleteStep({ data, onNext }: CompleteStepProps) {
  const executiveCount = data.executives?.length || 0;
  const connectedIntegrations = Object.values(data.integrations || {}).filter(Boolean).length;

  return (
    <div className="text-center space-y-8">
      {/* Success Icon */}
      <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
        <CheckCircle2 className="w-8 h-8 text-green-600" />
      </div>

      {/* Heading */}
      <div className="space-y-3">
        <h1 className="text-3xl font-bold">You&apos;re all set!</h1>
        <p className="text-muted-foreground text-lg max-w-md mx-auto">
          Your workspace is ready. Here&apos;s a summary of your setup:
        </p>
      </div>

      {/* Summary */}
      <div className="bg-muted/50 rounded-lg p-6 text-left space-y-4 max-w-sm mx-auto">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Company</span>
          <span className="font-medium">{data.company?.companyName || 'Not set'}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Your role</span>
          <span className="font-medium">{data.role?.jobTitle || 'Not set'}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Executives</span>
          <span className="font-medium">{executiveCount} added</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Integrations</span>
          <span className="font-medium">{connectedIntegrations} connected</span>
        </div>
      </div>

      {/* CTA */}
      <button
        onClick={() => onNext()}
        className="w-full max-w-sm py-3 px-4 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
      >
        Go to Dashboard
      </button>
    </div>
  );
}
