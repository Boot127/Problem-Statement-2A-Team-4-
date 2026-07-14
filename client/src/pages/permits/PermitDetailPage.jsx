import { useEffect, useState } from 'react';
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
} from '@mui/material';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import ArchiveOutlinedIcon from '@mui/icons-material/ArchiveOutlined';
import PublicOutlinedIcon from '@mui/icons-material/PublicOutlined';
import ScheduleOutlinedIcon from '@mui/icons-material/ScheduleOutlined';
import EventAvailableOutlinedIcon from '@mui/icons-material/EventAvailableOutlined';
import PaidOutlinedIcon from '@mui/icons-material/PaidOutlined';
import LaunchOutlinedIcon from '@mui/icons-material/LaunchOutlined';
import PageHeader from '../../components/common/PageHeader';
import AppBreadcrumbs from '../../components/common/AppBreadcrumbs';
import StatusChip from '../../components/common/StatusChip';
import WorkerTypeChip from '../../components/common/WorkerTypeChip';
import VisibilityBadge from '../../components/common/VisibilityBadge';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import permitService from '../../api/permitService';
import { countryName } from '../../utils/countries';

function InfoCard({ label, value, icon: Icon }) {
  return (
    <Card variant="outlined">
      <CardContent>
        <Stack direction="row" spacing={2} alignItems="center">
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

export default function PermitDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [permit, setPermit] = useState(undefined);
  const [confirmArchive, setConfirmArchive] = useState(false);

  const load = () => {
    permitService.getById(id).then(setPermit);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (permit === undefined) {
    return <Typography>Loading…</Typography>;
  }

  if (permit === null) {
    return (
      <Box>
        <AppBreadcrumbs items={[{ label: 'Dashboard', href: '/' }, { label: 'Work Permits', href: '/permits' }, { label: 'Not Found' }]} />
        <Typography variant="h6" sx={{ mb: 2 }}>
          Work permit not found.
        </Typography>
        <Button component={RouterLink} to="/permits" variant="contained">
          Back to Work Permits
        </Button>
      </Box>
    );
  }

  const handleArchive = () => {
    permitService.archive(permit.id).then(() => {
      setConfirmArchive(false);
      load();
    });
  };

  return (
    <Box>
      <AppBreadcrumbs
        items={[
          { label: 'Dashboard', href: '/' },
          { label: 'Work Permits', href: '/permits' },
          { label: permit.title },
        ]}
      />

      <PageHeader
        title={permit.title}
        subtitle={permit.permitType}
        actions={
          <Stack direction="row" spacing={1}>
            <Button
              variant="outlined"
              startIcon={<EditOutlinedIcon />}
              onClick={() => navigate(`/permits/${permit.id}/edit`)}
            >
              Edit
            </Button>
            <Button
              variant="outlined"
              color="error"
              startIcon={<ArchiveOutlinedIcon />}
              disabled={permit.status === 'ARCHIVED'}
              onClick={() => setConfirmArchive(true)}
            >
              Archive
            </Button>
          </Stack>
        }
      />

      <Stack direction="row" spacing={1} sx={{ mb: 3 }}>
        <StatusChip status={permit.status} />
        <WorkerTypeChip workerType={permit.workerType} />
        <VisibilityBadge visibility={permit.visibility} />
      </Stack>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(4, 1fr)' },
          gap: 2,
          mb: 3,
        }}
      >
        <InfoCard label="Country" value={countryName(permit.countryCode)} icon={PublicOutlinedIcon} />
        <InfoCard
          label="Processing Time"
          value={permit.processingTimeDays ? `${permit.processingTimeDays} days` : '—'}
          icon={ScheduleOutlinedIcon}
        />
        <InfoCard
          label="Validity"
          value={permit.validityMonths ? `${permit.validityMonths} months` : '—'}
          icon={EventAvailableOutlinedIcon}
        />
        <InfoCard
          label="Government Fee"
          value={
            permit.governmentFee || permit.governmentFee === 0
              ? `${permit.governmentFee} ${permit.currencyCode || ''}`.trim()
              : '—'
          }
          icon={PaidOutlinedIcon}
        />
      </Box>

      <Section title="Description">{permit.description}</Section>
      <Section title="Eligibility Criteria">{permit.eligibilityCriteria}</Section>

      <Paper variant="outlined" sx={{ p: 3 }}>
        <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1.5 }}>
          Source
        </Typography>
        {permit.sourceUrl ? (
          <Link
            href={permit.sourceUrl}
            target="_blank"
            rel="noopener"
            sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}
          >
            {permit.sourceUrl}
            <LaunchOutlinedIcon fontSize="inherit" />
          </Link>
        ) : (
          <Typography variant="body2" color="text.secondary">
            No source URL provided.
          </Typography>
        )}
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
          Last updated {permit.updatedAt ? new Date(permit.updatedAt).toLocaleString() : '—'}
        </Typography>
      </Paper>

      <ConfirmDialog
        open={confirmArchive}
        title="Archive work permit?"
        message={`"${permit.title}" will be marked as Archived. It will not be deleted and can still be viewed or restored later.`}
        confirmLabel="Archive Permit"
        confirmColor="error"
        onConfirm={handleArchive}
        onCancel={() => setConfirmArchive(false)}
      />
    </Box>
  );
}
