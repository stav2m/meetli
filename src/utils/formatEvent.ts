import type { CalendarTarget } from '../types/event';

const CALENDAR_LABELS: Record<CalendarTarget, string> = {
  personal: 'Personal calendar',
  family: 'Family calendar',
};

export function formatCalendar(calendar: CalendarTarget): string {
  return CALENDAR_LABELS[calendar];
}

export function formatDate(date: string): string {
  const parsed = new Date(`${date}T00:00:00`);

  return parsed.toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function formatTime(time: string): string {
  const [hours, minutes] = time.split(':').map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);

  return date.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} minutes`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (remainingMinutes === 0) {
    return hours === 1 ? '1 hour' : `${hours} hours`;
  }

  return `${hours}h ${remainingMinutes}m`;
}
