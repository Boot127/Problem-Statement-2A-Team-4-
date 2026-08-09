import { useEffect, useState } from 'react';
import { Link as RouterLink, useLocation, useParams } from 'react-router-dom';
import { Alert, Box, Button, Divider, Link, Paper, Skeleton, Stack, Typography } from '@mui/material';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import ArchiveOutlinedIcon from '@mui/icons-material/ArchiveOutlined';
import CompareArrowsOutlinedIcon from '@mui/icons-material/CompareArrowsOutlined';
import PrintOutlinedIcon from '@mui/icons-material/PrintOutlined';
import PublicOutlinedIcon from '@mui/icons-material/PublicOutlined';
import ScheduleOutlinedIcon from '@mui/icons-material/ScheduleOutlined';
import EventAvailableOutlinedIcon from '@mui/icons-material/EventAvailableOutlined';
import PaidOutlinedIcon from '@mui/icons-material/PaidOutlined';
import HealthAndSafetyOutlinedIcon from '@mui/icons-material/HealthAndSafetyOutlined';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import RuleOutlinedIcon from '@mui/icons-material/RuleOutlined';
import AccountTreeOutlinedIcon from '@mui/icons-material/AccountTreeOutlined';
import QuestionAnswerOutlinedIcon from '@mui/icons-material/QuestionAnswerOutlined';
import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined';
import LaunchOutlinedIcon from '@mui/icons-material/LaunchOutlined';
import PersonOutlineOutlinedIcon from '@mui/icons-material/PersonOutlineOutlined';
import BusinessOutlinedIcon from '@mui/icons-material/BusinessOutlined';
import AppBreadcrumbs from '../../components/common/AppBreadcrumbs';
import StatusChip from '../../components/common/StatusChip';
import WorkerTypeChip from '../../components/common/WorkerTypeChip';
import VisibilityBadge from '../../components/common/VisibilityBadge';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import PermitStatCard from './PermitStatCard';
import PermitHealthPanel from './PermitHealthPanel';
import PermitProcessOverview from './PermitProcessOverview';
import PermitLocalSearch from './PermitLocalSearch';
import SourceDocumentsPanel from './SourceDocumentsPanel';
import RecordReviewDialog from './RecordReviewDialog';
import PermitAskDialog from './PermitAskDialog';
import PermitEligibilityDialog from './PermitEligibilityDialog';
import PermitGroupMemberships from './PermitGroupMemberships';
import permitService from '../../api/permitService';
import { getApiErrorMessage } from '../../utils/apiError';
import { countryFlag, countryName } from '../../utils/countries';
import {
  getPermitNavigation,
  permitBreadcrumbItems,
  permitNavigationState,
  permitOverviewBack,
} from './permitNavigation';

function SectionHeading({ icon: Icon, title, description }) {
  return (
    <Box sx={{ mb: 1.5 }}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
        <Icon color="primary" fontSize="small" />
        <Typography variant="h6" fontWeight={800}>{title}</Typography>
      </Stack>
      {description && <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>{description}</Typography>}
    </Box>
  );
}

function ProsePanel({ id, icon: Icon, title, children, empty }) {
  return (
    <Paper id={id} variant="outlined" sx={{ p: { xs: 2, sm: 2.5 }, height: '100%', scrollMarginTop: 16 }}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1.25 }}><Icon color="primary" fontSize="small" /><Typography variant="subtitle1" fontWeight={800}>{title}</Typography></Stack>
      <Typography variant="body2" color={children ? 'text.primary' : 'text.disabled'} sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.75 }}>{children || empty}</Typography>
    </Paper>
  );
}

export default function PermitDetailPage() {
  const { id } = useParams();
  const location = useLocation();
  const [permit, setPermit] = useState(undefined);
  const [error, setError] = useState('');
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [reviewError, setReviewError] = useState('');
  const [askOpen, setAskOpen] = useState(false);
  const [eligibilityOpen, setEligibilityOpen] = useState(false);
  const navigation = getPermitNavigation(location);
  const navigationState = permitNavigationState(location);

  const load = () => permitService.getById(id)
    .then((data) => { setPermit(data); setError(''); })
    .catch((err) => { setError(getApiErrorMessage(err)); setPermit((current) => current ?? null); });

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (permit === undefined) {
    return <Stack spacing={2}><Skeleton variant="text" width={240} height={28} /><Skeleton variant="rounded" height={190} /><Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(4,1fr)' }, gap: 2 }}>{[1, 2, 3, 4].map((item) => <Skeleton key={item} variant="rounded" height={100} />)}</Box><Skeleton variant="rounded" height={300} /></Stack>;
  }

  if (!permit) {
    return (
      <Box>
        <AppBreadcrumbs items={[{ label: 'Dashboard', href: '/' }, { label: 'Work Permits', href: navigation.listHref }, { label: 'Unavailable' }]} back={{ label: 'Back to Work Permits', href: navigation.listHref }} />
        <Alert severity="error" sx={{ mb: 2 }}>{error || 'Work permit not found.'}</Alert>
      </Box>
    );
  }

  const hasFee = permit.governmentFee === 0 || Boolean(permit.governmentFee);
  const aiAssisted = String(permit.reviewNotes || '').includes('AI-assisted');

  const handleArchive = async () => {
    setArchiving(true);
    try {
      await permitService.archive(permit.id);
      setConfirmArchive(false);
      await load();
    } catch (err) {
      setError(getApiErrorMessage(err));
      setConfirmArchive(false);
    } finally { setArchiving(false); }
  };

  const handleReview = (values, { setSubmitting }) => {
    setReviewError('');
    permitService.recordReview(permit.id, values)
      .then(load)
      .then(() => setReviewDialogOpen(false))
      .catch((err) => setReviewError(getApiErrorMessage(err)))
      .finally(() => setSubmitting(false));
  };

  return (
    <Box>
      <AppBreadcrumbs
        items={permitBreadcrumbItems(permit, location)}
        back={permitOverviewBack(location)}
      />

      <Paper variant="outlined" sx={{ p: { xs: 2.5, md: 3.5 }, mb: 3, bgcolor: 'primary.dark', color: 'primary.contrastText', borderColor: 'primary.dark' }}>
        <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2.5} sx={{ justifyContent: 'space-between', alignItems: { lg: 'flex-start' } }}>
          <Stack direction="row" spacing={2} sx={{ minWidth: 0 }}>
            <Box aria-hidden="true" sx={{ width: 66, height: 66, flexShrink: 0, borderRadius: 2, display: 'grid', placeItems: 'center', bgcolor: 'rgba(255,255,255,0.12)', fontSize: 42 }}>{countryFlag(permit.countryCode)}</Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="overline" sx={{ opacity: 0.8, letterSpacing: 1.2 }}>Permit Overview</Typography>
              <Typography variant="h3" component="h1" fontWeight={800} sx={{ fontSize: { xs: '1.8rem', md: '2.35rem' }, lineHeight: 1.15 }}>{permit.title}</Typography>
              <Typography variant="body1" sx={{ opacity: 0.85, mt: 0.5 }}>{permit.permitType} · {countryName(permit.countryCode)}</Typography>
              <Stack direction="row" spacing={1} sx={{ mt: 1.5, flexWrap: 'wrap', rowGap: 1, '& .MuiChip-root': { color: 'common.white', borderColor: 'rgba(255,255,255,0.55)' } }}>
                <StatusChip status={permit.status} />
                <WorkerTypeChip workerType={permit.workerType} />
                <VisibilityBadge visibility={permit.visibility} />
              </Stack>
            </Box>
          </Stack>
          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', rowGap: 1 }}>
            <Button color="inherit" startIcon={<QuestionAnswerOutlinedIcon />} onClick={() => setAskOpen(true)}>Ask This Permit</Button>
            <Button color="inherit" startIcon={<FactCheckOutlinedIcon />} onClick={() => setEligibilityOpen(true)} disabled={permit.status === 'ARCHIVED'}>Check Eligibility</Button>
            <Button component={RouterLink} to={`/permits/compare?left=${permit.id}`} state={navigationState} color="inherit" startIcon={<CompareArrowsOutlinedIcon />}>Compare</Button>
            <Button component={RouterLink} to={`/permits/${permit.id}/guide`} state={navigationState} color="inherit" startIcon={<PrintOutlinedIcon />}>Export Guide</Button>
            <Button component={RouterLink} to={`/permits/${permit.id}/edit`} state={navigationState} variant="contained" color="inherit" startIcon={<EditOutlinedIcon />} sx={{ bgcolor: 'common.white', color: 'primary.main' }}>Edit</Button>
            <Button color="inherit" startIcon={<ArchiveOutlinedIcon />} disabled={permit.status === 'ARCHIVED' || archiving} onClick={() => setConfirmArchive(true)}>{archiving ? 'Archiving…' : 'Archive'}</Button>
          </Stack>
        </Stack>
      </Paper>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', lg: 'repeat(4, 1fr)' }, gap: 1.5, mb: 3 }}>
        <PermitStatCard label="Processing" value={permit.processingTimeDays !== null ? `${permit.processingTimeDays} days` : 'Not recorded'} icon={ScheduleOutlinedIcon} tone="info" muted={permit.processingTimeDays === null} />
        <PermitStatCard label="Validity" value={permit.validityMonths !== null ? `${permit.validityMonths} months` : 'Not recorded'} icon={EventAvailableOutlinedIcon} tone="secondary" muted={permit.validityMonths === null} />
        <PermitStatCard label="Government Fee" value={hasFee ? `${permit.currencyCode || ''} ${permit.governmentFee}`.trim() : 'Not recorded'} icon={PaidOutlinedIcon} tone="success" muted={!hasFee} />
        <PermitStatCard label="Information Health" value={`${permit.health?.completeness ?? 0}%`} supporting={permit.health?.reviewState?.replace('_', ' ')} icon={HealthAndSafetyOutlinedIcon} tone="warning" />
      </Box>

      {(permit.permitHolderName || permit.clientCompanyName) && (
        <Paper variant="outlined" sx={{ p: { xs: 2, sm: 2.5 }, mb: 3 }} aria-labelledby="holder-client-heading">
          <Typography id="holder-client-heading" variant="subtitle2" fontWeight={800} sx={{ mb: 1.5 }}>
            Holder / Client
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
            <Stack direction="row" spacing={1.25} sx={{ alignItems: 'flex-start', minWidth: 0 }}>
              <PersonOutlineOutlinedIcon color="primary" fontSize="small" aria-hidden="true" />
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="caption" color="text.secondary">PERMIT HOLDER</Typography>
                <Typography variant="body1" fontWeight={700} sx={{ overflowWrap: 'anywhere' }}>
                  {permit.permitHolderName || 'Not recorded'}
                </Typography>
              </Box>
            </Stack>
            <Stack direction="row" spacing={1.25} sx={{ alignItems: 'flex-start', minWidth: 0 }}>
              <BusinessOutlinedIcon color="primary" fontSize="small" aria-hidden="true" />
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="caption" color="text.secondary">CLIENT / COMPANY</Typography>
                <Typography variant="body1" fontWeight={700} sx={{ overflowWrap: 'anywhere' }}>
                  {permit.clientCompanyName || 'Not recorded'}
                </Typography>
              </Box>
            </Stack>
          </Box>
        </Paper>
      )}

      <Box sx={{ mb: 4 }}>
        <PermitHealthPanel permit={permit} disabled={archiving} onRecordReview={() => { setReviewError(''); setReviewDialogOpen(true); }} />
      </Box>

      <SectionHeading icon={AccountTreeOutlinedIcon} title="Application Processes" description="Open a dedicated workflow for New Application, Renewal, or Cancellation. These are three views of the same reusable permit." />
      <PermitProcessOverview permit={permit} navigationState={navigationState} />

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', xl: '1.4fr 0.8fr' }, gap: 2, mt: 4, mb: 4 }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
          <ProsePanel id="permit-description" icon={DescriptionOutlinedIcon} title="Description" empty="No description recorded.">{permit.description}</ProsePanel>
          <ProsePanel id="eligibility" icon={RuleOutlinedIcon} title="Eligibility" empty="No eligibility criteria recorded.">{permit.eligibilityCriteria}</ProsePanel>
        </Box>
        <PermitLocalSearch permit={permit} navigationState={navigationState} />
      </Box>

      <Box id="source-evidence" sx={{ scrollMarginTop: 16 }}>
        <SourceDocumentsPanel permitId={permit.id} onChanged={load} compact aiAssisted={aiAssisted} />
      </Box>

      <PermitGroupMemberships permitId={permit.id} navigationState={navigationState} />

      <Paper variant="outlined" sx={{ p: { xs: 2, sm: 2.5 } }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}><PublicOutlinedIcon color="primary" fontSize="small" /><Typography variant="h6" fontWeight={800}>Record Details</Typography></Stack>
        <Divider sx={{ my: 1.5 }} />
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2,1fr)', lg: 'repeat(4,1fr)' }, gap: 2 }}>
          <Box><Typography variant="caption" color="text.secondary">OFFICIAL SOURCE</Typography>{permit.sourceUrl ? <Link href={permit.sourceUrl} target="_blank" rel="noopener" sx={{ display: 'flex', gap: 0.5, alignItems: 'center', wordBreak: 'break-all' }}>{permit.sourceUrl}<LaunchOutlinedIcon fontSize="inherit" /></Link> : <Typography variant="body2" color="text.disabled">Not provided</Typography>}</Box>
          <Box><Typography variant="caption" color="text.secondary">VERSION</Typography><Typography variant="body2">{permit.version}</Typography></Box>
          <Box><Typography variant="caption" color="text.secondary">CREATED</Typography><Typography variant="body2">{new Date(permit.createdAt).toLocaleString()}</Typography></Box>
          <Box><Typography variant="caption" color="text.secondary">LAST UPDATED</Typography><Typography variant="body2">{new Date(permit.updatedAt).toLocaleString()}</Typography></Box>
        </Box>
      </Paper>

      <RecordReviewDialog open={reviewDialogOpen} permit={permit} errorMessage={reviewError} onSubmit={handleReview} onClose={() => setReviewDialogOpen(false)} />
      <PermitAskDialog open={askOpen} permit={permit} onClose={() => setAskOpen(false)} />
      <PermitEligibilityDialog open={eligibilityOpen} permit={permit} onClose={() => setEligibilityOpen(false)} />
      <ConfirmDialog open={confirmArchive} title="Archive work permit?" message={`"${permit.title}" will be archived but not deleted.`} confirmLabel="Archive Permit" confirmColor="error" onConfirm={handleArchive} onCancel={() => setConfirmArchive(false)} />
    </Box>
  );
}
