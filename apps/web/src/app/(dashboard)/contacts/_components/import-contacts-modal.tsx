"use client";

import { useState, useCallback, useMemo } from "react";
import { ModalOverlay, Modal, Dialog } from "@/components/application/modals/modal";
import { Button } from "@/components/base/buttons/button";
import { XClose } from "@untitledui/icons";
import { useContactImport } from "@/hooks/useContactImport";
import type {
  CsvParseResult,
  ColumnMapping,
  MappingDefaults,
  ValidationResult,
  MappedContact,
} from "./import-contacts-utils";
import { mapRowToContact, validateMappedContact } from "./import-contacts-utils";
import { UploadStep } from "./import-steps/upload-step";
import { MappingStep } from "./import-steps/mapping-step";
import { ReviewStep } from "./import-steps/review-step";
import { ProgressStep } from "./import-steps/progress-step";
import { ResultsStep } from "./import-steps/results-step";

type Step = 1 | 2 | 3 | 4 | 5;

const STEP_LABELS: Record<Step, string> = {
  1: "Upload",
  2: "Map Columns",
  3: "Review",
  4: "Importing",
  5: "Results",
};

interface ImportContactsModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete: () => void;
}

export function ImportContactsModal({
  isOpen,
  onOpenChange,
  onImportComplete,
}: ImportContactsModalProps) {
  const [step, setStep] = useState<Step>(1);
  const [parsed, setParsed] = useState<CsvParseResult | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const [defaults, setDefaults] = useState<MappingDefaults>({
    category: "client",
    company: "Unknown",
  });
  const [validationResults, setValidationResults] = useState<ValidationResult[]>([]);
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [updateDuplicates, setUpdateDuplicates] = useState(false);

  const {
    importContacts,
    checkDuplicates,
    cancel,
    isImporting,
    progress,
    result,
  } = useContactImport();

  // Mapped contacts (computed from validationResults)
  const validContacts = useMemo(
    () =>
      validationResults
        .filter((r) => r.errors.length === 0)
        .map((r) => r.data as unknown as MappedContact),
    [validationResults],
  );

  const handleClose = useCallback(() => {
    if (isImporting) return; // Don't close while importing
    onOpenChange(false);
    // Reset state after close animation
    setTimeout(() => {
      setStep(1);
      setParsed(null);
      setUploadError(null);
      setMapping({});
      setDefaults({ category: "client", company: "Unknown" });
      setValidationResults([]);
      setSkipDuplicates(true);
      setUpdateDuplicates(false);
    }, 200);
  }, [isImporting, onOpenChange]);

  const handleNext = useCallback(async () => {
    if (step === 1 && parsed) {
      setStep(2);
    } else if (step === 2) {
      // Validate all rows with current mapping
      // First check for duplicates
      const mappedRows = parsed!.rows.map((row) =>
        mapRowToContact(row, mapping, defaults),
      );
      const emails = mappedRows
        .map((c) => c.email)
        .filter(Boolean);

      const existingEmails = await checkDuplicates(emails);

      const results = mappedRows.map((contact, i) =>
        validateMappedContact(contact, i, existingEmails),
      );

      setValidationResults(results);
      setStep(3);
    } else if (step === 3) {
      // Start import
      setStep(4);
      const contactsToImport = validContacts;
      await importContacts(contactsToImport, {
        skipDuplicates,
        updateDuplicates,
      });
      setStep(5);
    }
  }, [step, parsed, mapping, defaults, checkDuplicates, validContacts, importContacts, skipDuplicates, updateDuplicates]);

  const handleBack = useCallback(() => {
    if (step === 2) setStep(1);
    else if (step === 3) setStep(2);
  }, [step]);

  const handleRemoveRow = useCallback(
    (rowIndex: number) => {
      setValidationResults((prev) => prev.filter((r) => r.rowIndex !== rowIndex));
    },
    [],
  );

  const handleDone = useCallback(() => {
    onImportComplete();
    handleClose();
  }, [onImportComplete, handleClose]);

  // Can proceed to next step?
  const canProceed = useMemo(() => {
    if (step === 1) return !!parsed;
    if (step === 2) {
      // Must have full_name and email mapped (or first+last name)
      const values = new Set(Object.values(mapping).filter(Boolean));
      const hasName =
        values.has("full_name") ||
        (values.has("__first_name") && values.has("__last_name"));
      const hasEmail = values.has("email");
      return hasName && hasEmail;
    }
    if (step === 3) {
      return validContacts.length > 0;
    }
    return false;
  }, [step, parsed, mapping, validContacts]);

  return (
    <ModalOverlay isOpen={isOpen} onOpenChange={onOpenChange} isDismissable={!isImporting}>
      <Modal className="max-w-3xl">
        <Dialog className="flex-col !items-stretch rounded-xl bg-primary shadow-xl ring-1 ring-black/5 dark:ring-white/10">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-secondary px-6 py-4">
            <div className="flex items-center gap-3">
              <h2 className="text-base font-semibold text-primary">Import Contacts</h2>
              <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-tertiary">
                Step {step} of 5 — {STEP_LABELS[step]}
              </span>
            </div>
            {!isImporting && (
              <button onClick={handleClose} className="text-quaternary hover:text-secondary transition-colors">
                <XClose className="h-5 w-5" />
              </button>
            )}
          </div>

          {/* Body */}
          <div className="px-6 py-5 min-h-[340px] max-h-[60vh] overflow-y-auto">
            {step === 1 && (
              <UploadStep
                parsed={parsed}
                onParsed={setParsed}
                error={uploadError}
                onError={setUploadError}
              />
            )}
            {step === 2 && parsed && (
              <MappingStep
                parsed={parsed}
                mapping={mapping}
                onMappingChange={setMapping}
                defaults={defaults}
                onDefaultsChange={setDefaults}
              />
            )}
            {step === 3 && (
              <ReviewStep
                validationResults={validationResults}
                onRemoveRow={handleRemoveRow}
                skipDuplicates={skipDuplicates}
                onSkipDuplicatesChange={setSkipDuplicates}
                updateDuplicates={updateDuplicates}
                onUpdateDuplicatesChange={setUpdateDuplicates}
              />
            )}
            {step === 4 && (
              <ProgressStep
                current={progress.current}
                total={progress.total}
                onCancel={cancel}
              />
            )}
            {step === 5 && result && (
              <ResultsStep result={result} originalRows={parsed?.rows || []} />
            )}
          </div>

          {/* Footer */}
          {step !== 4 && (
            <div className="flex items-center justify-between border-t border-secondary px-6 py-4">
              <div>
                {(step === 2 || step === 3) && (
                  <Button size="md" color="secondary" onClick={handleBack}>
                    Back
                  </Button>
                )}
              </div>
              <div>
                {step === 5 ? (
                  <Button size="md" color="primary" onClick={handleDone}>
                    View Contacts
                  </Button>
                ) : step === 3 ? (
                  <Button size="md" color="primary" onClick={handleNext} isDisabled={!canProceed}>
                    Import {validContacts.length} Contacts
                  </Button>
                ) : (
                  <Button size="md" color="primary" onClick={handleNext} isDisabled={!canProceed}>
                    Next
                  </Button>
                )}
              </div>
            </div>
          )}
        </Dialog>
      </Modal>
    </ModalOverlay>
  );
}
