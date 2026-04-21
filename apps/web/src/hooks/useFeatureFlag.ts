'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useOrganization } from './useOrganization';

interface FeatureFlag {
  id: string;
  enabled: boolean;
  tier_required: 'core' | 'pro' | 'enterprise';
  rollout_percentage: number;
}

interface UseFeatureFlagReturn {
  isEnabled: (flagId: string) => boolean;
  isLoading: boolean;
  flags: Record<string, FeatureFlag>;
}

const TIER_HIERARCHY: Record<string, number> = {
  trial: 0,
  starter: 1,
  core: 1,
  pro: 2,
  enterprise: 3,
};

export function useFeatureFlag(): UseFeatureFlagReturn {
  const { organization } = useOrganization();
  const [flags, setFlags] = useState<Record<string, FeatureFlag>>({});
  const [isLoading, setIsLoading] = useState(true);

  const supabase = createClient();

  useEffect(() => {
    const fetchFlags = async () => {
      try {
        setIsLoading(true);

        const { data, error } = await supabase
          .from('feature_flags')
          .select('*')
          .eq('enabled', true);

        if (error) throw error;

        const flagMap = (data || []).reduce(
          (acc, flag) => ({ ...acc, [flag.id]: flag }),
          {}
        );

        setFlags(flagMap);
      } catch (err) {
        console.error('Failed to fetch feature flags:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFlags();
  }, []);

  const isEnabled = (flagId: string): boolean => {
    const flag = flags[flagId];

    // If flag doesn't exist, default to enabled for core features
    if (!flag) {
      return true;
    }

    // Check if globally enabled
    if (!flag.enabled) {
      return false;
    }

    // Check tier requirement
    if (organization) {
      const orgTierLevel = TIER_HIERARCHY[organization.subscription_tier] || 0;
      const requiredTierLevel = TIER_HIERARCHY[flag.tier_required] || 0;

      if (orgTierLevel < requiredTierLevel) {
        return false;
      }
    }

    // Check rollout percentage (deterministic based on org id)
    if (flag.rollout_percentage < 100 && organization) {
      const hash = hashString(organization.id);
      if (hash % 100 >= flag.rollout_percentage) {
        return false;
      }
    }

    return true;
  };

  return {
    isEnabled,
    isLoading,
    flags,
  };
}

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}
