/**
 * CSV Contact Import Utilities
 * Parsing, column mapping, validation, and transformation for CSV imports
 */

import Papa from 'papaparse';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CsvParseResult {
  headers: string[];
  rows: Record<string, string>[];
  rowCount: number;
}

/** Maps CSV header → JeniferAI field name, or null to skip */
export type ColumnMapping = Record<string, string | null>;

export interface RowValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  rowIndex: number;
  data: Record<string, unknown>;
  errors: RowValidationError[];
  isDuplicate: boolean;
}

export interface ImportBatchResult {
  created: number;
  updated: number;
  skipped: number;
  failed: number;
  errors: { rowIndex: number; message: string }[];
}

export interface ImportResult {
  total: number;
  created: number;
  updated: number;
  skipped: number;
  failed: number;
  errors: { rowIndex: number; message: string }[];
}

// The fields available for mapping
export const JENIFER_FIELDS: { value: string; label: string; required?: boolean }[] = [
  { value: 'full_name', label: 'Full Name', required: true },
  { value: 'email', label: 'Email', required: true },
  { value: 'company', label: 'Company' },
  { value: 'title', label: 'Job Title' },
  { value: 'phone', label: 'Phone' },
  { value: 'mobile', label: 'Mobile' },
  { value: 'category', label: 'Category' },
  { value: 'tags', label: 'Tags' },
  { value: 'relationship_notes', label: 'Notes' },
  { value: 'linkedin_url', label: 'LinkedIn URL' },
  { value: 'assistant_name', label: 'Assistant Name' },
  { value: 'assistant_email', label: 'Assistant Email' },
  { value: 'address_line1', label: 'Address' },
  { value: 'city', label: 'City' },
  { value: 'state', label: 'State' },
  { value: 'postal_code', label: 'Postal Code' },
  { value: 'country', label: 'Country' },
];

// ---------------------------------------------------------------------------
// Column auto-detection aliases
// ---------------------------------------------------------------------------

const COLUMN_ALIASES: Record<string, string[]> = {
  full_name: ['name', 'full name', 'full_name', 'contact name', 'contact_name', 'display name', 'display_name'],
  first_name: ['first name', 'first_name', 'firstname', 'given name', 'given_name'],
  last_name: ['last name', 'last_name', 'lastname', 'surname', 'family name', 'family_name'],
  email: ['email', 'e-mail', 'email address', 'email_address', 'mail', 'primary email', 'work email'],
  phone: ['phone', 'phone number', 'phone_number', 'telephone', 'tel', 'work phone', 'office phone', 'business phone'],
  mobile: ['mobile', 'mobile phone', 'cell', 'cell phone', 'cellphone', 'mobile_phone', 'personal phone'],
  company: ['company', 'company name', 'company_name', 'organization', 'org', 'organisation', 'employer', 'business'],
  title: ['title', 'job title', 'job_title', 'position', 'role', 'designation', 'job role'],
  category: ['category', 'type', 'contact type', 'contact_type', 'group', 'label'],
  tags: ['tags', 'labels', 'keywords', 'groups'],
  relationship_notes: ['notes', 'relationship_notes', 'comments', 'description', 'memo', 'remark', 'remarks'],
  linkedin_url: ['linkedin', 'linkedin url', 'linkedin_url', 'linkedin profile'],
  assistant_name: ['assistant', 'assistant name', 'assistant_name', 'pa name', 'ea name'],
  assistant_email: ['assistant email', 'assistant_email', 'pa email', 'ea email'],
  address_line1: ['address', 'street', 'address line 1', 'address_line1', 'street address', 'address 1'],
  city: ['city', 'town'],
  state: ['state', 'province', 'region'],
  postal_code: ['zip', 'zip code', 'zipcode', 'postal code', 'postal_code', 'postcode'],
  country: ['country', 'nation'],
};

const CATEGORY_NORMALIZATION: Record<string, string> = {
  vip: 'vip',
  'v.i.p.': 'vip',
  important: 'vip',
  'board member': 'vip',
  'board-member': 'vip',
  client: 'client',
  customer: 'client',
  customers: 'client',
  vendor: 'vendor',
  supplier: 'vendor',
  suppliers: 'vendor',
  caterer: 'vendor',
  'event planner': 'vendor',
  'travel agent': 'vendor',
  partner: 'partner',
  partners: 'partner',
  investor: 'partner',
  personal: 'personal',
  friend: 'personal',
  family: 'personal',
  doctor: 'personal',
  accountant: 'personal',
  colleague: 'colleague',
  coworker: 'colleague',
  'co-worker': 'colleague',
  executive: 'colleague',
  'c-suite': 'colleague',
  media: 'other',
  press: 'other',
  pr: 'other',
  government: 'other',
  legal: 'other',
  counsel: 'other',
  finance: 'other',
  other: 'other',
};

const VALID_CATEGORIES = ['vip', 'client', 'vendor', 'partner', 'personal', 'colleague', 'other'];

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ---------------------------------------------------------------------------
// CSV Parsing
// ---------------------------------------------------------------------------

export function parseCsvFile(file: File): Promise<CsvParseResult> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h: string) => h.trim(),
      complete: (results) => {
        const headers = results.meta.fields || [];
        const rows = results.data as Record<string, string>[];
        resolve({ headers, rows, rowCount: rows.length });
      },
      error: (error: Error) => reject(error),
    });
  });
}

// ---------------------------------------------------------------------------
// Column auto-detection
// ---------------------------------------------------------------------------

export interface AutoDetectResult {
  mapping: ColumnMapping;
  hasFirstLastName: boolean;
  firstNameHeader: string | null;
  lastNameHeader: string | null;
}

export function autoDetectMapping(headers: string[]): AutoDetectResult {
  const mapping: ColumnMapping = {};
  const usedFields = new Set<string>();
  let firstNameHeader: string | null = null;
  let lastNameHeader: string | null = null;

  for (const header of headers) {
    const normalized = header.toLowerCase().trim().replace(/[_-]/g, ' ');

    // Check for first/last name split
    if (COLUMN_ALIASES.first_name.includes(normalized)) {
      firstNameHeader = header;
      continue;
    }
    if (COLUMN_ALIASES.last_name.includes(normalized)) {
      lastNameHeader = header;
      continue;
    }

    // Match against field aliases (skip first_name/last_name from main fields)
    let matched = false;
    for (const [field, aliases] of Object.entries(COLUMN_ALIASES)) {
      if (field === 'first_name' || field === 'last_name') continue;
      if (usedFields.has(field)) continue;

      if (aliases.includes(normalized)) {
        mapping[header] = field;
        usedFields.add(field);
        matched = true;
        break;
      }
    }

    if (!matched) {
      mapping[header] = null; // skip by default
    }
  }

  // If we found first + last name columns and no full_name was mapped
  const hasFirstLastName = !!(firstNameHeader && lastNameHeader);
  if (hasFirstLastName && !usedFields.has('full_name')) {
    // Mark these columns with special __first_name / __last_name so the mapper can concatenate
    mapping[firstNameHeader!] = '__first_name';
    mapping[lastNameHeader!] = '__last_name';
  } else {
    // If we only found one of them, skip
    if (firstNameHeader) mapping[firstNameHeader] = null;
    if (lastNameHeader) mapping[lastNameHeader] = null;
  }

  return { mapping, hasFirstLastName, firstNameHeader, lastNameHeader };
}

// ---------------------------------------------------------------------------
// Category normalization
// ---------------------------------------------------------------------------

export function normalizeCategory(value: string): string | null {
  if (!value) return null;
  const normalized = value.toLowerCase().trim();
  if (VALID_CATEGORIES.includes(normalized)) return normalized;
  return CATEGORY_NORMALIZATION[normalized] || null;
}

// ---------------------------------------------------------------------------
// Row mapping & validation
// ---------------------------------------------------------------------------

export interface MappingDefaults {
  category: string;
  company: string;
}

export interface MappedContact {
  full_name: string;
  email: string;
  company: string;
  category: string;
  title?: string;
  phone?: string;
  mobile?: string;
  tags?: string[];
  relationship_notes?: string;
  linkedin_url?: string;
  assistant_name?: string;
  assistant_email?: string;
  address_line1?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
}

export function mapRowToContact(
  row: Record<string, string>,
  mapping: ColumnMapping,
  defaults: MappingDefaults,
): MappedContact {
  const contact: Record<string, unknown> = {};

  let firstName = '';
  let lastName = '';

  for (const [csvHeader, field] of Object.entries(mapping)) {
    if (!field) continue;
    const value = (row[csvHeader] || '').trim();
    if (!value) continue;

    if (field === '__first_name') {
      firstName = value;
      continue;
    }
    if (field === '__last_name') {
      lastName = value;
      continue;
    }

    if (field === 'tags') {
      contact.tags = value.split(/[,;|]/).map(t => t.trim()).filter(Boolean).slice(0, 10);
    } else if (field === 'category') {
      contact.category = normalizeCategory(value);
    } else {
      contact[field] = value;
    }
  }

  // Concatenate first + last name if mapped
  if (firstName || lastName) {
    const fullName = `${firstName} ${lastName}`.trim();
    if (fullName && !contact.full_name) {
      contact.full_name = fullName;
    }
  }

  // Apply defaults for missing required fields
  if (!contact.company) contact.company = defaults.company || 'Unknown';
  if (!contact.category) contact.category = defaults.category || 'client';

  const mapped: MappedContact = {
    full_name: String(contact.full_name ?? ''),
    email: String(contact.email ?? ''),
    company: String(contact.company ?? 'Unknown'),
    category: String(contact.category ?? 'client'),
  };

  if (contact.title) mapped.title = String(contact.title);
  if (contact.phone) mapped.phone = String(contact.phone);
  if (contact.mobile) mapped.mobile = String(contact.mobile);
  if (Array.isArray(contact.tags)) mapped.tags = contact.tags as string[];
  if (contact.relationship_notes) mapped.relationship_notes = String(contact.relationship_notes);
  if (contact.linkedin_url) mapped.linkedin_url = String(contact.linkedin_url);
  if (contact.assistant_name) mapped.assistant_name = String(contact.assistant_name);
  if (contact.assistant_email) mapped.assistant_email = String(contact.assistant_email);
  if (contact.address_line1) mapped.address_line1 = String(contact.address_line1);
  if (contact.city) mapped.city = String(contact.city);
  if (contact.state) mapped.state = String(contact.state);
  if (contact.postal_code) mapped.postal_code = String(contact.postal_code);
  if (contact.country) mapped.country = String(contact.country);

  return mapped;
}

export function validateMappedContact(
  contact: MappedContact,
  rowIndex: number,
  existingEmails: Set<string>,
): ValidationResult {
  const errors: RowValidationError[] = [];

  if (!contact.full_name) {
    errors.push({ field: 'full_name', message: 'Name is required' });
  } else if (contact.full_name.length > 255) {
    errors.push({ field: 'full_name', message: 'Name too long (max 255 chars)' });
  }

  if (!contact.email) {
    errors.push({ field: 'email', message: 'Email is required' });
  } else if (!EMAIL_REGEX.test(contact.email)) {
    errors.push({ field: 'email', message: 'Invalid email format' });
  }

  if (!VALID_CATEGORIES.includes(contact.category)) {
    errors.push({ field: 'category', message: `Invalid category: ${contact.category}` });
  }

  if (contact.linkedin_url && !contact.linkedin_url.startsWith('http')) {
    contact.linkedin_url = `https://${contact.linkedin_url}`;
  }

  if (contact.assistant_email && !EMAIL_REGEX.test(contact.assistant_email)) {
    errors.push({ field: 'assistant_email', message: 'Invalid assistant email' });
  }

  const isDuplicate = contact.email ? existingEmails.has(contact.email.toLowerCase()) : false;

  return {
    rowIndex,
    data: contact as unknown as Record<string, unknown>,
    errors,
    isDuplicate,
  };
}

// ---------------------------------------------------------------------------
// Get a sample value for a CSV column (first non-empty value)
// ---------------------------------------------------------------------------

export function getSampleValue(rows: Record<string, string>[], header: string): string {
  for (const row of rows.slice(0, 10)) {
    const val = (row[header] || '').trim();
    if (val) return val.length > 50 ? val.slice(0, 47) + '...' : val;
  }
  return '—';
}

// ---------------------------------------------------------------------------
// Generate downloadable error report CSV
// ---------------------------------------------------------------------------

export function generateErrorCsv(
  errors: { rowIndex: number; message: string }[],
  originalRows: Record<string, string>[],
): Blob {
  const errorMap = new Map<number, string>();
  for (const e of errors) {
    const existing = errorMap.get(e.rowIndex) || '';
    errorMap.set(e.rowIndex, existing ? `${existing}; ${e.message}` : e.message);
  }

  const errorRows = Array.from(errorMap.entries()).map(([idx, msg]) => ({
    ...originalRows[idx],
    _import_error: msg,
  }));

  const csv = Papa.unparse(errorRows);
  return new Blob([csv], { type: 'text/csv;charset=utf-8;' });
}
