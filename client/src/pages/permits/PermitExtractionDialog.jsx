import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  MenuItem,
  Paper,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import AutoAwesomeOutlinedIcon from '@mui/icons-material/AutoAwesomeOutlined';
import permitService from '../../api/permitService';
import { getApiErrorMessage } from '../../utils/apiError';
import { PROCESS_TYPES, PROCESS_TYPE_LABELS } from '../../utils/enums';

const FIELD_CONFIG = {
  countryCode: ['Country code', 'text'], permitType: ['Permit type', 'text'], title: ['Title', 'text'],
  description: ['Description', 'multiline'], eligibilityCriteria: ['Eligibility criteria', 'multiline'],
  processingTimeDays: ['Processing days', 'number'], validityMonths: ['Validity months', 'number'],
  governmentFee: ['Government fee', 'number'], currencyCode: ['Currency code', 'text'], workerType: ['Worker type', 'text'],
};

function confidenceColor(value) { return value >= 0.75 ? 'success' : value >= 0.5 ? 'warning' : 'default'; }

function ReviewProcessTab({ processType, steps, documents }) {
  const selectedSteps = steps.filter((item) => item.processType === processType && item.selected).length;
  const selectedDocuments = documents.filter((item) => item.processType === processType && item.selected).length;
  return (
    <Box sx={{ textAlign: 'left' }}>
      <Typography component="span" variant="subtitle2" fontWeight={800}>{PROCESS_TYPE_LABELS[processType]}</Typography>
      <Typography component="span" variant="caption" display="block" sx={{ opacity: 0.8 }}>
        {selectedSteps} steps · {selectedDocuments} documents
      </Typography>
    </Box>
  );
}

export default function PermitExtractionDialog({ open, permitId, document, onClose, onSaved }) {
  const [result, setResult] = useState(null);
  const [fields, setFields] = useState([]);
  const [steps, setSteps] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [activeProcess, setActiveProcess] = useState('NEW');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open || !document) return;
    let active = true;
    permitService.extractSourceDocument(permitId, document.id)
      .then((data) => {
        if (!active) return;
        setResult(data);
        setFields(Object.entries(data.suggestions.fields || {}).filter(([key]) => FIELD_CONFIG[key]).map(([key, item]) => ({ key, value: item.value ?? '', confidence: item.confidence, selected: item.value !== '' && item.value !== null })));
        setSteps((data.suggestions.steps || []).map((item) => ({ ...item, selected: true })));
        setDocuments((data.suggestions.documents || []).map((item) => ({ ...item, selected: true })));
      })
      .catch((err) => active && setError(getApiErrorMessage(err)))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [open, permitId, document]);

  const updateField = (index, patch) => setFields((items) => items.map((item, i) => i === index ? { ...item, ...patch } : item));
  const updateStep = (index, patch) => setSteps((items) => items.map((item, i) => i === index ? { ...item, ...patch } : item));
  const updateDocument = (index, patch) => setDocuments((items) => items.map((item, i) => i === index ? { ...item, ...patch } : item));
  const setProcessSelection = (selected) => {
    setSteps((items) => items.map((item) => item.processType === activeProcess ? { ...item, selected } : item));
    setDocuments((items) => items.map((item) => item.processType === activeProcess ? { ...item, selected } : item));
  };

  const save = async () => {
    setSaving(true); setError('');
    try {
      const payload = {
        fields: Object.fromEntries(fields.filter((item) => item.selected).map((item) => [item.key, item.value])),
        steps: steps.filter((item) => item.selected).map((item) => ({ processType: item.processType, stepNumber: item.stepNumber, stepTitle: item.stepTitle, stepDetail: item.stepDetail, expectedTimeline: item.expectedTimeline })),
        documents: documents.filter((item) => item.selected).map((item) => ({ processType: item.processType, documentName: item.documentName, isMandatory: item.isMandatory, notes: item.notes, sortOrder: item.sortOrder })),
      };
      await permitService.applySourceExtractionDraft(permitId, document.id, payload);
      await onSaved?.();
      onClose();
    } catch (err) { setError(getApiErrorMessage(err)); }
    finally { setSaving(false); }
  };

  const activeSteps = steps.map((item, index) => ({ item, index })).filter(({ item }) => item.processType === activeProcess);
  const activeDocuments = documents.map((item, index) => ({ item, index })).filter(({ item }) => item.processType === activeProcess);

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} fullWidth maxWidth="lg" aria-labelledby="permit-extraction-title">
      <DialogTitle id="permit-extraction-title"><Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}><AutoAwesomeOutlinedIcon color="primary" /> <span>AI Extraction Review</span></Stack></DialogTitle>
      <DialogContent dividers>
        <Alert severity="warning" sx={{ mb: 2 }}>Nothing is saved automatically. Review, edit, and select each item. Acceptance always changes the permit to Draft.</Alert>
        {loading && <Stack spacing={1} sx={{ alignItems: 'center', py: 5 }}><CircularProgress /><Typography variant="body2">Extracting text and preparing suggestions…</Typography></Stack>}
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {result && (
          <Stack spacing={3}>
            <Alert severity={result.providerMode === 'mock' ? 'info' : 'success'}>
              {result.providerMode === 'mock' ? 'Mock mode: deterministic rules were used because live AI is not configured.' : 'Live provider response received.'} {result.extractedCharacters.toLocaleString()} characters extracted{result.textTruncated ? ' (truncated to the safe limit)' : ''}.
            </Alert>
            {(result.suggestions.warnings || []).map((warning) => <Alert key={warning} severity="warning">{warning}</Alert>)}
            <Box>
              <Typography variant="h6" fontWeight={700} sx={{ mb: 1 }}>Permit fields</Typography>
              <Stack spacing={1.5}>
                {fields.map((item, index) => {
                  const [label, type] = FIELD_CONFIG[item.key];
                  return <Stack key={item.key} direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ alignItems: { sm: 'flex-start' } }}>
                    <Checkbox checked={item.selected} onChange={(event) => updateField(index, { selected: event.target.checked })} inputProps={{ 'aria-label': `Accept ${label}` }} />
                    <TextField fullWidth size="small" label={label} type={type === 'number' ? 'number' : 'text'} multiline={type === 'multiline'} minRows={type === 'multiline' ? 2 : undefined} value={item.value} disabled={!item.selected} onChange={(event) => updateField(index, { value: event.target.value })} />
                    <Chip size="small" variant="outlined" color={confidenceColor(item.confidence)} label={`${Math.round(item.confidence * 100)}%`} sx={{ mt: { sm: 0.75 } }} />
                  </Stack>;
                })}
              </Stack>
            </Box>
            <Divider />
            <Box>
              <Typography variant="h6" fontWeight={700}>Process suggestions</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                Review each process separately. You can edit, move, or deselect any suggestion before saving.
              </Typography>
              <Tabs
                value={activeProcess}
                onChange={(_event, value) => setActiveProcess(value)}
                variant="scrollable"
                scrollButtons="auto"
                aria-label="Extracted permit process sections"
                sx={{
                  mb: 2,
                  '& .MuiTabs-indicator': { display: 'none' },
                  '& .MuiTab-root': { border: 1, borderColor: 'divider', borderRadius: 2, mr: 1, minHeight: 66, minWidth: 180, alignItems: 'flex-start' },
                  '& .Mui-selected': { bgcolor: 'primary.main', color: 'primary.contrastText' },
                }}
              >
                {PROCESS_TYPES.map((type) => <Tab key={type} value={type} label={<ReviewProcessTab processType={type} steps={steps} documents={documents} />} />)}
              </Tabs>

              {(activeSteps.length > 0 || activeDocuments.length > 0) && (
                <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                  <Button size="small" variant="outlined" onClick={() => setProcessSelection(true)}>Accept All in {PROCESS_TYPE_LABELS[activeProcess]}</Button>
                  <Button size="small" color="inherit" onClick={() => setProcessSelection(false)}>Reject All in {PROCESS_TYPE_LABELS[activeProcess]}</Button>
                </Stack>
              )}

              <Stack spacing={2} role="tabpanel" aria-label={`${PROCESS_TYPE_LABELS[activeProcess]} extraction suggestions`}>
                <Box>
                  <Typography variant="subtitle1" fontWeight={800}>Ordered process steps ({activeSteps.length})</Typography>
                  {!activeSteps.length && <Alert severity="info" sx={{ mt: 1 }}>No {PROCESS_TYPE_LABELS[activeProcess].toLowerCase()} steps were found. This process will remain empty unless you move an extracted step here.</Alert>}
                  <Stack spacing={1.5} sx={{ mt: 1 }}>
                    {activeSteps.map(({ item, index }) => (
                      <Paper key={`step-${index}`} variant="outlined" sx={{ p: 2, opacity: item.selected ? 1 : 0.65 }}>
                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mb: 1 }}>
                          <FormControlLabel control={<Checkbox checked={item.selected} onChange={(event) => updateStep(index, { selected: event.target.checked })} />} label="Use" />
                          <TextField size="small" type="number" label="Step" value={item.stepNumber} disabled={!item.selected} inputProps={{ min: 1 }} onChange={(event) => updateStep(index, { stepNumber: event.target.value })} sx={{ width: { sm: 100 } }} />
                          <TextField select size="small" label="Process" value={item.processType} disabled={!item.selected} onChange={(event) => updateStep(index, { processType: event.target.value })} sx={{ minWidth: 170 }}>{PROCESS_TYPES.map((type) => <MenuItem key={type} value={type}>{PROCESS_TYPE_LABELS[type]}</MenuItem>)}</TextField>
                          <TextField fullWidth size="small" label="Step title" value={item.stepTitle} disabled={!item.selected} onChange={(event) => updateStep(index, { stepTitle: event.target.value })} />
                          <Chip size="small" variant="outlined" color={confidenceColor(item.confidence)} label={`${Math.round(item.confidence * 100)}% confidence`} />
                        </Stack>
                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                          <TextField fullWidth size="small" multiline minRows={2} label="Step detail" value={item.stepDetail || ''} disabled={!item.selected} onChange={(event) => updateStep(index, { stepDetail: event.target.value })} />
                          <TextField size="small" label="Expected timeline" value={item.expectedTimeline || ''} disabled={!item.selected} onChange={(event) => updateStep(index, { expectedTimeline: event.target.value })} sx={{ minWidth: { sm: 220 } }} />
                        </Stack>
                      </Paper>
                    ))}
                  </Stack>
                </Box>

                <Box>
                  <Typography variant="subtitle1" fontWeight={800}>Required-document checklist ({activeDocuments.length})</Typography>
                  {!activeDocuments.length && <Alert severity="info" sx={{ mt: 1 }}>No {PROCESS_TYPE_LABELS[activeProcess].toLowerCase()} documents were found. This checklist will remain empty unless you move an extracted document here.</Alert>}
                  <Stack spacing={1.5} sx={{ mt: 1 }}>
                    {activeDocuments.map(({ item, index }) => (
                      <Paper key={`document-${index}`} variant="outlined" sx={{ p: 2, opacity: item.selected ? 1 : 0.65 }}>
                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ alignItems: { sm: 'center' } }}>
                          <FormControlLabel control={<Checkbox checked={item.selected} onChange={(event) => updateDocument(index, { selected: event.target.checked })} />} label="Use" />
                          <TextField size="small" type="number" label="Order" value={item.sortOrder} disabled={!item.selected} inputProps={{ min: 1 }} onChange={(event) => updateDocument(index, { sortOrder: event.target.value })} sx={{ width: { sm: 100 } }} />
                          <TextField select size="small" label="Process" value={item.processType} disabled={!item.selected} onChange={(event) => updateDocument(index, { processType: event.target.value })} sx={{ minWidth: 170 }}>{PROCESS_TYPES.map((type) => <MenuItem key={type} value={type}>{PROCESS_TYPE_LABELS[type]}</MenuItem>)}</TextField>
                          <TextField fullWidth size="small" label="Document name" value={item.documentName} disabled={!item.selected} onChange={(event) => updateDocument(index, { documentName: event.target.value })} />
                          <Chip size="small" color={item.isMandatory ? 'error' : 'default'} variant={item.isMandatory ? 'filled' : 'outlined'} label={item.isMandatory ? 'Mandatory' : 'Optional'} />
                        </Stack>
                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mt: 1 }}>
                          <TextField fullWidth size="small" label="Notes" value={item.notes || ''} disabled={!item.selected} onChange={(event) => updateDocument(index, { notes: event.target.value })} />
                          <FormControlLabel control={<Checkbox checked={item.isMandatory} disabled={!item.selected} onChange={(event) => updateDocument(index, { isMandatory: event.target.checked })} />} label="Required" />
                        </Stack>
                      </Paper>
                    ))}
                  </Stack>
                </Box>
              </Stack>
            </Box>
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>Cancel</Button>
        <Button variant="contained" onClick={save} disabled={!result || loading || saving}>{saving ? 'Saving Draft…' : 'Accept Selected as Draft'}</Button>
      </DialogActions>
    </Dialog>
  );
}
