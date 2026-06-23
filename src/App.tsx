import createCache from '@emotion/cache';
import { CacheProvider } from '@emotion/react';
import {
  Box,
  Card,
  CardContent,
  Container,
  CssBaseline,
  ThemeProvider,
  Typography,
} from '@mui/material';
import { prefixer } from 'stylis';
import rtlPlugin from 'stylis-plugin-rtl';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import EventChat from './components/EventChat';
import GoogleAuthButton from './components/GoogleAuthButton';
import LanguageSelector from './components/LanguageSelector';
import { getAuthStatus, consumePendingEvent } from './services/auth';
import { extractEventFromText } from './services/extractEvent';
import { createAppTheme } from './theme';
import type {
  AssistantEventMessage,
  ChatHistoryEntry,
  ChatMessage,
} from './types/chat';
import { formatCalendar, formatDate, formatDuration, formatTime } from './utils/formatEvent';
import { translateError } from './utils/translateError';

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

function createEmotionCache(direction: 'ltr' | 'rtl') {
  return createCache({
    key: direction === 'rtl' ? 'muirtl' : 'muiltr',
    stylisPlugins: direction === 'rtl' ? [prefixer, rtlPlugin] : [prefixer],
  });
}

export default function App() {
  const { t, i18n } = useTranslation();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);

  const direction = i18n.language.startsWith('he') ? 'rtl' : 'ltr';
  const locale = i18n.language.startsWith('he') ? 'he-IL' : 'en-US';

  const theme = useMemo(() => createAppTheme(direction), [direction]);
  const cache = useMemo(() => createEmotionCache(direction), [direction]);

  const formatEventForHistory = useCallback(
    (event: AssistantEventMessage['event']): string => {
      return [
        `${t('history.title')}: ${event.title}`,
        `${t('history.calendar')}: ${formatCalendar(event.calendar, t)}`,
        `${t('history.date')}: ${formatDate(event.date, locale)}`,
        `${t('history.time')}: ${formatTime(event.time, locale)}`,
        `${t('history.duration')}: ${formatDuration(event.duration, t)}`,
      ].join('\n');
    },
    [t, locale],
  );

  const buildHistory = useCallback(
    (currentMessages: ChatMessage[]): ChatHistoryEntry[] => {
      const history: ChatHistoryEntry[] = [];

      for (const message of currentMessages) {
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
    },
    [formatEventForHistory],
  );

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
        const rawMessage =
          err instanceof Error ? err.message : t('errors.generic');

        setMessages((current) => [
          ...current,
          {
            id: createId(),
            role: 'assistant',
            kind: 'error',
            content: translateError(rawMessage, t),
          },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [messages, buildHistory, t],
  );

  return (
    <CacheProvider value={cache}>
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
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
              <LanguageSelector />
            </Box>

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
                    component="img"
                    src="/meetli-logo-header.png"
                    alt={t('app.title')}
                    sx={{
                      display: 'block',
                      mx: 'auto',
                      mb: 2,
                      width: '100%',
                      maxWidth: 280,
                      height: 'auto',
                    }}
                  />
                  <Typography variant="body1" color="text.secondary">
                    {t('app.subtitle')}
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
    </CacheProvider>
  );
}
