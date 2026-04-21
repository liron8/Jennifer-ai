/**
 * Validation Utilities
 * Common validation functions
 */

export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

export function isNonEmptyArray<T>(value: unknown): value is T[] {
  return Array.isArray(value) && value.length > 0;
}

export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isUUID(value: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
}

export function isPhoneNumber(value: string): boolean {
  const phoneRegex = /^\+?[\d\s\-()]{10,}$/;
  return phoneRegex.test(value);
}

export function required<T>(value: T | null | undefined, message: string = 'Value is required'): T {
  if (value === null || value === undefined) {
    throw new Error(message);
  }
  return value;
}

export function assertNever(value: never, message?: string): never {
  throw new Error(message || `Unexpected value: ${value}`);
}
