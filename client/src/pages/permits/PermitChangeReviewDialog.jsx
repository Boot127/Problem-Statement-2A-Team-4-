import { useEffect, useMemo, useState } from 'react';
import {
  Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent,
  DialogTitle, Divider, Paper, Stack, Tab, Tabs, ToggleButton, ToggleButtonGroup, Typography,
} from '@mui/material';
import DifferenceOutlinedIcon from '@mui/icons-material/DifferenceOutlined';
import AddCircleOutlineOutlinedIcon from '@mui/icons-material/AddCircleOutlineOutlined';
import ChangeCircleOutlinedIcon from '@mui/icons-material/ChangeCircleOutlined';
import RemoveCircleOutlineOutlinedIcon from '@mui/icons-material/RemoveCircleOutlineOutlined';
import CheckCircleOutlineOutlinedIcon from '@mui/icons-material/CheckCircleOutlineOutlined';
import permitService from '../../api/permitService';
import { getApiErrorMessage } from '../../utils/apiError';

const SECTIONS = [
  { value: 'DETAILS', label: 'Permit Details' },
  { value: 'NEW', label: 'New Application' },
  { value: 'RENEWAL', label: 'Renewal' },
  { value: 'CANCELLATION', label: 'Cancellation' },
];

const CHANGE_STYLE = {
  ADDED: { label: 'Added', color: 'success', icon: AddCircleOutlineOutlinedIcon },
  CHANGED: { label: 'Changed', color: 'warning', icon: ChangeCircleOutlinedIcon },
  REMOVED: { label: 'Possibly Removed', color: 'error', icon: RemoveCircleOutlineOutlinedIcon },
  UNCHANGED: { label: 'Unchanged', color: 'default', icon: CheckCircleOutlineOutlinedIcon },
};

function displayValue(value) {
  if (value === null || value === undefined || value === '') return 'Not recorded';
  if (typeof value !== 'object') return String(value);
  if (value.stepTitle) {
    return [value.stepTitle, value.stepDetail, value.expectedTimeline && `Timeline: ${value.expectedTimeline}`]
      .filter(Boolean).join('\n');
  }
  if (value.documentName) {
    return [value.documentName, value.isMandatory ? 'Mandatory' : 'Optional', value.notes]
      .filter(Boolean).join('\n');
  }
  return JSON.stringify(value);
}

function ChangeCard({ change, decision, onDecision }) {
  const style = CHANGE_STYLE[change.changeType];
  const Icon = style.icon;
  const unchanged = change.changeType === 'UNCHANGED';
  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ justifyContent: 'space-between', alignItems: { sm: 'flex-start' } }}>
        <Box sx={{ minWidth: 0 }}>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
            <Icon fontSize="small" color={style.color} />
            <Typography variant="subtitle1" fontWeight={800}>{change.label}</Typography>
            <Chip size="small" color={style.color} variant="outlined" label={style.label} />
            {change.kind !== 'PERMIT_FIELD' && <Chip size="small" variant="outlined" label={change.kind === 'STEP' ? 'Process step' : 'Required document'} />}
          </Stack>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 1.25, mt: 1.5 }}>
            <Box sx={{ p: 1.25, bgcolor: 'action.hover', borderRadius: 1.5 }}>
              <Typography variant="caption" color="text.secondary" fontWeight={800}>CURRENT</Typography>
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', mt: 0.25 }}>{displayValue(change.current)}</Typography>
            </Box>
            <Box sx={{ p: 1.25, bgcolor: unchanged ? 'action.hover' : 'action.selected', borderRadius: 1.5 }}>
              <Typography variant="caption" color="text.secondary" fontWeight={800}>NEW SOURCE</Typography>
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', mt: 0.25 }}>{change.changeType === 'REMOVED' ? 'Not found in the new source section' : displayValue(change.proposed)}</Typography>
            </Box>
          </Box>
          {change.evidenceSnippet && (
            <Box sx={{ mt: 1.25, pl: 1.25, borderLeft: 3, borderColor: 'divider' }}>
              <Typography variant="caption" color="text.secondary" fontWeight={800}>SOURCE TEXT</Typography>
              <Typography variant="caption" display="block" color="text.secondary">{change.evidenceSnippet}</Typography>
            </Box>
          )}
        </Box>
        {!unchanged && (
          <ToggleButtonGroup
            exclusive
            size="small"
            value={decision || 'KEEP'}
            onChange={(_, value) => value && onDecision(value)}
            aria-label={`Decision for ${change.label}`}
            sx={{ flexShrink: 0 }}
          >
            <ToggleButton value="ACCEPT">Accept Change</ToggleButton>
            <ToggleButton value="KEEP">Keep Current</ToggleButton>
          </ToggleButtonGroup>
        )}
      </Stack>
    </Paper>
  );
}

export default function PermitChangeReviewDialog({ open, permitId, document, onClose, onSaved }) {
  const [result, setResult] = useState(null);
  const [decisions, setDecisions] = useState({});
  const [section, setSection] = useState('DETAILS');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    permitService.compareSourceDocument(permitId, document.id)
      .then((data) => {
        setResult(data);
        setDecisions(Object.fromEntries(data.changes.filter((item) => item.changeType !== 'UNCHANGED').map((item) => [item.id, 'KEEP'])));
        setError('');
      })
      .catch((err) => setError(getApiErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [open, permitId, document.id]);

  const visibleChanges = useMemo(() => (result?.changes || []).filter((change) =>
    section === 'DETAILS' ? change.kind === 'PERMIT_FIELD' : change.processType === section
  ), [result, section]);
  const accepted = (result?.changes || []).filter((change) => decisions[change.id] === 'ACCEPT');

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      await permitService.applySourceChangesDraft(permitId, document.id, accepted);
      await onSaved?.();
      onClose();
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} fullWidth maxWidth="lg" fullScreen={false} aria-labelledby="change-review-title">
      <DialogTitle id="change-review-title">
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}><DifferenceOutlinedIcon color="primary" /><Box><Typography variant="h6" fontWeight={900}>Source Change Review</Typography><Typography variant="body2" color="text.secondary">{document.fileName}</Typography></Box></Stack>
      </DialogTitle>
      <DialogContent dividers sx={{ p: { xs: 1.5, sm: 2.5 } }}>
        <Alert severity="warning" sx={{ mb: 2 }}>AI detected possible changes. Verify them against the official source before accepting. Nothing is changed automatically.</Alert>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {loading && <Stack sx={{ alignItems: 'center', py: 6 }} spacing={1}><CircularProgress /><Typography color="text.secondary">Comparing the source with this permit…</Typography></Stack>}
        {!loading && result && (
          <>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mb: 2, alignItems: { sm: 'center' }, justifyContent: 'space-between' }}>
              <Typography variant="subtitle1" fontWeight={800}>{result.possibleChangeCount} possible change{result.possibleChangeCount === 1 ? '' : 's'} detected</Typography>
              <Chip size="small" variant="outlined" label={`Provider: ${result.providerMode}`} />
            </Stack>
            <Tabs value={section} onChange={(_, value) => setSection(value)} variant="scrollable" scrollButtons="auto" aria-label="Source change sections">
              {SECTIONS.map((item) => <Tab key={item.value} value={item.value} label={item.label} />)}
            </Tabs>
            <Divider sx={{ mb: 2 }} />
            {visibleChanges.length ? <Stack spacing={1.25}>{visibleChanges.map((change) => <ChangeCard key={change.id} change={change} decision={decisions[change.id]} onDecision={(value) => setDecisions((current) => ({ ...current, [change.id]: value }))} />)}</Stack> : <Alert severity="success">No significant changes detected in this section.</Alert>}
          </>
        )}
      </DialogContent>
      <DialogActions sx={{ px: { xs: 1.5, sm: 2.5 }, py: 1.5, justifyContent: 'space-between' }}>
        <Typography variant="caption" color="text.secondary">Accepted changes always save the permit as Draft. The source stays attached.</Typography>
        <Stack direction="row" spacing={1}><Button onClick={onClose} disabled={saving}>Close</Button><Button variant="contained" onClick={save} disabled={saving || accepted.length === 0}>{saving ? 'Saving…' : `Save ${accepted.length} Accepted as Draft`}</Button></Stack>
      </DialogActions>
    </Dialog>
  );
}
