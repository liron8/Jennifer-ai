"use client";

/**
 * Dashboard Shell (Client Component)
 * UI shell for all protected dashboard routes using Untitled UI components
 * Features: Collapsible sidebar, sticky top nav header, dark mode toggle
 */

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import {
  Calendar,
  CheckDone01,
  Gift01,
  HomeLine,
  LifeBuoy01,
  MessageChatCircle,
  PieChart03,
  Stars01,
  Users01,
  UserSquare,
} from "@untitledui/icons";
import { CollapsibleSidebar } from "./collapsible-sidebar";
import { TopNavHeader } from "./top-nav-header";

export function DashboardShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen bg-primary">
      <CollapsibleSidebar
        activeUrl={pathname}
        items={[
          {
            label: "Dashboard",
            href: "/dashboard",
            icon: HomeLine,
          },
          {
            label: "Ask Jenifer",
            href: "/ask-jenifer",
            icon: Stars01,
          },
          {
            label: "Scheduling",
            href: "/scheduling",
            icon: Calendar,
            items: [
              { label: "Calendar", href: "/scheduling/calendar" },
              { label: "Meeting Log", href: "/scheduling/meeting-log" },
              { label: "Route Planner", href: "/scheduling/route-planner" },
              { label: "Meeting Tracker", href: "/scheduling/meeting-tracker" },
              { label: "Time Zones", href: "/scheduling/time-zones" },
            ],
          },
          {
            label: "Task Hub",
            href: "/tasks",
            icon: CheckDone01,
            badge: 5,
            items: [
              { label: "To-Do", href: "/tasks/todo" },
              { label: "Approvals", href: "/tasks/approvals", badge: 3 },
              { label: "Delegations", href: "/tasks/delegations" },
            ],
          },
          {
            label: "Key Dates",
            href: "/key-dates",
            icon: Gift01,
          },
          {
            label: "Reporting",
            href: "/reports",
            icon: PieChart03,
            items: [
              { label: "Calendar Insights", href: "/reports/calendar-insights" },
              { label: "Inbox Insights", href: "/reports/inbox-insights" },
              { label: "Throughput", href: "/reports/throughput" },
            ],
          },
          {
            label: "Executives",
            href: "/team/executives",
            icon: Users01,
          },
          {
            label: "Contacts",
            href: "/contacts",
            icon: UserSquare,
          },
          {
            label: "Concierge",
            href: "/concierge",
            icon: MessageChatCircle,
          },
        ]}
        footerItems={[
          {
            label: "Support",
            href: "/support",
            icon: LifeBuoy01,
          },
        ]}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <TopNavHeader />
        <main className="flex-1 overflow-auto bg-primary">
          {children}
        </main>
      </div>
    </div>
  );
}
