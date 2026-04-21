"use client";

/**
 * Info Card Component
 * Reusable card for displaying information sections
 */

import type { ReactNode } from "react";

interface InfoCardProps {
  title: string;
  children: ReactNode;
  action?: ReactNode;
}

export function InfoCard({ title, children, action }: InfoCardProps) {
  return (
    <div className="rounded-xl border border-secondary bg-primary">
      <div className="flex items-center justify-between border-b border-secondary px-5 py-4">
        <h3 className="text-sm font-semibold text-primary">{title}</h3>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

interface InfoItemProps {
  label: string;
  value: string | ReactNode;
}

export function InfoItem({ label, value }: InfoItemProps) {
  return (
    <div className="flex items-start justify-between py-2">
      <span className="text-sm text-tertiary">{label}</span>
      <span className="text-sm font-medium text-primary text-right">{value}</span>
    </div>
  );
}
