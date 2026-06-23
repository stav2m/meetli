import AccessTimeIcon from '@mui/icons-material/AccessTime';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import GoogleIcon from '@mui/icons-material/Google';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import TitleIcon from '@mui/icons-material/Title';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Divider,
  Link,
  Stack,
  Typography,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { createCalendarEvent } from '../services/createCalendarEvent';
import { signInWithGoogle } from '../services/auth';
import type { AssistantEventMessage, ChatMessage } from '../types/chat';
import { formatCalendar, formatDate, formatDuration, formatTime } from '../utils/formatEvent';
import { translateError } from '../utils/translateError';

interface EventBubbleProps {
  message: AssistantEventMessage;
  authenticated: boolean;
  onUpdateMessage: (id: string, update: Partial<ChatMessage>) => void;
}

interface DetailRowProps {
  icon: React.ReactNode;
  label: string;
  value: string;
}

function DetailRow({ icon, label, value }: DetailRowProps) {
  return (
    <Stack direction="row" spacing={1.5} sx={{ alignItems: 'flex-start' }}>
      <Box sx={{ color: 'primary.main', display: 'flex', mt: 0.25 }}>{icon}</Box>
      <Box>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
          {label}
        </Typography>
        <Typography variant="body2" sx={{ fontWeight: 500 }}>
          {value}
        </Typography>
      </Box>
    </Stack>
  );
}

export default function EventBubble({
  message,
  authenticated,
  onUpdateMessage,
}: EventBubbleProps) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language.startsWith('he') ? 'he-IL' : 'en-US';
  const { event, createdLink, creating, createError } = message;
  const calendarLabel = formatCalendar(event.calendar, t);

  const handleCreateInCalendar = async () => {
    onUpdateMessage(message.id, { creating: true, createError: null });

    try {
      const created = await createCalendarEvent(event);
      onUpdateMessage(message.id, {
        creating: false,
        createdLink: created.htmlLink,
        createError: null,
      });
    } catch (err) {
      const rawMessage = err instanceof Error ? err.message : t('errors.generic');

      onUpdateMessage(message.id, {
        creating: false,
        createError: translateError(rawMessage, t),
      });
    }
  };

  return (
    <Stack spacing={1.5}>
      <Typography variant="body2" color="text.secondary">
        {t('event.understood')}
      </Typography>

      <Stack spacing={1.25}>
        <DetailRow
          icon={<TitleIcon sx={{ fontSize: 16 }} />}
          label={t('event.title')}
          value={event.title}
        />
        <DetailRow
          icon={<CalendarMonthIcon sx={{ fontSize: 16 }} />}
          label={t('event.calendar')}
          value={calendarLabel}
        />
        <DetailRow
          icon={<CalendarTodayIcon sx={{ fontSize: 16 }} />}
          label={t('event.date')}
          value={formatDate(event.date, locale)}
        />
        <DetailRow
          icon={<AccessTimeIcon sx={{ fontSize: 16 }} />}
          label={t('event.time')}
          value={formatTime(event.time, locale)}
        />
        <DetailRow
          icon={<HourglassEmptyIcon sx={{ fontSize: 16 }} />}
          label={t('event.duration')}
          value={formatDuration(event.duration, t)}
        />
      </Stack>

      <Divider />

      {createdLink ? (
        <Alert
          severity="success"
          icon={<EventAvailableIcon fontSize="small" />}
          sx={{
            py: 0.5,
            border: 'none',
            bgcolor: 'rgba(24, 128, 56, 0.08)',
            color: 'success.dark',
            '& .MuiAlert-icon': { color: 'success.main' },
          }}
        >
          {t('event.addedTo', { calendar: calendarLabel })}{' '}
          <Link
            href={createdLink}
            target="_blank"
            rel="noopener noreferrer"
            sx={{ fontWeight: 600 }}
          >
            {t('event.viewEvent')}
          </Link>
        </Alert>
      ) : (
        <>
          {createError && (
            <Alert severity="error" sx={{ py: 0.5 }}>
              {createError}
            </Alert>
          )}

          {authenticated ? (
            <Button
              variant="contained"
              size="small"
              fullWidth
              disabled={creating}
              startIcon={
                creating ? (
                  <CircularProgress size={18} color="inherit" />
                ) : (
                  <EventAvailableIcon />
                )
              }
              onClick={handleCreateInCalendar}
            >
              {creating ? t('event.adding') : t('event.addTo', { calendar: calendarLabel })}
            </Button>
          ) : (
            <Button
              variant="contained"
              size="small"
              fullWidth
              startIcon={<GoogleIcon />}
              onClick={() => signInWithGoogle(event)}
            >
              {t('event.signInToAdd')}
            </Button>
          )}
        </>
      )}

      {createdLink && (
        <Button
          variant="outlined"
          size="small"
          fullWidth
          endIcon={<OpenInNewIcon />}
          href={createdLink}
          target="_blank"
          rel="noopener noreferrer"
        >
          {t('event.openInGoogle')}
        </Button>
      )}

      <Typography variant="caption" color="text.disabled">
        {t('event.notRight')}
      </Typography>
    </Stack>
  );
}
