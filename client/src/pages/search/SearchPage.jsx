import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  TextField,
  MenuItem,
  Typography,
  Stack,
  Chip,
  InputAdornment,
  TablePagination,
  Divider,
} from '@mui/material';
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined';
import InboxOutlinedIcon from '@mui/icons-material/InboxOutlined';
import PageHeader from '../../components/common/PageHeader';
import AppBreadcrumbs from '../../components/common/AppBreadcrumbs';
import StatusChip from '../../components/common/StatusChip';
import WorkerTypeChip from '../../components/common/WorkerTypeChip';
import VisibilityBadge from '../../components/common/VisibilityBadge';
import searchService from '../../api/searchService';
import { COUNTRIES, countryName } from '../../utils/countries';
import {
  WORKER_TYPES,
  WORKER_TYPE_LABELS,
  CONTENT_STATUSES,
  CONTENT_STATUS_LABELS,
  TARGET_TYPES,
  TARGET_TYPE_LABELS,
} from '../../utils/enums';

// Cross-entity keyword search (HLD Section 14.6, FR-0.7). Every authenticated
// role can search; results are already filtered server-side to what that
// role's visibility level permits (see server/src/services/searchService.js)
// — a Sales search never returns a COMPLIANCE_ONLY record or permit.
export default function SearchPage() {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [country, setCountry] = useState('');
  const [workerType, setWorkerType] = useState('');
  const [status, setStatus] = useState('');
  const [type, setType] = useState('');
  const [results, setResults] = useState([]);
  const [pagination, setPagination] = useState({ total: 0 });
  const [counts, setCounts] = useState({ compliance_record: 0, work_permit: 0 });
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const filters = { q, country, workerType, status, type };
  const filterKey = JSON.stringify(filters);

  useEffect(() => {
    setLoading(true);
    searchService
      .search({ ...filters, page: page + 1, limit: rowsPerPage })
      .then(({ data, pagination: p, counts: c }) => {
        setResults(data);
        setPagination(p);
        setCounts(c);
        setLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, rowsPerPage, filterKey]);

  const [lastFilterKey, setLastFilterKey] = useState(filterKey);
  if (filterKey !== lastFilterKey) {
    setLastFilterKey(filterKey);
    setPage(0);
  }

  const hasActiveFilters = Boolean(q.trim() || country || workerType || status || type);
  const clearFilters = () => {
    setQ('');
    setCountry('');
    setWorkerType('');
    setStatus('');
    setType('');
  };

  return (
    <Box>
      <AppBreadcrumbs items={[{ label: 'Dashboard', href: '/' }, { label: 'Search' }]} />

      <PageHeader
        title="Search"
        subtitle="Search across compliance content and work permits you have access to."
      />

      <Paper variant="outlined" sx={{ p: 2.5, mb: 3 }}>
        <Stack spacing={2}>
          <TextField
            placeholder="Search by title, summary, or description…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            fullWidth
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchOutlinedIcon fontSize="small" color="action" />
                  </InputAdornment>
                ),
              },
            }}
          />
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} useFlexGap sx={{ flexWrap: 'wrap' }}>
            <TextField
              select
              label="Type"
              value={type}
              onChange={(e) => setType(e.target.value)}
              size="small"
              sx={{ minWidth: 180 }}
            >
              <MenuItem value="">All Types</MenuItem>
              {TARGET_TYPES.map((t) => (
                <MenuItem key={t} value={t}>
                  {TARGET_TYPE_LABELS[t]}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Country"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              size="small"
              sx={{ minWidth: 170 }}
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
              label="Worker Type"
              value={workerType}
              onChange={(e) => setWorkerType(e.target.value)}
              size="small"
              sx={{ minWidth: 170 }}
            >
              <MenuItem value="">All Worker Types</MenuItem>
              {WORKER_TYPES.map((wt) => (
                <MenuItem key={wt} value={wt}>
                  {WORKER_TYPE_LABELS[wt]}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              size="small"
              sx={{ minWidth: 150 }}
            >
              <MenuItem value="">All Statuses</MenuItem>
              {CONTENT_STATUSES.map((s) => (
                <MenuItem key={s} value={s}>
                  {CONTENT_STATUS_LABELS[s]}
                </MenuItem>
              ))}
            </TextField>
            {hasActiveFilters && (
              <Typography
                variant="body2"
                color="primary"
                sx={{ alignSelf: 'center', cursor: 'pointer', whiteSpace: 'nowrap' }}
                onClick={clearFilters}
              >
                Clear Filters
              </Typography>
            )}
          </Stack>
        </Stack>
      </Paper>

      {!loading && pagination.total > 0 && (
        <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
          <Chip size="small" label={`${pagination.total} results`} />
          <Chip size="small" variant="outlined" label={`${counts.compliance_record} compliance records`} />
          <Chip size="small" variant="outlined" label={`${counts.work_permit} work permits`} />
        </Stack>
      )}

      <Paper variant="outlined">
        {!loading && results.length === 0 && (
          <Stack spacing={1} sx={{ alignItems: 'center', py: 6 }}>
            <InboxOutlinedIcon fontSize="large" color="disabled" />
            <Typography variant="body1" color="text.secondary">
              {hasActiveFilters || q.trim() ? 'No results match your search.' : 'Start typing to search.'}
            </Typography>
          </Stack>
        )}

        <Stack divider={<Divider />}>
          {results.map((result) => (
            <Box
              key={`${result.type}-${result.id}`}
              onClick={() => navigate(result.href)}
              sx={{ p: 2.5, cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
            >
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 0.5, flexWrap: 'wrap' }} useFlexGap>
                <Chip
                  size="small"
                  color={result.type === 'compliance_record' ? 'primary' : 'secondary'}
                  label={TARGET_TYPE_LABELS[result.type]}
                />
                <Typography variant="subtitle1" fontWeight={600}>
                  {result.title}
                </Typography>
              </Stack>
              {result.snippet && (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  {result.snippet}
                </Typography>
              )}
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }} useFlexGap>
                <Typography variant="caption" color="text.secondary">
                  {countryName(result.countryCode)}
                </Typography>
                <WorkerTypeChip workerType={result.workerType} />
                <VisibilityBadge visibility={result.visibility} />
                <StatusChip status={result.status} />
              </Stack>
            </Box>
          ))}
        </Stack>

        {pagination.total > 0 && (
          <>
            <Divider />
            <TablePagination
              component="div"
              count={pagination.total}
              page={page}
              onPageChange={(_e, newPage) => setPage(newPage)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(e) => {
                setRowsPerPage(parseInt(e.target.value, 10));
                setPage(0);
              }}
              rowsPerPageOptions={[10, 20, 50]}
            />
          </>
        )}
      </Paper>
    </Box>
  );
}
