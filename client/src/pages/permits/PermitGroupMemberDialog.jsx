import { useEffect, useMemo, useState } from 'react';
import { Alert, Autocomplete, Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField, Typography } from '@mui/material';
import permitService from '../../api/permitService';
import { getApiErrorMessage } from '../../utils/apiError';
import { countryName } from '../../utils/countries';

export default function PermitGroupMemberDialog({ open, group, onSubmit, onClose }) {
  const [permits, setPermits] = useState([]);
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setLoading(true);
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    let active = true;
    permitService.list({ search: debouncedSearch, page: 1, limit: 100 })
      .then((data) => { if (active) setPermits(data.items); })
      .catch((err) => { if (active) setError(getApiErrorMessage(err)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [open, debouncedSearch]);

  const existingIds = useMemo(() => new Set(group?.permits?.map((permit) => permit.id) || []), [group]);
  const options = permits.filter((permit) => permit.status !== 'ARCHIVED' && !existingIds.has(permit.id));

  const submit = async () => {
    if (!selected) return;
    setSaving(true);
    setError('');
    try {
      await onSubmit(selected.id);
      onClose();
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} fullWidth maxWidth="sm" aria-labelledby="add-permit-to-group-title">
      <DialogTitle id="add-permit-to-group-title">Add Existing Permit</DialogTitle>
      <DialogContent dividers>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Add a reference to an existing master permit. No permit information will be copied.</Typography>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {!loading && options.length === 0 && !search ? <Alert severity="info">Every available active permit is already in this group.</Alert> : <Autocomplete loading={loading} options={options} value={selected} onInputChange={(_, value, reason) => { if (reason === 'input' || reason === 'clear') setSearch(value); }} onChange={(_, value) => setSelected(value)} filterOptions={(items) => items} getOptionLabel={(option) => `${option.title} — ${countryName(option.countryCode)}`} isOptionEqualToValue={(option, value) => option.id === value.id} noOptionsText="No matching available permits" renderInput={(params) => <TextField {...params} label="Work Permit" placeholder="Search existing permits" helperText="Searches the full master permit library" />} />}
      </DialogContent>
      <DialogActions><Button onClick={onClose} disabled={saving}>Cancel</Button><Button variant="contained" onClick={submit} disabled={!selected || saving}>{saving ? 'Adding…' : 'Add Permit'}</Button></DialogActions>
    </Dialog>
  );
}
