"use client";

/**
 * Key Date Grid Card Component
 * Beautiful square card display for grid/card view with color-coded categories
 */

import {
  Calendar,
  Bell01,
  Edit01,
  Trash01,
  RefreshCw01,
} from "@untitledui/icons";
import { ButtonUtility } from "@/components/base/buttons/button-utility";
import { Avatar } from "@/components/base/avatar/avatar";
import type { KeyDate, KeyDateCategory } from "./key-dates-data";
import { getCategoryConfig, recurringLabel } from "./key-dates-data";

interface KeyDateGridCardProps {
  keyDate: KeyDate;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
}

const getInitials = (name: string) => {
  const parts = name.split(" ");
  return parts.length > 1 ? `${parts[0].charAt(0)}${parts[1].charAt(0)}` : parts[0].charAt(0);
};

// Category color configurations - subtle backgrounds with 5-10% opacity
const categoryColors: Record<KeyDateCategory, { bg: string; border: string; icon: string; badge: string; date: string }> = {
  birthdays: { bg: "from-pink-50/20 to-pink-100/5 dark:from-pink-950/10 dark:to-pink-900/5", border: "border-gray-200 dark:border-gray-800", icon: "bg-pink-100 dark:bg-pink-900/50", badge: "bg-pink-100 text-pink-700 dark:bg-pink-900/50 dark:text-pink-400", date: "text-pink-600 dark:text-pink-400" },
  anniversaries: { bg: "from-purple-50/20 to-purple-100/5 dark:from-purple-950/10 dark:to-purple-900/5", border: "border-gray-200 dark:border-gray-800", icon: "bg-purple-100 dark:bg-purple-900/50", badge: "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-400", date: "text-purple-600 dark:text-purple-400" },
  deadlines: { bg: "from-red-50/20 to-red-100/5 dark:from-red-950/10 dark:to-red-900/5", border: "border-gray-200 dark:border-gray-800", icon: "bg-red-100 dark:bg-red-900/50", badge: "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400", date: "text-red-600 dark:text-red-400" },
  milestones: { bg: "from-emerald-50/20 to-emerald-100/5 dark:from-emerald-950/10 dark:to-emerald-900/5", border: "border-gray-200 dark:border-gray-800", icon: "bg-emerald-100 dark:bg-emerald-900/50", badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400", date: "text-emerald-600 dark:text-emerald-400" },
  travel: { bg: "from-blue-50/20 to-blue-100/5 dark:from-blue-950/10 dark:to-blue-900/5", border: "border-gray-200 dark:border-gray-800", icon: "bg-blue-100 dark:bg-blue-900/50", badge: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400", date: "text-blue-600 dark:text-blue-400" },
  financial: { bg: "from-amber-50/20 to-amber-100/5 dark:from-amber-950/10 dark:to-amber-900/5", border: "border-gray-200 dark:border-gray-800", icon: "bg-amber-100 dark:bg-amber-900/50", badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400", date: "text-amber-600 dark:text-amber-400" },
  team: { bg: "from-indigo-50/20 to-indigo-100/5 dark:from-indigo-950/10 dark:to-indigo-900/5", border: "border-gray-200 dark:border-gray-800", icon: "bg-indigo-100 dark:bg-indigo-900/50", badge: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-400", date: "text-indigo-600 dark:text-indigo-400" },
  personal: { bg: "from-orange-50/20 to-orange-100/5 dark:from-orange-950/10 dark:to-orange-900/5", border: "border-gray-200 dark:border-gray-800", icon: "bg-orange-100 dark:bg-orange-900/50", badge: "bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-400", date: "text-orange-600 dark:text-orange-400" },
  vip: { bg: "from-violet-50/20 to-violet-100/5 dark:from-violet-950/10 dark:to-violet-900/5", border: "border-gray-200 dark:border-gray-800", icon: "bg-violet-100 dark:bg-violet-900/50", badge: "bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-400", date: "text-violet-600 dark:text-violet-400" },
  expirations: { bg: "from-slate-50/20 to-slate-100/5 dark:from-slate-950/10 dark:to-slate-900/5", border: "border-gray-200 dark:border-gray-800", icon: "bg-slate-100 dark:bg-slate-900/50", badge: "bg-slate-100 text-slate-700 dark:bg-slate-900/50 dark:text-slate-400", date: "text-slate-600 dark:text-slate-400" },
  holidays: { bg: "from-teal-50/20 to-teal-100/5 dark:from-teal-950/10 dark:to-teal-900/5", border: "border-gray-200 dark:border-gray-800", icon: "bg-teal-100 dark:bg-teal-900/50", badge: "bg-teal-100 text-teal-700 dark:bg-teal-900/50 dark:text-teal-400", date: "text-teal-600 dark:text-teal-400" },
  other: { bg: "from-gray-50/20 to-gray-100/5 dark:from-gray-950/10 dark:to-gray-900/5", border: "border-gray-200 dark:border-gray-800", icon: "bg-gray-100 dark:bg-gray-900/50", badge: "bg-gray-100 text-gray-700 dark:bg-gray-900/50 dark:text-gray-400", date: "text-gray-600 dark:text-gray-400" },
};

export function KeyDateGridCard({ keyDate, onEdit, onDelete }: KeyDateGridCardProps) {
  const categoryConfig = getCategoryConfig(keyDate.category);
  const colors = categoryColors[keyDate.category] || categoryColors.other;

  return (
    <div className={`group relative flex flex-col overflow-hidden rounded-2xl border bg-gradient-to-br p-5 shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-1 ${colors.bg} ${colors.border}`}>
      {/* Actions - Top Right */}
      <div className="absolute right-3 top-3 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        <ButtonUtility
          size="xs"
          color="tertiary"
          tooltip="Edit"
          icon={Edit01}
          onClick={() => onEdit?.(keyDate.id)}
        />
        <ButtonUtility
          size="xs"
          color="tertiary"
          tooltip="Delete"
          icon={Trash01}
          onClick={() => onDelete?.(keyDate.id)}
        />
      </div>

      {/* Category Icon - Large */}
      <div className={`mb-4 flex h-14 w-14 items-center justify-center rounded-xl text-2xl shadow-sm ${colors.icon}`}>
        {categoryConfig.icon}
      </div>

      {/* Title */}
      <div className="flex items-start gap-2 mb-2">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white line-clamp-2 flex-1">{keyDate.title}</h3>
        {keyDate.recurring && keyDate.recurring !== "none" && (
          <div className="flex items-center gap-1 rounded-full bg-white/60 px-1.5 py-0.5 dark:bg-gray-800/60 flex-shrink-0">
            <RefreshCw01 className="h-3 w-3 text-gray-500" />
          </div>
        )}
      </div>

      {/* Description */}
      {keyDate.description && (
        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-4">{keyDate.description}</p>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Date - Prominent */}
      <div className={`flex items-center gap-2 mb-3 text-lg font-bold ${colors.date}`}>
        <Calendar className="h-5 w-5" />
        <span>{keyDate.date}</span>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-200/50 dark:border-gray-700/50">
        <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${colors.badge}`}>
          {categoryConfig.label}
        </span>
        
        {keyDate.reminder && (
          <div className="flex items-center gap-1.5 rounded-lg bg-white/60 px-2 py-1 dark:bg-gray-800/60">
            <Bell01 className="h-3.5 w-3.5 text-amber-500" />
            <span className="text-xs text-gray-600 dark:text-gray-400">{keyDate.reminder}d</span>
          </div>
        )}
      </div>

      {/* Related Person */}
      {keyDate.relatedPerson && (
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-200/50 dark:border-gray-700/50">
          <Avatar initials={getInitials(keyDate.relatedPerson)} alt={keyDate.relatedPerson} size="sm" />
          <span className="text-sm text-gray-700 dark:text-gray-300 truncate">{keyDate.relatedPerson}</span>
        </div>
      )}
    </div>
  );
}
