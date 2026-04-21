/**
 * UI Utilities
 * Common utility functions for UI components
 */

import { twMerge } from 'tailwind-merge';

type ClassValue = string | number | boolean | undefined | null | ClassValue[];

export function cn(...inputs: ClassValue[]): string {
  return twMerge(inputs.filter(Boolean).join(' '));
}

export function focusRing(): string {
  return 'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';
}

export function disabledStyles(): string {
  return 'disabled:pointer-events-none disabled:opacity-50';
}
