import { useEffect, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  Link,
  Paper,
  Skeleton,
  Stack,
  Typography,
} from '@mui/material';
import PrintOutlinedIcon from '@mui/icons-material/PrintOutlined';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import AppBreadcrumbs from '../../components/common/AppBreadcrumbs';
import permitService from '../../api/permitService';
import { getApiErrorMessage } from '../../utils/apiError';
import { getPermitNavigation, permitBreadcrumbItems, permitNavigationState } from './permitNavigation';
import { countryName } from '../../utils/countries';
import { PROCESS_TYPES, PROCESS_TYPE_LABELS, WORKER_TYPE_LABELS } from '../../utils/enums';
import { formatPermitFee } from './permitComparison';

function GuideProcess({ permit, processType }) {
  const steps = permit.steps?.[processType] || [];
  const documents = permit.documents?.[processType] || [];
  return (
    <Box sx={{ breakInside: 'avoid', mb: 3 }}>
      <Typography variant="h6" fontWeight={700}>{PROCESS_TYPE_LABELS[processType]}</Typography>
      <Divider sx={{ my: 1 }} />
      <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 0.75 }}>Process steps</Typography>
      {steps.length ? (
        <Box component="ol" sx={{ mt: 0, pl: 3 }}>
          {steps.map((step) => (
            <Box component="li" key={step.id} sx={{ mb: 1 }}>
              <Typography variant="body2" fontWeight={700}>{step.stepTitle}</Typography>
              {step.stepDetail && <Typography variant="body2">{step.stepDetail}</Typography>}
              {step.expectedTimeline && <Typography variant="caption" color="text.secondary">Expected: {step.expectedTimeline}</Typography>}
            </Box>
          ))}
        </Box>
      ) : <Typography variant="body2" color="text.secondary">No steps recorded.</Typography>}
      <Typography variant="subtitle2" fontWeight={700} sx={{ mt: 1.5, mb: 0.75 }}>Required documents</Typography>
      {documents.length ? (
        <Stack spacing={0.75}>
          {documents.map((document) => (
            <Box key={document.id}>
              <Typography variant="body2">
                {document.isMandatory ? 'Required' : 'Optional'} — {document.documentName}
              </Typography>
              {document.notes && <Typography variant="caption" color="text.secondary">{document.notes}</Typography>}
            </Box>
          ))}
        </Stack>
      ) : <Typography variant="body2" color="text.secondary">No checklist recorded.</Typography>}
    </Box>
  );
}

export default function PermitGuidePage() {
  const { id } = useParams();
  const location = useLocation();
  const navigation = getPermitNavigation(location);
  const [permit, setPermit] = useState(undefined);
  const [sources, setSources] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([permitService.getById(id), permitService.listSourceDocuments(id, { includeArchived: false })])
      .then(([permitData, sourceData]) => {
        setPermit(permitData);
        setSources(sourceData);
      })
      .catch((err) => {
        setPermit(null);
        setError(getApiErrorMessage(err));
      });
  }, [id]);

  if (permit === undefined) return <Skeleton variant="rounded" height={500} />;
  if (!permit) return <Box><AppBreadcrumbs items={[{ label: 'Dashboard', href: '/' }, { label: 'Work Permits', href: navigation.listHref }, { label: 'Guide unavailable' }]} back={{ label: 'Back to Work Permits', href: navigation.listHref }} /><Alert severity="error">{error || 'Work permit not found.'}</Alert></Box>;

  const clientShareable = permit.visibility === 'CLIENT_SHAREABLE';
  const navigationState = permitNavigationState(location);
  const facts = [
    ['Country', countryName(permit.countryCode)],
    ['Permit type', permit.permitType],
    ['Worker type', WORKER_TYPE_LABELS[permit.workerType] || permit.workerType],
    ['Processing time', permit.processingTimeDays === 0 || permit.processingTimeDays ? `${permit.processingTimeDays} days` : 'Not recorded'],
    ['Validity', permit.validityMonths === 0 || permit.validityMonths ? `${permit.validityMonths} months` : 'Not recorded'],
    ['Government fee', formatPermitFee(permit)],
    ['Last reviewed', permit.lastReviewedAt || 'Not recorded'],
    ['Next review', permit.nextReviewAt || 'Not scheduled'],
  ];

  return (
    <Box
      sx={{
        '@media print': {
          '& .guide-actions, & .guide-breadcrumbs': { display: 'none' },
          '& .guide-paper': { boxShadow: 'none', border: 0, p: 0 },
          '& a': { color: 'inherit', textDecoration: 'none' },
        },
      }}
    >
      <Box className="guide-breadcrumbs">
        <AppBreadcrumbs
          items={permitBreadcrumbItems(permit, location, 'Permit Guide')}
          back={{ label: `Back to ${permit.title}`, href: `/permits/${permit.id}`, state: navigationState }}
        />
      </Box>
      <Stack className="guide-actions" direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ justifyContent: 'flex-end', mb: 2 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
          <Button variant="outlined" startIcon={<DescriptionOutlinedIcon />} component="a" href={permitService.permitGuideDocxUrl(permit.id)}>Download Word (.docx)</Button>
          <Button variant="contained" startIcon={<PrintOutlinedIcon />} onClick={() => window.print()}>Print / Save as PDF</Button>
        </Stack>
      </Stack>
      <Alert severity={clientShareable ? 'success' : 'warning'} className="guide-actions" sx={{ mb: 2 }}>
        {clientShareable
          ? 'This permit is marked Client Shareable. Confirm the content is current before external distribution.'
          : 'Internal guide only. This permit is not marked Client Shareable and must not be distributed externally.'}
      </Alert>
      <Paper className="guide-paper" variant="outlined" sx={{ p: { xs: 2.5, sm: 4 }, maxWidth: 900, mx: 'auto' }}>
        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-start', gap: 2 }}>
          <Box>
            <Typography variant="overline" color="primary.main" fontWeight={700}>Work Permit Guide</Typography>
            <Typography variant="h4" fontWeight={700}>{permit.title}</Typography>
            <Typography variant="body1" color="text.secondary">{countryName(permit.countryCode)} · Version {permit.version}</Typography>
          </Box>
          <Chip label={clientShareable ? 'Client Shareable' : 'Internal Only'} color={clientShareable ? 'success' : 'warning'} variant="outlined" />
        </Stack>
        <Divider sx={{ my: 3 }} />
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2, mb: 3 }}>
          {facts.map(([label, value]) => (
            <Box key={label}>
              <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ textTransform: 'uppercase' }}>{label}</Typography>
              <Typography variant="body2">{value}</Typography>
            </Box>
          ))}
        </Box>
        <Typography variant="h6" fontWeight={700}>Overview</Typography>
        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', mb: 2 }}>{permit.description || 'No description recorded.'}</Typography>
        <Typography variant="h6" fontWeight={700}>Eligibility</Typography>
        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', mb: 3 }}>{permit.eligibilityCriteria || 'No eligibility criteria recorded.'}</Typography>
        {PROCESS_TYPES.map((type) => <GuideProcess key={type} permit={permit} processType={type} />)}
        <Box sx={{ breakInside: 'avoid', mb: 3 }}>
          <Typography variant="h6" fontWeight={700}>Sources</Typography>
          <Divider sx={{ my: 1 }} />
          {permit.sourceUrl && <Link href={permit.sourceUrl}>{permit.sourceUrl}</Link>}
          {sources.map((source) => <Typography key={source.id} variant="body2">{source.fileName} — {source.sourceType.replaceAll('_', ' ')}</Typography>)}
          {!permit.sourceUrl && sources.length === 0 && <Typography variant="body2" color="text.secondary">No source information recorded.</Typography>}
        </Box>
        <Divider sx={{ my: 2 }} />
        <Typography variant="caption" color="text.secondary">
          Disclaimer: This guide is an internal reference and is not legal advice. Immigration requirements and fees may change. Verify against the official source before acting or sharing externally.
        </Typography>
      </Paper>
    </Box>
  );
}
