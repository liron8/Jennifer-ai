/**
 * Settings Module Manifest
 */

import type { ModuleManifest } from '@jeniferai/core-module-registry';

export const manifest: ModuleManifest = {
  id: 'settings',
  name: 'Settings',
  description: 'Application settings and configuration',
  version: '1.0.0',
  tier: 'core',
  dependencies: [],
  navigation: {
    icon: 'Setting2',
    label: 'Settings',
    path: '/settings/profile',
    order: 100,
    position: 'bottom',
    children: [
      { label: 'Profile', path: '/settings/profile', icon: 'User' },
      { label: 'Organization', path: '/settings/organization', icon: 'Building' },
      { label: 'Integrations', path: '/settings/integrations', icon: 'Link' },
      { label: 'Team', path: '/settings/team', icon: 'People' },
      { label: 'Billing', path: '/settings/billing', icon: 'Card' },
      { label: 'Audit Log', path: '/settings/audit-log', icon: 'DocumentText' },
    ],
  },
  migrations: [],
  permissions: ['settings:read', 'settings:write', 'admin:*'],
  events: {
    publishes: ['settings.updated', 'integration.connected'],
    subscribes: [],
  },
};
