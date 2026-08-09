import { Box, Button, Chip, Paper, Stack, Typography } from '@mui/material';
import AddTaskOutlinedIcon from '@mui/icons-material/AddTaskOutlined';
import AutorenewOutlinedIcon from '@mui/icons-material/AutorenewOutlined';
import CancelScheduleSendOutlinedIcon from '@mui/icons-material/CancelScheduleSendOutlined';
import ArrowForwardOutlinedIcon from '@mui/icons-material/ArrowForwardOutlined';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
import RadioButtonUncheckedOutlinedIcon from '@mui/icons-material/RadioButtonUncheckedOutlined';
import { Link as RouterLink } from 'react-router-dom';
import { PROCESS_TYPES, PROCESS_TYPE_LABELS } from '../../utils/enums';
import { formatTimelineEstimate, summariseProcess } from './processSummary';

const PROCESS_CONFIG = {
  NEW: { segment: 'new', icon: AddTaskOutlinedIcon, tone: 'primary' },
  RENEWAL: { segment: 'renewal', icon: AutorenewOutlinedIcon, tone: 'info' },
  CANCELLATION: { segment: 'cancellation', icon: CancelScheduleSendOutlinedIcon, tone: 'warning' },
};

function coverageState(summary) {
  if (summary.isComplete) return { label: 'Complete information', color: 'success', icon: CheckCircleOutlinedIcon };
  if (summary.isEmpty) return { label: 'Not added', color: 'default', icon: RadioButtonUncheckedOutlinedIcon };
  const missing = [];
  if (!summary.stepCount) missing.push('steps');
  if (!summary.documentCount) missing.push('documents');
  return { label: `Missing ${missing.join(' and ')}`, color: 'warning', icon: WarningAmberOutlinedIcon };
}

function ProcessCard({ permitId, processType, steps, documents, navigationState }) {
  const config = PROCESS_CONFIG[processType];
  const Icon = config.icon;
  const summary = summariseProcess(steps, documents);
  const state = coverageState(summary);
  const StateIcon = state.icon;
  const timeline = summary.timeline.exact ? formatTimelineEstimate(summary.timeline) : null;

  return (
    <Paper
      component="article"
      variant="outlined"
      sx={{
        p: 2.5,
        minHeight: 252,
        display: 'flex',
        flexDirection: 'column',
        borderTop: 4,
        borderTopColor: `${config.tone}.main`,
        transition: 'transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease',
        '&:hover': { transform: 'translateY(-2px)', boxShadow: 3, borderColor: `${config.tone}.light` },
      }}
    >
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 2 }}>
        <Box
          aria-hidden="true"
          sx={{
            width: 46,
            height: 46,
            borderRadius: 2,
            display: 'grid',
            placeItems: 'center',
            bgcolor: 'action.hover',
            color: `${config.tone}.main`,
          }}
        >
          <Icon />
        </Box>
        <Box>
          <Typography variant="overline" color="text.secondary" fontWeight={800}>
            Process template
          </Typography>
          <Typography variant="h6" fontWeight={800} sx={{ lineHeight: 1.15 }}>
            {PROCESS_TYPE_LABELS[processType]}
          </Typography>
        </Box>
      </Stack>

      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5, mb: 2 }}>
        <Box>
          <Typography variant="h5" fontWeight={800}>{summary.stepCount}</Typography>
          <Typography variant="caption" color="text.secondary">Ordered steps</Typography>
        </Box>
        <Box>
          <Typography variant="h5" fontWeight={800}>{summary.documentCount}</Typography>
          <Typography variant="caption" color="text.secondary">Checklist items</Typography>
        </Box>
      </Box>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
        {timeline ? `Estimated timeline ${timeline}` : summary.timeline.withTimeline ? 'Timeline is partially recorded' : 'No reliable timeline recorded'}
      </Typography>
      <Chip
        size="small"
        icon={<StateIcon />}
        label={state.label}
        color={state.color}
        variant={state.color === 'success' ? 'filled' : 'outlined'}
        sx={{ alignSelf: 'flex-start', mb: 2 }}
      />
      <Box sx={{ flexGrow: 1 }} />
      <Button
        component={RouterLink}
        to={`/permits/${permitId}/${config.segment}`}
        state={navigationState}
        endIcon={<ArrowForwardOutlinedIcon />}
        sx={{ alignSelf: 'flex-start' }}
      >
        View Process
      </Button>
    </Paper>
  );
}

export default function PermitProcessOverview({ permit, navigationState }) {
  return (
    <Stack spacing={3}>
      <Box
        aria-label="Application process cards"
        sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'repeat(3, 1fr)' }, gap: 2 }}
      >
        {PROCESS_TYPES.map((type) => (
          <ProcessCard
            key={type}
            permitId={permit.id}
            processType={type}
            steps={permit.steps?.[type] || []}
            documents={permit.documents?.[type] || []}
            navigationState={navigationState}
          />
        ))}
      </Box>

      <Paper variant="outlined" sx={{ p: { xs: 2, sm: 2.5 } }}>
        <Typography variant="h6" fontWeight={800}>Process Coverage</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          Compliance coverage across every process view for this permit.
        </Typography>
        <Stack divider={<Box sx={{ borderTop: 1, borderColor: 'divider' }} />}>
          {PROCESS_TYPES.map((type) => {
            const config = PROCESS_CONFIG[type];
            const summary = summariseProcess(permit.steps?.[type] || [], permit.documents?.[type] || []);
            const state = coverageState(summary);
            const StateIcon = state.icon;
            return (
              <Button
                key={type}
                component={RouterLink}
                to={`/permits/${permit.id}/${config.segment}`}
                state={navigationState}
                color="inherit"
                sx={{ py: 1.5, px: 1, justifyContent: 'space-between', textAlign: 'left' }}
                endIcon={<ArrowForwardOutlinedIcon />}
              >
                <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', flexGrow: 1 }}>
                  <StateIcon color={state.color === 'default' ? 'disabled' : state.color} fontSize="small" />
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="subtitle2" fontWeight={700}>{PROCESS_TYPE_LABELS[type]}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {summary.stepCount} steps · {summary.documentCount} documents
                    </Typography>
                  </Box>
                  <Chip size="small" label={state.label} color={state.color} variant="outlined" sx={{ mr: 1 }} />
                </Stack>
              </Button>
            );
          })}
        </Stack>
      </Paper>
    </Stack>
  );
}
