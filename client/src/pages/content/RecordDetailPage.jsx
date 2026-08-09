import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Paper,
  Typography,
  Button,
  Stack,
  Avatar,
  Link,
  IconButton,
  Tooltip,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
} from '@mui/material';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import ArchiveOutlinedIcon from '@mui/icons-material/ArchiveOutlined';
import PublicOutlinedIcon from '@mui/icons-material/PublicOutlined';
import CategoryOutlinedIcon from '@mui/icons-material/CategoryOutlined';
import EventOutlinedIcon from '@mui/icons-material/EventOutlined';
import HistoryOutlinedIcon from '@mui/icons-material/HistoryOutlined';
import LaunchOutlinedIcon from '@mui/icons-material/LaunchOutlined';
import UploadFileOutlinedIcon from '@mui/icons-material/UploadFileOutlined';
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined';
import AddIcon from '@mui/icons-material/Add';
import PageHeader from '../../components/common/PageHeader';
import AppBreadcrumbs from '../../components/common/AppBreadcrumbs';
import StatusChip from '../../components/common/StatusChip';
import WorkerTypeChip from '../../components/common/WorkerTypeChip';
import VisibilityBadge from '../../components/common/VisibilityBadge';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import recordService from '../../api/recordService';
import { apiOrigin } from '../../api/axiosClient';
import { countryName } from '../../utils/countries';
import {
  RECORD_CATEGORY_LABELS,
  WORKER_TYPES,
  WORKER_TYPE_LABELS,
  ACCEPTED_ATTACHMENT_TYPES,
  ACCEPTED_ATTACHMENT_LABEL,
  MAX_ATTACHMENT_SIZE_BYTES,
} from '../../utils/enums';
import { useAuth } from '../../context/AuthContext';
import { emptyComponent } from './recordValidation';

function InfoCard({ label, value, icon: Icon }) {
  return (
    <Card variant="outlined">
      <CardContent>
        <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
          <Avatar sx={{ bgcolor: 'primary.main', width: 40, height: 40 }}>
            <Icon fontSize="small" />
          </Avatar>
          <Box>
            <Typography variant="subtitle1" fontWeight={700}>
              {value}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {label}
            </Typography>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}

function Section({ title, children }) {
  return (
    <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
      <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1.5 }}>
        {title}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap' }}>
        {children || 'Not provided.'}
      </Typography>
    </Paper>
  );
}

function validateAttachment(file) {
  if (!ACCEPTED_ATTACHMENT_TYPES.includes(file.type)) {
    return `File type not supported. Accepted formats: ${ACCEPTED_ATTACHMENT_LABEL}.`;
  }
  if (file.size > MAX_ATTACHMENT_SIZE_BYTES) {
    return 'File size exceeds maximum limit of 25MB.';
  }
  return null;
}

export default function RecordDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { canEdit } = useAuth();
  const [record, setRecord] = useState(undefined);
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [componentDialogOpen, setComponentDialogOpen] = useState(false);
  const [componentDraft, setComponentDraft] = useState(emptyComponent);
  const [savingComponent, setSavingComponent] = useState(false);
  const fileInputRef = useRef(null);

  const load = () => {
    recordService.getById(id).then(setRecord);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (record === undefined) {
    return <Typography>Loading…</Typography>;
  }

  if (record === null) {
    return (
      <Box>
        <AppBreadcrumbs
          items={[
            { label: 'Dashboard', href: '/' },
            { label: 'Compliance Content', href: '/content' },
            { label: 'Not Found' },
          ]}
        />
        <Typography variant="h6" sx={{ mb: 2 }}>
          Compliance record not found.
        </Typography>
        <Button component={RouterLink} to="/content" variant="contained">
          Back to Compliance Content
        </Button>
      </Box>
    );
  }

  const handleArchive = () => {
    recordService.archive(record.id).then(() => {
      setConfirmArchive(false);
      load();
    });
  };

  const handleFileSelected = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    const error = validateAttachment(file);
    if (error) {
      setUploadError(error);
      return;
    }

    setUploadError(null);
    setUploading(true);
    try {
      await recordService.addAttachment(record.id, file);
      load();
    } catch (err) {
      setUploadError(err.response?.data?.message || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleSaveComponent = async () => {
    setSavingComponent(true);
    try {
      await recordService.addComponent(record.id, componentDraft);
      setComponentDialogOpen(false);
      setComponentDraft(emptyComponent);
      load();
    } catch (err) {
      setUploadError(err.response?.data?.message || 'Could not add benefit component.');
    } finally {
      setSavingComponent(false);
    }
  };

  return (
    <Box>
      <AppBreadcrumbs
        items={[
          { label: 'Dashboard', href: '/' },
          { label: 'Compliance Content', href: '/content' },
          { label: record.title },
        ]}
      />

      <PageHeader
        title={record.title}
        subtitle={RECORD_CATEGORY_LABELS[record.category] || record.category}
        actions={
          canEdit && (
            <Stack direction="row" spacing={1}>
              <Button
                variant="outlined"
                startIcon={<EditOutlinedIcon />}
                onClick={() => navigate(`/content/${record.id}/edit`)}
              >
                Edit
              </Button>
              <Button
                variant="outlined"
                color="error"
                startIcon={<ArchiveOutlinedIcon />}
                disabled={record.status === 'ARCHIVED'}
                onClick={() => setConfirmArchive(true)}
              >
                Archive
              </Button>
            </Stack>
          )
        }
      />

      <Stack direction="row" spacing={1} sx={{ mb: 3 }}>
        <StatusChip status={record.status} />
        <WorkerTypeChip workerType={record.workerType} />
        <VisibilityBadge visibility={record.visibility} />
      </Stack>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(4, 1fr)' },
          gap: 2,
          mb: 3,
        }}
      >
        <InfoCard label="Country" value={countryName(record.countryCode)} icon={PublicOutlinedIcon} />
        <InfoCard
          label="Category"
          value={RECORD_CATEGORY_LABELS[record.category] || record.category}
          icon={CategoryOutlinedIcon}
        />
        <InfoCard label="Effective Date" value={record.effectiveDate || '—'} icon={EventOutlinedIcon} />
        <InfoCard label="Version" value={`v${record.version || 1}`} icon={HistoryOutlinedIcon} />
      </Box>

      <Section title="Summary">{record.summary}</Section>
      <Section title="Full Text">{record.fullText}</Section>

      <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
          <Typography variant="subtitle1" fontWeight={600}>
            Benefit Components
          </Typography>
          {canEdit && (
            <Button size="small" startIcon={<AddIcon />} onClick={() => setComponentDialogOpen(true)}>
              Add Component
            </Button>
          )}
        </Stack>
        {(record.benefitComponents || []).length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No benefit components linked to this record.
          </Typography>
        ) : (
          <Stack spacing={1.5}>
            {record.benefitComponents.map((component) => (
              <Paper key={component.id} variant="outlined" sx={{ p: 2 }}>
                <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 1 }}>
                  <Typography variant="subtitle2" fontWeight={600}>
                    {component.componentName}
                  </Typography>
                  <WorkerTypeChip workerType={component.workerType} />
                </Stack>
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
                    gap: 1,
                  }}
                >
                  <Typography variant="body2" color="text.secondary">
                    Employer: {component.employerRate || '—'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Employee: {component.employeeRate || '—'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Cap: {component.capCeiling || 'Uncapped'}
                  </Typography>
                </Box>
                {component.calculationBasis && (
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                    Basis: {component.calculationBasis}
                  </Typography>
                )}
                {component.notes && (
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                    {component.notes}
                  </Typography>
                )}
              </Paper>
            ))}
          </Stack>
        )}
      </Paper>

      <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
          <Typography variant="subtitle1" fontWeight={600}>
            Source Documents
          </Typography>
          {canEdit && (
            <Button
              size="small"
              startIcon={<UploadFileOutlinedIcon />}
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
            >
              {uploading ? 'Uploading…' : 'Upload'}
            </Button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            hidden
            accept=".pdf,.docx,.xlsx,.jpg,.jpeg,.png"
            onChange={handleFileSelected}
          />
        </Stack>

        {uploadError && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setUploadError(null)}>
            {uploadError}
          </Alert>
        )}

        {(record.attachments || []).length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No attachments uploaded yet.
          </Typography>
        ) : (
          <Stack spacing={1}>
            {record.attachments.map((attachment) => (
              <Stack
                key={attachment.id}
                direction="row"
                spacing={1}
                sx={{ alignItems: 'center', py: 1, borderBottom: '1px solid', borderColor: 'divider' }}
              >
                <Tooltip title={attachment.fileName}>
                  <Typography
                    variant="body2"
                    sx={{ maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                  >
                    {attachment.fileName}
                  </Typography>
                </Tooltip>
                <Typography variant="caption" color="text.secondary">
                  {new Date(attachment.uploadedAt).toLocaleDateString()}
                </Typography>
                <Box sx={{ flexGrow: 1 }} />
                <Tooltip title="Download">
                  <IconButton
                    size="small"
                    component="a"
                    href={`${apiOrigin()}${attachment.filePath}`}
                    target="_blank"
                    rel="noopener"
                    download={attachment.fileName}
                  >
                    <DownloadOutlinedIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Stack>
            ))}
          </Stack>
        )}
      </Paper>

      <Paper variant="outlined" sx={{ p: 3 }}>
        <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1.5 }}>
          Source
        </Typography>
        {record.sourceUrl ? (
          <Link
            href={record.sourceUrl}
            target="_blank"
            rel="noopener"
            sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}
          >
            {record.sourceUrl}
            <LaunchOutlinedIcon fontSize="inherit" />
          </Link>
        ) : (
          <Typography variant="body2" color="text.secondary">
            No source URL provided.
          </Typography>
        )}
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
          Last updated {record.updatedAt ? new Date(record.updatedAt).toLocaleString() : '—'}
        </Typography>
      </Paper>

      <ConfirmDialog
        open={confirmArchive}
        title="Archive compliance record?"
        message={`"${record.title}" will be marked as Archived. It will not be deleted and can still be viewed or restored later.`}
        confirmLabel="Archive Record"
        confirmColor="error"
        onConfirm={handleArchive}
        onCancel={() => setConfirmArchive(false)}
      />

      <Dialog open={componentDialogOpen} onClose={() => setComponentDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Benefit Component</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Component Name"
              placeholder="e.g. Pension Fund"
              value={componentDraft.componentName}
              onChange={(e) => setComponentDraft((d) => ({ ...d, componentName: e.target.value }))}
              fullWidth
              autoFocus
            />
            <TextField
              select
              label="Worker Type"
              value={componentDraft.workerType}
              onChange={(e) => setComponentDraft((d) => ({ ...d, workerType: e.target.value }))}
              fullWidth
            >
              {WORKER_TYPES.map((wt) => (
                <MenuItem key={wt} value={wt}>
                  {WORKER_TYPE_LABELS[wt]}
                </MenuItem>
              ))}
            </TextField>
            <Stack direction="row" spacing={2}>
              <TextField
                label="Employer Rate"
                placeholder="e.g. 4.24%"
                value={componentDraft.employerRate}
                onChange={(e) => setComponentDraft((d) => ({ ...d, employerRate: e.target.value }))}
                fullWidth
              />
              <TextField
                label="Employee Rate"
                placeholder="e.g. 2%"
                value={componentDraft.employeeRate}
                onChange={(e) => setComponentDraft((d) => ({ ...d, employeeRate: e.target.value }))}
                fullWidth
              />
            </Stack>
            <TextField
              label="Cap / Ceiling"
              placeholder="e.g. IDR 11,086,300 / month"
              value={componentDraft.capCeiling}
              onChange={(e) => setComponentDraft((d) => ({ ...d, capCeiling: e.target.value }))}
              fullWidth
            />
            <TextField
              label="Calculation Basis"
              placeholder="e.g. monthly gross salary"
              value={componentDraft.calculationBasis}
              onChange={(e) => setComponentDraft((d) => ({ ...d, calculationBasis: e.target.value }))}
              fullWidth
            />
            <TextField
              label="Notes"
              value={componentDraft.notes}
              onChange={(e) => setComponentDraft((d) => ({ ...d, notes: e.target.value }))}
              multiline
              minRows={2}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setComponentDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={savingComponent || !componentDraft.componentName.trim()}
            onClick={handleSaveComponent}
          >
            Add
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
