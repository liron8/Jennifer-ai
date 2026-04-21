/**
 * Concierge Module Manifest
 */

import type { ModuleManifest } from '@jeniferai/core-module-registry';

export const manifest: ModuleManifest = {
  id: 'concierge',
  name: 'Concierge',
  description: 'Service directory and vendor management',
  version: '1.0.0',
  tier: 'core',
  dependencies: [],
  navigation: {
    icon: 'Building',
    label: 'Concierge',
    path: '/concierge',
    order: 90,
  },
  migrations: ['001_services.sql'],
  permissions: ['concierge:read', 'concierge:write'],
  events: {
    publishes: ['service.created'],
    subscribes: [],
  },
};
