"use client";

/**
 * JenniferAI Logo Components
 * Text-based logo for JenniferAI branding
 */

import { cx } from "@/utils/cx";

interface JenniferAILogoProps {
  className?: string;
}

export const JenniferAILogo = ({ className }: JenniferAILogoProps) => {
  return (
    <div className={cx("flex items-center gap-2", className)}>
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600">
        <span className="text-lg font-bold text-white">J</span>
      </div>
      <span className="text-lg font-semibold text-primary">JenniferAI</span>
    </div>
  );
};

export const JenniferAILogoMinimal = ({ className }: JenniferAILogoProps) => {
  return (
    <div className={cx("flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600", className)}>
      <span className="text-lg font-bold text-white">J</span>
    </div>
  );
};
