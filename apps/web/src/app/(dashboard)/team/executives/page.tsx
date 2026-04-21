"use client";

/**
 * Executives Page
 * List of all executives with grid view
 * Connected to real database via /api/executives
 */

import { useState, useMemo, useCallback } from "react";
import { Plus, SearchLg, Users01, RefreshCw01 } from "@untitledui/icons";
import { Button } from "@/components/base/buttons/button";
import { InputBase } from "@/components/base/input/input";
import { ExecutiveCard } from "../_components/executive-card";
import { type Executive } from "../_components/executive-data";
import { AddExecutiveSlideout } from "../_components/add-executive-slideout";
import { useExecutives, type DatabaseExecutive, type CreateExecutiveData } from "@/hooks/useExecutives";
import { notify } from "@/lib/notifications";

// Convert database executive to UI format
const convertToUIExecutive = (dbExec: DatabaseExecutive): Executive => {
  return {
    id: dbExec.id,
    name: dbExec.full_name,
    title: dbExec.title || '',
    email: dbExec.email || '',
    phone: dbExec.phone || '',
    location: dbExec.office_location || '',
    timezone: dbExec.timezone || 'America/Los_Angeles',
    department: 'Executive',
    bio: dbExec.bio || undefined,
  };
};

export default function ExecutivesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [isAddExecutiveOpen, setIsAddExecutiveOpen] = useState(false);

  // Fetch executives from database
  const { executives: dbExecutives, isLoading, error, stats, createExecutive, refetch } = useExecutives();

  // Convert database executives to UI format, filtering archived
  const executives = useMemo(() => {
    if (Array.isArray(dbExecutives)) {
      const filtered = showArchived ? dbExecutives : dbExecutives.filter(e => !e.archived_at);
      return filtered.map(e => ({
        ...convertToUIExecutive(e),
        isArchived: !!e.archived_at,
      }));
    }
    return [];
  }, [dbExecutives, showArchived]);

  const handleAddExecutive = useCallback(async (executiveData: Omit<Executive, "id">) => {
    try {
      const createData: CreateExecutiveData = {
        full_name: executiveData.name,
        title: executiveData.title,
        email: executiveData.email,
        phones: executiveData.phone ? [{ type: 'mobile', number: executiveData.phone, is_primary: true }] : undefined,
        main_office_location: executiveData.location,
        timezone: executiveData.timezone,
        bio: executiveData.bio,
      };

      await createExecutive(createData);
      notify.success('Executive created', `"${executiveData.name}" has been added.`);
    } catch (err) {
      console.error('Failed to create executive:', err);
      notify.error('Failed to create executive', err instanceof Error ? err.message : 'Please try again.');
    }
  }, [createExecutive]);

  const filteredExecutives = useMemo(() => {
    if (!searchQuery) return executives;
    const query = searchQuery.toLowerCase();
    return executives.filter(
      (e) =>
        e.name.toLowerCase().includes(query) ||
        e.title.toLowerCase().includes(query) ||
        e.department.toLowerCase().includes(query)
    );
  }, [searchQuery, executives]);

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 p-4 lg:p-8">
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-4">
            <div className="w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-tertiary">Loading executives...</p>
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
            <p className="text-lg font-semibold text-primary">Unable to load executives</p>
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
          <h1 className="text-xl font-semibold text-primary lg:text-2xl">Executives</h1>
          <p className="text-sm text-tertiary">
            {stats.total} executives in your organization
          </p>
        </div>
        <div className="flex gap-3">
          <Button size="md" color="primary" iconLeading={Plus} onClick={() => setIsAddExecutiveOpen(true)}>
            Add Executive
          </Button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex items-center gap-4">
        <div className="w-full lg:max-w-xs">
          <InputBase
            size="sm"
            type="search"
            aria-label="Search"
            placeholder="Search executives..."
            icon={SearchLg}
            value={searchQuery}
            onChange={(value) => setSearchQuery(value)}
          />
        </div>
        <label className="flex items-center gap-2 cursor-pointer whitespace-nowrap">
          <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500" />
          <span className="text-sm text-tertiary">Show Archived</span>
        </label>
      </div>

      {/* Executives Grid */}
      {filteredExecutives.length === 0 ? (
        <div className="flex h-64 items-center justify-center rounded-xl border border-secondary bg-primary">
          <div className="text-center">
            <Users01 className="mx-auto h-12 w-12 text-fg-quaternary" />
            <p className="mt-2 text-sm font-medium text-primary">No executives found</p>
            <p className="text-xs text-tertiary">Try adjusting your search</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredExecutives.map((executive) => (
            <div key={executive.id} className={executive.isArchived ? 'opacity-50' : ''}>
              <ExecutiveCard executive={executive} />
            </div>
          ))}
        </div>
      )}

      {/* Add Executive Slideout */}
      <AddExecutiveSlideout
        isOpen={isAddExecutiveOpen}
        onOpenChange={setIsAddExecutiveOpen}
        onSubmit={handleAddExecutive}
      />
    </div>
  );
}
