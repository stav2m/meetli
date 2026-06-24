import type { ParsedEvent } from '../parseEvent';
import type { WhatsAppLocale } from './detectLocale';
import { createWhatsAppTranslator, toIntlLocale } from './i18n';

function formatDuration(
  minutes: number,
  locale: WhatsAppLocale,
): string {
  const t = createWhatsAppTranslator(locale);

  if (minutes < 60) {
    return t('duration.minutes', { count: minutes });
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (remainingMinutes === 0) {
    return hours === 1
      ? t('duration.oneHour')
      : t('duration.hours', { count: hours });
  }

  return t('duration.hoursMinutes', {
    hours,
    minutes: remainingMinutes,
  });
}

export function formatEventSummary(
  event: ParsedEvent,
  locale: WhatsAppLocale,
): string {
  const t = createWhatsAppTranslator(locale);
  const intlLocale = toIntlLocale(locale);
  const parsedDate = new Date(`${event.date}T00:00:00`);
  const [hours, minutes] = event.time.split(':').map(Number);
  const timeValue = new Date();
  timeValue.setHours(hours, minutes, 0, 0);

  return [
    t('event.understood'),
    '',
    `📌 ${event.title}`,
    `📅 ${t(`calendar.${event.calendar}`)}`,
    `🗓 ${parsedDate.toLocaleDateString(intlLocale, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })}`,
    `🕐 ${timeValue.toLocaleTimeString(intlLocale, {
      hour: 'numeric',
      minute: '2-digit',
    })}`,
    `⏱ ${formatDuration(event.duration, locale)}`,
    '',
    t('whatsapp.eventFollowUp'),
  ].join('\n');
}
