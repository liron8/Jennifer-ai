"use client";

/**
 * Key Dates Page
 * Track important dates with category filtering and list/card/calendar views
 * Connected to real database via /api/key-dates
 */

import { useMemo, useState, useCallback } from "react";
import { Calendar, Grid01, List, Plus, SearchLg, RefreshCw01 } from "@untitledui/icons";
import { Button } from "@/components/base/buttons/button";
import { InputBase } from "@/components/base/input/input";
import { KeyDateCard } from "./_components/key-date-card";
import { KeyDateGridCard } from "./_components/key-date-grid-card";
import { KeyDatesCategoryTabs } from "./_components/key-dates-category-tabs";
import {
  type KeyDate,
  type KeyDateCategory,
  categories,
  getDatesByCategory,
  sortDatesByDate,
} from "./_components/key-dates-data";
import { AddDateSlideout } from "./_components/add-date-slideout";
import { EditDateSlideout } from "./_components/edit-date-slideout";
import { useKeyDates, type DatabaseKeyDate, type CreateKeyDateData } from "@/hooks/useKeyDates";
import { ConfirmDeleteDialog } from "@/components/application/confirm-delete-dialog";
import { notify } from "@/lib/notifications";

type ViewMode = "list" | "card" | "calendar";

type RecurringType = "weekly" | "bi_weekly" | "monthly" | "quarterly" | "bi_annual" | "annually" | "none";

const RECURRENCE_RULE_MAP: Record<string, string> = {
  weekly: 'FREQ=WEEKLY',
  bi_weekly: 'FREQ=WEEKLY;INTERVAL=2',
  monthly: 'FREQ=MONTHLY',
  quarterly: 'FREQ=MONTHLY;INTERVAL=3',
  bi_annual: 'FREQ=MONTHLY;INTERVAL=6',
  annually: 'FREQ=YEARLY',
};

function toRecurrenceRule(recurring?: string): string | undefined {
  if (!recurring) return undefined;
  return RECURRENCE_RULE_MAP[recurring];
}

function parseRecurrenceRule(rule: string | null | undefined): RecurringType {
  if (!rule) return 'none';
  if (rule === 'FREQ=WEEKLY;INTERVAL=2') return 'bi_weekly';
  if (rule === 'FREQ=MONTHLY;INTERVAL=3') return 'quarterly';
  if (rule === 'FREQ=MONTHLY;INTERVAL=6') return 'bi_annual';
  if (rule.includes('YEARLY')) return 'annually';
  if (rule.includes('MONTHLY')) return 'monthly';
  if (rule.includes('WEEKLY')) return 'weekly';
  return 'none';
}

// Convert database key date to UI format
const convertToUIKeyDate = (dbKeyDate: DatabaseKeyDate): KeyDate => {
  // Format the date for display
  // Append T12:00:00 to avoid timezone offset shifting the date by a day
  const dateObj = new Date(dbKeyDate.date + 'T12:00:00');
  let dateString = dateObj.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  
  // Handle date ranges (end_date)
  if (dbKeyDate.end_date) {
    const endDateObj = new Date(dbKeyDate.end_date + 'T12:00:00');
    if (dateObj.getMonth() === endDateObj.getMonth() && dateObj.getFullYear() === endDateObj.getFullYear()) {
      dateString = `${dateObj.toLocaleDateString("en-US", { month: "short" })} ${dateObj.getDate()}-${endDateObj.getDate()}, ${dateObj.getFullYear()}`;
    } else {
      const endStr = endDateObj.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
      dateString = `${dateString} - ${endStr}`;
    }
  }

  return {
    id: dbKeyDate.id,
    title: dbKeyDate.title,
    date: dateString,
    category: dbKeyDate.category,
    description: dbKeyDate.description || undefined,
    reminder: dbKeyDate.reminder_days?.[0],
    recurring: dbKeyDate.is_recurring
      ? parseRecurrenceRule(dbKeyDate.recurrence_rule)
      : 'none',
    relatedPerson: dbKeyDate.related_person || undefined,
  };
};

export default function KeyDatesPage() {
  const [activeCategory, setActiveCategory] = useState<KeyDateCategory | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [isAddDateOpen, setIsAddDateOpen] = useState(false);
  const [isEditDateOpen, setIsEditDateOpen] = useState(false);
  const [editingKeyDate, setEditingKeyDate] = useState<KeyDate | null>(null);
  const [deleteKeyDateId, setDeleteKeyDateId] = useState<string | null>(null);
  const [deleteKeyDateName, setDeleteKeyDateName] = useState("");

  // Fetch key dates from database
  const { keyDates: dbKeyDates, isLoading, error, stats, createKeyDate, updateKeyDate, deleteKeyDate, refetch } = useKeyDates();

  // Convert database key dates to UI format
  const keyDates = useMemo(() => {
    if (Array.isArray(dbKeyDates)) {
      return dbKeyDates.map(convertToUIKeyDate);
    }
    return [];
  }, [dbKeyDates]);

  const handleAddDate = useCallback(async (dateData: Omit<KeyDate, "id">) => {
    try {
      // Parse the date string back to ISO format
      const dateParts = dateData.date.split("-");
      let startDate: string;
      let endDate: string | undefined;

      if (dateParts.length === 2) {
        // Date range like "Jan 20-22, 2026" or "Jan 20, 2026 - Feb 1, 2026"
        const firstPart = dateParts[0].trim();
        const secondPart = dateParts[1].trim();
        
        // Try to parse as full date range
        const startParsed = new Date(firstPart);
        if (!isNaN(startParsed.getTime())) {
          startDate = startParsed.toISOString().split('T')[0];
          const endParsed = new Date(secondPart);
          if (!isNaN(endParsed.getTime())) {
            endDate = endParsed.toISOString().split('T')[0];
          }
        } else {
          // Fallback: just use today
          startDate = new Date().toISOString().split('T')[0];
        }
      } else {
        // Single date
        const parsed = new Date(dateData.date);
        startDate = !isNaN(parsed.getTime()) 
          ? parsed.toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0];
      }

      const createData: CreateKeyDateData = {
        title: dateData.title,
        description: dateData.description,
        date: startDate,
        end_date: endDate,
        category: dateData.category,
        related_person: dateData.relatedPerson,
        is_recurring: dateData.recurring !== 'none',
        recurrence_rule: toRecurrenceRule(dateData.recurring),
        reminder_days: dateData.reminder ? [dateData.reminder] : undefined,
      };

      await createKeyDate(createData);
      notify.success('Key date created', `"${dateData.title}" has been added.`);
    } catch (err) {
      console.error('Failed to create key date:', err);
      notify.error('Failed to create key date', err instanceof Error ? err.message : 'Please try again.');
    }
  }, [createKeyDate]);

  // Calculate counts per category
  const categoryCounts = useMemo(() => {
    const counts: Record<KeyDateCategory | "all", number> = {
      all: keyDates.length,
      birthdays: 0,
      anniversaries: 0,
      deadlines: 0,
      milestones: 0,
      travel: 0,
      financial: 0,
      team: 0,
      personal: 0,
      vip: 0,
      expirations: 0,
      holidays: 0,
      other: 0,
    };

    keyDates.forEach((date) => {
      counts[date.category]++;
    });

    return counts;
  }, [keyDates]);

  // Filter and sort dates
  const filteredDates = useMemo(() => {
    let filtered = getDatesByCategory(keyDates, activeCategory);

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (d) =>
          d.title.toLowerCase().includes(query) ||
          d.description?.toLowerCase().includes(query) ||
          d.relatedPerson?.toLowerCase().includes(query)
      );
    }

    return sortDatesByDate(filtered);
  }, [keyDates, activeCategory, searchQuery]);

  // Group dates by month for list view
  const groupedDates = useMemo(() => {
    const groups: Record<string, KeyDate[]> = {};

    filteredDates.forEach((date) => {
      const month = date.date.split(" ")[0] + " " + date.date.split(" ")[2]?.replace(",", "") || "2026";
      if (!groups[month]) groups[month] = [];
      groups[month].push(date);
    });

    return groups;
  }, [filteredDates]);

  const handleEdit = useCallback((id: string) => {
    const found = keyDates.find((d) => d.id === id);
    if (found) {
      setEditingKeyDate(found);
      setIsEditDateOpen(true);
    }
  }, [keyDates]);

  const handleEditSubmit = useCallback(async (id: string, dateData: Omit<KeyDate, "id">) => {
    try {
      const dateParts = dateData.date.split("-");
      let startDate: string;
      let endDateStr: string | undefined;

      if (dateParts.length === 2) {
        const firstPart = dateParts[0].trim();
        const secondPart = dateParts[1].trim();
        const startParsed = new Date(firstPart);
        if (!isNaN(startParsed.getTime())) {
          startDate = startParsed.toISOString().split('T')[0];
          const endParsed = new Date(secondPart);
          if (!isNaN(endParsed.getTime())) {
            endDateStr = endParsed.toISOString().split('T')[0];
          }
        } else {
          startDate = new Date().toISOString().split('T')[0];
        }
      } else {
        const parsed = new Date(dateData.date);
        startDate = !isNaN(parsed.getTime())
          ? parsed.toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0];
      }

      await updateKeyDate(id, {
        title: dateData.title,
        description: dateData.description,
        date: startDate,
        end_date: endDateStr,
        category: dateData.category,
        related_person: dateData.relatedPerson,
        is_recurring: dateData.recurring !== 'none',
        recurrence_rule: toRecurrenceRule(dateData.recurring),
        reminder_days: dateData.reminder ? [dateData.reminder] : undefined,
      });
      notify.success('Key date updated', `"${dateData.title}" has been updated.`);
    } catch (err) {
      console.error('Failed to update key date:', err);
      notify.error('Failed to update key date', err instanceof Error ? err.message : 'Please try again.');
    }
  }, [updateKeyDate]);

  const promptDeleteKeyDate = useCallback((id: string, title?: string) => {
    setDeleteKeyDateId(id);
    setDeleteKeyDateName(title || '');
  }, []);

  const confirmDeleteKeyDate = useCallback(async () => {
    if (!deleteKeyDateId) return;
    try {
      await deleteKeyDate(deleteKeyDateId);
      notify.success('Key date deleted', 'The key date has been removed.');
    } catch (err) {
      console.error('Failed to delete key date:', err);
      notify.error('Failed to delete key date', 'Please try again.');
    } finally {
      setDeleteKeyDateId(null);
      setDeleteKeyDateName('');
    }
  }, [deleteKeyDate, deleteKeyDateId]);

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 p-4 lg:p-8">
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-4">
            <div className="w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-tertiary">Loading key dates...</p>
          </div>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="flex flex-col gap-6 p-4 lg:p-8">
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-4 text-center">
            <p className="text-lg font-semibold text-primary">Unable to load key dates</p>
            <p className="text-sm text-tertiary max-w-md">{error}</p>
            <Button size="md" color="secondary" iconLeading={RefreshCw01} onClick={() => refetch()}>
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-4 lg:p-8">
      {/* Page Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-primary lg:text-2xl">Key Dates</h1>
          <p className="text-sm text-tertiary">
            {filteredDates.length} important dates tracked
          </p>
        </div>
        <div className="flex gap-3">
          <Button size="md" color="primary" iconLeading={Plus} onClick={() => setIsAddDateOpen(true)}>
            Add Date
          </Button>
        </div>
      </div>

      {/* Category Tabs */}
      <KeyDatesCategoryTabs
        activeCategory={activeCategory}
        onCategoryChange={setActiveCategory}
        counts={categoryCounts}
      />

      {/* Search and View Toggle */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="w-full lg:max-w-xs">
          <InputBase
            size="sm"
            type="search"
            aria-label="Search"
            placeholder="Search dates..."
            icon={SearchLg}
            value={searchQuery}
            onChange={(value) => setSearchQuery(value)}
          />
        </div>
        <div className="flex rounded-lg border border-secondary bg-primary p-1">
          <button
            onClick={() => setViewMode("list")}
            className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              viewMode === "list"
                ? "bg-secondary text-primary"
                : "text-tertiary hover:text-secondary"
            }`}
          >
            <List className="h-4 w-4" />
            List
          </button>
          <button
            onClick={() => setViewMode("card")}
            className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              viewMode === "card"
                ? "bg-secondary text-primary"
                : "text-tertiary hover:text-secondary"
            }`}
          >
            <Grid01 className="h-4 w-4" />
            Card
          </button>
          <button
            onClick={() => setViewMode("calendar")}
            className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              viewMode === "calendar"
                ? "bg-secondary text-primary"
                : "text-tertiary hover:text-secondary"
            }`}
          >
            <Calendar className="h-4 w-4" />
            Calendar
          </button>
        </div>
      </div>

      {/* Content */}
      {filteredDates.length === 0 ? (
        <div className="flex h-64 items-center justify-center rounded-xl border border-secondary bg-primary">
          <div className="text-center">
            <Calendar className="mx-auto h-12 w-12 text-fg-quaternary" />
            <p className="mt-2 text-sm font-medium text-primary">No dates found</p>
            <p className="text-xs text-tertiary">Try adjusting your filters</p>
          </div>
        </div>
      ) : viewMode === "list" ? (
        <div className="space-y-6">
          {Object.entries(groupedDates).map(([month, dates]) => (
            <div key={month}>
              <h3 className="mb-3 text-sm font-semibold text-tertiary uppercase tracking-wide">
                {month}
              </h3>
              <div className="space-y-3">
                {dates.map((date) => (
                  <KeyDateCard
                    key={date.id}
                    keyDate={date}
                    onEdit={handleEdit}
                    onDelete={(id) => promptDeleteKeyDate(id, date.title)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : viewMode === "card" ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredDates.map((date) => (
            <KeyDateGridCard
              key={date.id}
              keyDate={date}
              onEdit={handleEdit}
              onDelete={(id) => promptDeleteKeyDate(id, date.title)}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-secondary bg-primary p-6">
          <div className="flex h-96 items-center justify-center">
            <div className="text-center">
              <Calendar className="mx-auto h-12 w-12 text-fg-quaternary" />
              <p className="mt-2 text-sm font-medium text-primary">Calendar View</p>
              <p className="text-xs text-tertiary">
                Calendar visualization coming soon
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Add Date Slideout */}
      <AddDateSlideout
        isOpen={isAddDateOpen}
        onOpenChange={setIsAddDateOpen}
        onSubmit={handleAddDate}
      />

      {/* Edit Date Slideout */}
      <EditDateSlideout
        isOpen={isEditDateOpen}
        onOpenChange={setIsEditDateOpen}
        keyDate={editingKeyDate}
        onSubmit={handleEditSubmit}
      />

      {/* Delete Key Date Confirmation */}
      <ConfirmDeleteDialog
        isOpen={!!deleteKeyDateId}
        onClose={() => { setDeleteKeyDateId(null); setDeleteKeyDateName(''); }}
        onConfirm={confirmDeleteKeyDate}
        title="Delete Key Date"
        itemName={deleteKeyDateName}
      />
    </div>
  );
}
