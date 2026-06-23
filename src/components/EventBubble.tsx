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
import { createCalendarEvent } from '../services/createCalendarEvent';
import { signInWithGoogle } from '../services/auth';
import type { AssistantEventMessage, ChatMessage } from '../types/chat';
import { formatCalendar, formatDate, formatDuration, formatTime } from '../utils/formatEvent';

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
  const { event, createdLink, creating, createError } = message;

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
      onUpdateMessage(message.id, {
        creating: false,
        createError:
          err instanceof Error ? err.message : 'Something went wrong. Please try again.',
      });
    }
  };

  return (
    <Stack spacing={1.5}>
      <Typography variant="body2" color="text.secondary">
        Here&apos;s what I understood:
      </Typography>

      <Stack spacing={1.25}>
        <DetailRow icon={<TitleIcon sx={{ fontSize: 16 }} />} label="Title" value={event.title} />
        <DetailRow
          icon={<CalendarMonthIcon sx={{ fontSize: 16 }} />}
          label="Calendar"
          value={formatCalendar(event.calendar)}
        />
        <DetailRow
          icon={<CalendarTodayIcon sx={{ fontSize: 16 }} />}
          label="Date"
          value={formatDate(event.date)}
        />
        <DetailRow
          icon={<AccessTimeIcon sx={{ fontSize: 16 }} />}
          label="Time"
          value={formatTime(event.time)}
        />
        <DetailRow
          icon={<HourglassEmptyIcon sx={{ fontSize: 16 }} />}
          label="Duration"
          value={formatDuration(event.duration)}
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
          Added to your {formatCalendar(event.calendar).toLowerCase()}.{' '}
          <Link
            href={createdLink}
            target="_blank"
            rel="noopener noreferrer"
            sx={{ fontWeight: 600 }}
          >
            View event
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
              {creating ? 'Adding…' : `Add to ${formatCalendar(event.calendar)}`}
            </Button>
          ) : (
            <Button
              variant="contained"
              size="small"
              fullWidth
              startIcon={<GoogleIcon />}
              onClick={() => signInWithGoogle(event)}
            >
              Sign in to add to calendar
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
          Open in Google Calendar
        </Button>
      )}

      <Typography variant="caption" color="text.disabled">
        Not right? Send another message to correct it.
      </Typography>
    </Stack>
  );
}
