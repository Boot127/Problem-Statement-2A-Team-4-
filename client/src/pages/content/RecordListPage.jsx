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
  Menu,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import FilterAltOutlinedIcon from '@mui/icons-material/FilterAltOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import ArchiveOutlinedIcon from '@mui/icons-material/ArchiveOutlined';
import InboxOutlinedIcon from '@mui/icons-material/InboxOutlined';
import ArticleOutlinedIcon from '@mui/icons-material/ArticleOutlined';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import EditNoteOutlinedIcon from '@mui/icons-material/EditNoteOutlined';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import PageHeader from '../../components/common/PageHeader';
import AppBreadcrumbs from '../../components/common/AppBreadcrumbs';
import StatusChip from '../../components/common/StatusChip';
import WorkerTypeChip from '../../components/common/WorkerTypeChip';
import VisibilityBadge from '../../components/common/VisibilityBadge';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import recordService from '../../api/recordService';
import { COUNTRIES, countryName } from '../../utils/countries';
import { useAuth } from '../../context/AuthContext';
import { buildRecordsCsv, downloadCsv } from '../../utils/csvExport';
import {
  CONTENT_STATUSES,
  CONTENT_STATUS_LABELS,
  RECORD_CATEGORIES,
  RECORD_CATEGORY_LABELS,
  WORKER_TYPES,
  WORKER_TYPE_LABELS,
} from '../../utils/enums';

const SUMMARY_CARD_CONFIG = [
  { key: 'total', label: 'Total Records', icon: ArticleOutlinedIcon, color: 'primary' },
  { key: 'PUBLISHED', label: 'Published', icon: CheckCircleOutlinedIcon, color: 'success' },
  { key: 'DRAFT', label: 'Draft', icon: EditNoteOutlinedIcon, color: 'warning' },
  { key: 'ARCHIVED', label: 'Archived', icon: Inventory2OutlinedIcon, color: 'default' },
];

export default function RecordListPage() {
  const navigate = useNavigate();
  const { canEdit } = useAuth();
  const [records, setRecords] = useState([]);
  const [pagination, setPagination] = useState({ total: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [country, setCountry] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');
  const [workerType, setWorkerType] = useState('');
  const [archiveTarget, setArchiveTarget] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [exportAnchor, setExportAnchor] = useState(null);

  const filters = { search, country, category, status, workerType };
  const filterKey = JSON.stringify(filters);

  // Filtering/pagination is server-side (NFR-2: list endpoints are
  // paginated and never return unbounded result sets).
  const fetchRecords = () => {
    setLoading(true);
    return recordService
      .list({ ...filters, page: page + 1, limit: rowsPerPage })
      .then(({ data, pagination: p }) => {
        setRecords(data);
        setPagination(p);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchRecords();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, rowsPerPage, filterKey]);

  // Reset to the first page whenever the filters change.
  const [lastFilterKey, setLastFilterKey] = useState(filterKey);
  if (filterKey !== lastFilterKey) {
    setLastFilterKey(filterKey);
    setPage(0);
  }

  const summaryCounts = useMemo(
    () => ({
      total: pagination.total ?? 0,
      PUBLISHED: records.filter((r) => r.status === 'PUBLISHED').length,
      DRAFT: records.filter((r) => r.status === 'DRAFT').length,
      ARCHIVED: records.filter((r) => r.status === 'ARCHIVED').length,
    }),
    [records, pagination]
  );

  const hasActiveFilters = Boolean(search.trim() || country || category || status || workerType);

  const clearFilters = () => {
    setSearch('');
    setCountry('');
    setCategory('');
    setStatus('');
    setWorkerType('');
  };

  const handleConfirmArchive = () => {
    if (!archiveTarget) return;
    recordService.archive(archiveTarget.id).then(() => {
      setArchiveTarget(null);
      fetchRecords();
    });
  };

  const handleExportCsv = async () => {
    setExportAnchor(null);
    // Exports everything matching the current filters, up to the API's max
    // page size (NFR-2 caps list endpoints at 100).
    const { data } = await recordService.list({ ...filters, page: 1, limit: 100 });
    downloadCsv('compliance-records.csv', buildRecordsCsv(data));
  };

  const handleExportPdf = () => {
    setExportAnchor(null);
    window.print();
  };

  return (
    <Box>
      <AppBreadcrumbs items={[{ label: 'Dashboard', href: '/' }, { label: 'Compliance Content' }]} />

      <PageHeader
        title="Compliance Content Management"
        subtitle="Create, view, update, and archive labour-law and statutory-benefit records per country."
        actions={
          <Stack direction="row" spacing={1}>
            <Button
              variant="outlined"
              startIcon={<FileDownloadOutlinedIcon />}
              onClick={(e) => setExportAnchor(e.currentTarget)}
            >
              Export
            </Button>
            <Menu anchorEl={exportAnchor} open={Boolean(exportAnchor)} onClose={() => setExportAnchor(null)}>
              <MenuItem onClick={handleExportCsv}>Export as CSV</MenuItem>
              <MenuItem onClick={handleExportPdf}>Export as PDF (Print)</MenuItem>
            </Menu>
            {canEdit && (
              <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/content/new')}>
                New Record
              </Button>
            )}
          </Stack>
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
              <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
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
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 2 }}>
          <FilterAltOutlinedIcon fontSize="small" color="action" />
          <Typography variant="subtitle2" color="text.secondary">
            Search &amp; Filter
          </Typography>
        </Stack>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} useFlexGap sx={{ flexWrap: 'wrap' }}>
          <TextField
            label="Search"
            placeholder="Search by title, summary, or full text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            fullWidth
            size="small"
            sx={{ minWidth: 220 }}
          />
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
            label="Category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            size="small"
            sx={{ minWidth: 180 }}
          >
            <MenuItem value="">All Categories</MenuItem>
            {RECORD_CATEGORIES.map((c) => (
              <MenuItem key={c} value={c}>
                {RECORD_CATEGORY_LABELS[c]}
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
          {hasActiveFilters && (
            <Button onClick={clearFilters} sx={{ whiteSpace: 'nowrap' }}>
              Clear Filters
            </Button>
          )}
        </Stack>
      </Paper>

      <TableContainer component={Paper} variant="outlined" sx={{ overflowX: 'auto' }}>
        <Table sx={{ minWidth: 780 }}>
          <TableHead>
            <TableRow>
              <TableCell>Record</TableCell>
              <TableCell>Country</TableCell>
              <TableCell>Worker Type</TableCell>
              <TableCell>Visibility</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {!loading && records.length === 0 && (
              <TableRow>
                <TableCell colSpan={6}>
                  <Stack spacing={1} sx={{ alignItems: 'center', py: 5 }}>
                    <InboxOutlinedIcon fontSize="large" color="disabled" />
                    <Typography variant="body1" color="text.secondary">
                      {hasActiveFilters ? 'No records match your filters.' : 'No labour laws found.'}
                    </Typography>
                    {hasActiveFilters ? (
                      <Button size="small" onClick={clearFilters}>
                        Clear filters
                      </Button>
                    ) : (
                      canEdit && (
                        <Button variant="contained" size="small" onClick={() => navigate('/content/new')}>
                          Create your first record
                        </Button>
                      )
                    )}
                  </Stack>
                </TableCell>
              </TableRow>
            )}
            {records.map((record) => (
              <TableRow
                key={record.id}
                hover
                onClick={() => navigate(`/content/${record.id}`)}
                sx={{ cursor: 'pointer' }}
              >
                <TableCell>
                  <Typography variant="body2" fontWeight={600}>
                    {record.title}
                  </Typography>
                  {record.summary && (
                    <Typography variant="caption" color="text.secondary">
                      {record.summary}
                    </Typography>
                  )}
                </TableCell>
                <TableCell>{countryName(record.countryCode)}</TableCell>
                <TableCell>
                  <WorkerTypeChip workerType={record.workerType} />
                </TableCell>
                <TableCell>
                  <VisibilityBadge visibility={record.visibility} />
                </TableCell>
                <TableCell>
                  <StatusChip status={record.status} />
                </TableCell>
                <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                  <Stack direction="row" spacing={0.5} sx={{ justifyContent: 'flex-end' }}>
                    <Tooltip title="View">
                      <IconButton size="small" onClick={() => navigate(`/content/${record.id}`)}>
                        <VisibilityOutlinedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    {canEdit && (
                      <Tooltip title="Edit">
                        <IconButton size="small" onClick={() => navigate(`/content/${record.id}/edit`)}>
                          <EditOutlinedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                    {canEdit && (
                      <Tooltip title={record.status === 'ARCHIVED' ? 'Already archived' : 'Archive'}>
                        <span>
                          <IconButton
                            size="small"
                            color="error"
                            disabled={record.status === 'ARCHIVED'}
                            onClick={() => setArchiveTarget(record)}
                          >
                            <ArchiveOutlinedIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                    )}
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
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
      </TableContainer>

      <ConfirmDialog
        open={Boolean(archiveTarget)}
        title="Archive compliance record?"
        message={
          archiveTarget
            ? `"${archiveTarget.title}" will be marked as Archived. It will not be deleted and can still be viewed or restored later.`
            : ''
        }
        confirmLabel="Archive Record"
        confirmColor="error"
        onConfirm={handleConfirmArchive}
        onCancel={() => setArchiveTarget(null)}
      />
    </Box>
  );
}
