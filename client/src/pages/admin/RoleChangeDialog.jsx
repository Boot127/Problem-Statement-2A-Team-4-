import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, Typography } from '@mui/material';
import { ROLE_LABELS } from '../../utils/enums';
import { userProfile } from '../../utils/userProfile';

export default function RoleChangeDialog({ change, busy, error, onClose, onConfirm }) {
  const profile = change ? userProfile(change.user) : null;
  return (
    <Dialog open={Boolean(change)} onClose={busy ? undefined : onClose} fullWidth maxWidth="xs">
      <DialogTitle>Confirm role change</DialogTitle>
      <DialogContent>
        {profile && (
          <Stack spacing={2} sx={{ pt: 0.5 }}>
            <Typography>Change role for <strong>{profile.email}</strong>?</Typography>
            <Alert severity="warning">
              {profile.roleLabel} → {ROLE_LABELS[change.role]}
              <br />This changes which protected areas the user can access.
            </Alert>
            {error && <Alert severity="error">{error}</Alert>}
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={busy}>Cancel</Button>
        <Button variant="contained" onClick={onConfirm} disabled={busy}>{busy ? 'Changing…' : 'Confirm'}</Button>
      </DialogActions>
    </Dialog>
  );
}
