/**
 * Reports Module Manifest
 */

import type { ModuleManifest } from '@jeniferai/core-module-registry';

export const manifest: ModuleManifest = {
  id: 'reports',
  name: 'Reporting',
  description: 'Calendar insights, inbox analytics, and throughput metrics',
  version: '1.0.0',
  tier: 'core',
  dependencies: ['scheduling', 'tasks'],
  navigation: {
    icon: 'Chart',
    label: 'Reporting',
    path: '/reports',
    order: 50,
    children: [
      { label: 'Calendar Insights', path: '/reports/calendar-insights', icon: 'Calendar' },
      { label: 'Inbox Insights', path: '/reports/inbox-insights', icon: 'Sms' },
      { label: 'Throughput', path: '/reports/throughput', icon: 'Activity' },
    ],
  },
  migrations: [],
  permissions: ['reports:read'],
  events: {
    publishes: ['report.generated'],
    subscribes: ['meeting.created', 'task.completed'],
  },
};
