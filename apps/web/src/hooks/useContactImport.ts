/**
 * useContactImport Hook
 * Manages CSV contact import lifecycle: duplicate checking, batched import, progress tracking
 */

import { useState, useRef, useCallback } from 'react';
import type { MappedContact, ImportResult } from '@/app/(dashboard)/contacts/_components/import-contacts-utils';

const BATCH_SIZE = 50;

export function useContactImport() {
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [result, setResult] = useState<ImportResult | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const checkDuplicates = useCallback(async (emails: string[]): Promise<Set<string>> => {
    try {
      const res = await fetch('/api/contacts/check-duplicates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emails }),
      });

      if (!res.ok) return new Set();

      const json = await res.json();
      return new Set<string>(
        (json.data?.existing_emails || []).map((e: string) => e.toLowerCase()),
      );
    } catch {
      return new Set();
    }
  }, []);

  const importContacts = useCallback(
    async (
      contacts: MappedContact[],
      options: { skipDuplicates: boolean; updateDuplicates: boolean },
    ): Promise<ImportResult> => {
      setIsImporting(true);
      setResult(null);
      abortRef.current = new AbortController();

      const totalBatches = Math.ceil(contacts.length / BATCH_SIZE);
      setProgress({ current: 0, total: contacts.length });

      const aggregated: ImportResult = {
        total: contacts.length,
        created: 0,
        updated: 0,
        skipped: 0,
        failed: 0,
        errors: [],
      };

      try {
        for (let i = 0; i < totalBatches; i++) {
          if (abortRef.current.signal.aborted) break;

          const batch = contacts.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE);

          const res = await fetch('/api/contacts/import', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contacts: batch,
              skip_duplicates: options.skipDuplicates,
              update_duplicates: options.updateDuplicates,
            }),
            signal: abortRef.current.signal,
          });

          if (!res.ok) {
            // Entire batch failed
            aggregated.failed += batch.length;
            aggregated.errors.push({
              rowIndex: i * BATCH_SIZE,
              message: `Batch ${i + 1} failed: ${res.statusText}`,
            });
          } else {
            const json = await res.json();
            const batchResult = json.data;
            aggregated.created += batchResult.created || 0;
            aggregated.updated += batchResult.updated || 0;
            aggregated.skipped += batchResult.skipped || 0;
            aggregated.failed += batchResult.failed || 0;
            if (batchResult.errors) {
              // Offset row indices by batch position
              for (const e of batchResult.errors) {
                aggregated.errors.push({
                  rowIndex: e.rowIndex >= 0 ? e.rowIndex + i * BATCH_SIZE : e.rowIndex,
                  message: e.message,
                });
              }
            }
          }

          setProgress({ current: Math.min((i + 1) * BATCH_SIZE, contacts.length), total: contacts.length });
        }
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          aggregated.failed += contacts.length - aggregated.created - aggregated.updated - aggregated.skipped - aggregated.failed;
          aggregated.errors.push({ rowIndex: -1, message: (err as Error).message });
        }
      }

      setResult(aggregated);
      setIsImporting(false);
      return aggregated;
    },
    [],
  );

  const cancel = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const reset = useCallback(() => {
    setResult(null);
    setProgress({ current: 0, total: 0 });
    setIsImporting(false);
  }, []);

  return {
    importContacts,
    checkDuplicates,
    cancel,
    reset,
    isImporting,
    progress,
    result,
  };
}
