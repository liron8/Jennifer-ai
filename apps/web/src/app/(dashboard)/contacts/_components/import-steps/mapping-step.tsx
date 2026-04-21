"use client";

import { useState, useEffect } from "react";
import { CheckCircle, AlertTriangle, ArrowRight } from "@untitledui/icons";
import { cx } from "@/utils/cx";
import type { CsvParseResult, ColumnMapping, MappingDefaults } from "../import-contacts-utils";
import { JENIFER_FIELDS, autoDetectMapping, getSampleValue } from "../import-contacts-utils";

interface MappingStepProps {
  parsed: CsvParseResult;
  mapping: ColumnMapping;
  onMappingChange: (mapping: ColumnMapping) => void;
  defaults: MappingDefaults;
  onDefaultsChange: (defaults: MappingDefaults) => void;
}

export function MappingStep({
  parsed,
  mapping,
  onMappingChange,
  defaults,
  onDefaultsChange,
}: MappingStepProps) {
  const [initialized, setInitialized] = useState(false);

  // Auto-detect on first render
  useEffect(() => {
    if (!initialized && Object.keys(mapping).length === 0) {
      const detected = autoDetectMapping(parsed.headers);
      onMappingChange(detected.mapping);
      setInitialized(true);
    }
  }, [initialized, mapping, parsed.headers, onMappingChange]);

  const mappedRequiredFields = new Set(
    Object.values(mapping).filter(Boolean),
  );

  const requiredFields = JENIFER_FIELDS.filter((f) => f.required);
  const missingRequired = requiredFields.filter(
    (f) =>
      !mappedRequiredFields.has(f.value) &&
      // first/last name counts as full_name
      !(f.value === "full_name" && mappedRequiredFields.has("__first_name") && mappedRequiredFields.has("__last_name")),
  );

  const handleFieldChange = (csvHeader: string, field: string) => {
    onMappingChange({ ...mapping, [csvHeader]: field || null });
  };

  // Fields already used (can't map two CSV columns to the same field)
  const usedFields = new Set(Object.values(mapping).filter((v) => v && v !== "__first_name" && v !== "__last_name"));

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-primary">Map Columns</h3>
        <p className="mt-1 text-sm text-tertiary">
          Match your CSV columns to JeniferAI contact fields. We&apos;ve auto-detected what we could.
        </p>
      </div>

      {missingRequired.length > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-warning-secondary bg-warning-primary/5 px-4 py-2.5 text-sm text-warning-primary">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          Required fields not mapped: {missingRequired.map((f) => f.label).join(", ")}
        </div>
      )}

      {/* Mapping table */}
      <div className="rounded-lg border border-secondary">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-x-3 border-b border-secondary bg-secondary/50 px-4 py-2 text-xs font-semibold text-tertiary uppercase tracking-wider">
          <span>CSV Column</span>
          <span />
          <span>JeniferAI Field</span>
        </div>

        <div className="max-h-[320px] overflow-y-auto divide-y divide-secondary">
          {parsed.headers.map((header) => {
            const fieldValue = mapping[header];
            const isMapped = fieldValue && fieldValue !== "__first_name" && fieldValue !== "__last_name";
            const isSpecial = fieldValue === "__first_name" || fieldValue === "__last_name";
            const sample = getSampleValue(parsed.rows, header);

            return (
              <div
                key={header}
                className="grid grid-cols-[1fr_auto_1fr] items-center gap-x-3 px-4 py-2.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-primary">{header}</p>
                  <p className="truncate text-xs text-quaternary">{sample}</p>
                </div>

                <ArrowRight className="h-4 w-4 text-quaternary" />

                <div className="flex items-center gap-2">
                  {isSpecial ? (
                    <div className="flex items-center gap-1.5 text-xs text-success-primary">
                      <CheckCircle className="h-3.5 w-3.5" />
                      {fieldValue === "__first_name" ? "First Name → Full Name" : "Last Name → Full Name"}
                    </div>
                  ) : (
                    <>
                      <select
                        value={fieldValue || ""}
                        onChange={(e) => handleFieldChange(header, e.target.value)}
                        className="w-full rounded-lg border border-secondary bg-primary px-3 py-1.5 text-sm text-primary focus:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-100"
                      >
                        <option value="">Skip this column</option>
                        {JENIFER_FIELDS.map((f) => (
                          <option
                            key={f.value}
                            value={f.value}
                            disabled={usedFields.has(f.value) && mapping[header] !== f.value}
                          >
                            {f.label}
                            {f.required ? " *" : ""}
                          </option>
                        ))}
                      </select>
                      {isMapped && (
                        <CheckCircle className="h-4 w-4 shrink-0 text-success-primary" />
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Defaults */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-secondary">
            Default Category
          </label>
          <select
            value={defaults.category}
            onChange={(e) => onDefaultsChange({ ...defaults, category: e.target.value })}
            className="w-full rounded-lg border border-secondary bg-primary px-3 py-2 text-sm text-primary focus:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-100"
          >
            <option value="client">Client</option>
            <option value="vip">VIP</option>
            <option value="vendor">Vendor</option>
            <option value="partner">Partner</option>
            <option value="personal">Personal</option>
            <option value="colleague">Colleague</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-secondary">
            Default Company
          </label>
          <input
            type="text"
            value={defaults.company}
            onChange={(e) => onDefaultsChange({ ...defaults, company: e.target.value })}
            placeholder="Unknown"
            className="w-full rounded-lg border border-secondary bg-primary px-3 py-2 text-sm text-primary placeholder:text-quaternary focus:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-100"
          />
        </div>
      </div>
    </div>
  );
}
