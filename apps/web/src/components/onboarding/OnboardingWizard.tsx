'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

import { WelcomeStep } from './steps/WelcomeStep';
import { CompanyStep } from './steps/CompanyStep';
import { RoleStep } from './steps/RoleStep';
import { ExecutivesStep } from './steps/ExecutivesStep';
import { IntegrationsStep } from './steps/IntegrationsStep';
import { CompleteStep } from './steps/CompleteStep';
import { SetupAnimation } from './SetupAnimation';
import { cn } from '@/lib/utils';

export interface OnboardingFormData {
  company: {
    companyName?: string;
    companySize?: string;
    industry?: string;
    companyWebsite?: string;
  };
  role: {
    fullName?: string;
    jobTitle?: string;
    role?: string;
    phoneNumber?: string;
    timezone?: string;
  };
  executives: Array<{
    fullName: string;
    title: string;
    email?: string;
    phone?: string;
  }>;
  integrations: {
    googleCalendar?: boolean;
    outlookCalendar?: boolean;
    gmail?: boolean;
    outlook?: boolean;
  };
}

const STEPS = [
  { id: 'welcome', title: 'Welcome', component: WelcomeStep },
  { id: 'company', title: 'Company', component: CompanyStep },
  { id: 'role', title: 'Your Role', component: RoleStep },
  { id: 'executives', title: 'Executives', component: ExecutivesStep },
  { id: 'integrations', title: 'Integrations', component: IntegrationsStep },
  { id: 'complete', title: 'Complete', component: CompleteStep },
];

export function OnboardingWizard() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [formData, setFormData] = useState<OnboardingFormData>({
    company: {},
    role: {},
    executives: [],
    integrations: {},
  });

  const handleNext = (stepData?: Record<string, unknown>) => {
    if (stepData) {
      setFormData((prev) => ({
        ...prev,
        [STEPS[currentStep].id]: stepData,
      }));
    }

    if (currentStep < STEPS.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleComplete = async () => {
    setIsComplete(true);

    // TODO: Save onboarding data to Supabase
    // await saveOnboardingData(formData);

    // Wait for animation then redirect
    setTimeout(() => {
      router.push('/dashboard');
    }, 4000);
  };

  if (isComplete) {
    return <SetupAnimation />;
  }

  const CurrentStepComponent = STEPS[currentStep].component;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Progress Bar */}
      <div className="w-full h-1 bg-muted">
        <motion.div
          className="h-full bg-primary"
          initial={{ width: 0 }}
          animate={{ width: `${((currentStep + 1) / STEPS.length) * 100}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      {/* Step Indicator */}
      <div className="flex justify-center py-8">
        <div className="flex items-center space-x-2">
          {STEPS.map((step, index) => (
            <div
              key={step.id}
              className={cn(
                'w-2 h-2 rounded-full transition-colors',
                index <= currentStep ? 'bg-primary' : 'bg-muted'
              )}
            />
          ))}
        </div>
      </div>

      {/* Step Content */}
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-lg">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <CurrentStepComponent
                data={formData}
                onNext={handleNext}
                onBack={handleBack}
                isFirstStep={currentStep === 0}
                isLastStep={currentStep === STEPS.length - 1}
              />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
