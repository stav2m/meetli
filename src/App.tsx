import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import {
  Box,
  Card,
  CardContent,
  Container,
  CssBaseline,
  ThemeProvider,
  Typography,
} from '@mui/material';
import { useCallback, useEffect, useState } from 'react';
import EventChat from './components/EventChat';
import GoogleAuthButton from './components/GoogleAuthButton';
import { getAuthStatus, consumePendingEvent } from './services/auth';
import { extractEventFromText } from './services/extractEvent';
import { theme } from './theme';
import type {
  AssistantEventMessage,
  ChatHistoryEntry,
  ChatMessage,
} from './types/chat';
import { formatCalendar, formatDate, formatDuration, formatTime } from './utils/formatEvent';

function createId() {
  return crypto.randomUUID();
}

function getLatestEvent(messages: ChatMessage[]) {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];

    if (message.role === 'assistant' && message.kind === 'event') {
      return message.event;
    }
  }

  return null;
}

function formatEventForHistory(event: AssistantEventMessage['event']): string {
  return [
    `Title: ${event.title}`,
    `Calendar: ${formatCalendar(event.calendar)}`,
    `Date: ${formatDate(event.date)}`,
    `Time: ${formatTime(event.time)}`,
    `Duration: ${formatDuration(event.duration)}`,
  ].join('\n');
}

function buildHistory(messages: ChatMessage[]): ChatHistoryEntry[] {
  const history: ChatHistoryEntry[] = [];

  for (const message of messages) {
    if (message.role === 'user') {
      history.push({ role: 'user', content: message.content });
      continue;
    }

    if (message.kind === 'error') {
      history.push({ role: 'assistant', content: message.content });
      continue;
    }

    history.push({
      role: 'assistant',
      content: formatEventForHistory(message.event),
    });
  }

  return history;
}

export default function App() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);

  const refreshAuthStatus = useCallback(async () => {
    setAuthLoading(true);

    try {
      const authStatus = await getAuthStatus();
      setAuthenticated(authStatus.authenticated);
    } catch {
      setAuthenticated(false);
    } finally {
      setAuthLoading(false);
    }
  }, []);

  useEffect(() => {
    const restorePendingEvent = () => {
      const pendingEvent = consumePendingEvent();

      if (pendingEvent) {
        setMessages([
          {
            id: createId(),
            role: 'assistant',
            kind: 'event',
            event: pendingEvent,
          },
        ]);
      }
    };

    void refreshAuthStatus().then(restorePendingEvent);

    const params = new URLSearchParams(window.location.search);
    const authResult = params.get('auth');

    if (authResult) {
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [refreshAuthStatus]);

  const handleUpdateMessage = useCallback(
    (id: string, update: Partial<ChatMessage>) => {
      setMessages((current) =>
        current.map((message) =>
          message.id === id ? ({ ...message, ...update } as ChatMessage) : message,
        ),
      );
    },
    [],
  );

  const handleSend = useCallback(
    async (text: string) => {
      const userMessage: ChatMessage = {
        id: createId(),
        role: 'user',
        content: text,
      };

      setMessages((current) => [...current, userMessage]);
      setLoading(true);

      try {
        const previousEvent = getLatestEvent(messages);
        const extracted = await extractEventFromText(text, {
          previousEvent,
          history: buildHistory(messages),
        });

        setMessages((current) => [
          ...current,
          {
            id: createId(),
            role: 'assistant',
            kind: 'event',
            event: extracted,
          },
        ]);
      } catch (err) {
        setMessages((current) => [
          ...current,
          {
            id: createId(),
            role: 'assistant',
            kind: 'error',
            content:
              err instanceof Error
                ? err.message
                : 'Something went wrong. Please try again.',
          },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [messages],
  );

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(160deg, #f8f9fb 0%, #e8f0fe 100%)',
          py: { xs: 3, sm: 4 },
          px: 2,
        }}
      >
        <Container maxWidth="sm">
          <Card
            elevation={0}
            sx={{
              borderRadius: 3,
              overflow: 'visible',
              transition: 'transform 0.3s ease, box-shadow 0.3s ease',
            }}
          >
            <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
              <Box
                sx={{
                  textAlign: 'center',
                  mb: 3,
                }}
              >
                <Box
                  sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 56,
                    height: 56,
                    borderRadius: '50%',
                    bgcolor: 'primary.main',
                    color: 'primary.contrastText',
                    mb: 2,
                    boxShadow: '0 4px 14px rgba(26, 115, 232, 0.4)',
                  }}
                >
                  <CalendarMonthIcon sx={{ fontSize: 32 }} />
                </Box>

                <Typography variant="h4" component="h1" gutterBottom>
                  Meetli
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  Create calendar events using natural language.
                </Typography>

                <Box sx={{ mt: 2 }}>
                  <GoogleAuthButton
                    authenticated={authenticated}
                    loading={authLoading}
                    onAuthChange={refreshAuthStatus}
                  />
                </Box>
              </Box>

              <EventChat
                messages={messages}
                loading={loading}
                authenticated={authenticated}
                onSend={handleSend}
                onUpdateMessage={handleUpdateMessage}
              />
            </CardContent>
          </Card>
        </Container>
      </Box>
    </ThemeProvider>
  );
}
