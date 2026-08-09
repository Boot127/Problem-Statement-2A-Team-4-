import { useEffect, useState } from 'react';
import { Link as RouterLink, useLocation, useParams } from 'react-router-dom';
import { Accordion, AccordionDetails, AccordionSummary, Alert, Box, Button, Chip, Paper, Skeleton, Stack, Typography } from '@mui/material';
import ArrowBackOutlinedIcon from '@mui/icons-material/ArrowBackOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import AddTaskOutlinedIcon from '@mui/icons-material/AddTaskOutlined';
import AutorenewOutlinedIcon from '@mui/icons-material/AutorenewOutlined';
import CancelScheduleSendOutlinedIcon from '@mui/icons-material/CancelScheduleSendOutlined';
import SourceOutlinedIcon from '@mui/icons-material/SourceOutlined';
import ExpandMoreOutlinedIcon from '@mui/icons-material/ExpandMoreOutlined';
import QuestionAnswerOutlinedIcon from '@mui/icons-material/QuestionAnswerOutlined';
import ContentCopyOutlinedIcon from '@mui/icons-material/ContentCopyOutlined';
import AppBreadcrumbs from '../../components/common/AppBreadcrumbs';
import StatusChip from '../../components/common/StatusChip';
import permitService from '../../api/permitService';
import { getApiErrorMessage } from '../../utils/apiError';
import { PROCESS_TYPE_LABELS } from '../../utils/enums';
import { countryFlag, countryName } from '../../utils/countries';
import PermitProcessTabs from './PermitProcessTabs';
import SourceDocumentsPanel from './SourceDocumentsPanel';
import GuidedProcessPreview from './GuidedProcessPreview';
import ProcessModeSelector from './ProcessModeSelector';
import PermitAskDialog from './PermitAskDialog';
import ProcessCopyDialog from './ProcessCopyDialog';
import { formatTimelineEstimate, summariseProcess } from './processSummary';
import {
  getPermitNavigation,
  permitBreadcrumbItems,
  permitNavigationState,
} from './permitNavigation';

const PROCESS_IDENTITY = {
  NEW: { accent: 'primary', icon: AddTaskOutlinedIcon },
  RENEWAL: { accent: 'secondary', icon: AutorenewOutlinedIcon },
  CANCELLATION: { accent: 'warning', icon: CancelScheduleSendOutlinedIcon },
};

export default function PermitProcessPage({ processType }) {
  const { id } = useParams();
  const location = useLocation();
  const [permit, setPermit] = useState(undefined);
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState('template');
  const [askOpen, setAskOpen] = useState(false);
  const [copyOpen, setCopyOpen] = useState(false);
  const [copyMessage, setCopyMessage] = useState('');

  const load = () => permitService.getById(id)
    .then((data) => { setPermit(data); setError(''); })
    .catch((err) => { setError(getApiErrorMessage(err)); setPermit((current) => current ?? null); });

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (permit === undefined) {
    return <Stack spacing={2}><Skeleton variant="text" width={260} height={30} /><Skeleton variant="rounded" height={180} /><Skeleton variant="rounded" height={500} /></Stack>;
  }

  if (!permit) {
    const navigation = getPermitNavigation(location);
    return (
      <Box>
        <AppBreadcrumbs
          items={[{ label: 'Dashboard', href: '/' }, { label: 'Work Permits', href: navigation.listHref }, { label: 'Process unavailable' }]}
          back={{ label: 'Back to Work Permits', href: navigation.listHref }}
        />
        <Alert severity="error" sx={{ mb: 2 }}>{error || 'Work permit not found.'}</Alert>
      </Box>
    );
  }

  const label = PROCESS_TYPE_LABELS[processType];
  const steps = permit.steps?.[processType] || [];
  const documents = permit.documents?.[processType] || [];
  const summary = summariseProcess(steps, documents);
  const timeline = summary.timeline.exact ? formatTimelineEstimate(summary.timeline) : null;
  const identity = PROCESS_IDENTITY[processType];
  const ProcessIcon = identity.icon;
  const navigationState = permitNavigationState(location);
  const scrollToSources = () => document.getElementById('source-evidence-header')?.scrollIntoView({ behavior: 'smooth', block: 'center' });

  return (
    <Box>
      <AppBreadcrumbs
        items={permitBreadcrumbItems(permit, location, label)}
        back={{ label: `Back to ${permit.title}`, href: `/permits/${permit.id}`, state: navigationState }}
      />

      <Paper variant="outlined" sx={{ p: { xs: 2.5, md: 3.5 }, mb: 2.5, borderTop: 5, borderTopColor: `${identity.accent}.main`, boxShadow: 1 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2.5} sx={{ justifyContent: 'space-between', alignItems: { md: 'flex-start' } }}>
          <Stack direction="row" spacing={2} sx={{ minWidth: 0 }}>
            <Box aria-hidden="true" sx={{ width: 62, height: 62, borderRadius: 2.5, bgcolor: 'action.hover', color: `${identity.accent}.main`, display: 'grid', placeItems: 'center', flexShrink: 0 }}><ProcessIcon sx={{ fontSize: 34 }} /></Box>
            <Box sx={{ minWidth: 0 }}>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                <Typography variant="overline" color={`${identity.accent}.main`} fontWeight={900} sx={{ letterSpacing: 1.2 }}>{label}</Typography>
                <Typography aria-hidden="true" sx={{ fontSize: 22, lineHeight: 1 }}>{countryFlag(permit.countryCode)}</Typography>
              </Stack>
              <Typography variant="h4" component="h1" fontWeight={900} sx={{ color: 'text.primary', fontSize: { xs: '1.65rem', sm: '2.1rem' } }}>{permit.title}</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{permit.permitType} · {countryName(permit.countryCode)}</Typography>
              <Typography variant="body1" fontWeight={700} sx={{ color: 'text.primary', mt: 1 }}>
                {summary.stepCount} Steps · {summary.documentCount} Documents · {timeline ? `Approx. ${timeline.replace('≈ ', '')}` : summary.timeline.withTimeline ? 'Partial timeline' : 'Timeline not recorded'}
              </Typography>
              <Stack direction="row" spacing={1} sx={{ mt: 1.5, flexWrap: 'wrap', rowGap: 1 }}>
                <StatusChip status={permit.status} />
                <Chip size="small" variant="outlined" label={summary.isComplete ? 'Complete information' : summary.isEmpty ? 'Not configured' : 'Incomplete information'} color={summary.isComplete ? 'success' : 'warning'} />
              </Stack>
            </Box>
          </Stack>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
            <Button variant="outlined" startIcon={<ContentCopyOutlinedIcon />} disabled={permit.status === 'ARCHIVED'} onClick={() => setCopyOpen(true)}>Copy Process</Button>
            <Button variant="outlined" startIcon={<QuestionAnswerOutlinedIcon />} onClick={() => setAskOpen(true)}>Ask This Permit</Button>
            <Button component={RouterLink} to={`/permits/${permit.id}`} state={navigationState} variant="outlined" startIcon={<ArrowBackOutlinedIcon />}>Permit Overview</Button>
            <Button component={RouterLink} to={`/permits/${permit.id}/edit`} state={navigationState} variant="outlined" startIcon={<EditOutlinedIcon />}>Edit Permit</Button>
          </Stack>
        </Stack>
      </Paper>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {copyMessage && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setCopyMessage('')}>{copyMessage}</Alert>}

      <Box sx={{ mb: 2.5 }}><ProcessModeSelector value={viewMode} onChange={setViewMode} /></Box>

      {viewMode === 'template' ? (
        <PermitProcessTabs permitId={permit.id} steps={permit.steps} documents={permit.documents} fixedProcessType={processType} onChanged={load} onExtractFromSource={scrollToSources} />
      ) : (
        <GuidedProcessPreview steps={steps} processLabel={label} processType={processType} />
      )}

      <Box id="source-evidence" sx={{ scrollMarginTop: 16 }}>
        <Accordion variant="outlined" disableGutters sx={{ mb: 3, '&:before': { display: 'none' } }}>
          <AccordionSummary expandIcon={<ExpandMoreOutlinedIcon />} aria-controls="source-evidence-content" id="source-evidence-header">
            <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center' }}>
              <SourceOutlinedIcon color="primary" />
              <Box><Typography variant="subtitle1" fontWeight={800}>Source Evidence</Typography><Typography variant="body2" color="text.secondary">Official documents and AI extraction evidence. Expand to manage.</Typography></Box>
            </Stack>
          </AccordionSummary>
          <AccordionDetails id="source-evidence-content" sx={{ pt: 0 }}>
            <SourceDocumentsPanel permitId={permit.id} onChanged={load} compact embedded aiAssisted={String(permit.reviewNotes || '').includes('AI-assisted')} />
          </AccordionDetails>
        </Accordion>
      </Box>
      <PermitAskDialog open={askOpen} permit={permit} onClose={() => setAskOpen(false)} />
      {copyOpen && <ProcessCopyDialog open destinationPermit={permit} processType={processType} onClose={() => setCopyOpen(false)} onCopied={async (result) => { await load(); setCopyMessage(`${result.copiedSteps} steps and ${result.copiedDocuments} documents copied. ${result.skippedStepDuplicates + result.skippedDocumentDuplicates ? `${result.skippedStepDuplicates + result.skippedDocumentDuplicates} exact duplicates skipped.` : ''}`); }} />}
    </Box>
  );
}
