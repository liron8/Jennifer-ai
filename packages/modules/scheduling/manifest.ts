/**
 * Scheduling Module Manifest
 */

import type { ModuleManifest } from '@jeniferai/core-module-registry';

export const manifest: ModuleManifest = {
  id: 'scheduling',
  name: 'Scheduling',
  description: 'Calendar management, meeting scheduling, and route planning',
  version: '1.0.0',
  tier: 'core',
  dependencies: [],
  navigation: {
    icon: 'Calendar',
    label: 'Scheduling',
    path: '/scheduling',
    order: 20,
    children: [
      { label: 'Calendar', path: '/scheduling/calendar', icon: 'Calendar1' },
      { label: 'Meeting Log', path: '/scheduling/meeting-log', icon: 'ClipboardText' },
      { label: 'Route Planner', path: '/scheduling/route-planner', icon: 'Location' },
    ],
  },
  migrations: ['001_meetings.sql'],
  permissions: ['scheduling:read', 'scheduling:write', 'scheduling:delete'],
  events: {
    publishes: ['meeting.created', 'meeting.updated', 'meeting.deleted', 'meeting.reminder'],
    subscribes: ['task.created', 'contact.updated'],
  },
};
