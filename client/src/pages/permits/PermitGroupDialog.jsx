import { useState } from 'react';
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField } from '@mui/material';
import { getApiErrorMessage } from '../../utils/apiError';

export default function PermitGroupDialog({ open, group, onSubmit, onClose }) {
  const [groupName, setGroupName] = useState(group?.groupName || '');
  const [description, setDescription] = useState(group?.description || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    if (!groupName.trim()) return;
    setSaving(true);
    setError('');
    try {
      await onSubmit({ groupName: groupName.trim(), description: description.trim() });
      onClose();
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} fullWidth maxWidth="sm" aria-labelledby="permit-group-dialog-title">
      <Stack component="form" onSubmit={submit}>
        <DialogTitle id="permit-group-dialog-title">{group ? 'Edit Permit Group' : 'Create Permit Group'}</DialogTitle>
        <DialogContent dividers>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <Stack spacing={2}>
            <TextField autoFocus required label="Group Name" value={groupName} onChange={(event) => setGroupName(event.target.value)} inputProps={{ maxLength: 160 }} helperText="For example: Company ABZ or Regional Hiring Team" />
            <TextField label="Description" value={description} onChange={(event) => setDescription(event.target.value)} multiline minRows={3} inputProps={{ maxLength: 1000 }} helperText={`${description.length}/1000`} />
          </Stack>
        </DialogContent>
        <DialogActions><Button onClick={onClose} disabled={saving}>Cancel</Button><Button type="submit" variant="contained" disabled={saving || !groupName.trim()}>{saving ? 'Saving…' : group ? 'Save Changes' : 'Create Group'}</Button></DialogActions>
      </Stack>
    </Dialog>
  );
}
