"use client";

/**
 * Chart Card Component
 * Container for charts with title and optional actions
 */

import type { ReactNode } from "react";

interface ChartCardProps {
  title: string;
  description?: string;
  children: ReactNode;
  action?: ReactNode;
}

export function ChartCard({ title, description, children, action }: ChartCardProps) {
  return (
    <div className="rounded-xl border border-secondary bg-primary">
      <div className="flex items-center justify-between border-b border-secondary px-5 py-4">
        <div>
          <h3 className="text-sm font-semibold text-primary">{title}</h3>
          {description && (
            <p className="mt-0.5 text-xs text-tertiary">{description}</p>
          )}
        </div>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}
