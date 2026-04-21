/**
 * Team Module Manifest
 */

import type { ModuleManifest } from '@jeniferai/core-module-registry';

export const manifest: ModuleManifest = {
  id: 'team',
  name: 'Team',
  description: 'Executive profiles and team management',
  version: '1.0.0',
  tier: 'core',
  dependencies: [],
  navigation: {
    icon: 'Profile2User',
    label: 'Team',
    path: '/team/executives',
    order: 60,
  },
  migrations: [],
  permissions: ['team:read', 'team:write'],
  events: {
    publishes: ['executive.updated'],
    subscribes: [],
  },
};
