"use client";

/**
 * Key Dates Category Tabs Component
 * Horizontal scrollable category filter tabs
 */

import { categories, type KeyDateCategory } from "./key-dates-data";

interface KeyDatesCategoryTabsProps {
  activeCategory: KeyDateCategory | "all";
  onCategoryChange: (category: KeyDateCategory | "all") => void;
  counts: Record<KeyDateCategory | "all", number>;
}

export function KeyDatesCategoryTabs({
  activeCategory,
  onCategoryChange,
  counts,
}: KeyDatesCategoryTabsProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-secondary">
      {categories.filter((category) => category.id === "all" || (counts[category.id] || 0) > 0).map((category) => {
        const isActive = activeCategory === category.id;
        const count = counts[category.id] || 0;

        return (
          <button
            key={category.id}
            onClick={() => onCategoryChange(category.id)}
            className={`flex flex-shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              isActive
                ? "bg-brand-50 text-brand-700 ring-1 ring-brand-200"
                : "bg-secondary text-secondary hover:bg-tertiary"
            }`}
          >
            <span>{category.icon}</span>
            <span>{category.label}</span>
            <span
              className={`rounded-full px-1.5 py-0.5 text-xs ${
                isActive ? "bg-brand-100 text-brand-700" : "bg-tertiary text-tertiary"
              }`}
            >
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
