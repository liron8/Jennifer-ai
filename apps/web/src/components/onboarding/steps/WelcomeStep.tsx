'use client';

import { Sparkles } from 'lucide-react';
import type { OnboardingFormData } from '../OnboardingWizard';

interface WelcomeStepProps {
  data: OnboardingFormData;
  onNext: () => void;
  onBack: () => void;
  isFirstStep: boolean;
  isLastStep: boolean;
}

export function WelcomeStep({ onNext }: WelcomeStepProps) {
  return (
    <div className="text-center space-y-8">
      {/* Icon */}
      <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
        <Sparkles className="w-8 h-8 text-primary" />
      </div>

      {/* Heading */}
      <div className="space-y-3">
        <h1 className="text-3xl font-bold">Welcome to JeniferAI</h1>
        <p className="text-muted-foreground text-lg max-w-md mx-auto">
          Your AI-powered command center for executive assistance. Let&apos;s get you set up in just a few minutes.
        </p>
      </div>

      {/* Features */}
      <div className="grid grid-cols-1 gap-4 text-left max-w-sm mx-auto">
        <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg">
          <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
            <span className="text-primary font-semibold">1</span>
          </div>
          <div>
            <p className="font-medium">Smart Scheduling</p>
            <p className="text-sm text-muted-foreground">AI-powered calendar management</p>
          </div>
        </div>
        <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg">
          <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
            <span className="text-primary font-semibold">2</span>
          </div>
          <div>
            <p className="font-medium">Task Automation</p>
            <p className="text-sm text-muted-foreground">Streamline approvals and delegations</p>
          </div>
        </div>
        <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg">
          <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
            <span className="text-primary font-semibold">3</span>
          </div>
          <div>
            <p className="font-medium">Executive Insights</p>
            <p className="text-sm text-muted-foreground">Real-time analytics and reporting</p>
          </div>
        </div>
      </div>

      {/* CTA */}
      <button
        onClick={() => onNext()}
        className="w-full max-w-sm py-3 px-4 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
      >
        Let&apos;s get started
      </button>
    </div>
  );
}
