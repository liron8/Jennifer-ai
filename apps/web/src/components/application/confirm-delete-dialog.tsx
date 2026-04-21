"use client";

import { AlertTriangle } from "@untitledui/icons";
import { Button } from "@/components/base/buttons/button";

interface ConfirmDeleteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message?: string;
  itemName?: string;
  isLoading?: boolean;
}

export function ConfirmDeleteDialog({
  isOpen,
  onClose,
  onConfirm,
  title = "Delete Item",
  message,
  itemName,
  isLoading = false,
}: ConfirmDeleteDialogProps) {
  if (!isOpen) return null;

  const displayMessage =
    message ||
    `Are you sure you want to delete${itemName ? ` "${itemName}"` : " this item"}? This action cannot be undone.`;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center">
      <div
        className="fixed inset-0 bg-overlay/70 backdrop-blur-[6px]"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-md rounded-xl border border-secondary bg-primary p-6 shadow-xl">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-error-50 dark:bg-error-500/10">
            <AlertTriangle className="h-5 w-5 text-error-600 dark:text-error-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-primary">{title}</h3>
            <p className="mt-1 text-sm text-tertiary">{displayMessage}</p>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <Button
            size="md"
            color="secondary"
            onClick={onClose}
            isDisabled={isLoading}
          >
            Cancel
          </Button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className="inline-flex items-center justify-center rounded-lg bg-error-600 px-4 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-error-700 focus:outline-none focus:ring-4 focus:ring-error-100 disabled:opacity-50 dark:bg-error-500 dark:hover:bg-error-600 dark:focus:ring-error-500/20"
          >
            {isLoading ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}
