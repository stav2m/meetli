export type WhatsAppLocale = 'en' | 'he';

const HEBREW_LETTER = /[\u0590-\u05FF]/;

export function detectLocaleFromText(text: string): WhatsAppLocale {
  const trimmed = text.trim();

  if (!trimmed) {
    return 'en';
  }

  return HEBREW_LETTER.test(trimmed) ? 'he' : 'en';
}

export function resolveLocale(
  stored: WhatsAppLocale | undefined,
  text?: string,
): WhatsAppLocale {
  if (text?.trim()) {
    return detectLocaleFromText(text);
  }

  return stored ?? 'en';
}
