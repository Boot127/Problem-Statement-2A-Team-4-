import { useState } from 'react';
import { alpha } from '@mui/material/styles';
import { Alert, Box, Button, Chip, LinearProgress, Paper, Stack, Typography } from '@mui/material';
import ArrowBackOutlinedIcon from '@mui/icons-material/ArrowBackOutlined';
import ArrowForwardOutlinedIcon from '@mui/icons-material/ArrowForwardOutlined';
import ScheduleOutlinedIcon from '@mui/icons-material/ScheduleOutlined';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import RadioButtonUncheckedOutlinedIcon from '@mui/icons-material/RadioButtonUncheckedOutlined';
import PlayCircleFilledOutlinedIcon from '@mui/icons-material/PlayCircleFilledOutlined';
import AddTaskOutlinedIcon from '@mui/icons-material/AddTaskOutlined';
import AutorenewOutlinedIcon from '@mui/icons-material/AutorenewOutlined';
import CancelScheduleSendOutlinedIcon from '@mui/icons-material/CancelScheduleSendOutlined';

const PROCESS_IDENTITY = {
  NEW: { accent: 'primary', icon: AddTaskOutlinedIcon },
  RENEWAL: { accent: 'secondary', icon: AutorenewOutlinedIcon },
  CANCELLATION: { accent: 'warning', icon: CancelScheduleSendOutlinedIcon },
};

export default function GuidedProcessPreview({ steps, processLabel, processType }) {
  const [index, setIndex] = useState(0);

  if (!steps.length) {
    return <Alert severity="info">Guided preview becomes available after at least one {processLabel.toLowerCase()} step is added.</Alert>;
  }

  const safeIndex = Math.min(index, steps.length - 1);
  const step = steps[safeIndex];
  const completedPreviewSteps = safeIndex + 1;
  const percentage = Math.round((completedPreviewSteps / steps.length) * 100);
  const remaining = Math.max(0, steps.length - completedPreviewSteps);
  const identity = PROCESS_IDENTITY[processType] || PROCESS_IDENTITY.NEW;
  const ProcessIcon = identity.icon;
  const setStep = (nextIndex) => setIndex(Math.max(0, Math.min(steps.length - 1, nextIndex)));

  return (
    <Stack spacing={2.5} sx={{ mb: 3 }}>
      <Paper
        variant="outlined"
        sx={(theme) => ({
          p: { xs: 2.25, md: 3 },
          color: 'common.white',
          bgcolor: theme.palette[identity.accent].main,
          borderColor: theme.palette[identity.accent].main,
          boxShadow: 2,
        })}
      >
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2.5} sx={{ justifyContent: 'space-between', alignItems: { md: 'flex-end' } }}>
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 0.75 }}>
              <ProcessIcon />
              <Typography variant="overline" fontWeight={900} sx={{ color: 'inherit', letterSpacing: 1 }}>{processLabel} Progress Preview</Typography>
            </Stack>
            <Typography variant="h5" fontWeight={900} sx={{ color: 'inherit' }}>Step {safeIndex + 1} of {steps.length}</Typography>
            <Typography variant="body2" sx={{ color: 'inherit', opacity: 0.85, mt: 0.25 }}>{remaining} step{remaining === 1 ? '' : 's'} remaining in this walkthrough</Typography>
          </Box>
          <Box sx={{ minWidth: { md: 150 }, textAlign: { md: 'right' } }}>
            <Typography variant="h3" fontWeight={900} sx={{ color: 'inherit', lineHeight: 1 }}>{percentage}%</Typography>
            <Typography variant="caption" fontWeight={800} sx={{ color: 'inherit', opacity: 0.85 }}>WALKTHROUGH PROGRESS</Typography>
          </Box>
        </Stack>
        <LinearProgress
          variant="determinate"
          value={percentage}
          aria-label={`${processLabel} guided preview ${percentage} percent complete`}
          sx={{
            mt: 2,
            height: 10,
            borderRadius: 6,
            bgcolor: 'rgba(255,255,255,0.24)',
            '& .MuiLinearProgress-bar': { bgcolor: 'common.white', borderRadius: 6 },
          }}
        />
        <Box sx={{ mt: 2, pt: 1.5, borderTop: '1px solid rgba(255,255,255,0.25)' }}>
          <Typography variant="caption" fontWeight={800} sx={{ color: 'inherit', opacity: 0.8 }}>CURRENT STEP</Typography>
          <Typography variant="subtitle1" fontWeight={900} sx={{ color: 'inherit' }}>{step.stepTitle}</Typography>
        </Box>
      </Paper>

      <Paper variant="outlined" sx={{ p: { xs: 1.5, sm: 2 } }}>
        <Typography variant="subtitle2" fontWeight={900}>Step Navigator</Typography>
        <Typography variant="caption" color="text.secondary">Select any step to jump directly to it. Statuses are preview-only.</Typography>
        <Box
          component="ol"
          aria-label={`${processLabel} guided step navigator`}
          sx={{ listStyle: 'none', m: 0, mt: 1.5, p: 0, display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(auto-fit, minmax(170px, 1fr))' }, gap: 1 }}
        >
          {steps.map((navigatorStep, navigatorIndex) => {
            const isCurrent = navigatorIndex === safeIndex;
            const isVisited = navigatorIndex < safeIndex;
            const status = isCurrent ? 'Current' : isVisited ? 'Visited' : 'Upcoming';
            const StatusIcon = isCurrent ? PlayCircleFilledOutlinedIcon : isVisited ? CheckCircleOutlinedIcon : RadioButtonUncheckedOutlinedIcon;
            return (
              <Box component="li" key={navigatorStep.id}>
                <Button
                  fullWidth
                  color="inherit"
                  onClick={() => setStep(navigatorIndex)}
                  aria-current={isCurrent ? 'step' : undefined}
                  sx={(theme) => ({
                    height: '100%',
                    minHeight: 68,
                    p: 1.25,
                    justifyContent: 'flex-start',
                    textAlign: 'left',
                    border: 1,
                    borderColor: isCurrent ? `${identity.accent}.main` : 'divider',
                    bgcolor: isCurrent ? alpha(theme.palette[identity.accent].main, 0.09) : 'background.paper',
                    '&:hover': { bgcolor: alpha(theme.palette[identity.accent].main, 0.07) },
                  })}
                >
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-start', minWidth: 0 }}>
                    <StatusIcon color={isCurrent ? identity.accent : isVisited ? 'success' : 'disabled'} fontSize="small" sx={{ mt: 0.15 }} />
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="caption" color="text.secondary" fontWeight={800}>{String(navigatorIndex + 1).padStart(2, '0')} · {status.toUpperCase()}</Typography>
                      <Typography variant="body2" fontWeight={isCurrent ? 900 : 700} sx={{ color: 'text.primary', lineHeight: 1.3 }}>{navigatorStep.stepTitle}</Typography>
                    </Box>
                  </Stack>
                </Button>
              </Box>
            );
          })}
        </Box>
      </Paper>

      <Paper
        variant="outlined"
        sx={(theme) => ({
          position: 'relative',
          overflow: 'hidden',
          p: { xs: 2.5, md: 4 },
          minHeight: 360,
          display: 'flex',
          flexDirection: 'column',
          bgcolor: alpha(theme.palette[identity.accent].main, 0.055),
          borderColor: alpha(theme.palette[identity.accent].main, 0.3),
          borderLeft: 6,
          borderLeftColor: `${identity.accent}.main`,
        })}
      >
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ justifyContent: 'space-between', alignItems: { sm: 'flex-start' }, mb: 2.5 }}>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
            <Box sx={{ width: 50, height: 50, borderRadius: '50%', display: 'grid', placeItems: 'center', bgcolor: `${identity.accent}.main`, color: 'common.white', fontWeight: 900 }}>{String(step.stepNumber).padStart(2, '0')}</Box>
            <Box>
              <Typography variant="overline" color="text.secondary" fontWeight={900}>STEP {String(safeIndex + 1).padStart(2, '0')} OF {String(steps.length).padStart(2, '0')}</Typography>
              <Typography variant="h4" component="h2" fontWeight={900} sx={{ color: 'text.primary', fontSize: { xs: '1.55rem', sm: '2rem' }, lineHeight: 1.2 }}>{step.stepTitle}</Typography>
            </Box>
          </Stack>
          <Chip icon={<ScheduleOutlinedIcon />} label={step.expectedTimeline || 'Timeline not recorded'} color={identity.accent} variant="outlined" sx={{ fontWeight: 800, bgcolor: 'background.paper' }} />
        </Stack>

        <Typography variant="body1" sx={{ color: 'text.primary', whiteSpace: 'pre-wrap', lineHeight: 1.85, maxWidth: 820 }}>{step.stepDetail || 'No additional instructions are recorded for this step.'}</Typography>

        <Box sx={{ flexGrow: 1 }} />
        <Stack direction={{ xs: 'column-reverse', sm: 'row' }} spacing={1.25} sx={{ justifyContent: 'space-between', mt: 4 }}>
          <Button variant="outlined" startIcon={<ArrowBackOutlinedIcon />} disabled={safeIndex === 0} onClick={() => setStep(safeIndex - 1)} sx={{ minWidth: 140 }}>Previous Step</Button>
          <Button variant="contained" endIcon={<ArrowForwardOutlinedIcon />} disabled={safeIndex === steps.length - 1} onClick={() => setStep(safeIndex + 1)} sx={{ minWidth: 150 }}>Next Step</Button>
        </Stack>
      </Paper>

      <Alert severity="info">Preview only: navigating these steps does not save completion or change the reusable permit template.</Alert>
    </Stack>
  );
}
