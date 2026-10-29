/**
 * Single-responsibility date & time formatting utilities.
 */

export function toDate(dateInput: string | Date): Date {
  return typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
}

/**
 * Returns ISO date string key in YYYY-MM-DD format (UTC based on ISO split).
 */
export function getIsoDateKey(dateInput: string | Date): string {
  const d = toDate(dateInput);
  return d.toISOString().split('T')[0];
}

/**
 * Formats full date with weekday, e.g. "Wednesday, Dec 10"
 */
export function formatDateWithWeekday(dateInput: string | Date): string {
  const d = toDate(dateInput);
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Formats short month and day, e.g. "Dec 10"
 */
export function formatMonthDay(dateInput: string | Date): string {
  const d = toDate(dateInput);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Formats short weekday name, e.g. "Wed"
 */
export function formatWeekdayShort(dateInput: string | Date): string {
  const d = toDate(dateInput);
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
  });
}

/**
 * Formats time only, e.g. "9:00 AM"
 */
export function formatTimeOnly(dateInput: string | Date): string {
  const d = toDate(dateInput);
  return d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

/**
 * Formats a time range, e.g. "9:00 AM – 9:30 AM"
 */
export function formatTimeRange(startInput: string | Date, endInput: string | Date): string {
  return `${formatTimeOnly(startInput)} – ${formatTimeOnly(endInput)}`;
}

/**
 * Formats full human-readable date and time, e.g. "Wed, Dec 10, 9:00 AM"
 */
export function formatFullDateTime(dateInput: string | Date): string {
  const d = toDate(dateInput);
  return d.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/**
 * Formats timestamp with full year, e.g. "Dec 10, 2026, 9:00 AM"
 */
export function formatTimestamp(dateInput: string | Date): string {
  const d = toDate(dateInput);
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}
