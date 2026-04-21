"use client";

/**
 * Executive Card Component
 * Beautiful card display for executive in grid view with color-coded departments
 */

import Link from "next/link";
import { Mail01, Phone01, MarkerPin01, ChevronRight, Building02, Briefcase01, Code01, Target04, Settings01, Users01 } from "@untitledui/icons";
import { Avatar } from "@/components/base/avatar/avatar";
import type { Executive } from "./executive-data";
import { getInitials } from "./executive-data";

interface ExecutiveCardProps {
  executive: Executive;
}

// Department color configurations - subtle backgrounds with 5-10% opacity
const departmentColors: Record<string, { bg: string; border: string; icon: string; badge: string; iconComponent: typeof Building02 }> = {
  Executive: { 
    bg: "from-purple-50/30 to-purple-100/10 dark:from-purple-950/10 dark:to-purple-900/5", 
    border: "border-gray-200 dark:border-gray-800",
    icon: "bg-purple-100 text-purple-600 dark:bg-purple-900/50 dark:text-purple-400",
    badge: "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-400",
    iconComponent: Building02
  },
  Finance: { 
    bg: "from-emerald-50/30 to-emerald-100/10 dark:from-emerald-950/10 dark:to-emerald-900/5", 
    border: "border-gray-200 dark:border-gray-800",
    icon: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400",
    badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400",
    iconComponent: Briefcase01
  },
  Engineering: { 
    bg: "from-blue-50/30 to-blue-100/10 dark:from-blue-950/10 dark:to-blue-900/5", 
    border: "border-gray-200 dark:border-gray-800",
    icon: "bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400",
    badge: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400",
    iconComponent: Code01
  },
  Marketing: { 
    bg: "from-pink-50/30 to-pink-100/10 dark:from-pink-950/10 dark:to-pink-900/5", 
    border: "border-gray-200 dark:border-gray-800",
    icon: "bg-pink-100 text-pink-600 dark:bg-pink-900/50 dark:text-pink-400",
    badge: "bg-pink-100 text-pink-700 dark:bg-pink-900/50 dark:text-pink-400",
    iconComponent: Target04
  },
  Operations: { 
    bg: "from-amber-50/30 to-amber-100/10 dark:from-amber-950/10 dark:to-amber-900/5", 
    border: "border-gray-200 dark:border-gray-800",
    icon: "bg-amber-100 text-amber-600 dark:bg-amber-900/50 dark:text-amber-400",
    badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400",
    iconComponent: Settings01
  },
  "Human Resources": { 
    bg: "from-cyan-50/30 to-cyan-100/10 dark:from-cyan-950/10 dark:to-cyan-900/5", 
    border: "border-gray-200 dark:border-gray-800",
    icon: "bg-cyan-100 text-cyan-600 dark:bg-cyan-900/50 dark:text-cyan-400",
    badge: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/50 dark:text-cyan-400",
    iconComponent: Users01
  },
};

const defaultColors = {
  bg: "from-gray-50/30 to-gray-100/10 dark:from-gray-950/10 dark:to-gray-900/5",
  border: "border-gray-200 dark:border-gray-800",
  icon: "bg-gray-100 text-gray-600 dark:bg-gray-900/50 dark:text-gray-400",
  badge: "bg-gray-100 text-gray-700 dark:bg-gray-900/50 dark:text-gray-400",
  iconComponent: Building02
};

export function ExecutiveCard({ executive }: ExecutiveCardProps) {
  const colors = departmentColors[executive.department] || defaultColors;
  const DeptIcon = colors.iconComponent || defaultColors.iconComponent;

  const contactRows = [
    { icon: Mail01, value: executive.email, color: "text-blue-500", placeholder: "No email added" },
    { icon: Phone01, value: executive.phone, color: "text-emerald-500", placeholder: "No phone added" },
    { icon: MarkerPin01, value: executive.location, color: "text-amber-500", placeholder: "No location set" },
  ];

  return (
    <Link
      href={`/team/executives/${executive.id}`}
      className={`group relative flex flex-col overflow-hidden rounded-2xl border bg-gradient-to-br shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 ${colors.bg} ${colors.border}`}
    >
      {/* Top accent bar */}
      <div className="h-1 w-full bg-gradient-to-r from-brand-500 to-brand-400 opacity-60 group-hover:opacity-100 transition-opacity" />

      <div className="flex flex-1 flex-col p-5">
        {/* Department Icon Badge - Top Right */}
        <div className={`absolute top-5 right-4 flex h-9 w-9 items-center justify-center rounded-lg ${colors.icon} shadow-sm`}>
          <DeptIcon className="h-4.5 w-4.5" />
        </div>

        {/* Avatar and Name Section */}
        <div className="flex items-start gap-3.5">
          <div className="relative shrink-0">
            <Avatar
              initials={getInitials(executive.name)}
              alt={executive.name}
              size="lg"
              className="ring-2 ring-white dark:ring-gray-800 shadow-md"
            />
            <div className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-green-500 ring-2 ring-white dark:ring-gray-900" />
          </div>
          <div className="flex-1 min-w-0 pr-8">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors truncate">
              {executive.name}
            </h3>
            {executive.title ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 truncate">{executive.title}</p>
            ) : (
              <p className="text-sm text-gray-400 dark:text-gray-600 mt-0.5 italic">No title set</p>
            )}
            <span className={`mt-2 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${colors.badge}`}>
              {executive.department}
            </span>
          </div>
        </div>

        {/* Contact Info */}
        <div className="mt-4 space-y-2 border-t border-gray-200/60 dark:border-gray-700/40 pt-3.5">
          {contactRows.map(({ icon: Icon, value, color, placeholder }) => (
            <div key={placeholder} className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-white/80 dark:bg-gray-800/60">
                <Icon className={`h-3.5 w-3.5 ${value ? color : "text-gray-300 dark:text-gray-600"}`} />
              </div>
              {value ? (
                <span className="text-sm text-gray-700 dark:text-gray-300 truncate">{value}</span>
              ) : (
                <span className="text-xs text-gray-400 dark:text-gray-600 italic">{placeholder}</span>
              )}
            </div>
          ))}
        </div>

        {/* View Profile Link */}
        <div className="mt-auto pt-4 flex items-center justify-end text-xs font-medium text-brand-600 dark:text-brand-400 opacity-0 group-hover:opacity-100 transition-opacity">
          View Profile
          <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
        </div>
      </div>
    </Link>
  );
}
