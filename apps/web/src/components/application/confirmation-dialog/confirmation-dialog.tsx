"use client";

/**
 * Reusable Confirmation Dialog
 * Used for destructive actions (delete, archive, disconnect, etc.)
 */

import { AlertTriangle } from "@untitledui/icons";
import { Button } from "@/components/base/buttons/button";

interface ConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "warning" | "default";
  isLoading?: boolean;
}

export function ConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "danger",
  isLoading = false,
}: ConfirmationDialogProps) {
  if (!isOpen) return null;

  const iconColorMap = {
    danger: "bg-error-100 text-error-600 dark:bg-error-500/10 dark:text-error-400",
    warning: "bg-warning-100 text-warning-600 dark:bg-warning-500/10 dark:text-warning-400",
    default: "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400",
  };

  const buttonColorMap = {
    danger: "bg-error-600 hover:bg-error-700 text-white",
    warning: "bg-warning-600 hover:bg-warning-700 text-white",
    default: "bg-brand-600 hover:bg-brand-700 text-white",
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="mx-4 w-full max-w-sm rounded-xl bg-white p-6 shadow-xl dark:bg-gray-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col items-center text-center">
          <div className={`flex h-12 w-12 items-center justify-center rounded-full ${iconColorMap[variant]} mb-4`}>
            <AlertTriangle className="h-6 w-6" />
          </div>
          <h3 className="text-lg font-semibold text-primary">{title}</h3>
          <p className="mt-1 text-sm text-tertiary">{description}</p>
        </div>
        <div className="mt-6 flex gap-3">
          <Button
            size="md"
            color="secondary"
            className="flex-1"
            onClick={onClose}
            isDisabled={isLoading}
          >
            {cancelLabel}
          </Button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors disabled:opacity-50 ${buttonColorMap[variant]}`}
          >
            {isLoading ? "Processing..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
