'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Loader2, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

const SETUP_STEPS = [
  { message: 'Creating your workspace...', duration: 1000 },
  { message: 'Setting up executive profiles...', duration: 1000 },
  { message: 'Configuring your dashboard...', duration: 1000 },
  { message: 'Almost there...', duration: 1000 },
];

export function SetupAnimation() {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev < SETUP_STEPS.length - 1) {
          setCompletedSteps((completed) => [...completed, prev]);
          return prev + 1;
        }
        return prev;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center">
      {/* Logo */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="mb-12"
      >
        <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center">
          <span className="text-primary-foreground font-bold text-3xl">J</span>
        </div>
      </motion.div>

      {/* Progress Steps */}
      <div className="space-y-4 w-80">
        {SETUP_STEPS.map((step, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 10 }}
            animate={{
              opacity: index <= currentStep ? 1 : 0.3,
              y: 0,
            }}
            transition={{ delay: index * 0.1 }}
            className="flex items-center space-x-3"
          >
            <div className="w-6 h-6 flex items-center justify-center">
              {completedSteps.includes(index) ? (
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                  <Check className="h-5 w-5 text-primary" />
                </motion.div>
              ) : index === currentStep ? (
                <Loader2 className="h-5 w-5 text-primary animate-spin" />
              ) : (
                <div className="w-2 h-2 rounded-full bg-muted" />
              )}
            </div>
            <span
              className={cn(
                'text-sm',
                index <= currentStep ? 'text-foreground' : 'text-muted-foreground'
              )}
            >
              {step.message}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
