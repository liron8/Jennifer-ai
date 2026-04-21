'use client';

/**
 * Feature Flag Hooks
 * React hooks for feature flag access
 */

import { useFeatureFlagContext } from './provider';

/**
 * Hook to check if a feature is enabled
 */
export function useFeatureFlag(flagId: string): boolean {
  const { isEnabled } = useFeatureFlagContext();
  return isEnabled(flagId);
}

/**
 * Hook to get the feature flags context
 */
export function useFeatureFlags() {
  return useFeatureFlagContext();
}
