/**
 * Date Utilities
 * Common date manipulation functions
 */

import { format, formatDistance, parseISO, isValid, addDays, addWeeks, addMonths, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isBefore, isAfter, isSameDay } from 'date-fns';

export function formatDate(date: Date | string, formatStr: string = 'MMM d, yyyy'): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return isValid(d) ? format(d, formatStr) : '';
}

export function formatDateTime(date: Date | string): string {
  return formatDate(date, 'MMM d, yyyy h:mm a');
}

export function formatTime(date: Date | string): string {
  return formatDate(date, 'h:mm a');
}

export function formatRelative(date: Date | string): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return isValid(d) ? formatDistance(d, new Date(), { addSuffix: true }) : '';
}

export function isValidDate(date: unknown): date is Date {
  return date instanceof Date && isValid(date);
}

export function parseDate(dateString: string): Date | null {
  const parsed = parseISO(dateString);
  return isValid(parsed) ? parsed : null;
}

export { addDays, addWeeks, addMonths, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isBefore, isAfter, isSameDay };
