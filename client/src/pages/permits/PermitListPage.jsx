import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TextField,
  MenuItem,
  IconButton,
  Tooltip,
  Button,
  Typography,
  Stack,
  Avatar,
  Divider,
  Alert,
  Skeleton,
  Collapse,
  Badge,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CompareArrowsOutlinedIcon from '@mui/icons-material/CompareArrowsOutlined';
import FilterAltOutlinedIcon from '@mui/icons-material/FilterAltOutlined';
import TuneOutlinedIcon from '@mui/icons-material/TuneOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import ArchiveOutlinedIcon from '@mui/icons-material/ArchiveOutlined';
import InboxOutlinedIcon from '@mui/icons-material/InboxOutlined';
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
import AssignmentIndOutlinedIcon from '@mui/icons-material/AssignmentIndOutlined';
import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined';
import UpdateOutlinedIcon from '@mui/icons-material/UpdateOutlined';
import ErrorOutlineOutlinedIcon from '@mui/icons-material/ErrorOutlineOutlined';
import NotificationsActiveOutlinedIcon from '@mui/icons-material/NotificationsActiveOutlined';
import PermitGroupsSection from './PermitGroupsSection';
import PermitGroupDialog from './PermitGroupDialog';
import PageHeader from '../../components/common/PageHeader';
import AppBreadcrumbs from '../../components/common/AppBreadcrumbs';
import StatusChip from '../../components/common/StatusChip';
import WorkerTypeChip from '../../components/common/WorkerTypeChip';
import VisibilityBadge from '../../components/common/VisibilityBadge';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import ReviewStateChip from './ReviewStateChip';
import permitService from '../../api/permitService';
import { getApiErrorMessage } from '../../utils/apiError';
import { COUNTRIES, countryName } from '../../utils/countries';
import {
  PERMIT_STATUSES,
  PERMIT_STATUS_LABELS,
  REVIEW_STATES,
  REVIEW_STATE_LABELS,
  WORKER_TYPES,
  WORKER_TYPE_LABELS,
  VISIBILITY_LEVELS,
  VISIBILITY_LABELS,
} from '../../utils/enums';

const SUMMARY_CARD_CONFIG = [
  { key: 'totalPermits', label: 'Total Permits', icon: AssignmentIndOutlinedIcon, color: 'primary' },
  { key: 'REVIEW_DUE', label: 'Review Due', icon: FactCheckOutlinedIcon, color: 'warning' },
  { key: 'INCOMPLETE', label: 'Incomplete', icon: ErrorOutlineOutlinedIcon, color: 'error' },
  { key: 'recentlyUpdated', label: 'Updated Recently', icon: UpdateOutlinedIcon, color: 'success' },
];

export default function PermitListPage() {
  const navigate = useNavigate();
  // The dashboard warnings deep-link here as /permits?reviewState=REVIEW_DUE,
  // so the filter seeds from the URL. Only a known value is accepted, so a
  // hand-edited URL can't put the control into an invalid state.
  const [searchParams, setSearchParams] = useSearchParams();
  const initialReviewState = REVIEW_STATES.includes(searchParams.get('reviewState'))
    ? searchParams.get('reviewState')
    : '';
  const initialRowsPerPage = [5, 10, 25].includes(Number(searchParams.get('limit')))
    ? Number(searchParams.get('limit'))
    : 10;
  const initialPage = Math.max(0, Number.parseInt(searchParams.get('page') || '1', 10) - 1 || 0);

  const [permits, setPermits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [country, setCountry] = useState(searchParams.get('country') || '');
  const [status, setStatus] = useState(searchParams.get('status') || '');
  const [reviewState, setReviewState] = useState(initialReviewState);
  const [workerType, setWorkerType] = useState(searchParams.get('workerType') || '');
  const [visibility, setVisibility] = useState(searchParams.get('visibility') || '');
  const [hasSource, setHasSource] = useState(searchParams.get('hasSource') || '');
  const [hasRenewal, setHasRenewal] = useState(searchParams.get('hasRenewal') || '');
  const [hasCancellation, setHasCancellation] = useState(searchParams.get('hasCancellation') || '');
  const [processCompleteness, setProcessCompleteness] = useState(searchParams.get('processCompleteness') || '');
  const [minFee, setMinFee] = useState(searchParams.get('minFee') || '');
  const [maxFee, setMaxFee] = useState(searchParams.get('maxFee') || '');
  const [minProcessingDays, setMinProcessingDays] = useState(searchParams.get('minProcessingDays') || '');
  const [maxProcessingDays, setMaxProcessingDays] = useState(searchParams.get('maxProcessingDays') || '');
  const [nextReviewFrom, setNextReviewFrom] = useState(searchParams.get('nextReviewFrom') || '');
  const [nextReviewTo, setNextReviewTo] = useState(searchParams.get('nextReviewTo') || '');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [archiveTarget, setArchiveTarget] = useState(null);
  const [archiving, setArchiving] = useState(false);
  const [error, setError] = useState('');
  // MUI TablePagination is 0-based; the API is 1-based.
  const [page, setPage] = useState(initialPage);
  const [rowsPerPage, setRowsPerPage] = useState(initialRowsPerPage);
  const [total, setTotal] = useState(0);
  const [summaryCounts, setSummaryCounts] = useState({
    total: 0,
    DRAFT: 0,
    PUBLISHED: 0,
    ARCHIVED: 0,
  });
  const [reviewCounts, setReviewCounts] = useState({
    total: 0,
    CURRENT: 0,
    DUE_SOON: 0,
    REVIEW_DUE: 0,
    OUTDATED: 0,
    INCOMPLETE: 0,
  });
  const [dashboardCounts, setDashboardCounts] = useState({
    total: 0,
    totalPermits: 0,
    REVIEW_DUE: 0,
    INCOMPLETE: 0,
    recentlyUpdated: 0,
    needsAttention: 0,
    missingSource: 0,
  });
  const [groups, setGroups] = useState([]);
  const [groupsLoading, setGroupsLoading] = useState(true);
  const [groupError, setGroupError] = useState('');
  const [groupDialogOpen, setGroupDialogOpen] = useState(false);
  const [reminderCount, setReminderCount] = useState(0);

  // Debounced so typing in the search box doesn't fire a request per keystroke.
  const [debouncedSearch, setDebouncedSearch] = useState(searchParams.get('search') || '');
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(timer);
  }, [search]);

  // Filtering and paging are now done server-side.
  const applyResponse = (data) => {
    setPermits(data.items);
    setTotal(data.total);
    setSummaryCounts(data.statusCounts);
    if (data.reviewCounts) setReviewCounts(data.reviewCounts);
    setError('');
    // If the current page is now past the end (e.g. after archiving the last
    // row on it), step back so the user doesn't see an empty table.
    if (data.items.length === 0 && data.total > 0 && page > 0) {
      setPage(Math.max(0, data.totalPages - 1));
    }
  };

  const fetchPermits = () =>
    permitService
      .list({
        search: debouncedSearch,
        country,
        status,
        reviewState,
        workerType,
        visibility,
        hasSource,
        hasRenewal,
        hasCancellation,
        processCompleteness,
        minFee,
        maxFee,
        minProcessingDays,
        maxProcessingDays,
        nextReviewFrom,
        nextReviewTo,
        page: page + 1,
        limit: rowsPerPage,
      })
      .then(applyResponse)
      .catch((err) => setError(getApiErrorMessage(err)))
      .finally(() => setLoading(false));

  // Used for retry/refresh, where the spinner has to be shown again.
  const reloadPermits = () => {
    setLoading(true);
    return Promise.all([
      fetchPermits(),
      permitService.healthSummary().then(setDashboardCounts),
    ]);
  };

  const fetchGroups = () => {
    setGroupsLoading(true);
    return permitService.listGroups()
      .then((data) => { setGroups(data); setGroupError(''); })
      .catch((err) => setGroupError(getApiErrorMessage(err)))
      .finally(() => setGroupsLoading(false));
  };

  useEffect(() => {
    permitService.healthSummary().then(setDashboardCounts).catch(() => {});
    permitService.listGroups()
      .then((data) => { setGroups(data); setGroupError(''); })
      .catch((err) => setGroupError(getApiErrorMessage(err)))
      .finally(() => setGroupsLoading(false));
    permitService.reminders().then((data) => setReminderCount(data.allTotal)).catch(() => {});
  }, []);

  useEffect(() => {
    fetchPermits();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    debouncedSearch,
    country,
    status,
    reviewState,
    workerType,
    visibility,
    hasSource,
    hasRenewal,
    hasCancellation,
    processCompleteness,
    minFee,
    maxFee,
    minProcessingDays,
    maxProcessingDays,
    nextReviewFrom,
    nextReviewTo,
    page,
    rowsPerPage,
  ]);

  // Reset to the first page whenever the filters change. Adjusting state
  // during render (rather than in an effect) avoids an extra render pass.
  const filterKey = `${debouncedSearch}|${country}|${status}|${reviewState}|${workerType}|${visibility}|${hasSource}|${hasRenewal}|${hasCancellation}|${processCompleteness}|${minFee}|${maxFee}|${minProcessingDays}|${maxProcessingDays}|${nextReviewFrom}|${nextReviewTo}`;
  const [lastFilterKey, setLastFilterKey] = useState(filterKey);
  if (filterKey !== lastFilterKey) {
    setLastFilterKey(filterKey);
    setPage(0);
  }

  const listParams = new URLSearchParams();
  const listValues = {
    search: debouncedSearch,
    country,
    status,
    reviewState,
    workerType,
    visibility,
    hasSource,
    hasRenewal,
    hasCancellation,
    processCompleteness,
    minFee,
    maxFee,
    minProcessingDays,
    maxProcessingDays,
    nextReviewFrom,
    nextReviewTo,
  };
  Object.entries(listValues).forEach(([key, value]) => {
    if (value !== '') listParams.set(key, value);
  });
  if (page > 0) listParams.set('page', String(page + 1));
  if (rowsPerPage !== 10) listParams.set('limit', String(rowsPerPage));
  const serialisedListParams = listParams.toString();
  const currentListHref = `/permits${serialisedListParams ? `?${serialisedListParams}` : ''}`;
  const navigationState = { permitListHref: currentListHref };

  useEffect(() => {
    if (searchParams.toString() !== serialisedListParams) {
      setSearchParams(serialisedListParams, { replace: true });
    }
  }, [searchParams, serialisedListParams, setSearchParams]);

  const hasActiveFilters = Boolean(
    search.trim() ||
      country ||
      status ||
      reviewState ||
      workerType ||
      visibility ||
      hasSource !== '' ||
      hasRenewal !== '' ||
      hasCancellation !== '' ||
      processCompleteness ||
      minFee !== '' ||
      maxFee !== '' ||
      minProcessingDays !== '' ||
      maxProcessingDays !== '' ||
      nextReviewFrom ||
      nextReviewTo
  );

  // Keeps the URL in step with the review filter so the view stays shareable
  // and the browser back button behaves. `replace` avoids stacking a history
  // entry per filter click.
  const applyReviewState = (next) => {
    setReviewState(next);
  };

  const clearFilters = () => {
    setSearch('');
    setCountry('');
    setStatus('');
    setWorkerType('');
    setVisibility('');
    setHasSource('');
    setHasRenewal('');
    setHasCancellation('');
    setProcessCompleteness('');
    setMinFee('');
    setMaxFee('');
    setMinProcessingDays('');
    setMaxProcessingDays('');
    setNextReviewFrom('');
    setNextReviewTo('');
    applyReviewState('');
  };

  // Counts of records that need someone's attention, used for the one-click
  // "show me the problems" shortcuts above the table.
  const needsAttention =
    reviewCounts.REVIEW_DUE + reviewCounts.OUTDATED + reviewCounts.INCOMPLETE;

  const handleConfirmArchive = () => {
    if (!archiveTarget || archiving) return;
    setArchiving(true);
    permitService
      .archive(archiveTarget.id)
      .then(() => {
        setArchiveTarget(null);
        return reloadPermits();
      })
      .catch((err) => {
        setError(getApiErrorMessage(err));
        setArchiveTarget(null);
      })
      .finally(() => setArchiving(false));
  };

  return (
    <Box>
      <AppBreadcrumbs items={[{ label: 'Dashboard', href: '/' }, { label: 'Work Permits' }]} />

      <PageHeader
        title="Work Permit Management"
        subtitle="Create, view, update, and archive work-permit types per country."
        actions={
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" startIcon={<Badge badgeContent={reminderCount} color="error" max={99}><NotificationsActiveOutlinedIcon /></Badge>} onClick={() => navigate('/permits/reminders', { state: navigationState })}>Reminders</Button>
            <Button
              variant="outlined"
              startIcon={<CompareArrowsOutlinedIcon />}
              onClick={() => navigate('/permits/compare', { state: navigationState })}
            >
              Compare
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => navigate('/permits/new', { state: navigationState })}
            >
              New Permit
            </Button>
          </Stack>
        }
      />

      {error && (
        <Alert
          severity="error"
          sx={{ mb: 3 }}
          onClose={() => setError('')}
          action={
            <Button color="inherit" size="small" onClick={reloadPermits} disabled={loading}>
              Retry
            </Button>
          }
        >
          {error}
        </Alert>
      )}

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(4, 1fr)' },
          gap: 2,
          mb: 3,
        }}
      >
        {SUMMARY_CARD_CONFIG.map(({ key, label, icon: Icon, color }) => (
          <Card key={key} variant="outlined">
            <CardContent>
              <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
                <Avatar sx={{ bgcolor: `${color}.main`, width: 40, height: 40 }}>
                  <Icon fontSize="small" />
                </Avatar>
                <Box>
                  <Typography variant="h6" fontWeight={700}>
                    {dashboardCounts[key] ?? summaryCounts[key] ?? 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {label}
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        ))}
      </Box>

      {groupError && <Alert severity="warning" sx={{ mb: 2 }} action={<Button color="inherit" size="small" onClick={fetchGroups}>Retry</Button>}>{groupError}</Alert>}
      <PermitGroupsSection groups={groups} loading={groupsLoading} onCreate={() => setGroupDialogOpen(true)} onOpen={(groupId) => navigate(`/permits/groups/${groupId}`, { state: navigationState })} />

      <Box sx={{ mb: 1.5 }}>
        <Typography variant="overline" color="primary" fontWeight={900}>ALL WORK PERMITS</Typography>
        <Typography variant="body2" color="text.secondary">Search and manage the complete master permit library.</Typography>
      </Box>

      <Paper variant="outlined" sx={{ p: 2.5, mb: 3 }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 2 }}>
          <FilterAltOutlinedIcon fontSize="small" color="action" />
          <Typography variant="subtitle2" color="text.secondary">
            Search &amp; Filter
          </Typography>
        </Stack>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField
            label="Search"
            placeholder="Search permits, holder, company, processes, documents, or sources"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            fullWidth
            size="small"
          />
          <TextField
            select
            label="Country"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            size="small"
            sx={{ minWidth: 180 }}
          >
            <MenuItem value="">All Countries</MenuItem>
            {COUNTRIES.map((c) => (
              <MenuItem key={c.code} value={c.code}>
                {c.name}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label="Status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            size="small"
            sx={{ minWidth: 160 }}
          >
            <MenuItem value="">All Statuses</MenuItem>
            {PERMIT_STATUSES.map((s) => (
              <MenuItem key={s} value={s}>
                {PERMIT_STATUS_LABELS[s]}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label="Review State"
            value={reviewState}
            onChange={(e) => applyReviewState(e.target.value)}
            size="small"
            sx={{ minWidth: 170 }}
            helperText="Information health"
          >
            <MenuItem value="">All Review States</MenuItem>
            {REVIEW_STATES.map((s) => (
              <MenuItem key={s} value={s}>
                {REVIEW_STATE_LABELS[s]} ({reviewCounts[s] ?? 0})
              </MenuItem>
            ))}
          </TextField>
          {hasActiveFilters && (
            <Button onClick={clearFilters} sx={{ whiteSpace: 'nowrap' }}>
              Clear Filters
            </Button>
          )}
        </Stack>

        <Button
          size="small"
          startIcon={<TuneOutlinedIcon />}
          onClick={() => setShowAdvancedFilters((open) => !open)}
          aria-expanded={showAdvancedFilters}
          sx={{ mt: 2 }}
        >
          {showAdvancedFilters ? 'Hide advanced filters' : 'More filters'}
        </Button>

        <Collapse in={showAdvancedFilters}>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: 'repeat(4, 1fr)' },
              gap: 2,
              mt: 2,
            }}
          >
            <TextField
              select
              label="Worker Type"
              value={workerType}
              onChange={(e) => setWorkerType(e.target.value)}
              size="small"
            >
              <MenuItem value="">All Worker Types</MenuItem>
              {WORKER_TYPES.map((value) => (
                <MenuItem key={value} value={value}>
                  {WORKER_TYPE_LABELS[value]}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Visibility"
              value={visibility}
              onChange={(e) => setVisibility(e.target.value)}
              size="small"
            >
              <MenuItem value="">All Visibility Levels</MenuItem>
              {VISIBILITY_LEVELS.map((value) => (
                <MenuItem key={value} value={value}>
                  {VISIBILITY_LABELS[value]}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Source Document"
              value={hasSource}
              onChange={(e) => setHasSource(e.target.value)}
              size="small"
            >
              <MenuItem value="">Any</MenuItem>
              <MenuItem value="true">Attached</MenuItem>
              <MenuItem value="false">Not attached</MenuItem>
            </TextField>
            <TextField
              select
              label="Renewal Process"
              value={hasRenewal}
              onChange={(e) => setHasRenewal(e.target.value)}
              size="small"
            >
              <MenuItem value="">Any</MenuItem>
              <MenuItem value="true">Available</MenuItem>
              <MenuItem value="false">Not recorded</MenuItem>
            </TextField>
            <TextField
              select
              label="Cancellation Process"
              value={hasCancellation}
              onChange={(e) => setHasCancellation(e.target.value)}
              size="small"
            >
              <MenuItem value="">Any</MenuItem>
              <MenuItem value="true">Available</MenuItem>
              <MenuItem value="false">Not recorded</MenuItem>
            </TextField>
            <TextField
              select
              label="Process Completeness"
              value={processCompleteness}
              onChange={(e) => setProcessCompleteness(e.target.value)}
              size="small"
              helperText="New is required; optional processes count when started"
            >
              <MenuItem value="">Any</MenuItem>
              <MenuItem value="COMPLETE">Complete</MenuItem>
              <MenuItem value="INCOMPLETE">Incomplete</MenuItem>
            </TextField>
            <TextField
              label="Minimum Fee"
              type="number"
              value={minFee}
              onChange={(e) => setMinFee(e.target.value)}
              size="small"
              inputProps={{ min: 0, step: '0.01' }}
            />
            <TextField
              label="Maximum Fee"
              type="number"
              value={maxFee}
              onChange={(e) => setMaxFee(e.target.value)}
              size="small"
              inputProps={{ min: 0, step: '0.01' }}
            />
            <TextField
              label="Minimum Processing Days"
              type="number"
              value={minProcessingDays}
              onChange={(e) => setMinProcessingDays(e.target.value)}
              size="small"
              inputProps={{ min: 0, step: 1 }}
            />
            <TextField
              label="Maximum Processing Days"
              type="number"
              value={maxProcessingDays}
              onChange={(e) => setMaxProcessingDays(e.target.value)}
              size="small"
              inputProps={{ min: 0, step: 1 }}
            />
            <TextField
              label="Next Review From"
              type="date"
              value={nextReviewFrom}
              onChange={(e) => setNextReviewFrom(e.target.value)}
              size="small"
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField
              label="Next Review To"
              type="date"
              value={nextReviewTo}
              onChange={(e) => setNextReviewTo(e.target.value)}
              size="small"
              slotProps={{ inputLabel: { shrink: true } }}
            />
          </Box>
        </Collapse>
      </Paper>

      {/* One-click shortcuts to the records that actually need work. Only
          rendered when there is something to act on, so a healthy dataset
          doesn't carry a permanent scolding banner. */}
      {needsAttention > 0 && (
        <Alert
          severity="warning"
          icon={<WarningAmberOutlinedIcon />}
          sx={{ mb: 3 }}
          action={
            reviewState ? (
              <Button color="inherit" size="small" onClick={() => applyReviewState('')}>
                Show All
              </Button>
            ) : null
          }
        >
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', rowGap: 1 }}>
            <Typography variant="body2">
              {needsAttention} permit{needsAttention === 1 ? '' : 's'} need attention:
            </Typography>
            {['REVIEW_DUE', 'OUTDATED', 'INCOMPLETE']
              .filter((s) => reviewCounts[s] > 0)
              .map((s) => (
                <Button
                  key={s}
                  size="small"
                  variant={reviewState === s ? 'contained' : 'outlined'}
                  color="inherit"
                  onClick={() => applyReviewState(reviewState === s ? '' : s)}
                >
                  {reviewCounts[s]} {REVIEW_STATE_LABELS[s]}
                </Button>
              ))}
          </Stack>
        </Alert>
      )}

      <TableContainer component={Paper} variant="outlined" sx={{ overflowX: 'auto' }}>
        <Table sx={{ minWidth: 900 }}>
          <TableHead>
            <TableRow>
              <TableCell>Permit</TableCell>
              <TableCell>Country</TableCell>
              <TableCell>Worker Type</TableCell>
              <TableCell>Visibility</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Information Health</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading &&
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={`skeleton-${i}`}>
                  {Array.from({ length: 7 }).map((__, c) => (
                    <TableCell key={c}>
                      <Skeleton variant="text" height={28} />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            {!loading && !error && permits.length === 0 && (
              <TableRow>
                <TableCell colSpan={7}>
                  <Stack spacing={1} sx={{ alignItems: 'center', py: 5 }}>
                    <InboxOutlinedIcon fontSize="large" color="disabled" />
                    <Typography variant="body1" color="text.secondary">
                      {permits.length === 0
                        ? 'No work permits yet.'
                        : 'No work permits match your filters.'}
                    </Typography>
                    {permits.length === 0 ? (
                      <Button variant="contained" size="small" onClick={() => navigate('/permits/new', { state: navigationState })}>
                        Create your first permit
                      </Button>
                    ) : (
                      <Button size="small" onClick={clearFilters}>
                        Clear filters
                      </Button>
                    )}
                  </Stack>
                </TableCell>
              </TableRow>
            )}
            {!loading &&
              permits.map((permit) => (
              <TableRow key={permit.id} hover>
                <TableCell>
                  <Typography variant="body2" fontWeight={600}>
                    {permit.title}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {permit.permitType}
                  </Typography>
                  {(permit.permitHolderName || permit.clientCompanyName) && (
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
                      {[permit.permitHolderName, permit.clientCompanyName].filter(Boolean).join(' · ')}
                    </Typography>
                  )}
                </TableCell>
                <TableCell>{countryName(permit.countryCode)}</TableCell>
                <TableCell>
                  <WorkerTypeChip workerType={permit.workerType} />
                </TableCell>
                <TableCell>
                  <VisibilityBadge visibility={permit.visibility} />
                </TableCell>
                <TableCell>
                  <StatusChip status={permit.status} />
                </TableCell>
                <TableCell>
                  {permit.health ? (
                    <Stack spacing={0.5} sx={{ alignItems: 'flex-start' }}>
                      <ReviewStateChip state={permit.health.reviewState} />
                      <Typography variant="caption" color="text.secondary">
                        {permit.health.completeness}% complete
                        {permit.health.missingCount > 0
                          ? ` · ${permit.health.missingCount} missing`
                          : ''}
                      </Typography>
                    </Stack>
                  ) : (
                    <Typography variant="caption" color="text.disabled">
                      —
                    </Typography>
                  )}
                </TableCell>
                <TableCell align="right">
                  <Stack direction="row" spacing={0.5} sx={{ justifyContent: 'flex-end' }}>
                    <Tooltip title="View">
                      <IconButton size="small" onClick={() => navigate(`/permits/${permit.id}`, { state: navigationState })}>
                        <VisibilityOutlinedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Edit">
                      <IconButton size="small" onClick={() => navigate(`/permits/${permit.id}/edit`, { state: navigationState })}>
                        <EditOutlinedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={permit.status === 'ARCHIVED' ? 'Already archived' : 'Archive'}>
                      <span>
                        <IconButton
                          size="small"
                          color="error"
                          disabled={permit.status === 'ARCHIVED' || archiving}
                          onClick={() => setArchiveTarget(permit)}
                        >
                          <ArchiveOutlinedIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {!loading && total > 0 && (
          <>
            <Divider />
            <TablePagination
              component="div"
              count={total}
              page={page}
              onPageChange={(_e, newPage) => setPage(newPage)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(e) => {
                setRowsPerPage(parseInt(e.target.value, 10));
                setPage(0);
              }}
              rowsPerPageOptions={[5, 10, 25]}
            />
          </>
        )}
      </TableContainer>

      <ConfirmDialog
        open={Boolean(archiveTarget)}
        title="Archive work permit?"
        message={
          archiveTarget
            ? `"${archiveTarget.title}" will be marked as Archived. It will not be deleted and can still be viewed or restored later.`
            : ''
        }
        confirmLabel="Archive Permit"
        confirmColor="error"
        onConfirm={handleConfirmArchive}
        onCancel={() => setArchiveTarget(null)}
      />
      {groupDialogOpen && <PermitGroupDialog
        open
        onClose={() => setGroupDialogOpen(false)}
        onSubmit={(values) => permitService.createGroup(values).then((created) => {
          setGroups((current) => [created, ...current]);
          navigate(`/permits/groups/${created.id}`, { state: navigationState });
        })}
      />}
    </Box>
  );
}
