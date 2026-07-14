import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import FilterAltOutlinedIcon from '@mui/icons-material/FilterAltOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import ArchiveOutlinedIcon from '@mui/icons-material/ArchiveOutlined';
import InboxOutlinedIcon from '@mui/icons-material/InboxOutlined';
import AssignmentIndOutlinedIcon from '@mui/icons-material/AssignmentIndOutlined';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import EditNoteOutlinedIcon from '@mui/icons-material/EditNoteOutlined';
import ArchiveOutlinedIconAlt from '@mui/icons-material/Inventory2Outlined';
import PageHeader from '../../components/common/PageHeader';
import AppBreadcrumbs from '../../components/common/AppBreadcrumbs';
import StatusChip from '../../components/common/StatusChip';
import WorkerTypeChip from '../../components/common/WorkerTypeChip';
import VisibilityBadge from '../../components/common/VisibilityBadge';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import permitService from '../../api/permitService';
import { COUNTRIES, countryName } from '../../utils/countries';
import { PERMIT_STATUSES, PERMIT_STATUS_LABELS } from '../../utils/enums';

const SUMMARY_CARD_CONFIG = [
  { key: 'total', label: 'Total Permits', icon: AssignmentIndOutlinedIcon, color: 'primary' },
  { key: 'PUBLISHED', label: 'Published', icon: CheckCircleOutlinedIcon, color: 'success' },
  { key: 'DRAFT', label: 'Draft', icon: EditNoteOutlinedIcon, color: 'warning' },
  { key: 'ARCHIVED', label: 'Archived', icon: ArchiveOutlinedIconAlt, color: 'default' },
];

export default function PermitListPage() {
  const navigate = useNavigate();
  const [permits, setPermits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [country, setCountry] = useState('');
  const [status, setStatus] = useState('');
  const [archiveTarget, setArchiveTarget] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);

  const fetchPermits = () =>
    permitService.list().then((data) => {
      setPermits(data);
      setLoading(false);
    });

  useEffect(() => {
    fetchPermits();
  }, []);

  const filtered = useMemo(() => {
    let result = permits;
    if (country) result = result.filter((p) => p.countryCode === country);
    if (status) result = result.filter((p) => p.status === status);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.permitType.toLowerCase().includes(q) ||
          countryName(p.countryCode).toLowerCase().includes(q)
      );
    }
    return result;
  }, [permits, search, country, status]);

  // Reset to the first page whenever the filters change. Adjusting state
  // during render (rather than in an effect) avoids an extra render pass.
  const filterKey = `${search}|${country}|${status}`;
  const [lastFilterKey, setLastFilterKey] = useState(filterKey);
  if (filterKey !== lastFilterKey) {
    setLastFilterKey(filterKey);
    setPage(0);
  }

  const summaryCounts = useMemo(
    () => ({
      total: permits.length,
      PUBLISHED: permits.filter((p) => p.status === 'PUBLISHED').length,
      DRAFT: permits.filter((p) => p.status === 'DRAFT').length,
      ARCHIVED: permits.filter((p) => p.status === 'ARCHIVED').length,
    }),
    [permits]
  );

  const paged = useMemo(
    () => filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage),
    [filtered, page, rowsPerPage]
  );

  const hasActiveFilters = Boolean(search.trim() || country || status);

  const clearFilters = () => {
    setSearch('');
    setCountry('');
    setStatus('');
  };

  const handleConfirmArchive = () => {
    if (!archiveTarget) return;
    permitService.archive(archiveTarget.id).then(() => {
      setArchiveTarget(null);
      fetchPermits();
    });
  };

  return (
    <Box>
      <AppBreadcrumbs items={[{ label: 'Dashboard', href: '/' }, { label: 'Work Permits' }]} />

      <PageHeader
        title="Work Permit Management"
        subtitle="Create, view, update, and archive work-permit types per country."
        actions={
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/permits/new')}
          >
            New Permit
          </Button>
        }
      />

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
              <Stack direction="row" spacing={2} alignItems="center">
                <Avatar sx={{ bgcolor: `${color}.main`, width: 40, height: 40 }}>
                  <Icon fontSize="small" />
                </Avatar>
                <Box>
                  <Typography variant="h6" fontWeight={700}>
                    {summaryCounts[key]}
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

      <Paper variant="outlined" sx={{ p: 2.5, mb: 3 }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
          <FilterAltOutlinedIcon fontSize="small" color="action" />
          <Typography variant="subtitle2" color="text.secondary">
            Search &amp; Filter
          </Typography>
        </Stack>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField
            label="Search"
            placeholder="Search by title, permit type, or country"
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
          {hasActiveFilters && (
            <Button onClick={clearFilters} sx={{ whiteSpace: 'nowrap' }}>
              Clear Filters
            </Button>
          )}
        </Stack>
      </Paper>

      <TableContainer component={Paper} variant="outlined" sx={{ overflowX: 'auto' }}>
        <Table sx={{ minWidth: 720 }}>
          <TableHead>
            <TableRow>
              <TableCell>Permit</TableCell>
              <TableCell>Country</TableCell>
              <TableCell>Worker Type</TableCell>
              <TableCell>Visibility</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {!loading && filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={6}>
                  <Stack alignItems="center" spacing={1} sx={{ py: 5 }}>
                    <InboxOutlinedIcon fontSize="large" color="disabled" />
                    <Typography variant="body1" color="text.secondary">
                      {permits.length === 0
                        ? 'No work permits yet.'
                        : 'No work permits match your filters.'}
                    </Typography>
                    {permits.length === 0 ? (
                      <Button variant="contained" size="small" onClick={() => navigate('/permits/new')}>
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
            {paged.map((permit) => (
              <TableRow key={permit.id} hover>
                <TableCell>
                  <Typography variant="body2" fontWeight={600}>
                    {permit.title}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {permit.permitType}
                  </Typography>
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
                <TableCell align="right">
                  <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                    <Tooltip title="View">
                      <IconButton size="small" onClick={() => navigate(`/permits/${permit.id}`)}>
                        <VisibilityOutlinedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Edit">
                      <IconButton size="small" onClick={() => navigate(`/permits/${permit.id}/edit`)}>
                        <EditOutlinedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={permit.status === 'ARCHIVED' ? 'Already archived' : 'Archive'}>
                      <span>
                        <IconButton
                          size="small"
                          color="error"
                          disabled={permit.status === 'ARCHIVED'}
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
        {filtered.length > 0 && (
          <>
            <Divider />
            <TablePagination
              component="div"
              count={filtered.length}
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
    </Box>
  );
}
