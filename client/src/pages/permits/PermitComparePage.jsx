import { useEffect, useState } from 'react';
import { Link as RouterLink, useLocation, useSearchParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import CompareArrowsOutlinedIcon from '@mui/icons-material/CompareArrowsOutlined';
import AppBreadcrumbs from '../../components/common/AppBreadcrumbs';
import PageHeader from '../../components/common/PageHeader';
import permitService from '../../api/permitService';
import { getApiErrorMessage } from '../../utils/apiError';
import { PROCESS_TYPES } from '../../utils/enums';
import { buildComparisonRows, buildProcessComparison } from './permitComparison';
import { getPermitNavigation, permitNavigationState } from './permitNavigation';

function ProcessCard({ permit, processType }) {
  const summary = buildProcessComparison(permit, processType);
  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography variant="subtitle2" fontWeight={700}>{summary.label}</Typography>
        <Typography variant="caption" color={summary.isComplete ? 'success.main' : 'warning.main'} fontWeight={700}>
          {summary.isComplete ? 'Complete' : summary.isEmpty ? 'Not recorded' : 'Incomplete'}
        </Typography>
      </Stack>
      <Typography variant="body2" color="text.secondary">
        {summary.stepCount} step{summary.stepCount === 1 ? '' : 's'} · {summary.documentCount} document{summary.documentCount === 1 ? '' : 's'} ({summary.mandatoryCount} mandatory)
      </Typography>
    </Paper>
  );
}

export default function PermitComparePage() {
  const location = useLocation();
  const navigation = getPermitNavigation(location);
  const navigationState = permitNavigationState(location);
  const [searchParams, setSearchParams] = useSearchParams();
  const [options, setOptions] = useState([]);
  const [leftId, setLeftId] = useState(searchParams.get('left') || '');
  const [rightId, setRightId] = useState(searchParams.get('right') || '');
  const [left, setLeft] = useState(null);
  const [right, setRight] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    permitService.list({ limit: 100 })
      .then((data) => setOptions(data.items))
      .catch((err) => setError(getApiErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    let active = true;
    setSearchParams(
      leftId || rightId
        ? { ...(leftId && { left: leftId }), ...(rightId && { right: rightId }) }
        : {},
      { replace: true, state: location.state }
    );
    Promise.all([
      leftId ? permitService.getById(leftId) : Promise.resolve(null),
      rightId ? permitService.getById(rightId) : Promise.resolve(null),
    ])
      .then(([nextLeft, nextRight]) => {
        if (!active) return;
        setLeft(nextLeft);
        setRight(nextRight);
        setError('');
      })
      .catch((err) => active && setError(getApiErrorMessage(err)));
    return () => { active = false; };
  }, [leftId, rightId, location.state, setSearchParams]);

  const ready = left && right && left.id !== right.id;
  const rows = ready ? buildComparisonRows(left, right) : [];

  return (
    <Box>
      <AppBreadcrumbs
        items={[{ label: 'Dashboard', href: '/' }, { label: 'Work Permits', href: navigation.listHref }, { label: 'Compare Permits' }]}
        back={{ label: 'Back to Work Permits', href: navigation.listHref }}
      />
      <PageHeader
        title="Compare Work Permits"
        subtitle="Review two permit records and their process coverage side by side."
      />
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <Paper variant="outlined" sx={{ p: 2.5, mb: 3 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ alignItems: { md: 'center' } }}>
          <TextField select fullWidth size="small" label="First permit" value={leftId} onChange={(event) => setLeftId(event.target.value)}>
            <MenuItem value="">Select a permit</MenuItem>
            {options.map((permit) => <MenuItem key={permit.id} value={String(permit.id)} disabled={String(permit.id) === rightId}>{permit.title}</MenuItem>)}
          </TextField>
          <CompareArrowsOutlinedIcon color="action" sx={{ alignSelf: 'center' }} />
          <TextField select fullWidth size="small" label="Second permit" value={rightId} onChange={(event) => setRightId(event.target.value)}>
            <MenuItem value="">Select a permit</MenuItem>
            {options.map((permit) => <MenuItem key={permit.id} value={String(permit.id)} disabled={String(permit.id) === leftId}>{permit.title}</MenuItem>)}
          </TextField>
        </Stack>
      </Paper>

      {loading && <Stack sx={{ alignItems: 'center', py: 6 }}><CircularProgress size={30} /></Stack>}
      {!loading && !ready && (
        <Alert severity={leftId && rightId ? 'warning' : 'info'}>Select two different permits to compare.</Alert>
      )}
      {ready && (
        <>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '180px 1fr 1fr' }, gap: 1, mb: 3 }}>
            <Box sx={{ display: { xs: 'none', md: 'block' } }} />
            {[left, right].map((permit) => (
              <Paper key={permit.id} variant="outlined" sx={{ p: 2, bgcolor: 'action.hover' }}>
                <Typography variant="h6" fontWeight={700}>{permit.title}</Typography>
                <Button component={RouterLink} to={`/permits/${permit.id}`} state={navigationState} size="small" sx={{ mt: 0.5 }}>Open details</Button>
              </Paper>
            ))}
            {rows.map((row) => (
              <Box key={row.label} sx={{ display: 'contents' }}>
                <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ p: 1.5, textTransform: 'uppercase' }}>{row.label}</Typography>
                <Paper variant="outlined" sx={{ p: 1.5 }}><Typography variant="body2">{row.left}</Typography></Paper>
                <Paper variant="outlined" sx={{ p: 1.5 }}><Typography variant="body2">{row.right}</Typography></Paper>
              </Box>
            ))}
          </Box>
          <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>Process coverage</Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
            {[left, right].map((permit) => (
              <Stack key={permit.id} spacing={1.5}>
                <Typography variant="subtitle1" fontWeight={700}>{permit.title}</Typography>
                {PROCESS_TYPES.map((type) => <ProcessCard key={type} permit={permit} processType={type} />)}
              </Stack>
            ))}
          </Box>
        </>
      )}
    </Box>
  );
}
