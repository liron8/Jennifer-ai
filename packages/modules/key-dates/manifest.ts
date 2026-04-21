/**
 * Key Dates Module Manifest
 */

import type { ModuleManifest } from '@jeniferai/core-module-registry';

export const manifest: ModuleManifest = {
  id: 'key-dates',
  name: 'Key Dates',
  description: 'Track important dates, birthdays, anniversaries, and deadlines',
  version: '1.0.0',
  tier: 'core',
  dependencies: [],
  navigation: {
    icon: 'Calendar2',
    label: 'Key Dates',
    path: '/key-dates',
    order: 40,
  },
  migrations: ['001_key_dates.sql'],
  permissions: ['key-dates:read', 'key-dates:write', 'key-dates:delete'],
  events: {
    publishes: ['key-date.created', 'key-date.reminder'],
    subscribes: ['contact.created'],
  },
};
