/**
 * Dashboard Module Manifest
 */

import type { ModuleManifest } from '@jeniferai/core-module-registry';

export const manifest: ModuleManifest = {
  id: 'dashboard',
  name: 'Dashboard',
  description: 'Main dashboard overview with priorities, schedule, and quick actions',
  version: '1.0.0',
  tier: 'core',
  dependencies: [],
  navigation: {
    icon: 'Category',
    label: 'Dashboard',
    path: '/dashboard',
    order: 10,
  },
  migrations: [],
  permissions: ['dashboard:read'],
  events: {
    publishes: ['dashboard.viewed'],
    subscribes: [
      'task.created',
      'task.completed',
      'meeting.created',
      'approval.created',
    ],
  },
};
