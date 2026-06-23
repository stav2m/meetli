import type { CalendarTarget } from '../types/event';
import type { TFunction } from 'i18next';

export function formatCalendar(calendar: CalendarTarget, t: TFunction): string {
  return t(`calendar.${calendar}`);
}

export function formatDate(date: string, locale: string): string {
  const parsed = new Date(`${date}T00:00:00`);

  return parsed.toLocaleDateString(locale, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function formatTime(time: string, locale: string): string {
  const [hours, minutes] = time.split(':').map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);

  return date.toLocaleTimeString(locale, {
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatDuration(minutes: number, t: TFunction): string {
  if (minutes < 60) {
    return t('duration.minutes', { count: minutes });
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (remainingMinutes === 0) {
    return hours === 1 ? t('duration.oneHour') : t('duration.hours', { count: hours });
  }

  return t('duration.hoursMinutes', { hours, minutes: remainingMinutes });
}
