import { useEffect, useState } from 'react';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import { Alert, Box, Button, Chip, MenuItem, Paper, Skeleton, Stack, TextField, Typography } from '@mui/material';
import NotificationsActiveOutlinedIcon from '@mui/icons-material/NotificationsActiveOutlined';
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
import ScheduleOutlinedIcon from '@mui/icons-material/ScheduleOutlined';
import ErrorOutlineOutlinedIcon from '@mui/icons-material/ErrorOutlineOutlined';
import SourceOutlinedIcon from '@mui/icons-material/SourceOutlined';
import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined';
import ArrowForwardOutlinedIcon from '@mui/icons-material/ArrowForwardOutlined';
import AppBreadcrumbs from '../../components/common/AppBreadcrumbs';
import PageHeader from '../../components/common/PageHeader';
import permitService from '../../api/permitService';
import { getApiErrorMessage } from '../../utils/apiError';
import { countryFlag, countryName } from '../../utils/countries';
import { getPermitNavigation, permitNavigationState } from './permitNavigation';

const TYPES = {
  REVIEW_OVERDUE: { label: 'Review Overdue', color: 'error', icon: WarningAmberOutlinedIcon },
  DUE_SOON: { label: 'Review Due Soon', color: 'warning', icon: ScheduleOutlinedIcon },
  INCOMPLETE: { label: 'Incomplete Information', color: 'warning', icon: FactCheckOutlinedIcon },
  MISSING_SOURCE: { label: 'Missing Source Evidence', color: 'info', icon: SourceOutlinedIcon },
  OUTDATED: { label: 'Possibly Outdated', color: 'error', icon: ErrorOutlineOutlinedIcon },
};

export default function PermitReminderCentrePage() {
  const location = useLocation();
  const navigation = getPermitNavigation(location);
  const navigationState = permitNavigationState(location);
  const [filter, setFilter] = useState('');
  const [data, setData] = useState(undefined);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    permitService.reminders(filter)
      .then((response) => { if (active) { setData(response); setError(''); } })
      .catch((err) => { if (active) setError(getApiErrorMessage(err)); });
    return () => { active = false; };
  }, [filter]);

  return (
    <Box>
      <AppBreadcrumbs
        items={[{ label: 'Dashboard', href: '/' }, { label: 'Work Permits', href: navigation.listHref }, { label: 'Reminders' }]}
        back={{ label: 'Back to Work Permits', href: navigation.listHref }}
      />
      <PageHeader title="Work Permit Reminders" subtitle="Computed from current permit health, review dates, process coverage, and source evidence. Resolving the permit automatically removes its reminder." />
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {data === undefined ? <Stack spacing={1.5}>{[1, 2, 3].map((item) => <Skeleton key={item} variant="rounded" height={130} />)}</Stack> : (
        <>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '2fr 1fr 1fr' }, gap: 1.5, mb: 3 }}>
            <Paper variant="outlined" sx={{ p: 2.25, borderTop: 4, borderTopColor: data.allTotal ? 'warning.main' : 'success.main' }}><Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}><NotificationsActiveOutlinedIcon color={data.allTotal ? 'warning' : 'success'} /><Box><Typography variant="h5" fontWeight={900}>{data.allTotal}</Typography><Typography variant="body2" color="text.secondary">Reminder reasons</Typography></Box></Stack></Paper>
            <Paper variant="outlined" sx={{ p: 2.25 }}><Typography variant="h5" fontWeight={900}>{data.permitCount}</Typography><Typography variant="body2" color="text.secondary">Permits needing attention</Typography></Paper>
            <Paper variant="outlined" sx={{ p: 2.25 }}><Typography variant="h5" fontWeight={900}>{data.dueSoonDays} days</Typography><Typography variant="body2" color="text.secondary">Due-soon window</Typography></Paper>
          </Box>
          <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between' }}>
              <Box><Typography variant="subtitle1" fontWeight={850}>Reminder queue</Typography><Typography variant="body2" color="text.secondary">Most urgent items and nearest dates appear first. A permit may have more than one reason.</Typography></Box>
              <TextField select size="small" label="Reminder Type" value={filter} onChange={(event) => { setData(undefined); setFilter(event.target.value); }} sx={{ minWidth: { sm: 230 } }}>
                <MenuItem value="">All Reminder Types</MenuItem>
                {Object.entries(TYPES).map(([key, item]) => <MenuItem key={key} value={key}>{item.label} ({data.counts[key] || 0})</MenuItem>)}
              </TextField>
            </Stack>
          </Paper>
          {data.items.length === 0 ? <Paper variant="outlined" sx={{ py: 6, px: 2, textAlign: 'center', bgcolor: 'action.hover' }}><FactCheckOutlinedIcon color="success" sx={{ fontSize: 44 }} /><Typography variant="h6" fontWeight={850}>No matching reminders</Typography><Typography variant="body2" color="text.secondary">There are no active Work Permits requiring attention in this category.</Typography></Paper> : (
            <Stack spacing={1.5}>
              {data.items.map((reminder) => {
                const config = TYPES[reminder.type];
                const Icon = config.icon;
                return <Paper key={`${reminder.permitId}-${reminder.type}`} component="article" variant="outlined" sx={{ p: { xs: 2, sm: 2.5 }, borderLeft: 5, borderLeftColor: `${config.color}.main` }}><Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ justifyContent: 'space-between', alignItems: { md: 'center' } }}><Stack direction="row" spacing={1.5} sx={{ minWidth: 0 }}><Box sx={{ width: 42, height: 42, flexShrink: 0, borderRadius: 2, bgcolor: `${config.color}.main`, color: `${config.color}.contrastText`, display: 'grid', placeItems: 'center' }}><Icon /></Box><Box sx={{ minWidth: 0 }}><Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 0.75 }}><Chip size="small" color={config.color} label={config.label} /><Typography aria-hidden="true">{countryFlag(reminder.countryCode)}</Typography><Typography variant="h6" fontWeight={850}>{reminder.permitTitle}</Typography></Stack><Typography variant="body2" color="text.secondary">{reminder.permitType} · {countryName(reminder.countryCode)} · {reminder.completeness}% complete</Typography><Typography variant="body1" sx={{ mt: 0.75 }}>{reminder.reason}</Typography>{reminder.nextReviewAt && <Typography variant="caption" color="text.secondary">Next review: {new Date(`${reminder.nextReviewAt}T00:00:00`).toLocaleDateString()}</Typography>}</Box></Stack><Button component={RouterLink} to={`/permits/${reminder.permitId}`} state={navigationState} variant="outlined" endIcon={<ArrowForwardOutlinedIcon />} sx={{ flexShrink: 0 }}>View Permit</Button></Stack></Paper>;
              })}
            </Stack>
          )}
        </>
      )}
    </Box>
  );
}
