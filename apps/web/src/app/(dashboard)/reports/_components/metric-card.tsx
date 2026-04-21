"use client";

/**
 * Metric Card Component
 * Displays a single metric with icon, value, and optional trend
 */

import type { FC } from "react";
import { TrendUp01, TrendDown01 } from "@untitledui/icons";

interface MetricCardProps {
  title: string;
  value: string | number;
  description?: string;
  trend?: {
    value: string;
    direction: "up" | "down";
  };
  icon: FC<{ className?: string }>;
}

export function MetricCard({ title, value, description, trend, icon: Icon }: MetricCardProps) {
  return (
    <div className="rounded-xl border border-secondary bg-primary p-5">
      <div className="flex items-start justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50">
          <Icon className="h-5 w-5 text-brand-600" />
        </div>
        {trend && (
          <div
            className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
              trend.direction === "up"
                ? "bg-utility-success-50 text-utility-success-700"
                : "bg-utility-error-50 text-utility-error-700"
            }`}
          >
            {trend.direction === "up" ? (
              <TrendUp01 className="h-3 w-3" />
            ) : (
              <TrendDown01 className="h-3 w-3" />
            )}
            {trend.value}
          </div>
        )}
      </div>
      <div className="mt-4">
        <p className="text-sm font-medium text-tertiary">{title}</p>
        <p className="mt-1 text-2xl font-semibold text-primary">{value}</p>
        {description && (
          <p className="mt-1 text-xs text-tertiary">{description}</p>
        )}
      </div>
    </div>
  );
}
