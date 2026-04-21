"use client";

/**
 * ViewToggle Component
 * Toggle buttons for switching between Board, List, and Table views
 */

import {
  LayoutGrid01,
  List,
  Table,
} from "@untitledui/icons";
import { type ViewMode } from "./task-types";

interface ViewToggleProps {
  currentView: ViewMode;
  onViewChange: (view: ViewMode) => void;
}

const views: { id: ViewMode; label: string; icon: typeof LayoutGrid01 }[] = [
  { id: "board", label: "Board", icon: LayoutGrid01 },
  { id: "list", label: "List", icon: List },
  { id: "table", label: "Table", icon: Table },
];

export function ViewToggle({ currentView, onViewChange }: ViewToggleProps) {
  return (
    <div className="inline-flex rounded-lg bg-gray-100 p-1 dark:bg-gray-800">
      {views.map((view) => {
        const Icon = view.icon;
        const isActive = currentView === view.id;
        
        return (
          <button
            key={view.id}
            onClick={() => onViewChange(view.id)}
            className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-all ${
              isActive
                ? "bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white"
                : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
            }`}
          >
            <Icon className="h-4 w-4" />
            <span className="hidden sm:inline">{view.label}</span>
          </button>
        );
      })}
    </div>
  );
}
