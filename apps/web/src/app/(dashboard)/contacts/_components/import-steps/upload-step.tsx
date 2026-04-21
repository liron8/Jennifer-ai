"use client";

import { FileUploadDropZone } from "@/components/application/file-upload/file-upload-base";
import { CheckCircle, File06 } from "@untitledui/icons";
import type { CsvParseResult } from "../import-contacts-utils";
import { parseCsvFile } from "../import-contacts-utils";

interface UploadStepProps {
  parsed: CsvParseResult | null;
  onParsed: (result: CsvParseResult) => void;
  error: string | null;
  onError: (error: string | null) => void;
}

export function UploadStep({ parsed, onParsed, error, onError }: UploadStepProps) {
  const handleFiles = async (files: FileList) => {
    onError(null);
    const file = files[0];
    if (!file) return;

    try {
      const result = await parseCsvFile(file);
      if (result.rowCount === 0) {
        onError("The CSV file is empty or has no data rows.");
        return;
      }
      if (result.headers.length === 0) {
        onError("Could not detect any column headers in the file.");
        return;
      }
      onParsed(result);
    } catch (err) {
      onError(`Failed to parse file: ${(err as Error).message}`);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-primary">Upload CSV File</h3>
        <p className="mt-1 text-sm text-tertiary">
          Upload a CSV or TSV file exported from your previous contact management tool.
          We&apos;ll auto-detect your columns and let you map them in the next step.
        </p>
      </div>

      <FileUploadDropZone
        accept=".csv,.tsv,text/csv,text/tab-separated-values"
        allowsMultiple={false}
        maxSize={5 * 1024 * 1024}
        hint="CSV or TSV file (max 5 MB)"
        onDropFiles={handleFiles}
        onSizeLimitExceed={() => onError("File is too large. Maximum size is 5 MB.")}
        onDropUnacceptedFiles={() => onError("Only CSV and TSV files are accepted.")}
      />

      {error && (
        <div className="rounded-lg border border-error-secondary bg-error-primary/5 px-4 py-3 text-sm text-error-primary">
          {error}
        </div>
      )}

      {parsed && (
        <div className="flex items-center gap-3 rounded-lg border border-secondary bg-primary px-4 py-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success-secondary">
            <CheckCircle className="h-5 w-5 text-success-primary" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-primary">File parsed successfully</p>
            <p className="text-xs text-tertiary">
              Found <span className="font-semibold">{parsed.rowCount}</span> contacts with{" "}
              <span className="font-semibold">{parsed.headers.length}</span> columns
            </p>
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="rounded-lg border border-secondary bg-secondary/30 px-4 py-3.5">
        <p className="text-xs font-semibold text-secondary mb-2">What to know before uploading</p>
        <ul className="space-y-1.5 text-xs text-tertiary">
          <li className="flex gap-2">
            <span className="mt-0.5 text-brand-500">&#x2022;</span>
            <span><span className="font-medium text-secondary">Required fields:</span> Full Name and Email. All other fields are optional.</span>
          </li>
          <li className="flex gap-2">
            <span className="mt-0.5 text-brand-500">&#x2022;</span>
            <span><span className="font-medium text-secondary">Column names don&apos;t need to match exactly</span> — we&apos;ll auto-detect common headers and you can adjust the mapping in the next step.</span>
          </li>
          <li className="flex gap-2">
            <span className="mt-0.5 text-brand-500">&#x2022;</span>
            <span><span className="font-medium text-secondary">Supported fields:</span> Name, Email, Company, Job Title, Phone, Mobile, Category, Tags, Notes, LinkedIn, Assistant Name, Assistant Email, Address, City, State, Zip, Country.</span>
          </li>
          <li className="flex gap-2">
            <span className="mt-0.5 text-brand-500">&#x2022;</span>
            <span><span className="font-medium text-secondary">Categories:</span> VIP, Client, Vendor, Partner, Personal, Colleague, or Other. Unrecognized categories (e.g. &quot;Executive&quot;, &quot;Media&quot;) are automatically mapped to the closest match.</span>
          </li>
          <li className="flex gap-2">
            <span className="mt-0.5 text-brand-500">&#x2022;</span>
            <span><span className="font-medium text-secondary">Tags:</span> Separate multiple tags with commas (e.g. &quot;VIP, Board Member, Keynote Speaker&quot;).</span>
          </li>
          <li className="flex gap-2">
            <span className="mt-0.5 text-brand-500">&#x2022;</span>
            <span><span className="font-medium text-secondary">Duplicates:</span> Contacts with matching emails will be flagged — you can skip or update them.</span>
          </li>
          <li className="flex gap-2">
            <span className="mt-0.5 text-brand-500">&#x2022;</span>
            <span><span className="font-medium text-secondary">Limit:</span> Up to 50 contacts per import. Max file size 5 MB.</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
