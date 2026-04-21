'use client';

import { useMemo } from 'react';
import { cx } from '@/utils/cx';

interface PasswordStrengthProps {
  password: string;
  className?: string;
}

interface StrengthResult {
  score: number;
  label: string;
  color: string;
  bgColor: string;
}

function calculateStrength(password: string): StrengthResult {
  let score = 0;
  
  if (!password) {
    return { score: 0, label: '', color: 'text-quaternary', bgColor: 'bg-quaternary' };
  }

  // Length checks
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  
  // Character variety checks
  if (/[a-z]/.test(password)) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^a-zA-Z0-9]/.test(password)) score += 1;

  // Normalize to 0-4 scale
  const normalizedScore = Math.min(4, Math.floor(score * 4 / 6));

  const results: Record<number, StrengthResult> = {
    0: { score: 0, label: 'Too weak', color: 'text-red-600', bgColor: 'bg-red-500' },
    1: { score: 1, label: 'Weak', color: 'text-red-600', bgColor: 'bg-red-500' },
    2: { score: 2, label: 'Fair', color: 'text-amber-600', bgColor: 'bg-amber-500' },
    3: { score: 3, label: 'Good', color: 'text-green-600', bgColor: 'bg-green-500' },
    4: { score: 4, label: 'Strong', color: 'text-green-600', bgColor: 'bg-green-500' },
  };

  return results[normalizedScore];
}

export function PasswordStrength({ password, className }: PasswordStrengthProps) {
  const strength = useMemo(() => calculateStrength(password), [password]);

  if (!password) return null;

  return (
    <div className={cx('flex flex-col gap-2', className)}>
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((index) => (
          <div
            key={index}
            className={cx(
              'h-1 flex-1 rounded-full transition-colors duration-200',
              index < strength.score ? strength.bgColor : 'bg-gray-200'
            )}
          />
        ))}
      </div>
      <div className="flex justify-between items-center">
        <span className={cx('text-xs font-medium', strength.color)}>
          {strength.label}
        </span>
        {strength.score < 3 && (
          <span className="text-xs text-tertiary">
            {password.length < 8 && 'Use 8+ characters'}
            {password.length >= 8 && !/[A-Z]/.test(password) && 'Add uppercase'}
            {password.length >= 8 && /[A-Z]/.test(password) && !/[0-9]/.test(password) && 'Add numbers'}
            {password.length >= 8 && /[A-Z]/.test(password) && /[0-9]/.test(password) && !/[^a-zA-Z0-9]/.test(password) && 'Add symbols'}
          </span>
        )}
      </div>
    </div>
  );
}

export function usePasswordStrength(password: string) {
  return useMemo(() => calculateStrength(password), [password]);
}
