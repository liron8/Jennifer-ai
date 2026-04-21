"use client";

import { CheckCircle, AlertTriangle, Download01 } from "@untitledui/icons";
import type { ImportResult } from "../import-contacts-utils";
import { generateErrorCsv } from "../import-contacts-utils";

interface ResultsStepProps {
  result: ImportResult;
  originalRows: Record<string, string>[];
}

export function ResultsStep({ result, originalRows }: ResultsStepProps) {
  const hasFailures = result.failed > 0;
  const isAllFailed = result.created === 0 && result.updated === 0;

  const handleDownloadErrors = () => {
    const blob = generateErrorCsv(result.errors, originalRows);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "import-errors.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col items-center justify-center py-8 space-y-5">
      <div
        className={`flex h-14 w-14 items-center justify-center rounded-full ${
          isAllFailed
            ? "bg-error-secondary"
            : hasFailures
              ? "bg-warning-secondary"
              : "bg-success-secondary"
        }`}
      >
        {isAllFailed ? (
          <AlertTriangle className="h-7 w-7 text-error-primary" />
        ) : hasFailures ? (
          <AlertTriangle className="h-7 w-7 text-warning-primary" />
        ) : (
          <CheckCircle className="h-7 w-7 text-success-primary" />
        )}
      </div>

      <div className="text-center">
        <h3 className="text-base font-semibold text-primary">
          {isAllFailed ? "Import Failed" : "Import Complete"}
        </h3>
        <div className="mt-2 space-y-1 text-sm text-secondary">
          {result.created > 0 && (
            <p>
              <span className="font-semibold text-success-primary">{result.created}</span> contacts
              created
            </p>
          )}
          {result.updated > 0 && (
            <p>
              <span className="font-semibold text-brand-600">{result.updated}</span> contacts
              updated
            </p>
          )}
          {result.skipped > 0 && (
            <p>
              <span className="font-semibold text-quaternary">{result.skipped}</span> duplicates
              skipped
            </p>
          )}
          {result.failed > 0 && (
            <p>
              <span className="font-semibold text-error-primary">{result.failed}</span> failed
            </p>
          )}
        </div>
      </div>

      {hasFailures && (
        <button
          onClick={handleDownloadErrors}
          className="inline-flex items-center gap-2 rounded-lg border border-secondary px-4 py-2 text-sm font-medium text-secondary hover:bg-primary_hover transition-colors"
        >
          <Download01 className="h-4 w-4" />
          Download Error Report
        </button>
      )}
    </div>
  );
}
