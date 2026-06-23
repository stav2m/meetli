import SendIcon from '@mui/icons-material/Send';
import SmartToyOutlinedIcon from '@mui/icons-material/SmartToyOutlined';
import {
  Alert,
  Box,
  CircularProgress,
  IconButton,
  InputAdornment,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { type FormEvent, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ChatMessage } from '../types/chat';
import EventBubble from './EventBubble';

interface EventChatProps {
  messages: ChatMessage[];
  loading: boolean;
  authenticated: boolean;
  onSend: (message: string) => void;
  onUpdateMessage: (id: string, update: Partial<ChatMessage>) => void;
}

function UserBubble({ content }: { content: string }) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
      <Paper
        elevation={0}
        sx={{
          px: 2,
          py: 1.25,
          maxWidth: '85%',
          bgcolor: 'primary.main',
          color: 'primary.contrastText',
          borderRadius: '18px 18px 4px 18px',
        }}
      >
        <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
          {content}
        </Typography>
      </Paper>
    </Box>
  );
}

function AssistantBubble({ children }: { children: React.ReactNode }) {
  return (
    <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
      <Box
        sx={{
          width: 32,
          height: 32,
          borderRadius: '50%',
          bgcolor: 'rgba(26, 115, 232, 0.1)',
          color: 'primary.main',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          mt: 0.25,
        }}
      >
        <SmartToyOutlinedIcon sx={{ fontSize: 18 }} />
      </Box>
      <Paper
        elevation={0}
        sx={{
          px: 2,
          py: 1.25,
          maxWidth: '85%',
          bgcolor: 'grey.100',
          borderRadius: '4px 18px 18px 18px',
        }}
      >
        {children}
      </Paper>
    </Box>
  );
}

function WelcomeState() {
  const { t } = useTranslation();

  return (
    <Box sx={{ textAlign: 'center', py: 5, px: 2 }}>
      <Typography variant="body1" color="text.secondary" gutterBottom>
        {t('chat.welcome')}
      </Typography>
      <Typography variant="body2" color="text.disabled">
        {t('chat.example')}
      </Typography>
      <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mt: 2 }}>
        {t('chat.followUp')}
      </Typography>
    </Box>
  );
}

function TypingIndicator() {
  const { t } = useTranslation();

  return (
    <AssistantBubble>
      <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', py: 0.5 }}>
        <CircularProgress size={16} />
        <Typography variant="body2" color="text.secondary">
          {t('chat.understanding')}
        </Typography>
      </Stack>
    </AssistantBubble>
  );
}

export default function EventChat({
  messages,
  loading,
  authenticated,
  onSend,
  onUpdateMessage,
}: EventChatProps) {
  const { t } = useTranslation();
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const isEmpty = input.trim().length === 0;

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [messages, loading]);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = input.trim();

    if (!trimmed || loading) {
      return;
    }

    onSend(trimmed);
    setInput('');
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
        overflow: 'hidden',
        bgcolor: 'background.paper',
      }}
    >
      <Box
        ref={scrollRef}
        sx={{
          flex: 1,
          minHeight: 320,
          maxHeight: { xs: 360, sm: 420 },
          overflowY: 'auto',
          px: 2,
          py: 2,
          bgcolor: 'rgba(248, 249, 251, 0.6)',
        }}
      >
        {messages.length === 0 && !loading && <WelcomeState />}

        <Stack spacing={2}>
          {messages.map((message) => {
            if (message.role === 'user') {
              return <UserBubble key={message.id} content={message.content} />;
            }

            if (message.kind === 'error') {
              return (
                <AssistantBubble key={message.id}>
                  <Alert severity="error" sx={{ border: 'none', bgcolor: 'transparent', p: 0 }}>
                    {message.content}
                  </Alert>
                </AssistantBubble>
              );
            }

            return (
              <AssistantBubble key={message.id}>
                <EventBubble
                  message={message}
                  authenticated={authenticated}
                  onUpdateMessage={onUpdateMessage}
                />
              </AssistantBubble>
            );
          })}

          {loading && <TypingIndicator />}
        </Stack>
      </Box>

      <Box
        component="form"
        onSubmit={handleSubmit}
        sx={{
          px: 1.5,
          py: 1.5,
          borderTop: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
        }}
      >
        <TextField
          fullWidth
          multiline
          maxRows={4}
          size="small"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder={
            messages.length > 0 ? t('chat.placeholderFollowUp') : t('chat.placeholderEmpty')
          }
          disabled={loading}
          aria-label={t('chat.eventMessage')}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              handleSubmit(event);
            }
          }}
          slotProps={{
            input: {
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    type="submit"
                    color="primary"
                    disabled={isEmpty || loading}
                    aria-label={t('chat.sendMessage')}
                  >
                    {loading ? <CircularProgress size={22} /> : <SendIcon />}
                  </IconButton>
                </InputAdornment>
              ),
              sx: {
                borderRadius: 3,
                bgcolor: 'grey.50',
                '&.Mui-focused': {
                  bgcolor: 'background.paper',
                },
              },
            },
          }}
        />
      </Box>
    </Box>
  );
}
