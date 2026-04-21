/**
 * Module Registry Types
 * Defines the structure for plugin-based modular architecture
 */

export type SubscriptionTier = 'core' | 'pro' | 'enterprise';

export interface NavigationChild {
  label: string;
  path: string;
  icon: string;
}

export interface NavigationConfig {
  icon: string;
  label: string;
  path: string;
  order: number;
  children?: NavigationChild[];
  position?: 'top' | 'bottom';
  badge?: string;
}

export interface EventConfig {
  publishes: string[];
  subscribes: string[];
}

export interface ModuleManifest {
  /** Unique identifier (kebab-case) */
  id: string;
  /** Display name */
  name: string;
  /** Description */
  description: string;
  /** Semantic version */
  version: string;
  /** Required subscription tier */
  tier: SubscriptionTier;
  /** Other modules this depends on (by id) */
  dependencies: string[];
  /** Navigation configuration */
  navigation: NavigationConfig;
  /** Database migrations for this module */
  migrations: string[];
  /** Required permissions */
  permissions: string[];
  /** Event configuration */
  events: EventConfig;
}

export interface RegisteredModule {
  manifest: ModuleManifest;
  enabled: boolean;
  loadedAt: Date;
}

export interface NavigationItem {
  id: string;
  icon: string;
  label: string;
  path: string;
  tier: SubscriptionTier;
  badge?: string;
  position?: 'top' | 'bottom';
  children?: NavigationChild[];
}
