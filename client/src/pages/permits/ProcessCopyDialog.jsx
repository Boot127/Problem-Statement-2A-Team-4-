import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Autocomplete,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  FormLabel,
  Radio,
  RadioGroup,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import permitService from '../../api/permitService';
import { getApiErrorMessage } from '../../utils/apiError';
import { countryName } from '../../utils/countries';
import { PROCESS_TYPE_LABELS } from '../../utils/enums';
import ConfirmDialog from '../../components/common/ConfirmDialog';

export default function ProcessCopyDialog({ open, destinationPermit, processType, onClose, onCopied }) {
  const [permits, setPermits] = useState([]);
  const [source, setSource] = useState(null);
  const [sourceDetail, setSourceDetail] = useState(null);
  const [includeSteps, setIncludeSteps] = useState(true);
  const [includeDocuments, setIncludeDocuments] = useState(true);
  const [mode, setMode] = useState('APPEND');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [confirmReplace, setConfirmReplace] = useState(false);

  useEffect(() => {
    let active = true;
    permitService.list({ page: 1, limit: 100 })
      .then((data) => { if (active) setPermits(data.items.filter((permit) => permit.id !== destinationPermit.id && permit.status !== 'ARCHIVED')); })
      .catch((err) => { if (active) setError(getApiErrorMessage(err)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [destinationPermit.id]);

  useEffect(() => {
    if (!source) return undefined;
    let active = true;
    permitService.getById(source.id)
      .then((data) => { if (active) setSourceDetail(data); })
      .catch((err) => { if (active) setError(getApiErrorMessage(err)); });
    return () => { active = false; };
  }, [source]);

  const sourceSteps = sourceDetail?.steps?.[processType] || [];
  const sourceDocuments = sourceDetail?.documents?.[processType] || [];
  const destinationSteps = destinationPermit.steps?.[processType] || [];
  const destinationDocuments = destinationPermit.documents?.[processType] || [];
  const destinationHasSelectedData =
    (includeSteps && destinationSteps.length > 0) ||
    (includeDocuments && destinationDocuments.length > 0);
  const selectedSourceCount = (includeSteps ? sourceSteps.length : 0) + (includeDocuments ? sourceDocuments.length : 0);
  const canSubmit = sourceDetail && (includeSteps || includeDocuments) && selectedSourceCount > 0 && !saving;

  const options = useMemo(() => permits, [permits]);

  const performCopy = async () => {
    setSaving(true);
    setError('');
    try {
      const result = await permitService.copyProcess(destinationPermit.id, {
        sourcePermitId: sourceDetail.id,
        processType,
        includeSteps,
        includeDocuments,
        mode: destinationHasSelectedData ? mode : 'APPEND',
      });
      setConfirmReplace(false);
      await onCopied(result);
      onClose();
    } catch (err) {
      setConfirmReplace(false);
      setError(getApiErrorMessage(err));
    } finally { setSaving(false); }
  };

  const submit = () => {
    if (!canSubmit) return;
    if (destinationHasSelectedData && mode === 'REPLACE') setConfirmReplace(true);
    else performCopy();
  };

  return (
    <>
      <Dialog open={open} onClose={saving ? undefined : onClose} fullWidth maxWidth="sm" aria-labelledby="copy-process-dialog-title">
        <DialogTitle id="copy-process-dialog-title">Copy {PROCESS_TYPE_LABELS[processType]} Process</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2.25}>
            <Alert severity="info">This copies process structure only. Permit fees, eligibility, validity, description and other permit details are not copied or linked.</Alert>
            {error && <Alert severity="error">{error}</Alert>}
            <Autocomplete
              loading={loading}
              options={options}
              value={source}
              onChange={(_, value) => { setSource(value); setSourceDetail(null); setError(''); }}
              getOptionLabel={(permit) => `${permit.title} — ${countryName(permit.countryCode)}`}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              renderInput={(params) => <TextField {...params} required label="Copy from permit" placeholder="Select an existing permit" />}
            />
            <TextField label="Process" value={PROCESS_TYPE_LABELS[processType]} InputProps={{ readOnly: true }} helperText="The source and destination use the same process type." />
            <TextField label="Copy to permit" value={destinationPermit.title} InputProps={{ readOnly: true }} />

            <Stack spacing={0.25}>
              <FormLabel component="legend">Include</FormLabel>
              <FormControlLabel control={<Checkbox checked={includeSteps} onChange={(event) => setIncludeSteps(event.target.checked)} />} label={`Process Steps${sourceDetail ? ` (${sourceSteps.length})` : ''}`} />
              <FormControlLabel control={<Checkbox checked={includeDocuments} onChange={(event) => setIncludeDocuments(event.target.checked)} />} label={`Required Documents${sourceDetail ? ` (${sourceDocuments.length})` : ''}`} />
            </Stack>

            {sourceDetail && selectedSourceCount === 0 && <Alert severity="warning">The selected source has no chosen {PROCESS_TYPE_LABELS[processType].toLowerCase()} content to copy.</Alert>}

            {destinationHasSelectedData && (
              <>
                <Divider />
                <Alert severity="warning">The destination already has {destinationSteps.length} steps and {destinationDocuments.length} documents in this process. Nothing will be overwritten silently.</Alert>
                <RadioGroup value={mode} onChange={(event) => setMode(event.target.value)} aria-label="Existing destination content behavior">
                  <FormControlLabel value="APPEND" control={<Radio />} label="Append — keep existing content and add non-duplicate copied items" />
                  <FormControlLabel value="REPLACE" control={<Radio />} label="Replace Existing — remove the selected destination content first" />
                </RadioGroup>
              </>
            )}
            <Typography variant="caption" color="text.secondary">The source permit remains unchanged. Copied content becomes independently editable in the destination.</Typography>
          </Stack>
        </DialogContent>
        <DialogActions><Button onClick={onClose} disabled={saving}>Cancel</Button><Button variant="contained" onClick={submit} disabled={!canSubmit}>{saving ? 'Copying…' : 'Copy Process'}</Button></DialogActions>
      </Dialog>
      <ConfirmDialog open={confirmReplace} title="Replace existing process content?" message={`This will permanently remove the selected ${PROCESS_TYPE_LABELS[processType].toLowerCase()} steps and/or documents from "${destinationPermit.title}" before copying. The operation is transactional.`} confirmLabel="Replace and Copy" confirmColor="error" onConfirm={performCopy} onCancel={() => setConfirmReplace(false)} />
    </>
  );
}
