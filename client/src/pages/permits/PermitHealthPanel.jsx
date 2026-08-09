import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Collapse,
  LinearProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
import ReviewStateChip from './ReviewStateChip';

function formatDate(iso) {
  if (!iso) return null;
  const date = new Date(`${String(iso).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

function scoreTone(score) {
  if (score >= 80) return 'success';
  if (score >= 50) return 'warning';
  return 'error';
}

function Fact({ label, value, muted }) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</Typography>
      <Typography variant="body2" fontWeight={600} color={muted ? 'text.disabled' : 'text.primary'}>{value}</Typography>
    </Box>
  );
}

export default function PermitHealthPanel({ permit, onRecordReview, disabled }) {
  const [expanded, setExpanded] = useState(false);
  const health = permit.health;
  if (!health) return null;

  const healthy = health.warnings.length === 0 && health.reviewState === 'CURRENT';
  const tone = scoreTone(health.completeness);
  const urgentWarnings = health.warnings.filter((item) => item.severity !== 'info');
  const previewWarnings = (urgentWarnings.length ? urgentWarnings : health.warnings).slice(0, 3);
  const HeadingIcon = healthy ? CheckCircleOutlinedIcon : WarningAmberOutlinedIcon;

  return (
    <Paper
      variant="outlined"
      sx={{
        p: { xs: 2, sm: 2.5 },
        borderLeft: 4,
        borderLeftColor: healthy ? 'success.main' : urgentWarnings.some((item) => item.severity === 'error') ? 'error.main' : 'warning.main',
      }}
    >
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ justifyContent: 'space-between', alignItems: { sm: 'flex-start' } }}>
        <Box sx={{ flexGrow: 1 }}>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
            <HeadingIcon color={healthy ? 'success' : 'warning'} />
            <Typography variant="h6" fontWeight={800}>{healthy ? 'Information Current' : 'Information Needs Attention'}</Typography>
            <ReviewStateChip state={health.reviewState} />
          </Stack>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {healthy ? 'This permit is complete, sourced, and inside its review window.' : `${health.missing.length} information gap${health.missing.length === 1 ? '' : 's'} require review.`}
          </Typography>
        </Box>
        <Button size="small" variant="outlined" startIcon={<FactCheckOutlinedIcon />} onClick={onRecordReview} disabled={disabled}>
          Record Review
        </Button>
      </Stack>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: '1.2fr 1fr 1fr 1fr' }, gap: 2, mt: 2.5, alignItems: 'center' }}>
        <Box>
          <Stack direction="row" sx={{ justifyContent: 'space-between', mb: 0.5 }}>
            <Typography variant="caption" color="text.secondary" fontWeight={700}>COMPLETENESS</Typography>
            <Typography variant="body2" fontWeight={800} color={`${tone}.main`}>{health.completeness}%</Typography>
          </Stack>
          <LinearProgress variant="determinate" value={health.completeness} color={tone} sx={{ height: 7, borderRadius: 4 }} aria-label={`Permit completeness ${health.completeness} percent`} />
        </Box>
        <Fact label="Last reviewed" value={formatDate(permit.lastReviewedAt) || 'Never reviewed'} muted={!permit.lastReviewedAt} />
        <Fact label="Next review" value={formatDate(permit.nextReviewAt) || 'Not scheduled'} muted={!permit.nextReviewAt} />
        <Fact label="Missing" value={health.missing.length ? `${health.missing.length} items` : 'Nothing'} />
      </Box>

      {!healthy && previewWarnings.length > 0 && (
        <Alert severity={previewWarnings.some((item) => item.severity === 'error') ? 'error' : 'warning'} sx={{ mt: 2 }}>
          <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
            {previewWarnings.map((item) => <Typography component="li" variant="body2" key={item.message}>{item.message}</Typography>)}
          </Box>
        </Alert>
      )}

      <Stack direction="row" spacing={1} sx={{ mt: 1.5, alignItems: 'center' }}>
        <Button size="small" onClick={() => setExpanded((value) => !value)} endIcon={expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />} aria-expanded={expanded}>
          {expanded ? 'Hide health details' : 'View health details'}
        </Button>
        {!expanded && health.warnings.length > previewWarnings.length && <Chip size="small" variant="outlined" label={`${health.warnings.length - previewWarnings.length} more notices`} />}
      </Stack>

      <Collapse in={expanded} unmountOnExit>
        <Box sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
          <Typography variant="subtitle2" fontWeight={800}>Completeness breakdown</Typography>
          <List dense aria-label="Completeness checks" sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, columnGap: 2 }}>
            {health.checks.map((check) => (
              <ListItem key={check.key} disableGutters sx={{ py: 0.25 }}>
                <ListItemIcon sx={{ minWidth: 30 }}>{check.done ? <CheckCircleOutlinedIcon fontSize="small" color="success" /> : <CancelOutlinedIcon fontSize="small" color="error" />}</ListItemIcon>
                <ListItemText primary={check.label} slotProps={{ primary: { variant: 'body2' } }} />
              </ListItem>
            ))}
          </List>
          {health.warnings.length > 0 && (
            <Box sx={{ mt: 1.5 }}>
              <Typography variant="subtitle2" fontWeight={800}>All notices</Typography>
              <Box component="ul" sx={{ mt: 0.75, mb: 0, pl: 2.5 }}>
                {health.warnings.map((item) => <Typography component="li" variant="body2" color="text.secondary" key={item.message}>{item.message}</Typography>)}
              </Box>
            </Box>
          )}
          {permit.reviewNotes && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" fontWeight={800}>Review notes</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap' }}>{permit.reviewNotes}</Typography>
            </Box>
          )}
        </Box>
      </Collapse>
    </Paper>
  );
}
