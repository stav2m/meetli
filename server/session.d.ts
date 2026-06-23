import type { GoogleTokens } from './googleAuth';

declare module 'express-session' {
  interface SessionData {
    googleTokens?: GoogleTokens;
    familyCalendarId?: string;
  }
}
