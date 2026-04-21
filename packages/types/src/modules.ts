/**
 * Module Types
 * Types for the plugin-based modular architecture
 */

import type { SubscriptionTier } from './database';

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
  id: string;
  name: string;
  description: string;
  version: string;
  tier: SubscriptionTier;
  dependencies: string[];
  navigation: NavigationConfig;
  migrations: string[];
  permissions: string[];
  events: EventConfig;
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
