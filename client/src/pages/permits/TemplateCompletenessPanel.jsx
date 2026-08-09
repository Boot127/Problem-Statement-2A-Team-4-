import { Box, Chip, LinearProgress, Paper, Stack, Typography } from '@mui/material';
import AccountTreeOutlinedIcon from '@mui/icons-material/AccountTreeOutlined';
import ScheduleOutlinedIcon from '@mui/icons-material/ScheduleOutlined';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
import { calculateTemplateCompleteness } from './processPresentation';

function Metric({ value, label }) {
  return (
    <Box>
      <Typography variant="h5" fontWeight={900} sx={{ color: 'text.primary', lineHeight: 1.1 }}>{value}</Typography>
      <Typography variant="caption" color="text.secondary" fontWeight={700}>{label}</Typography>
    </Box>
  );
}

export default function TemplateCompletenessPanel({ steps, documents, summary, timelineEstimate }) {
  const completeness = calculateTemplateCompleteness(steps, documents);
  const tone = completeness.percentage >= 85 ? 'success' : completeness.percentage >= 60 ? 'warning' : 'error';
  const StatusIcon = completeness.missing.length ? WarningAmberOutlinedIcon : CheckCircleOutlinedIcon;

  return (
    <Paper variant="outlined" sx={{ p: { xs: 2, sm: 2.5 }, mb: 3, bgcolor: 'grey.50' }}>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ justifyContent: 'space-between', alignItems: { md: 'flex-start' } }}>
        <Box>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}><AccountTreeOutlinedIcon color="primary" /><Typography variant="h6" fontWeight={900}>Process Template</Typography></Stack>
          <Typography variant="body2" color="text.secondary">Official reusable process information—not application progress.</Typography>
        </Box>
        <Chip icon={<ScheduleOutlinedIcon />} size="small" variant="outlined" color="info" label={timelineEstimate ? `Estimated timeline ${timelineEstimate}` : 'Timeline not recorded'} />
      </Stack>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(4, 1fr)' }, gap: 2, mt: 2.5, mb: 2.5 }}>
        <Metric value={summary.stepCount} label="Steps" />
        <Metric value={summary.documentCount} label="Documents" />
        <Metric value={summary.mandatoryCount} label="Mandatory" />
        <Metric value={summary.optionalCount} label="Optional" />
      </Box>

      <Box sx={{ pt: 2, borderTop: 1, borderColor: 'divider' }}>
        <Stack direction="row" spacing={1} sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 0.75 }}>
          <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}><StatusIcon color={tone} fontSize="small" /><Typography variant="subtitle2" fontWeight={900}>Process Information Completeness</Typography></Stack>
          <Typography variant="subtitle1" fontWeight={900} color={`${tone}.main`}>{completeness.percentage}%</Typography>
        </Stack>
        <LinearProgress variant="determinate" value={completeness.percentage} color={tone} aria-label={`Process information completeness ${completeness.percentage} percent`} sx={{ height: 9, borderRadius: 5 }} />
        {completeness.missing.length ? (
          <Box sx={{ mt: 1.25 }}>
            <Typography variant="caption" color="text.secondary" fontWeight={800}>MISSING INFORMATION</Typography>
            <Stack direction="row" spacing={0.75} sx={{ flexWrap: 'wrap', rowGap: 0.75, mt: 0.5 }}>
              {completeness.missing.slice(0, 4).map((item) => <Chip key={item} size="small" variant="outlined" color="warning" label={item} />)}
              {completeness.missing.length > 4 && <Chip size="small" label={`+${completeness.missing.length - 4} more`} />}
            </Stack>
          </Box>
        ) : (
          <Typography variant="body2" color="success.main" fontWeight={700} sx={{ mt: 1 }}>All process template information is complete.</Typography>
        )}
      </Box>
    </Paper>
  );
}
