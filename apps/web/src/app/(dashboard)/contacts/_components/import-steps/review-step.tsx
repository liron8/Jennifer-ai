"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Trash01, XCircle } from "@untitledui/icons";
import { cx } from "@/utils/cx";
import type { ValidationResult } from "../import-contacts-utils";

interface ReviewStepProps {
  validationResults: ValidationResult[];
  onRemoveRow: (rowIndex: number) => void;
  skipDuplicates: boolean;
  onSkipDuplicatesChange: (skip: boolean) => void;
  updateDuplicates: boolean;
  onUpdateDuplicatesChange: (update: boolean) => void;
}

const PAGE_SIZE = 20;

export function ReviewStep({
  validationResults,
  onRemoveRow,
  skipDuplicates,
  onSkipDuplicatesChange,
  updateDuplicates,
  onUpdateDuplicatesChange,
}: ReviewStepProps) {
  const [page, setPage] = useState(0);

  const stats = useMemo(() => {
    const valid = validationResults.filter((r) => r.errors.length === 0 && !r.isDuplicate).length;
    const errors = validationResults.filter((r) => r.errors.length > 0).length;
    const duplicates = validationResults.filter((r) => r.isDuplicate && r.errors.length === 0).length;
    return { valid, errors, duplicates, total: validationResults.length };
  }, [validationResults]);

  const pageRows = validationResults.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(validationResults.length / PAGE_SIZE);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-primary">Review Contacts</h3>
        <p className="mt-1 text-sm text-tertiary">
          Preview your contacts before importing. Fix any issues below.
        </p>
      </div>

      {/* Summary bar */}
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-secondary bg-secondary/30 px-4 py-2.5 text-sm">
        <span className="font-medium text-primary">{stats.total} total</span>
        <span className="text-quaternary">·</span>
        <span className="text-success-primary">{stats.valid} valid</span>
        {stats.errors > 0 && (
          <>
            <span className="text-quaternary">·</span>
            <span className="text-error-primary">{stats.errors} errors</span>
          </>
        )}
        {stats.duplicates > 0 && (
          <>
            <span className="text-quaternary">·</span>
            <span className="text-warning-primary">{stats.duplicates} duplicates</span>
          </>
        )}
      </div>

      {/* Duplicate options */}
      {stats.duplicates > 0 && (
        <div className="flex flex-wrap items-center gap-4 rounded-lg border border-warning-secondary bg-warning-primary/5 px-4 py-2.5 text-sm">
          <AlertTriangle className="h-4 w-4 text-warning-primary shrink-0" />
          <span className="text-warning-primary">{stats.duplicates} contacts already exist.</span>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="radio"
              name="duplicate-action"
              checked={skipDuplicates && !updateDuplicates}
              onChange={() => { onSkipDuplicatesChange(true); onUpdateDuplicatesChange(false); }}
              className="accent-brand-600"
            />
            <span className="text-secondary">Skip</span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="radio"
              name="duplicate-action"
              checked={updateDuplicates}
              onChange={() => { onSkipDuplicatesChange(false); onUpdateDuplicatesChange(true); }}
              className="accent-brand-600"
            />
            <span className="text-secondary">Update existing</span>
          </label>
        </div>
      )}

      {/* Table */}
      <div className="rounded-lg border border-secondary overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-secondary bg-secondary/50 text-left text-xs font-semibold text-tertiary uppercase tracking-wider">
                <th className="px-3 py-2 w-8">#</th>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Email</th>
                <th className="px-3 py-2">Company</th>
                <th className="px-3 py-2">Category</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2 w-8" />
              </tr>
            </thead>
            <tbody className="divide-y divide-secondary">
              {pageRows.map((row) => {
                const d = row.data as Record<string, string>;
                const hasErrors = row.errors.length > 0;

                return (
                  <tr
                    key={row.rowIndex}
                    className={cx(
                      hasErrors && "bg-error-primary/5",
                      !hasErrors && row.isDuplicate && "bg-warning-primary/5",
                    )}
                  >
                    <td className="px-3 py-2 text-xs text-quaternary">{row.rowIndex + 1}</td>
                    <td className="px-3 py-2 font-medium text-primary truncate max-w-[160px]">
                      {d.full_name || "—"}
                    </td>
                    <td className="px-3 py-2 text-secondary truncate max-w-[180px]">
                      {d.email || "—"}
                    </td>
                    <td className="px-3 py-2 text-secondary truncate max-w-[140px]">
                      {d.company || "—"}
                    </td>
                    <td className="px-3 py-2 text-secondary capitalize">
                      {d.category || "—"}
                    </td>
                    <td className="px-3 py-2">
                      {hasErrors ? (
                        <span className="inline-flex items-center gap-1 text-xs text-error-primary">
                          <XCircle className="h-3.5 w-3.5" />
                          {row.errors[0].message}
                        </span>
                      ) : row.isDuplicate ? (
                        <span className="inline-flex items-center gap-1 text-xs text-warning-primary">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          Duplicate
                        </span>
                      ) : (
                        <span className="text-xs text-success-primary">Valid</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {hasErrors && (
                        <button
                          onClick={() => onRemoveRow(row.rowIndex)}
                          className="text-quaternary hover:text-error-primary transition-colors"
                          title="Remove row"
                        >
                          <Trash01 className="h-4 w-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-secondary px-4 py-2.5">
            <span className="text-xs text-tertiary">
              Page {page + 1} of {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(Math.max(0, page - 1))}
                disabled={page === 0}
                className="rounded px-3 py-1 text-xs font-medium text-secondary hover:bg-primary_hover disabled:opacity-40"
              >
                Previous
              </button>
              <button
                onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                disabled={page === totalPages - 1}
                className="rounded px-3 py-1 text-xs font-medium text-secondary hover:bg-primary_hover disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
