import { useEffect, useMemo, useState } from 'react';
import {
  Alert, Avatar, Box, Button, Card, CardActionArea, CardContent, FormControl,
  InputLabel, MenuItem, Pagination, Select, Skeleton, Stack, TextField, Typography,
} from '@mui/material';
import HistoryOutlinedIcon from '@mui/icons-material/HistoryOutlined';
import SearchOffOutlinedIcon from '@mui/icons-material/SearchOffOutlined';
import adminActivityService from '../../api/adminActivityService';
import { userProfile } from '../../utils/userProfile';
import ActivityDetailsDialog from './ActivityDetailsDialog';
import { actionLabel, activityTitle, dateTime, entityLabel } from './activityPresentation';

export default function ActivityHistory() {
  const [filters, setFilters] = useState({ search: '', userId: '', entityType: '', action: '', dateFrom: '', dateTo: '', page: 1 });
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);
  const params = useMemo(() => ({ ...filters, search: filters.search.trim(), limit: 10 }), [filters]);
  const fetchData = () => adminActivityService.list(params);
  const reload = () => { setLoading(true); fetchData().then((result) => { setData(result); setError(''); }).catch((requestError) => setError(requestError.response?.data?.message || 'Could not load activity history.')).finally(() => setLoading(false)); };
  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => fetchData().then((result) => { if (active) { setData(result); setError(''); } }).catch((requestError) => { if (active) setError(requestError.response?.data?.message || 'Could not load activity history.'); }).finally(() => { if (active) setLoading(false); }), 250);
    return () => { active = false; clearTimeout(timer); };
    // fetchData is intentionally recreated from the memoized filter params.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);
  const update = (key, value) => setFilters((current) => ({ ...current, [key]: value, page: key === 'page' ? value : 1 }));
  const options = data?.filterOptions || { users: [], entityTypes: [], actions: [] };
  return (
    <Stack spacing={2.5}>
      <Box><Typography variant="h6" fontWeight={750}>Activity History</Typography><Typography variant="body2" color="text.secondary">Real audit events showing who acted, what changed, the target and when it occurred.</Typography></Box>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'minmax(220px,2fr) repeat(3,minmax(150px,1fr))' }, gap: 1.5 }}>
        <TextField size="small" label="Search activity" value={filters.search} onChange={(event) => update('search', event.target.value)} />
        <FormControl size="small"><InputLabel>User</InputLabel><Select label="User" value={filters.userId} onChange={(event) => update('userId', event.target.value)}><MenuItem value="">All users</MenuItem>{options.users.map((user) => <MenuItem key={user.id} value={user.id}>{userProfile(user).displayName}</MenuItem>)}</Select></FormControl>
        <FormControl size="small"><InputLabel>Module</InputLabel><Select label="Module" value={filters.entityType} onChange={(event) => update('entityType', event.target.value)}><MenuItem value="">All modules</MenuItem>{options.entityTypes.map((value) => <MenuItem key={value} value={value}>{entityLabel(value)}</MenuItem>)}</Select></FormControl>
        <FormControl size="small"><InputLabel>Action</InputLabel><Select label="Action" value={filters.action} onChange={(event) => update('action', event.target.value)}><MenuItem value="">All actions</MenuItem>{options.actions.map((value) => <MenuItem key={value} value={value}>{actionLabel(value)}</MenuItem>)}</Select></FormControl>
        <TextField size="small" type="date" label="From" value={filters.dateFrom} onChange={(event) => update('dateFrom', event.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
        <TextField size="small" type="date" label="To" value={filters.dateTo} onChange={(event) => update('dateTo', event.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
      </Box>
      {error && <Alert severity="error" action={<Button color="inherit" onClick={reload}>Retry</Button>}>{error}</Alert>}
      {loading ? <Stack spacing={1.25}>{[1,2,3,4].map((value) => <Skeleton key={value} variant="rounded" height={76} />)}</Stack>
        : data?.items.length === 0 ? <Stack alignItems="center" spacing={1} sx={{ py: 5 }}><SearchOffOutlinedIcon color="action" /><Typography fontWeight={700}>No activity matches these filters</Typography><Typography variant="body2" color="text.secondary">Try clearing one or more filters.</Typography></Stack>
        : <Stack spacing={1}>{data?.items.map((item) => (
          <Card key={item.id} variant="outlined"><CardActionArea onClick={() => setSelected(item)}><CardContent sx={{ py: 1.5 }}><Stack direction="row" spacing={1.5} alignItems="center"><Avatar sx={{ bgcolor: '#edf3ff', color: 'primary.main' }}><HistoryOutlinedIcon /></Avatar><Box sx={{ flexGrow: 1, minWidth: 0 }}><Typography variant="body2" fontWeight={700}>{activityTitle(item)}</Typography><Typography variant="caption" color="text.secondary">{item.actorName} · {entityLabel(item.entityType)} · {dateTime(item.createdAt)}</Typography></Box></Stack></CardContent></CardActionArea></Card>
        ))}</Stack>}
      {(data?.pagination.totalPages || 0) > 1 && <Pagination page={data.pagination.page} count={data.pagination.totalPages} onChange={(_event, page) => update('page', page)} color="primary" sx={{ alignSelf: 'center' }} />}
      <ActivityDetailsDialog activity={selected} onClose={() => setSelected(null)} />
    </Stack>
  );
}
