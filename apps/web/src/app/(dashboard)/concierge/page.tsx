"use client";

/**
 * Concierge Page
 * Service directory with categories, search, and favorites
 * Connected to real database via /api/concierge (Pro tier)
 */

import { useState, useMemo, useCallback } from "react";
import {
  Plus,
  SearchLg,
  Phone01,
  Globe02,
  MarkerPin01,
  Star01,
  Building07,
  List,
  Grid01,
  RefreshCw01,
  Edit01,
  Trash01,
  Heart,
} from "@untitledui/icons";
import { Button } from "@/components/base/buttons/button";
import { ButtonUtility } from "@/components/base/buttons/button-utility";
import { InputBase } from "@/components/base/input/input";
import { Badge } from "@/components/base/badges/badges";
import { TabList, Tabs } from "@/components/application/tabs/tabs";
import {
  categoryIcons,
  categoryLabels,
  type Service,
} from "./_components/concierge-data";
import { AddServiceSlideout } from "./_components/add-service-slideout";
import { ConfirmDeleteDialog } from "@/components/application/confirm-delete-dialog";
import { useConcierge, type DatabaseConciergeService, type CreateConciergeServiceData, type UpdateConciergeServiceData } from "@/hooks/useConcierge";
import { notify } from "@/lib/notifications";

type ViewMode = "list" | "card";

// Convert database service to UI format
const convertToUIService = (dbService: DatabaseConciergeService): Service => ({
  id: dbService.id,
  name: dbService.name,
  category: dbService.category,
  description: dbService.description || '',
  contact: dbService.contact_name || undefined,
  phone: dbService.phone || undefined,
  address: dbService.address || undefined,
  website: dbService.website || undefined,
  rating: dbService.rating || undefined,
  notes: dbService.notes || undefined,
  tags: dbService.tags || undefined,
  isFavorite: dbService.is_favorite,
});

export default function ConciergePage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [viewMode, setViewMode] = useState<ViewMode>("card");
  const [isAddServiceOpen, setIsAddServiceOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Fetch services from database
  const { services: dbServices, isLoading, error, stats, createService, updateService, deleteService, toggleFavorite, refetch } = useConcierge();

  // Convert database services to UI format
  const services = useMemo(() => {
    if (Array.isArray(dbServices)) {
      return dbServices.map(convertToUIService);
    }
    return [];
  }, [dbServices]);

  const handleAddService = useCallback(async (serviceData: Omit<Service, "id">) => {
    try {
      // Auto-prefix https:// if website doesn't have a protocol
      let website = serviceData.website;
      if (website && !website.startsWith('http://') && !website.startsWith('https://')) {
        website = `https://${website}`;
      }

      const createData: CreateConciergeServiceData = {
        name: serviceData.name,
        description: serviceData.description,
        category: serviceData.category,
        contact_name: serviceData.contact,
        phone: serviceData.phone,
        address: serviceData.address,
        website: website || undefined,
        rating: serviceData.rating,
        notes: serviceData.notes,
        tags: serviceData.tags,
      };

      await createService(createData);
      notify.success('Service created', `"${serviceData.name}" has been added.`);
    } catch (err) {
      console.error('Failed to create service:', err);
      notify.error('Failed to create service', err instanceof Error ? err.message : 'Please try again.');
    }
  }, [createService]);

  const handleToggleFavorite = useCallback(async (id: string) => {
    try {
      await toggleFavorite(id);
    } catch (err) {
      console.error('Failed to toggle favorite:', err);
      notify.error('Failed to update favorite', 'Please try again.');
    }
  }, [toggleFavorite]);

  const handleEditService = useCallback((service: Service) => {
    setEditingService(service);
    setIsAddServiceOpen(true);
  }, []);

  const handleUpdateService = useCallback(async (serviceData: Omit<Service, "id">) => {
    if (!editingService) return;
    try {
      let website = serviceData.website;
      if (website && !website.startsWith('http://') && !website.startsWith('https://')) {
        website = `https://${website}`;
      }

      const updateData: UpdateConciergeServiceData = {
        name: serviceData.name,
        description: serviceData.description,
        category: serviceData.category,
        contact_name: serviceData.contact,
        phone: serviceData.phone,
        address: serviceData.address,
        website: website || undefined,
        rating: serviceData.rating,
        notes: serviceData.notes,
        tags: serviceData.tags,
        is_favorite: serviceData.isFavorite,
      };

      await updateService(editingService.id, updateData);
      notify.success('Service updated', `"${serviceData.name}" has been updated.`);
      setEditingService(null);
    } catch (err) {
      console.error('Failed to update service:', err);
      notify.error('Failed to update service', err instanceof Error ? err.message : 'Please try again.');
    }
  }, [editingService, updateService]);

  const handleDeleteService = useCallback(async () => {
    if (!deleteConfirmId) return;
    try {
      await deleteService(deleteConfirmId);
      notify.success('Service deleted', 'The service has been removed.');
    } catch (err) {
      console.error('Failed to delete service:', err);
      notify.error('Failed to delete service', 'Please try again.');
    }
    setDeleteConfirmId(null);
  }, [deleteConfirmId, deleteService]);

  const filteredServices = useMemo(() => {
    let filtered = services;

    if (activeCategory === "favorites") {
      filtered = filtered.filter((s) => s.isFavorite);
    } else if (activeCategory !== "all") {
      filtered = filtered.filter((s) => s.category === activeCategory);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (s) =>
          s.name.toLowerCase().includes(query) ||
          s.description.toLowerCase().includes(query) ||
          s.tags?.some((t) => t.toLowerCase().includes(query))
      );
    }

    return filtered;
  }, [activeCategory, searchQuery, services]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {
      all: services.length,
      favorites: services.filter((s) => s.isFavorite).length,
    };
    services.forEach((s) => {
      counts[s.category] = (counts[s.category] || 0) + 1;
    });
    return counts;
  }, [services]);

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 p-4 lg:p-8">
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-4">
            <div className="w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-tertiary">Loading concierge services...</p>
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
            <p className="text-lg font-semibold text-primary">Unable to load concierge services</p>
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
          <h1 className="text-xl font-semibold text-primary lg:text-2xl">Concierge Services</h1>
          <p className="text-sm text-tertiary">{stats.total} services in your directory</p>
        </div>
        <Button size="md" color="primary" iconLeading={Plus} onClick={() => setIsAddServiceOpen(true)}>
          Add Service
        </Button>
      </div>

      {/* Tabs */}
      <Tabs selectedKey={activeCategory} onSelectionChange={(key) => setActiveCategory(key as string)}>
        <TabList
          type="button-minimal"
          items={[
            { id: "all", label: `All (${categoryCounts.all})` },
            { id: "favorites", label: `⭐ Favorites (${categoryCounts.favorites})` },
            { id: "restaurants", label: `🍽️ Dining (${categoryCounts.restaurants || 0})` },
            { id: "hotels", label: `🏨 Hotels (${categoryCounts.hotels || 0})` },
            { id: "transportation", label: `🚗 Transport (${categoryCounts.transportation || 0})` },
            { id: "travel", label: `✈️ Travel (${categoryCounts.travel || 0})` },
            { id: "wellness", label: `💆 Wellness (${categoryCounts.wellness || 0})` },
            { id: "entertainment", label: `🎭 Entertainment (${categoryCounts.entertainment || 0})` },
          ]}
        />
      </Tabs>

      {/* Search and View Toggle */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="w-full lg:max-w-xs">
          <InputBase
            size="sm"
            type="search"
            aria-label="Search"
            placeholder="Search services..."
            icon={SearchLg}
            value={searchQuery}
            onChange={(value) => setSearchQuery(value)}
          />
        </div>
        <div className="flex rounded-lg border border-secondary bg-primary p-1">
          <button
            onClick={() => setViewMode("list")}
            className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              viewMode === "list" ? "bg-secondary text-primary" : "text-tertiary hover:text-secondary"
            }`}
          >
            <List className="h-4 w-4" />
            List
          </button>
          <button
            onClick={() => setViewMode("card")}
            className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              viewMode === "card" ? "bg-secondary text-primary" : "text-tertiary hover:text-secondary"
            }`}
          >
            <Grid01 className="h-4 w-4" />
            Card
          </button>
        </div>
      </div>

      {/* Content */}
      {filteredServices.length === 0 ? (
        <div className="flex h-64 items-center justify-center rounded-xl border border-secondary bg-primary">
          <div className="text-center">
            <Building07 className="mx-auto h-12 w-12 text-fg-quaternary" />
            <p className="mt-2 text-sm font-medium text-primary">No services found</p>
            <p className="text-xs text-tertiary">Try adjusting your filters</p>
          </div>
        </div>
      ) : viewMode === "list" ? (
        <div className="space-y-3">
          {filteredServices.map((service) => {
            const categoryColorMap: Record<string, { bg: string; icon: string }> = {
              restaurants: { bg: "from-orange-50/20 to-orange-100/5 dark:from-orange-950/10 dark:to-orange-900/5", icon: "bg-orange-100 dark:bg-orange-900/50" },
              hotels: { bg: "from-blue-50/20 to-blue-100/5 dark:from-blue-950/10 dark:to-blue-900/5", icon: "bg-blue-100 dark:bg-blue-900/50" },
              transportation: { bg: "from-emerald-50/20 to-emerald-100/5 dark:from-emerald-950/10 dark:to-emerald-900/5", icon: "bg-emerald-100 dark:bg-emerald-900/50" },
              entertainment: { bg: "from-purple-50/20 to-purple-100/5 dark:from-purple-950/10 dark:to-purple-900/5", icon: "bg-purple-100 dark:bg-purple-900/50" },
              wellness: { bg: "from-pink-50/20 to-pink-100/5 dark:from-pink-950/10 dark:to-pink-900/5", icon: "bg-pink-100 dark:bg-pink-900/50" },
              shopping: { bg: "from-amber-50/20 to-amber-100/5 dark:from-amber-950/10 dark:to-amber-900/5", icon: "bg-amber-100 dark:bg-amber-900/50" },
              travel: { bg: "from-cyan-50/20 to-cyan-100/5 dark:from-cyan-950/10 dark:to-cyan-900/5", icon: "bg-cyan-100 dark:bg-cyan-900/50" },
              other: { bg: "from-gray-50/20 to-gray-100/5 dark:from-gray-950/10 dark:to-gray-900/5", icon: "bg-gray-100 dark:bg-gray-900/50" },
            };
            const colors = categoryColorMap[service.category] || categoryColorMap.other;
            
            return (
              <div
                key={service.id}
                className={`group flex items-start gap-4 rounded-2xl border border-gray-200 bg-gradient-to-br p-4 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 dark:border-gray-800 ${colors.bg}`}
              >
                <div className={`flex h-14 w-14 items-center justify-center rounded-xl text-2xl shadow-sm ${colors.icon}`}>
                  {categoryIcons[service.category]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{service.name}</p>
                    {service.isFavorite && <Star01 className="h-4 w-4 text-amber-500 fill-amber-500" />}
                    {service.rating && (
                      <span className="flex items-center gap-0.5 text-xs text-amber-600">
                        {"★".repeat(service.rating)}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5 line-clamp-1">{service.description}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {service.tags?.map((tag) => (
                      <span key={tag} className="inline-flex rounded-full bg-white/80 px-2 py-0.5 text-xs font-medium text-gray-700 shadow-sm dark:bg-gray-800/80 dark:text-gray-300">{tag}</span>
                    ))}
                  </div>
                </div>
                <div className="hidden lg:flex flex-col items-end gap-2">
                  {service.phone && (
                    <div className="flex items-center gap-2 rounded-lg bg-white/60 px-2 py-1 dark:bg-gray-800/60">
                      <Phone01 className="h-3.5 w-3.5 text-emerald-500" />
                      <span className="text-xs text-gray-600 dark:text-gray-400">{service.phone}</span>
                    </div>
                  )}
                  {service.address && (
                    <div className="flex items-center gap-2 rounded-lg bg-white/60 px-2 py-1 dark:bg-gray-800/60">
                      <MarkerPin01 className="h-3.5 w-3.5 text-amber-500" />
                      <span className="text-xs text-gray-500 truncate max-w-[200px]">{service.address}</span>
                    </div>
                  )}
                  <div className="flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                    <ButtonUtility size="xs" color="tertiary" tooltip={service.isFavorite ? "Unfavorite" : "Favorite"} icon={Star01} onClick={() => handleToggleFavorite(service.id)} />
                    <ButtonUtility size="xs" color="tertiary" tooltip="Edit" icon={Edit01} onClick={() => handleEditService(service)} />
                    <ButtonUtility size="xs" color="tertiary" tooltip="Delete" icon={Trash01} onClick={() => setDeleteConfirmId(service.id)} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filteredServices.map((service) => {
            const categoryColorMap: Record<string, { bg: string; border: string; icon: string; tag: string }> = {
              restaurants: { bg: "from-orange-50/20 to-orange-100/5 dark:from-orange-950/10 dark:to-orange-900/5", border: "border-gray-200 dark:border-gray-800", icon: "bg-orange-100 dark:bg-orange-900/50", tag: "bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-400" },
              hotels: { bg: "from-blue-50/20 to-blue-100/5 dark:from-blue-950/10 dark:to-blue-900/5", border: "border-gray-200 dark:border-gray-800", icon: "bg-blue-100 dark:bg-blue-900/50", tag: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400" },
              transportation: { bg: "from-emerald-50/20 to-emerald-100/5 dark:from-emerald-950/10 dark:to-emerald-900/5", border: "border-gray-200 dark:border-gray-800", icon: "bg-emerald-100 dark:bg-emerald-900/50", tag: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400" },
              entertainment: { bg: "from-purple-50/20 to-purple-100/5 dark:from-purple-950/10 dark:to-purple-900/5", border: "border-gray-200 dark:border-gray-800", icon: "bg-purple-100 dark:bg-purple-900/50", tag: "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-400" },
              wellness: { bg: "from-pink-50/20 to-pink-100/5 dark:from-pink-950/10 dark:to-pink-900/5", border: "border-gray-200 dark:border-gray-800", icon: "bg-pink-100 dark:bg-pink-900/50", tag: "bg-pink-100 text-pink-700 dark:bg-pink-900/50 dark:text-pink-400" },
              shopping: { bg: "from-amber-50/20 to-amber-100/5 dark:from-amber-950/10 dark:to-amber-900/5", border: "border-gray-200 dark:border-gray-800", icon: "bg-amber-100 dark:bg-amber-900/50", tag: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400" },
              travel: { bg: "from-cyan-50/20 to-cyan-100/5 dark:from-cyan-950/10 dark:to-cyan-900/5", border: "border-gray-200 dark:border-gray-800", icon: "bg-cyan-100 dark:bg-cyan-900/50", tag: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/50 dark:text-cyan-400" },
              other: { bg: "from-gray-50/20 to-gray-100/5 dark:from-gray-950/10 dark:to-gray-900/5", border: "border-gray-200 dark:border-gray-800", icon: "bg-gray-100 dark:bg-gray-900/50", tag: "bg-gray-100 text-gray-700 dark:bg-gray-900/50 dark:text-gray-400" },
            };
            const colors = categoryColorMap[service.category] || categoryColorMap.other;
            
            return (
              <div
                key={service.id}
                className={`group relative overflow-hidden rounded-2xl border bg-gradient-to-br p-5 shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-1 ${colors.bg} ${colors.border}`}
              >
                {/* Actions */}
                <div className="absolute top-3 right-3 flex items-center gap-0.5">
                  {service.isFavorite && (
                    <Star01 className="h-4 w-4 text-amber-500 fill-amber-500 mr-1" />
                  )}
                  <div className="flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      onClick={() => handleToggleFavorite(service.id)}
                      className="rounded-lg p-1.5 text-gray-400 hover:bg-white/80 hover:text-amber-500 dark:hover:bg-gray-800/80"
                      title={service.isFavorite ? "Unfavorite" : "Favorite"}
                    >
                      <Star01 className={`h-4 w-4 ${service.isFavorite ? "text-amber-500 fill-amber-500" : ""}`} />
                    </button>
                    <button
                      onClick={() => handleEditService(service)}
                      className="rounded-lg p-1.5 text-gray-400 hover:bg-white/80 hover:text-gray-700 dark:hover:bg-gray-800/80 dark:hover:text-gray-200"
                      title="Edit"
                    >
                      <Edit01 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setDeleteConfirmId(service.id)}
                      className="rounded-lg p-1.5 text-gray-400 hover:bg-error-50 hover:text-error-600 dark:hover:bg-error-900/20 dark:hover:text-error-400"
                      title="Delete"
                    >
                      <Trash01 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Icon & Rating */}
                <div className="flex items-start gap-3">
                  <div className={`flex h-14 w-14 items-center justify-center rounded-xl text-2xl shadow-sm ${colors.icon}`}>
                    {categoryIcons[service.category]}
                  </div>
                  {service.rating && (
                    <div className="flex items-center gap-0.5 rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-700 dark:bg-amber-900/50 dark:text-amber-400">
                      {"★".repeat(service.rating)}
                    </div>
                  )}
                </div>

                {/* Name & Description */}
                <h3 className="mt-4 text-base font-semibold text-gray-900 dark:text-white">{service.name}</h3>
                <p className="mt-1.5 text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{service.description}</p>
                
                {/* Tags */}
                {service.tags && service.tags.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {service.tags.slice(0, 3).map((tag) => (
                      <span key={tag} className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${colors.tag}`}>{tag}</span>
                    ))}
                  </div>
                )}

                {/* Contact Info */}
                <div className="mt-4 space-y-2 border-t border-gray-200/50 pt-4 dark:border-gray-700/50">
                  {service.contact && (
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{service.contact}</p>
                  )}
                  {service.phone && (
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/80 shadow-sm dark:bg-gray-800/80">
                        <Phone01 className="h-3.5 w-3.5 text-emerald-500" />
                      </div>
                      <span className="text-sm text-gray-600 dark:text-gray-400">{service.phone}</span>
                    </div>
                  )}
                  {service.address && (
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/80 shadow-sm dark:bg-gray-800/80">
                        <MarkerPin01 className="h-3.5 w-3.5 text-amber-500" />
                      </div>
                      <span className="text-sm text-gray-600 dark:text-gray-400 truncate">{service.address}</span>
                    </div>
                  )}
                  {service.website && (
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/80 shadow-sm dark:bg-gray-800/80">
                        <Globe02 className="h-3.5 w-3.5 text-blue-500" />
                      </div>
                      <span className="text-sm text-gray-600 dark:text-gray-400">{service.website}</span>
                    </div>
                  )}
                </div>

                {/* Notes */}
                {service.notes && (
                  <div className="mt-4 rounded-xl bg-amber-50 p-3 dark:bg-amber-900/20">
                    <p className="text-xs text-amber-700 dark:text-amber-400">{service.notes}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Service Slideout */}
      <AddServiceSlideout
        isOpen={isAddServiceOpen}
        onOpenChange={(open) => {
          setIsAddServiceOpen(open);
          if (!open) setEditingService(null);
        }}
        onSubmit={editingService ? handleUpdateService : handleAddService}
        editService={editingService}
      />

      {/* Delete Confirmation */}
      <ConfirmDeleteDialog
        isOpen={!!deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
        onConfirm={handleDeleteService}
        title="Delete Service"
        message="Are you sure you want to delete this concierge service? This action cannot be undone."
      />
    </div>
  );
}
