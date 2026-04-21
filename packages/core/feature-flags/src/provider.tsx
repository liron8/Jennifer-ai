'use client';

/**
 * Feature Flag Provider
 * React context provider for feature flags
 */

import React, { createContext, useContext, useMemo, type ReactNode } from 'react';
import { featureFlagService, type SubscriptionTier } from './service';

export interface FeatureFlagContextValue {
  isEnabled: (flagId: string) => boolean;
  orgId: string;
  tier: SubscriptionTier;
}

const FeatureFlagContext = createContext<FeatureFlagContextValue | null>(null);

interface FeatureFlagProviderProps {
  children: ReactNode;
  orgId: string;
  tier: SubscriptionTier;
}

export function FeatureFlagProvider({
  children,
  orgId,
  tier,
}: FeatureFlagProviderProps): React.JSX.Element {
  const value = useMemo(
    () => ({
      isEnabled: (flagId: string) => featureFlagService.isEnabledSync(flagId, orgId, tier),
      orgId,
      tier,
    }),
    [orgId, tier]
  );

  return (
    <FeatureFlagContext.Provider value={value}>
      {children}
    </FeatureFlagContext.Provider>
  );
}

export function useFeatureFlagContext(): FeatureFlagContextValue {
  const context = useContext(FeatureFlagContext);
  if (!context) {
    throw new Error('useFeatureFlagContext must be used within a FeatureFlagProvider');
  }
  return context;
}
