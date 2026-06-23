export type CalendarTarget = 'personal' | 'family';

export interface CalendarEvent {
  title: string;
  date: string;
  time: string;
  duration: number;
  calendar: CalendarTarget;
  timeZone?: string;
}

export type EventFormStatus = 'idle' | 'loading' | 'success' | 'error';
