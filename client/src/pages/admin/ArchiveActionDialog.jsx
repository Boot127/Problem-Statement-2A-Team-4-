import { useState } from 'react';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  TextField,
} from '@mui/material';

export default function ArchiveActionDialog({ action, busy, error, onCancel, onConfirm }) {
  const [confirmation, setConfirmation] = useState('');
  const deleting = action.kind === 'delete';
  const valid = !deleting || confirmation === 'DELETE';

  return (
    <Dialog open onClose={busy ? undefined : onCancel} maxWidth="xs" fullWidth>
      <DialogTitle>
        {deleting ? `Permanently delete "${action.item.title}"?` : `Restore "${action.item.title}"?`}
      </DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ mb: deleting ? 2 : 0 }}>
          {deleting
            ? 'This action cannot be undone. All owned child records and uploaded files will be removed.'
            : `This item will return to ${action.item.previousStatus || 'its safest available active state'}.`}
        </DialogContentText>
        {deleting && (
          <TextField
            autoFocus
            fullWidth
            label="Type DELETE to confirm"
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            autoComplete="off"
          />
        )}
        {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onCancel} disabled={busy}>Cancel</Button>
        <Button
          variant="contained"
          color={deleting ? 'error' : 'primary'}
          disabled={busy || !valid}
          onClick={onConfirm}
        >
          {busy ? 'Working…' : deleting ? 'Permanently Delete' : 'Restore'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
