import { useState } from 'react';
import {
  Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent,
  DialogTitle, Divider, MenuItem, Paper, Stack, TextField, Typography,
} from '@mui/material';
import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined';
import CheckCircleOutlineOutlinedIcon from '@mui/icons-material/CheckCircleOutlineOutlined';
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
import permitService from '../../api/permitService';
import { getApiErrorMessage } from '../../utils/apiError';
import { COUNTRIES } from '../../utils/countries';

const OUTCOMES = {
  LIKELY_MATCH: { label: 'Likely Match', color: 'success' },
  POSSIBLE_MATCH: { label: 'Possible Match', color: 'info' },
  MISSING_INFORMATION: { label: 'Missing Information', color: 'warning' },
  REQUIRES_COMPLIANCE_REVIEW: { label: 'Requires Compliance Review', color: 'warning' },
};

const INITIAL = {
  nationality: '', age: '', monthlySalary: '', salaryCurrency: '', jobRole: '',
  yearsRelevantExperience: '', highestQualification: '',
};

export default function PermitEligibilityDialog({ open, permit, onClose }) {
  const [values, setValues] = useState({ ...INITIAL, salaryCurrency: permit.currencyCode || '' });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const set = (field) => (event) => setValues((current) => ({ ...current, [field]: event.target.value }));

  const check = async () => {
    setLoading(true);
    setError('');
    try {
      setResult(await permitService.checkEligibility(permit.id, values));
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const outcome = result ? OUTCOMES[result.outcome] || OUTCOMES.REQUIRES_COMPLIANCE_REVIEW : null;
  return (
    <Dialog open={open} onClose={loading ? undefined : onClose} fullWidth maxWidth="md" aria-labelledby="eligibility-check-title">
      <DialogTitle id="eligibility-check-title"><Stack direction="row" spacing={1.25} sx={{ alignItems: 'center' }}><FactCheckOutlinedIcon color="primary" /><Box><Typography variant="h6" fontWeight={900}>{permit.title} Eligibility Check</Typography><Typography variant="body2" color="text.secondary">Advisory screening against this permit’s stored eligibility information.</Typography></Box></Stack></DialogTitle>
      <DialogContent dividers>
        <Alert severity="warning" sx={{ mb: 2 }}>This checker does not make a legal eligibility decision. Compliance must verify the result.</Alert>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Box component="form" onSubmit={(event) => { event.preventDefault(); check(); }} sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5 }}>
          <TextField select label="Nationality" value={values.nationality} onChange={set('nationality')}><MenuItem value="">Not provided</MenuItem>{COUNTRIES.map((country) => <MenuItem key={country.code} value={country.name}>{country.name}</MenuItem>)}</TextField>
          <TextField label="Age" type="number" value={values.age} onChange={set('age')} inputProps={{ min: 16, max: 100 }} />
          <Stack direction="row" spacing={1}><TextField label="Monthly Salary" type="number" value={values.monthlySalary} onChange={set('monthlySalary')} inputProps={{ min: 0 }} fullWidth /><TextField label="Currency" value={values.salaryCurrency} onChange={set('salaryCurrency')} inputProps={{ maxLength: 3 }} sx={{ width: 120 }} /></Stack>
          <TextField label="Job Role" value={values.jobRole} onChange={set('jobRole')} inputProps={{ maxLength: 200 }} />
          <TextField label="Years of Relevant Experience" type="number" value={values.yearsRelevantExperience} onChange={set('yearsRelevantExperience')} inputProps={{ min: 0, max: 80 }} />
          <TextField label="Highest Qualification" value={values.highestQualification} onChange={set('highestQualification')} inputProps={{ maxLength: 200 }} />
        </Box>
        <Button fullWidth variant="contained" size="large" onClick={check} disabled={loading} sx={{ mt: 2 }}>{loading ? <><CircularProgress size={18} color="inherit" sx={{ mr: 1 }} />Checking…</> : 'Check Eligibility'}</Button>

        {result && (
          <Paper variant="outlined" sx={{ mt: 2.5, overflow: 'hidden' }} aria-live="polite">
            <Box sx={{ p: 2, bgcolor: 'action.hover' }}><Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' } }}><Box><Typography variant="overline" color="text.secondary">ADVISORY RESULT</Typography><Typography variant="h5" fontWeight={900}>{outcome.label}</Typography></Box><Chip label={outcome.label} color={outcome.color} /></Stack></Box>
            <Divider />
            <Stack spacing={2} sx={{ p: 2 }}>
              {result.explicitRuleResults.length > 0 && <Box><Typography variant="subtitle2" fontWeight={900} sx={{ mb: 1 }}>Explicit requirements found in stored eligibility text</Typography><Stack spacing={1}>{result.explicitRuleResults.map((item) => <Paper key={item.ruleType} variant="outlined" sx={{ p: 1.5 }}><Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>{item.result === 'PASS' ? <CheckCircleOutlineOutlinedIcon color="success" /> : <WarningAmberOutlinedIcon color="warning" />}<Box><Typography variant="body2" fontWeight={800}>{item.ruleType.replaceAll('_', ' ')}</Typography><Typography variant="caption" display="block">Applicant: {item.applicantValue ?? 'Not provided'} · Stored requirement: {item.storedRequirement}</Typography><Typography variant="caption" color="text.secondary">{item.explanation}</Typography></Box></Stack></Paper>)}</Stack></Box>}
              {result.matchedConditions.length > 0 && <Box><Typography variant="subtitle2" fontWeight={900}>Possible matches</Typography>{result.matchedConditions.map((item) => <Typography key={item} variant="body2" sx={{ mt: 0.5 }}>✓ {item}</Typography>)}</Box>}
              {(result.uncertainConditions.length > 0 || result.conditionsRequiringReview.length > 0) && <Box><Typography variant="subtitle2" fontWeight={900}>Needs review</Typography>{[...result.uncertainConditions, ...result.conditionsRequiringReview].map((item) => <Typography key={item} variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>⚠ {item}</Typography>)}</Box>}
              {result.missingApplicantInformation.length > 0 && <Alert severity="warning">Missing applicant information: {result.missingApplicantInformation.map((item) => item.replace(/([A-Z])/g, ' $1').toLowerCase()).join(', ')}.</Alert>}
              <Alert severity="info">{result.disclaimer}</Alert>
              <Typography variant="caption" color="text.secondary">Provider: {result.providerMode}. Deterministic explicit-rule results are evaluated by the server; AI only assists with free-text comparison.</Typography>
            </Stack>
          </Paper>
        )}
      </DialogContent>
      <DialogActions><Button onClick={onClose} disabled={loading}>Close</Button></DialogActions>
    </Dialog>
  );
}
