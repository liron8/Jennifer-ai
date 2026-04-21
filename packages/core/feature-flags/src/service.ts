/**
 * Feature Flag Service
 * Manages feature flags with per-tenant customization
 */

export type SubscriptionTier = 'trial' | 'starter' | 'pro' | 'enterprise';

export interface FeatureFlag {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  tier_required: SubscriptionTier;
  rollout_percentage: number;
  org_whitelist: string[];
  org_blacklist: string[];
}

export interface Organization {
  id: string;
  tier: SubscriptionTier;
}

class FeatureFlagService {
  private flags: Map<string, FeatureFlag> = new Map();
  private orgOverrides: Map<string, Map<string, boolean>> = new Map();

  /**
   * Register a feature flag
   */
  registerFlag(flag: FeatureFlag): void {
    this.flags.set(flag.id, flag);
  }

  /**
   * Get a feature flag by ID
   */
  getFlag(flagId: string): FeatureFlag | undefined {
    return this.flags.get(flagId);
  }

  /**
   * Set an organization-specific override
   */
  setOrgOverride(orgId: string, flagId: string, enabled: boolean): void {
    if (!this.orgOverrides.has(orgId)) {
      this.orgOverrides.set(orgId, new Map());
    }
    this.orgOverrides.get(orgId)!.set(flagId, enabled);
  }

  /**
   * Check if a feature is enabled for a specific organization
   */
  async isEnabled(flagId: string, orgId: string, orgTier: SubscriptionTier): Promise<boolean> {
    const flag = this.flags.get(flagId);
    if (!flag) return false;

    // Step 1: Check global enabled
    if (!flag.enabled) return false;

    // Step 2: Check org-specific override
    const orgOverride = this.orgOverrides.get(orgId)?.get(flagId);
    if (orgOverride !== undefined) return orgOverride;

    // Step 3: Check blacklist
    if (flag.org_blacklist.includes(orgId)) return false;

    // Step 4: Check whitelist
    if (flag.org_whitelist.includes(orgId)) return true;

    // Step 5: Check tier
    if (!this.tierMeetsRequirement(orgTier, flag.tier_required)) {
      return false;
    }

    // Step 6: Check rollout percentage
    return this.isInRollout(orgId, flag.rollout_percentage);
  }

  /**
   * Synchronous check for feature flag (uses cached data)
   */
  isEnabledSync(flagId: string, orgId: string, orgTier: SubscriptionTier): boolean {
    const flag = this.flags.get(flagId);
    if (!flag) return false;

    if (!flag.enabled) return false;

    const orgOverride = this.orgOverrides.get(orgId)?.get(flagId);
    if (orgOverride !== undefined) return orgOverride;

    if (flag.org_blacklist.includes(orgId)) return false;
    if (flag.org_whitelist.includes(orgId)) return true;

    if (!this.tierMeetsRequirement(orgTier, flag.tier_required)) {
      return false;
    }

    return this.isInRollout(orgId, flag.rollout_percentage);
  }

  /**
   * Check if org tier meets the required tier
   */
  private tierMeetsRequirement(orgTier: SubscriptionTier, requiredTier: SubscriptionTier): boolean {
    const tierHierarchy: SubscriptionTier[] = ['trial', 'starter', 'pro', 'enterprise'];
    const orgTierIndex = tierHierarchy.indexOf(orgTier);
    const requiredTierIndex = tierHierarchy.indexOf(requiredTier);

    // Trial has access to all features during trial period
    if (orgTier === 'trial') return true;

    return orgTierIndex >= requiredTierIndex;
  }

  /**
   * Deterministic rollout check based on org ID
   */
  private isInRollout(orgId: string, percentage: number): boolean {
    if (percentage >= 100) return true;
    if (percentage <= 0) return false;

    const hash = this.hashString(orgId);
    return (hash % 100) < percentage;
  }

  /**
   * Simple hash function for deterministic rollout
   */
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }
}

export const featureFlagService = new FeatureFlagService();
export { FeatureFlagService };
