"use client";

import { ProgressBarBase } from "@/components/base/progress-indicators/progress-indicators";

interface ProgressStepProps {
  current: number;
  total: number;
  onCancel: () => void;
}

export function ProgressStep({ current, total, onCancel }: ProgressStepProps) {
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0;

  return (
    <div className="flex flex-col items-center justify-center py-8 space-y-6">
      <div className="text-center">
        <h3 className="text-sm font-semibold text-primary">Importing Contacts</h3>
        <p className="mt-1 text-sm text-tertiary">
          {current} of {total} contacts processed...
        </p>
      </div>

      <div className="w-full max-w-md space-y-2">
        <ProgressBarBase
          value={percentage}
          progressClassName="bg-brand-600"
        />
        <p className="text-center text-xs text-quaternary">{percentage}%</p>
      </div>

      <button
        onClick={onCancel}
        className="rounded-lg border border-secondary px-4 py-2 text-sm font-medium text-secondary hover:bg-primary_hover transition-colors"
      >
        Cancel Import
      </button>
    </div>
  );
}
