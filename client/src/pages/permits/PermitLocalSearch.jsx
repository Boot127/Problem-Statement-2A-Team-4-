import { useEffect, useMemo, useState } from 'react';
import { Alert, Box, InputAdornment, Link, Paper, Stack, TextField, Typography } from '@mui/material';
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import AccountTreeOutlinedIcon from '@mui/icons-material/AccountTreeOutlined';
import ChecklistOutlinedIcon from '@mui/icons-material/ChecklistOutlined';
import AttachFileOutlinedIcon from '@mui/icons-material/AttachFileOutlined';
import { Link as RouterLink } from 'react-router-dom';
import permitService from '../../api/permitService';
import { PROCESS_TYPES, PROCESS_TYPE_LABELS } from '../../utils/enums';

const SEGMENTS = { NEW: 'new', RENEWAL: 'renewal', CANCELLATION: 'cancellation' };

function includes(value, query) {
  return String(value || '').toLowerCase().includes(query);
}

export default function PermitLocalSearch({ permit, navigationState }) {
  const [query, setQuery] = useState('');
  const [sources, setSources] = useState([]);

  useEffect(() => {
    let active = true;
    permitService.listSourceDocuments(permit.id, { includeArchived: false })
      .then((items) => { if (active) setSources(items); })
      .catch(() => { if (active) setSources([]); });
    return () => { active = false; };
  }, [permit.id]);

  const results = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (term.length < 2) return [];
    const matches = [];

    if (includes(permit.eligibilityCriteria, term)) {
      matches.push({ kind: 'Eligibility', title: 'Eligibility criteria', detail: permit.eligibilityCriteria, to: '#eligibility', icon: DescriptionOutlinedIcon });
    }
    if (includes(permit.description, term)) {
      matches.push({ kind: 'Overview', title: 'Permit description', detail: permit.description, to: '#permit-description', icon: DescriptionOutlinedIcon });
    }

    PROCESS_TYPES.forEach((type) => {
      (permit.steps?.[type] || []).forEach((step) => {
        if (includes(`${step.stepTitle} ${step.stepDetail} ${step.expectedTimeline}`, term)) {
          matches.push({ kind: PROCESS_TYPE_LABELS[type], title: step.stepTitle, detail: step.stepDetail || step.expectedTimeline, to: `/permits/${permit.id}/${SEGMENTS[type]}`, icon: AccountTreeOutlinedIcon });
        }
      });
      (permit.documents?.[type] || []).forEach((document) => {
        if (includes(`${document.documentName} ${document.notes}`, term)) {
          matches.push({ kind: PROCESS_TYPE_LABELS[type], title: document.documentName, detail: document.notes || (document.isMandatory ? 'Mandatory document' : 'Optional document'), to: `/permits/${permit.id}/${SEGMENTS[type]}`, icon: ChecklistOutlinedIcon });
        }
      });
    });

    sources.forEach((source) => {
      if (includes(`${source.fileName} ${source.description} ${source.sourceType}`, term)) {
        matches.push({ kind: 'Source Evidence', title: source.fileName, detail: source.description || source.sourceType, to: '#source-evidence', icon: AttachFileOutlinedIcon });
      }
    });
    return matches.slice(0, 12);
  }, [permit, query, sources]);

  const hasQuery = query.trim().length >= 2;

  return (
    <Paper variant="outlined" sx={{ p: { xs: 2, sm: 2.5 } }}>
      <Typography variant="h6" fontWeight={800}>Search This Permit</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
        Find eligibility rules, process steps, checklist items, and source files.
      </Typography>
      <TextField
        fullWidth
        size="small"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search this permit…"
        slotProps={{
          htmlInput: { 'aria-label': 'Search this permit' },
          input: { startAdornment: <InputAdornment position="start"><SearchOutlinedIcon fontSize="small" /></InputAdornment> },
        }}
      />
      {hasQuery && results.length === 0 && <Alert severity="info" sx={{ mt: 2 }}>No matching information was found in this permit.</Alert>}
      {results.length > 0 && (
        <Stack spacing={0} sx={{ mt: 1.5 }} divider={<Box sx={{ borderTop: 1, borderColor: 'divider' }} />}>
          {results.map((result, index) => {
            const Icon = result.icon;
            const externalRoute = result.to.startsWith('/');
            return (
              <Link
                key={`${result.kind}-${result.title}-${index}`}
                component={externalRoute ? RouterLink : 'a'}
                to={externalRoute ? result.to : undefined}
                state={externalRoute ? navigationState : undefined}
                href={externalRoute ? undefined : result.to}
                underline="none"
                color="inherit"
                sx={{ py: 1.25, display: 'flex', gap: 1.25, alignItems: 'flex-start' }}
              >
                <Icon fontSize="small" color="primary" sx={{ mt: 0.25 }} />
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="caption" color="text.secondary">{result.kind}</Typography>
                  <Typography variant="subtitle2" fontWeight={700}>{result.title}</Typography>
                  {result.detail && <Typography variant="body2" color="text.secondary" noWrap>{result.detail}</Typography>}
                </Box>
              </Link>
            );
          })}
        </Stack>
      )}
    </Paper>
  );
}
