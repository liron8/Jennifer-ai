"use client";

/**
 * Preferences Tab Component
 * Manages organization preferences: week start day, time format, and category options
 */

import { useState, useEffect, useCallback } from "react";
import { Plus, Trash01, Edit01, Check, XClose } from "@untitledui/icons";
import { Button } from "@/components/base/buttons/button";
import { Input } from "@/components/base/input/input";
import { NativeSelect } from "@/components/base/select/select-native";
import { ConfirmationDialog } from "@/components/application/confirmation-dialog/confirmation-dialog";
import { notify } from "@/lib/notifications";

interface CategoryOption {
  id: string;
  category_type: string;
  name: string;
  color: string | null;
  sort_order: number;
  is_default: boolean;
}

interface OrgSettings {
  week_starts_on?: string;
  time_format?: string;
  timezone?: string;
}

const CATEGORY_TYPES = [
  { id: "concierge", label: "Concierge Categories" },
  { id: "contact", label: "Contact Categories" },
  { id: "key_date", label: "Key Date Categories" },
  { id: "priority", label: "Priority Levels" },
  { id: "todo", label: "To-Do Categories" },
] as const;

const DEFAULT_CATEGORIES: Record<string, string[]> = {
  concierge: ["Travel", "Scheduling", "Research", "Communication", "Admin", "Personal"],
  contact: ["Client", "Vendor", "Partner", "Investor", "Personal", "Other"],
  key_date: ["Birthday", "Anniversary", "Holiday", "Deadline", "Renewal", "Other"],
  priority: ["Critical", "High", "Medium", "Low"],
  todo: ["General", "Meeting Prep", "Follow-up", "Travel", "Communication", "Research"],
};

const weekStartOptions = [
  { label: "Sunday", value: "sunday" },
  { label: "Monday", value: "monday" },
  { label: "Saturday", value: "saturday" },
];

const timeFormatOptions = [
  { label: "12-hour (AM/PM)", value: "12h" },
  { label: "24-hour", value: "24h" },
];

export function PreferencesTab() {
  const [orgSettings, setOrgSettings] = useState<OrgSettings>({});
  const [categories, setCategories] = useState<Record<string, CategoryOption[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [activeCategoryType, setActiveCategoryType] = useState<string>("concierge");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [newItemName, setNewItemName] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [orgRes, catRes] = await Promise.all([
        fetch("/api/settings/organization"),
        fetch("/api/settings/preferences"),
      ]);

      if (orgRes.ok) {
        const orgResult = await orgRes.json();
        const orgData = orgResult.data?.data ?? orgResult.data;
        setOrgSettings(orgData?.settings || {});
      }

      if (catRes.ok) {
        const catResult = await catRes.json();
        const catData = catResult.data?.data ?? catResult.data ?? [];
        // Group by category_type
        const grouped: Record<string, CategoryOption[]> = {};
        for (const type of CATEGORY_TYPES) {
          grouped[type.id] = catData.filter((c: CategoryOption) => c.category_type === type.id);
        }
        setCategories(grouped);
      }
    } catch (err) {
      console.error("Failed to fetch preferences:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleUpdateOrgSetting = async (key: string, value: string) => {
    const updatedSettings = { ...orgSettings, [key]: value };
    setOrgSettings(updatedSettings);

    try {
      const response = await fetch("/api/settings/organization", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: updatedSettings }),
      });
      if (response.ok) {
        notify.success("Saved", "Preference updated successfully.");
      } else {
        notify.error("Error", "Failed to save preference.");
      }
    } catch {
      notify.error("Error", "Failed to save preference.");
    }
  };

  const handleSeedDefaults = async (type: string) => {
    const defaults = DEFAULT_CATEGORIES[type] || [];
    try {
      for (let i = 0; i < defaults.length; i++) {
        await fetch("/api/settings/preferences", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            category_type: type,
            name: defaults[i],
            sort_order: i,
            is_default: true,
          }),
        });
      }
      notify.success("Defaults created", `Added ${defaults.length} default options.`);
      fetchData();
    } catch {
      notify.error("Error", "Failed to create defaults.");
    }
  };

  const handleAddCategory = async () => {
    if (!newItemName.trim()) return;
    try {
      const currentItems = categories[activeCategoryType] || [];
      const response = await fetch("/api/settings/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category_type: activeCategoryType,
          name: newItemName.trim(),
          sort_order: currentItems.length,
        }),
      });
      if (response.ok) {
        setNewItemName("");
        setIsAddingNew(false);
        fetchData();
        notify.success("Added", `"${newItemName.trim()}" has been added.`);
      } else {
        notify.error("Error", "Failed to add item.");
      }
    } catch {
      notify.error("Error", "Failed to add item.");
    }
  };

  const handleUpdateCategory = async (id: string) => {
    if (!editingName.trim()) return;
    try {
      const response = await fetch("/api/settings/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, name: editingName.trim() }),
      });
      if (response.ok) {
        setEditingId(null);
        fetchData();
        notify.success("Updated", "Category updated.");
      } else {
        notify.error("Error", "Failed to update.");
      }
    } catch {
      notify.error("Error", "Failed to update.");
    }
  };

  const handleDeleteCategory = (id: string, name: string) => {
    setDeleteTarget({ id, name });
  };

  const confirmDeleteCategory = async () => {
    if (!deleteTarget) return;
    try {
      const response = await fetch(`/api/settings/preferences?id=${deleteTarget.id}`, {
        method: "DELETE",
      });
      if (response.ok) {
        fetchData();
        notify.success("Deleted", `"${deleteTarget.name}" has been removed.`);
      } else {
        notify.error("Error", "Failed to delete.");
      }
    } catch {
      notify.error("Error", "Failed to delete.");
    } finally {
      setDeleteTarget(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-tertiary">Loading preferences...</p>
        </div>
      </div>
    );
  }

  const activeItems = categories[activeCategoryType] || [];
  const activeTypeLabel = CATEGORY_TYPES.find((t) => t.id === activeCategoryType)?.label || "";

  return (
    <div className="flex flex-col gap-8">
      {/* General Preferences */}
      <div className="rounded-xl bg-primary shadow-xs ring-1 ring-secondary ring-inset p-6">
        <h3 className="text-lg font-semibold text-primary mb-1">General Preferences</h3>
        <p className="text-sm text-tertiary mb-5">Configure date, time, and calendar display settings.</p>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-secondary">Week Starts On</label>
            <NativeSelect
              options={weekStartOptions}
              value={orgSettings.week_starts_on || "sunday"}
              onChange={(e) => handleUpdateOrgSetting("week_starts_on", e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-secondary">Time Format</label>
            <NativeSelect
              options={timeFormatOptions}
              value={orgSettings.time_format || "12h"}
              onChange={(e) => handleUpdateOrgSetting("time_format", e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Category Management */}
      <div className="rounded-xl bg-primary shadow-xs ring-1 ring-secondary ring-inset p-6">
        <h3 className="text-lg font-semibold text-primary mb-1">Category Management</h3>
        <p className="text-sm text-tertiary mb-5">
          Manage categories for different modules. Changes apply across the entire organization.
        </p>

        {/* Category Type Tabs */}
        <div className="flex gap-1 rounded-lg bg-gray-100 p-1 dark:bg-gray-800 mb-5 overflow-x-auto">
          {CATEGORY_TYPES.map((type) => (
            <button
              key={type.id}
              onClick={() => {
                setActiveCategoryType(type.id);
                setIsAddingNew(false);
                setEditingId(null);
              }}
              className={`whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                activeCategoryType === type.id
                  ? "bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white"
                  : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              }`}
            >
              {type.label}
            </button>
          ))}
        </div>

        {/* Category Items */}
        <div className="flex flex-col gap-2">
          {activeItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <p className="text-sm text-tertiary mb-3">No {activeTypeLabel.toLowerCase()} configured yet.</p>
              <Button
                size="sm"
                color="secondary"
                onClick={() => handleSeedDefaults(activeCategoryType)}
              >
                Load Defaults
              </Button>
            </div>
          ) : (
            <ul className="divide-y divide-secondary rounded-lg ring-1 ring-secondary ring-inset">
              {activeItems.map((item, index) => (
                <li key={item.id} className="flex items-center justify-between px-4 py-2.5">
                  {editingId === item.id ? (
                    <div className="flex items-center gap-2 flex-1">
                      <input
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleUpdateCategory(item.id);
                          if (e.key === "Escape") setEditingId(null);
                        }}
                        className="flex-1 rounded-md border border-secondary bg-primary px-2.5 py-1 text-sm text-primary focus:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-100"
                        autoFocus
                      />
                      <button
                        onClick={() => handleUpdateCategory(item.id)}
                        className="rounded p-1 text-success-600 hover:bg-success-50 dark:hover:bg-success-500/10"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="rounded p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                      >
                        <XClose className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-medium text-tertiary w-5 text-center">{index + 1}</span>
                        <span className="text-sm text-primary">{item.name}</span>
                        {item.is_default && (
                          <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-500 dark:bg-gray-700 dark:text-gray-400">
                            Default
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setEditingId(item.id);
                            setEditingName(item.name);
                          }}
                          className="rounded p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 dark:hover:text-gray-300"
                        >
                          <Edit01 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteCategory(item.id, item.name)}
                          className="rounded p-1 text-gray-400 hover:text-error-600 hover:bg-error-50 dark:hover:bg-error-500/10"
                        >
                          <Trash01 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}

          {/* Add New Item */}
          {isAddingNew ? (
            <div className="flex items-center gap-2 mt-2">
              <input
                type="text"
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddCategory();
                  if (e.key === "Escape") {
                    setIsAddingNew(false);
                    setNewItemName("");
                  }
                }}
                placeholder={`New ${activeTypeLabel.replace(/s$/, "").toLowerCase()} name...`}
                className="flex-1 rounded-md border border-secondary bg-primary px-3 py-2 text-sm text-primary placeholder:text-quaternary focus:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-100"
                autoFocus
              />
              <Button size="sm" color="primary" onClick={handleAddCategory}>
                Add
              </Button>
              <Button
                size="sm"
                color="secondary"
                onClick={() => {
                  setIsAddingNew(false);
                  setNewItemName("");
                }}
              >
                Cancel
              </Button>
            </div>
          ) : (
            <Button
              size="sm"
              color="secondary"
              iconLeading={Plus}
              className="self-start mt-2"
              onClick={() => setIsAddingNew(true)}
            >
              Add {activeTypeLabel.replace(/s$/, "").replace(/ie$/, "y")}
            </Button>
          )}
        </div>
      </div>

      {/* Delete Confirmation */}
      <ConfirmationDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDeleteCategory}
        title={`Delete "${deleteTarget?.name ?? "item"}"?`}
        description="This category option will be permanently removed. This cannot be undone."
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
  );
}
