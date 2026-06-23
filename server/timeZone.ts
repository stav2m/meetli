export const DEFAULT_TIMEZONE = 'Asia/Jerusalem';

export function getNowInTimezone(timeZone: string = DEFAULT_TIMEZONE): Date {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(new Date());
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? '00';

  return new Date(
    `${value('year')}-${value('month')}-${value('day')}T${value('hour')}:${value('minute')}:${value('second')}`,
  );
}

export function formatDateInTimezone(
  date: Date,
  timeZone: string = DEFAULT_TIMEZONE,
): string {
  return date.toLocaleDateString('sv-SE', { timeZone });
}

export function formatTimeInTimezone(
  date: Date,
  timeZone: string = DEFAULT_TIMEZONE,
): string {
  return date.toLocaleTimeString('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export function isValidTimeZone(timeZone: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone });
    return true;
  } catch {
    return false;
  }
}

export function resolveTimeZone(timeZone?: string): string {
  if (timeZone && isValidTimeZone(timeZone)) {
    return timeZone;
  }

  return DEFAULT_TIMEZONE;
}
