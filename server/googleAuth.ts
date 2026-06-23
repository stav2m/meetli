import { google } from 'googleapis';
import type { Credentials } from 'google-auth-library';

export const CALENDAR_SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/calendar.calendarlist.readonly',
];
export const TIMEZONE = 'Asia/Jerusalem';

export interface GoogleTokens {
  access_token: string;
  refresh_token?: string;
  expiry_date?: number;
}

function requireEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is not configured.`);
  }

  return value;
}

export function createOAuth2Client() {
  return new google.auth.OAuth2(
    requireEnv('GOOGLE_CLIENT_ID'),
    requireEnv('GOOGLE_CLIENT_SECRET'),
    requireEnv('GOOGLE_REDIRECT_URI'),
  );
}

export function getGoogleAuthUrl(): string {
  const oauth2Client = createOAuth2Client();

  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: CALENDAR_SCOPES,
    prompt: 'consent',
  });
}

export async function exchangeCodeForTokens(
  code: string,
): Promise<GoogleTokens> {
  const oauth2Client = createOAuth2Client();
  const { tokens } = await oauth2Client.getToken(code);

  if (!tokens.access_token) {
    throw new Error('Google did not return an access token.');
  }

  return {
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token ?? undefined,
    expiry_date: tokens.expiry_date ?? undefined,
  };
}

export function getAuthenticatedClient(tokens: GoogleTokens) {
  const oauth2Client = createOAuth2Client();
  oauth2Client.setCredentials(tokens as Credentials);
  return oauth2Client;
}
