import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  MenuItem,
  Pagination,
  Paper,
  Stack,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import RestoreOutlinedIcon from '@mui/icons-material/RestoreOutlined';
import DeleteForeverOutlinedIcon from '@mui/icons-material/DeleteForeverOutlined';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import SearchOffOutlinedIcon from '@mui/icons-material/SearchOffOutlined';
import adminArchiveService from '../../api/adminArchiveService';
import ArchiveActionDialog from './ArchiveActionDialog';
import { RECORD_CATEGORY_LABELS, TARGET_TYPE_LABELS } from '../../utils/enums';

const MODULES = [
  { value: 'COMPLIANCE_CONTENT', label: 'Compliance Content' },
  { value: 'WORK_PERMIT', label: 'Work Permits' },
  { value: 'REVIEW', label: 'Reviews' },
];

function dateLabel(value) {
  if (!value) return 'Date unavailable';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString();
}
function typeLabel(item, entityType) {
  if (entityType === 'COMPLIANCE_CONTENT') return RECORD_CATEGORY_LABELS[item.type] || item.type;
  if (entityType === 'REVIEW') return TARGET_TYPE_LABELS[item.targetType] || item.targetType;
  return item.type;
}
function secondaryDetails(item, entityType) {
  if (entityType === 'COMPLIANCE_CONTENT') return `${item.componentCount} components • ${item.attachmentCount} attachments`;
  if (entityType === 'WORK_PERMIT') return [item.permitHolderName && `Holder: ${item.permitHolderName}`, item.clientCompanyName && `Client: ${item.clientCompanyName}`].filter(Boolean).join(' • ') || 'No holder or client recorded';
  return `${item.targetTitle} • Submitted by ${item.submittedBy || 'Not recorded'}${item.reviewedBy ? ` • Reviewed by ${item.reviewedBy}` : ''}`;
}

export default function ArchiveManagement() {
  const [entityType, setEntityType] = useState('COMPLIANCE_CONTENT');
  const [search, setSearch] = useState('');
  const [country, setCountry] = useState('');
  const [type, setType] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [action, setAction] = useState(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [actionError, setActionError] = useState('');

  const params = useMemo(() => ({ entityType, search: search.trim(), country, type, page, limit: 8 }), [entityType, search, country, type, page]);

  const load = () => {
    setLoading(true);
    return adminArchiveService.list(params)
      .then((response) => { setData(response); setError(''); })
      .catch((requestError) => setError(requestError.response?.data?.message || 'Could not load archived items.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const timer = setTimeout(load, 250);
    return () => clearTimeout(timer);
    // load is intentionally recreated with the memoized request params.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  const changeModule = (_event, value) => {
    setEntityType(value); setSearch(''); setCountry(''); setType(''); setPage(1); setSuccess('');
  };
  const runAction = async () => {
    setActionBusy(true); setActionError('');
    try {
      if (action.kind === 'restore') await adminArchiveService.restore(entityType, action.item.id);
      else await adminArchiveService.permanentlyDelete(entityType, action.item.id);
      setSuccess(action.kind === 'restore' ? `Restored "${action.item.title}".` : `Permanently deleted "${action.item.title}".`);
      setAction(null);
      await load();
    } catch (requestError) {
      setActionError(requestError.response?.data?.message || 'The archive action failed.');
    } finally { setActionBusy(false); }
  };

  const options = data?.filterOptions || { countries: [], types: [] };
  const counts = data?.counts || {};
  const total = Object.values(counts).reduce((sum, value) => sum + Number(value || 0), 0);

  return (
    <Box>
      <Paper variant="outlined" sx={{ p: { xs: 2, sm: 2.5 }, mb: 2.5 }}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Inventory2OutlinedIcon color="primary" />
          <Box>
            <Typography variant="h6" fontWeight={700}>Archive Management</Typography>
            <Typography variant="body2" color="text.secondary">{total} archived item{total === 1 ? '' : 's'} across supported modules</Typography>
          </Box>
        </Stack>
      </Paper>

      {success && <Alert severity="success" onClose={() => setSuccess('')} sx={{ mb: 2 }}>{success}</Alert>}
      {error && <Alert severity="error" onClose={() => setError('')} sx={{ mb: 2 }}>{error}</Alert>}

      <Paper variant="outlined" sx={{ mb: 2.5 }}>
        <Tabs value={entityType} onChange={changeModule} variant="scrollable" scrollButtons="auto" allowScrollButtonsMobile aria-label="Archived record modules">
          {MODULES.map((module) => <Tab key={module.value} value={module.value} label={`${module.label} (${counts[module.value] || 0})`} />)}
        </Tabs>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} sx={{ p: 2 }}>
          <TextField size="small" fullWidth label="Search archived items" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} />
          {entityType !== 'REVIEW' && <TextField select size="small" label="Country" value={country} onChange={(event) => { setCountry(event.target.value); setPage(1); }} sx={{ minWidth: 180 }}><MenuItem value="">All countries</MenuItem>{options.countries.map((option) => <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>)}</TextField>}
          <TextField select size="small" label={entityType === 'REVIEW' ? 'Target type' : 'Type'} value={type} onChange={(event) => { setType(event.target.value); setPage(1); }} sx={{ minWidth: 210 }}><MenuItem value="">All types</MenuItem>{options.types.map((option) => <MenuItem key={option.value} value={option.value}>{entityType === 'COMPLIANCE_CONTENT' ? RECORD_CATEGORY_LABELS[option.value] || option.label : option.label}</MenuItem>)}</TextField>
        </Stack>
      </Paper>

      {loading && !data ? <Stack alignItems="center" sx={{ py: 8 }}><CircularProgress /></Stack> : (
        <Stack spacing={1.5} aria-busy={loading}>
          {data?.items.map((item) => (
            <Card key={item.id} variant="outlined">
              <CardContent>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'center' }}>
                  <Box sx={{ minWidth: 0 }}>
                    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                      <Typography fontWeight={700}>{item.title}</Typography>
                      <Chip size="small" label="Archived" />
                    </Stack>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{typeLabel(item, entityType)}{item.countryName || item.countryCode ? ` • ${item.countryName || item.countryCode}` : ''}</Typography>
                    <Typography variant="body2" color="text.secondary">{secondaryDetails(item, entityType)}</Typography>
                    <Typography variant="caption" color="text.secondary">Archived {dateLabel(item.archivedAt)}</Typography>
                    {item.deleteBlockedReason && <Alert severity="info" sx={{ mt: 1, py: 0 }}>{item.deleteBlockedReason}</Alert>}
                  </Box>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} flexShrink={0}>
                    <Button variant="outlined" startIcon={<RestoreOutlinedIcon />} onClick={() => { setAction({ kind:'restore',item }); setActionError(''); }}>Restore</Button>
                    <Tooltip title={item.deleteBlockedReason || 'Permanently delete archived item'}><span><Button color="error" variant="outlined" startIcon={<DeleteForeverOutlinedIcon />} disabled={Boolean(item.deleteBlockedReason)} onClick={() => { setAction({ kind:'delete',item }); setActionError(''); }}>Permanently Delete</Button></span></Tooltip>
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          ))}
          {!loading && data?.items.length === 0 && <Paper variant="outlined" sx={{ py: 7, textAlign: 'center' }}><SearchOffOutlinedIcon color="disabled" sx={{ fontSize: 42 }} /><Typography color="text.secondary">No archived items match these filters.</Typography></Paper>}
          {(data?.pagination.totalPages || 0) > 1 && <Stack alignItems="center" sx={{ pt: 1 }}><Pagination page={data.pagination.page} count={data.pagination.totalPages} onChange={(_event, value) => setPage(value)} color="primary" /></Stack>}
        </Stack>
      )}

      {action && <ArchiveActionDialog key={`${action.kind}-${action.item.id}`} action={action} busy={actionBusy} error={actionError} onCancel={() => !actionBusy && setAction(null)} onConfirm={runAction} />}
    </Box>
  );
}
