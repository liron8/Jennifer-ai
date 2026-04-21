export interface NavItemChild {
  label: string;
  icon: string;
  path: string;
}

export interface NavItem {
  id: string;
  label: string;
  icon: string;
  path: string;
  tier: 'core' | 'pro' | 'enterprise';
  badge?: string;
  position?: 'top' | 'bottom';
  children?: NavItemChild[];
}

export const sidebarNavigation: NavItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: 'LayoutDashboard',
    path: '/dashboard',
    tier: 'core',
  },
  {
    id: 'ask-jenifer',
    label: 'Ask Jenifer',
    icon: 'Stars01',
    path: '/ask-jenifer',
    tier: 'core',
  },
  {
    id: 'scheduling',
    label: 'Scheduling',
    icon: 'Calendar',
    path: '/scheduling',
    tier: 'core',
    children: [
      {
        label: 'Calendar',
        icon: 'CalendarDays',
        path: '/scheduling/calendar',
      },
      {
        label: 'Meeting Log',
        icon: 'ClipboardList',
        path: '/scheduling/meeting-log',
      },
      {
        label: 'Route Planner',
        icon: 'MapPin',
        path: '/scheduling/route-planner',
      },
      {
        label: 'Meeting Tracker',
        icon: 'BarChart',
        path: '/scheduling/meeting-tracker',
      },
      {
        label: 'Time Zones',
        icon: 'Globe',
        path: '/scheduling/time-zones',
      },
    ],
  },
  {
    id: 'tasks',
    label: 'Task Hub',
    icon: 'CheckSquare',
    path: '/tasks',
    tier: 'core',
    children: [
      {
        label: 'To-Do',
        icon: 'ListTodo',
        path: '/tasks/todo',
      },
      {
        label: 'Approvals',
        icon: 'FileCheck',
        path: '/tasks/approvals',
      },
      {
        label: 'Delegations',
        icon: 'Users',
        path: '/tasks/delegations',
      },
    ],
  },
  {
    id: 'key-dates',
    label: 'Key Dates',
    icon: 'CalendarHeart',
    path: '/key-dates',
    tier: 'core',
  },
  {
    id: 'reports',
    label: 'Reporting',
    icon: 'BarChart3',
    path: '/reports',
    tier: 'core',
    children: [
      {
        label: 'Calendar Insights',
        icon: 'CalendarRange',
        path: '/reports/calendar-insights',
      },
      {
        label: 'Inbox Insights',
        icon: 'Mail',
        path: '/reports/inbox-insights',
      },
      {
        label: 'Throughput',
        icon: 'TrendingUp',
        path: '/reports/throughput',
      },
    ],
  },
  {
    id: 'team',
    label: 'Executives',
    icon: 'UserCircle',
    path: '/team/executives',
    tier: 'core',
  },
  {
    id: 'events',
    label: 'Events Hub',
    icon: 'Sparkles',
    path: '/events',
    tier: 'pro',
    badge: 'PRO',
  },
  {
    id: 'contacts',
    label: 'Contacts',
    icon: 'Contact',
    path: '/contacts',
    tier: 'pro',
  },
  {
    id: 'concierge',
    label: 'Concierge',
    icon: 'Concierge',
    path: '/concierge',
    tier: 'pro',
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: 'Settings',
    path: '/settings',
    tier: 'core',
    position: 'bottom',
    children: [
      {
        label: 'My Profile',
        icon: 'User',
        path: '/settings/profile',
      },
      {
        label: 'Organization',
        icon: 'Building2',
        path: '/settings/organization',
      },
      {
        label: 'Integrations',
        icon: 'Plug',
        path: '/settings/integrations',
      },
      {
        label: 'Team Members',
        icon: 'Users',
        path: '/settings/team',
      },
      {
        label: 'Billing',
        icon: 'CreditCard',
        path: '/settings/billing',
      },
      {
        label: 'Audit Log',
        icon: 'ScrollText',
        path: '/settings/audit-log',
      },
    ],
  },
];
