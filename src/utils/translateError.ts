import type { TFunction } from 'i18next';

const ERROR_KEY_MAP: Record<string, string> = {
  'Something went wrong. Please try again.': 'errors.generic',
  'Sign in with Google to create calendar events.': 'errors.signInRequired',
  'Missing or invalid "message" field.': 'errors.invalidMessage',
  'Failed to create calendar event.': 'errors.createFailed',
  'Google Calendar login is not configured.': 'errors.authNotConfigured',
  'Could not sign out.': 'errors.signOutFailed',
};

export function translateError(message: string, t: TFunction): string {
  const key = ERROR_KEY_MAP[message];

  if (key) {
    return t(key);
  }

  return message;
}
