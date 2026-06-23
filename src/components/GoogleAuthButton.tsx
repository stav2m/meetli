import GoogleIcon from '@mui/icons-material/Google';
import LogoutIcon from '@mui/icons-material/Logout';
import { Box, Button, CircularProgress, Stack, Typography } from '@mui/material';
import { signInWithGoogle, signOut } from '../services/auth';

interface GoogleAuthButtonProps {
  authenticated: boolean;
  loading: boolean;
  onAuthChange: () => void;
}

export default function GoogleAuthButton({
  authenticated,
  loading,
  onAuthChange,
}: GoogleAuthButtonProps) {
  const handleSignOut = async () => {
    await signOut();
    onAuthChange();
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 1 }}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  if (authenticated) {
    return (
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', justifyContent: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          Signed in with Google
        </Typography>
        <Button
          size="small"
          variant="outlined"
          startIcon={<LogoutIcon />}
          onClick={handleSignOut}
          sx={{ textTransform: 'none' }}
        >
          Sign out
        </Button>
      </Stack>
    );
  }

  return (
    <Button
      variant="outlined"
      startIcon={<GoogleIcon />}
      onClick={() => signInWithGoogle()}
      sx={{ textTransform: 'none' }}
    >
      Sign in with Google
    </Button>
  );
}
