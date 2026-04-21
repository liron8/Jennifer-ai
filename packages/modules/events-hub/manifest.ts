/**
 * Events Hub Module Manifest (Pro Feature)
 */

import type { ModuleManifest } from '@jeniferai/core-module-registry';

export const manifest: ModuleManifest = {
  id: 'events-hub',
  name: 'Events Hub',
  description: 'Event planning and management',
  version: '1.0.0',
  tier: 'pro',
  dependencies: ['scheduling', 'contacts'],
  navigation: {
    icon: 'Calendar',
    label: 'Events Hub',
    path: '/events',
    order: 70,
    badge: 'PRO',
  },
  migrations: ['001_events.sql'],
  permissions: ['events:read', 'events:write', 'events:delete'],
  events: {
    publishes: ['event.created', 'event.updated'],
    subscribes: ['contact.created'],
  },
};
