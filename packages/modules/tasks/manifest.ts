/**
 * Tasks Module Manifest
 */

import type { ModuleManifest } from '@jeniferai/core-module-registry';

export const manifest: ModuleManifest = {
  id: 'tasks',
  name: 'Task Hub',
  description: 'Task management, approvals, and delegations',
  version: '1.0.0',
  tier: 'core',
  dependencies: [],
  navigation: {
    icon: 'TaskSquare',
    label: 'Task Hub',
    path: '/tasks',
    order: 30,
    children: [
      { label: 'To-Do', path: '/tasks/todo', icon: 'TickSquare' },
      { label: 'Approvals', path: '/tasks/approvals', icon: 'DocumentText' },
      { label: 'Delegations', path: '/tasks/delegations', icon: 'People' },
    ],
  },
  migrations: ['001_tasks.sql', '002_approvals.sql', '003_delegations.sql'],
  permissions: ['tasks:read', 'tasks:write', 'tasks:delete', 'approvals:read', 'approvals:write'],
  events: {
    publishes: ['task.created', 'task.updated', 'task.completed', 'approval.created', 'approval.decided'],
    subscribes: ['meeting.created'],
  },
};
