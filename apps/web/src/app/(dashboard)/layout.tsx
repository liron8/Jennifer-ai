/**
 * Dashboard Layout (Server Component)
 * Forces dynamic rendering for all dashboard routes — these require
 * authentication and should never be statically prerendered at build time.
 */

import type { ReactNode } from "react";
import { DashboardShell } from "./_components/dashboard-shell";

export const dynamic = "force-dynamic";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <DashboardShell>{children}</DashboardShell>;
}
