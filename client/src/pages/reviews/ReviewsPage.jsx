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
  Alert,
  CircularProgress,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import FilterAltOutlinedIcon from '@mui/icons-material/FilterAltOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import ArchiveOutlinedIcon from '@mui/icons-material/ArchiveOutlined';
import InboxOutlinedIcon from '@mui/icons-material/InboxOutlined';
import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import HourglassEmptyOutlinedIcon from '@mui/icons-material/HourglassEmptyOutlined';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import PageHeader from '../../components/common/PageHeader';
import AppBreadcrumbs from '../../components/common/AppBreadcrumbs';
import StatusChip from '../../components/common/StatusChip';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import reviewService from '../../api/reviewService';
import ReviewNotifications from './ReviewNotifications';
import { REVIEW_STATUSES, REVIEW_STATUS_LABELS, TARGET_TYPES, TARGET_TYPE_LABELS } from '../../utils/enums';

const SUMMARY_CARD_CONFIG = [
  { key: 'total', label: 'Total Requests', icon: FactCheckOutlinedIcon, color: 'primary' },
  { key: 'PENDING', label: 'Pending', icon: HourglassEmptyOutlinedIcon, color: 'warning' },
  { key: 'APPROVED', label: 'Approved', icon: CheckCircleOutlinedIcon, color: 'success' },
  { key: 'ARCHIVED', label: 'Archived', icon: Inventory2OutlinedIcon, color: 'default' },
];

export default function ReviewsPage() {
  const navigate = useNavigate();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [targetType, setTargetType] = useState('');
  const [status, setStatus] = useState('');
  const [archiveTarget, setArchiveTarget] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [error, setError] = useState('');
  const [archiving, setArchiving] = useState(false);

  const fetchReviews = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await reviewService.list();
      setReviews(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load review requests.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    reviewService.list()
      .then((data) => { if (active) setReviews(data); })
      .catch((err) => { if (active) setError(err.response?.data?.message || 'Could not load review requests.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const filtered = useMemo(() => {
    let result = reviews;
    if (targetType) result = result.filter((r) => r.targetType === targetType);
    if (status) result = result.filter((r) => r.reviewStatus === status);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter((r) =>
        r.title.toLowerCase().includes(q) || (r.description || '').toLowerCase().includes(q)
      );
    }
    return result;
  }, [reviews, search, targetType, status]);

  // Reset to the first page whenever the filters change. Adjusting state
  // during render (rather than in an effect) avoids an extra render pass.
  const filterKey = `${search}|${targetType}|${status}`;
  const [lastFilterKey, setLastFilterKey] = useState(filterKey);
  if (filterKey !== lastFilterKey) {
    setLastFilterKey(filterKey);
    setPage(0);
  }

  const summaryCounts = useMemo(
    () => ({
      total: reviews.length,
      PENDING: reviews.filter((r) => r.reviewStatus === 'PENDING').length,
      APPROVED: reviews.filter((r) => r.reviewStatus === 'APPROVED').length,
      ARCHIVED: reviews.filter((r) => r.reviewStatus === 'ARCHIVED').length,
    }),
    [reviews]
  );

  const paged = useMemo(
    () => filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage),
    [filtered, page, rowsPerPage]
  );

  const hasActiveFilters = Boolean(search.trim() || targetType || status);

  const clearFilters = () => {
    setSearch('');
    setTargetType('');
    setStatus('');
  };

  const handleConfirmArchive = async () => {
    if (!archiveTarget || archiving) return;
    setArchiving(true);
    setError('');
    try {
      await reviewService.archive(archiveTarget.id);
      setArchiveTarget(null);
      await fetchReviews();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not archive the review request.');
    } finally {
      setArchiving(false);
    }
  };

  return (
    <Box>
      <AppBreadcrumbs items={[{ label: 'Dashboard', href: '/' }, { label: 'Review & Approval' }]} />

      <PageHeader
        title="Review & Approval Workflow"
        subtitle="Create, view, update, and archive review requests."
        actions={<Stack direction="row" spacing={1} alignItems="center">
          <ReviewNotifications />
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/reviews/new')}>
            New Review Request
          </Button>
        </Stack>}
      />

      {error && <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>{error}</Alert>}

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
            placeholder="Search by title or description"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            fullWidth
            size="small"
          />
          <TextField
            select
            label="Target Type"
            value={targetType}
            onChange={(e) => setTargetType(e.target.value)}
            size="small"
            sx={{ minWidth: 180 }}
          >
            <MenuItem value="">All Target Types</MenuItem>
            {TARGET_TYPES.map((t) => (
              <MenuItem key={t} value={t}>
                {TARGET_TYPE_LABELS[t]}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label="Status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            size="small"
            sx={{ minWidth: 180 }}
          >
            <MenuItem value="">All Statuses</MenuItem>
            {REVIEW_STATUSES.map((s) => (
              <MenuItem key={s} value={s}>
                {REVIEW_STATUS_LABELS[s]}
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
              <TableCell>Review Request</TableCell>
              <TableCell>Target</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading && (
              <TableRow><TableCell colSpan={4} align="center"><CircularProgress size={28} sx={{ my: 4 }} /></TableCell></TableRow>
            )}
            {!loading && filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={4}>
                  <Stack alignItems="center" spacing={1} sx={{ py: 5 }}>
                    <InboxOutlinedIcon fontSize="large" color="disabled" />
                    <Typography variant="body1" color="text.secondary">
                      {reviews.length === 0
                        ? 'No review requests yet.'
                        : 'No review requests match your filters.'}
                    </Typography>
                    {reviews.length === 0 ? (
                      <Button variant="contained" size="small" onClick={() => navigate('/reviews/new')}>
                        Create your first review request
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
            {paged.map((review) => (
              <TableRow key={review.id} hover>
                <TableCell>
                  <Typography variant="body2" fontWeight={600}>
                    {review.title}
                  </Typography>
                </TableCell>
                <TableCell>
                  {TARGET_TYPE_LABELS[review.targetType] || review.targetType} #{review.targetId}
                </TableCell>
                <TableCell>
                  <StatusChip status={review.reviewStatus} />
                </TableCell>
                <TableCell align="right">
                  <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                    <Tooltip title="View">
                      <IconButton size="small" onClick={() => navigate(`/reviews/${review.id}`)}>
                        <VisibilityOutlinedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Edit">
                      <IconButton size="small" onClick={() => navigate(`/reviews/${review.id}/edit`)}>
                        <EditOutlinedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={review.reviewStatus === 'ARCHIVED' ? 'Already archived' : 'Archive'}>
                      <span>
                        <IconButton
                          size="small"
                          color="error"
                          disabled={review.reviewStatus === 'ARCHIVED'}
                          onClick={() => setArchiveTarget(review)}
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
        title="Archive review request?"
        message={
          archiveTarget
            ? `"${archiveTarget.title}" will be marked as Archived. It will not be deleted and can still be viewed later.`
            : ''
        }
        confirmLabel="Archive Request"
        confirmColor="error"
        onConfirm={handleConfirmArchive}
        onCancel={() => setArchiveTarget(null)}
      />
    </Box>
  );
}
