/**
 * Contacts Module Manifest
 */

import type { ModuleManifest } from '@jeniferai/core-module-registry';

export const manifest: ModuleManifest = {
  id: 'contacts',
  name: 'Contacts',
  description: 'Contact directory and relationship management',
  version: '1.0.0',
  tier: 'core',
  dependencies: [],
  navigation: {
    icon: 'Personalcard',
    label: 'Contacts',
    path: '/contacts',
    order: 80,
  },
  migrations: ['001_contacts.sql'],
  permissions: ['contacts:read', 'contacts:write', 'contacts:delete'],
  events: {
    publishes: ['contact.created', 'contact.updated'],
    subscribes: [],
  },
};
