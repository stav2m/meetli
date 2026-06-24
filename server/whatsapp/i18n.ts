import en from '../../src/i18n/locales/en.json';
import he from '../../src/i18n/locales/he.json';
import type { WhatsAppLocale } from './detectLocale';

type TranslationValue = string | { [key: string]: TranslationValue };
type TranslationTree = { [key: string]: TranslationValue };

const RESOURCES: Record<WhatsAppLocale, TranslationTree> = {
  en: en as TranslationTree,
  he: he as TranslationTree,
};

const ERROR_KEY_MAP: Record<string, string> = {
  'Something went wrong. Please try again.': 'errors.generic',
  'Sign in with Google to create calendar events.': 'errors.signInRequired',
  'Missing or invalid "message" field.': 'errors.invalidMessage',
  'Failed to create calendar event.': 'errors.createFailed',
  'Google Calendar login is not configured.': 'errors.authNotConfigured',
  'Could not sign out.': 'errors.signOutFailed',
  'Could not determine a valid event date. Please include when the event should happen.':
    'errors.invalidDate',
  'Could not determine a valid event time. Please include when the event should happen.':
    'errors.invalidTime',
  'Unable to parse event details. Please try rephrasing your request.':
    'errors.parseFailed',
  'OpenAI API key is not configured.': 'errors.openAiNotConfigured',
  'Google Calendar did not return event details.': 'errors.googleNoEventDetails',
};

function lookup(tree: TranslationTree, key: string): string | undefined {
  const parts = key.split('.');
  let current: TranslationValue | undefined = tree;

  for (const part of parts) {
    if (!current || typeof current === 'string') {
      return undefined;
    }

    current = current[part];
  }

  return typeof current === 'string' ? current : undefined;
}

function interpolate(
  template: string,
  vars?: Record<string, string | number>,
): string {
  if (!vars) {
    return template;
  }

  return template.replace(/\{\{(\w+)\}\}/g, (_, name: string) =>
    String(vars[name] ?? `{{${name}}}`),
  );
}

export function createWhatsAppTranslator(locale: WhatsAppLocale) {
  const tree = RESOURCES[locale];

  return function t(
    key: string,
    vars?: Record<string, string | number>,
  ): string {
    const value = lookup(tree, key);
    return interpolate(value ?? key, vars);
  };
}

export function translateWhatsAppError(
  message: string,
  locale: WhatsAppLocale,
): string {
  const key = ERROR_KEY_MAP[message];

  if (!key) {
    return message;
  }

  return createWhatsAppTranslator(locale)(key);
}

export function toIntlLocale(locale: WhatsAppLocale): string {
  return locale === 'he' ? 'he-IL' : 'en-US';
}
