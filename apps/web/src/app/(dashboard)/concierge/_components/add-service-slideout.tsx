"use client";

/**
 * AddServiceSlideout Component
 * Slideout panel for adding/editing concierge services
 */

import { useState, useEffect } from "react";
import {
  Phone01,
  Globe02,
  MarkerPin01,
  Star01,
  Tag01,
  Building07,
  User01,
} from "@untitledui/icons";
import { SlideoutMenu } from "@/components/application/slideout-menus/slideout-menu";
import { Button } from "@/components/base/buttons/button";
import { CloseButton } from "@/components/base/buttons/close-button";
import { Input } from "@/components/base/input/input";
import { NativeSelect } from "@/components/base/select/select-native";
import { Toggle } from "@/components/base/toggle/toggle";
import type { Service } from "./concierge-data";

interface AddServiceSlideoutProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit?: (service: Omit<Service, "id">) => void;
  editService?: Service | null;
}

const categoryOptions = [
  { label: "Restaurants / Dining", value: "restaurants" },
  { label: "Hotels", value: "hotels" },
  { label: "Transportation", value: "transportation" },
  { label: "Entertainment", value: "entertainment" },
  { label: "Wellness", value: "wellness" },
  { label: "Shopping", value: "shopping" },
  { label: "Travel", value: "travel" },
  { label: "Other", value: "other" },
];

const ratingOptions = [
  { label: "No rating", value: "0" },
  { label: "★", value: "1" },
  { label: "★★", value: "2" },
  { label: "★★★", value: "3" },
  { label: "★★★★", value: "4" },
  { label: "★★★★★", value: "5" },
];

export function AddServiceSlideout({ isOpen, onOpenChange, onSubmit, editService }: AddServiceSlideoutProps) {
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [isFavorite, setIsFavorite] = useState(false);

  // Pre-fill when editing
  useEffect(() => {
    if (editService) {
      setTags(editService.tags || []);
      setIsFavorite(editService.isFavorite ?? false);
    } else {
      setTags([]);
      setTagInput("");
      setIsFavorite(false);
    }
  }, [editService]);

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddTag();
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const ratingValue = parseInt(formData.get("rating") as string, 10);
    
    const service: Omit<Service, "id"> = {
      name: formData.get("name") as string,
      category: formData.get("category") as Service["category"],
      description: formData.get("description") as string,
      contact: formData.get("contact") as string || undefined,
      phone: formData.get("phone") as string || undefined,
      address: formData.get("address") as string || undefined,
      website: formData.get("website") as string || undefined,
      rating: ratingValue > 0 ? ratingValue : undefined,
      notes: formData.get("notes") as string || undefined,
      tags: tags.length > 0 ? tags : undefined,
      isFavorite,
    };

    onSubmit?.(service);
    onOpenChange(false);
    
    // Reset form state
    setTags([]);
    setTagInput("");
    setIsFavorite(false);
  };

  return (
    <SlideoutMenu.Trigger isOpen={isOpen} onOpenChange={onOpenChange}>
      <SlideoutMenu isDismissable>
        {/* Header */}
        <div className="relative w-full border-b border-secondary px-4 py-4 md:px-6">
          <CloseButton className="absolute top-4 right-4" onClick={() => onOpenChange(false)} />
          <h2 className="text-lg font-semibold text-primary">{editService ? "Edit Service" : "Add Service"}</h2>
          <p className="text-sm text-tertiary">{editService ? "Update this concierge service" : "Add a new concierge service to your directory"}</p>
        </div>

        {/* Content */}
        <SlideoutMenu.Content>
          <form id="add-service-form" onSubmit={handleSubmit} className="flex flex-col gap-5">
            {/* Service Name */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="name" className="text-sm font-medium text-secondary">
                Service Name <span className="text-error-500">*</span>
              </label>
              <Input
                id="name"
                name="name"
                size="sm"
                icon={Building07}
                placeholder="e.g., The French Laundry, Four Seasons"
                defaultValue={editService?.name}
                isRequired
              />
            </div>

            {/* Category & Rating */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="category" className="text-sm font-medium text-secondary">
                  Category <span className="text-error-500">*</span>
                </label>
                <NativeSelect
                  id="category"
                  name="category"
                  options={categoryOptions}
                  defaultValue={editService?.category || "restaurants"}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="rating" className="text-sm font-medium text-secondary">
                  Rating
                </label>
                <NativeSelect
                  id="rating"
                  name="rating"
                  options={ratingOptions}
                  defaultValue={editService?.rating?.toString() || "0"}
                />
              </div>
            </div>

            {/* Description */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="description" className="text-sm font-medium text-secondary">
                Description <span className="text-error-500">*</span>
              </label>
              <textarea
                id="description"
                name="description"
                rows={2}
                required
                defaultValue={editService?.description}
                placeholder="Brief description of the service..."
                className="w-full rounded-lg border border-secondary bg-primary px-3 py-2 text-sm text-primary placeholder:text-quaternary focus:border-brand-300 focus:outline-none focus:ring-4 focus:ring-brand-100"
              />
            </div>

            {/* Contact Person */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="contact" className="text-sm font-medium text-secondary">
                Contact Person / Department
              </label>
              <Input
                id="contact"
                name="contact"
                size="sm"
                icon={User01}
                placeholder="e.g., Reservations Team, VIP Concierge"
                defaultValue={editService?.contact}
              />
            </div>

            {/* Phone & Website */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="phone" className="text-sm font-medium text-secondary">
                  Phone
                </label>
                <Input
                  id="phone"
                  name="phone"
                  size="sm"
                  icon={Phone01}
                  placeholder="+1 (555) 000-0000"
                  defaultValue={editService?.phone}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="website" className="text-sm font-medium text-secondary">
                  Website
                </label>
                <Input
                  id="website"
                  name="website"
                  size="sm"
                  icon={Globe02}
                  placeholder="example.com"
                  defaultValue={editService?.website}
                />
              </div>
            </div>

            {/* Address */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="address" className="text-sm font-medium text-secondary">
                Address
              </label>
              <Input
                id="address"
                name="address"
                size="sm"
                icon={MarkerPin01}
                placeholder="Full address"
                defaultValue={editService?.address}
              />
            </div>

            {/* Tags */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="tagInput" className="text-sm font-medium text-secondary">
                Tags
              </label>
              <div className="flex gap-2">
                <Input
                  id="tagInput"
                  size="sm"
                  icon={Tag01}
                  placeholder="Add a tag and press Enter"
                  value={tagInput}
                  onChange={(value) => setTagInput(value)}
                  onKeyDown={handleKeyDown}
                />
                <Button type="button" size="sm" color="secondary" onClick={handleAddTag}>
                  Add
                </Button>
              </div>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="ml-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Notes */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="notes" className="text-sm font-medium text-secondary">
                Notes
              </label>
              <textarea
                id="notes"
                name="notes"
                rows={2}
                defaultValue={editService?.notes}
                placeholder="Special instructions, account numbers, preferences..."
                className="w-full rounded-lg border border-secondary bg-primary px-3 py-2 text-sm text-primary placeholder:text-quaternary focus:border-brand-300 focus:outline-none focus:ring-4 focus:ring-brand-100"
              />
            </div>

            {/* Favorite Toggle */}
            <div className="flex items-center justify-between rounded-lg border border-secondary p-3">
              <div className="flex items-center gap-2">
                <Star01 className={`h-4 w-4 ${isFavorite ? "text-amber-500 fill-amber-500" : "text-fg-quaternary"}`} />
                <span className="text-sm text-secondary">Add to favorites</span>
              </div>
              <Toggle size="sm" isSelected={isFavorite} onChange={setIsFavorite} />
            </div>
          </form>
        </SlideoutMenu.Content>

        {/* Footer */}
        <SlideoutMenu.Footer className="flex w-full items-center justify-end gap-3">
          <Button size="md" color="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" form="add-service-form" size="md" color="primary">
            {editService ? "Save Changes" : "Add Service"}
          </Button>
        </SlideoutMenu.Footer>
      </SlideoutMenu>
    </SlideoutMenu.Trigger>
  );
}
