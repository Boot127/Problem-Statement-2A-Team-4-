import { Box, Chip, Dialog, DialogContent, DialogTitle, Divider, IconButton, Stack, Typography } from '@mui/material';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import { ROLE_LABELS } from '../../utils/enums';
import { actionLabel, dateTime, entityLabel } from './activityPresentation';

function friendlyKey(value) {
  return value.replace(/([a-z])([A-Z])/g, '$1 $2').replaceAll('_', ' ').replace(/^./, (letter) => letter.toUpperCase());
}
function valueLabel(key, value) {
  if (key === 'role') return ROLE_LABELS[value] || value;
  if (value == null) return 'Not recorded';
  if (typeof value === 'object') return JSON.stringify(value, null, 2);
  return String(value);
}
function ChangeValues({ title, value }) {
  if (!value || Object.keys(value).length === 0) return null;
  return (
    <Box>
      <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>{title}</Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2,minmax(0,1fr))' }, gap: 1.25 }}>
        {Object.entries(value).filter(([key]) => key !== 'event').map(([key, entry]) => (
          <Box key={key} sx={{ p: 1.25, bgcolor: 'grey.50', borderRadius: 1.5 }}>
            <Typography variant="caption" color="text.secondary">{friendlyKey(key)}</Typography>
            <Typography component={typeof entry === 'object' ? 'pre' : 'p'} variant="body2" fontWeight={600} sx={{ m: 0, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
              {valueLabel(key, entry)}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

export default function ActivityDetailsDialog({ activity, onClose }) {
  return (
    <Dialog open={Boolean(activity)} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ pr: 6 }}>Activity Details<IconButton aria-label="Close activity details" onClick={onClose} sx={{ position: 'absolute', right: 12, top: 12 }}><CloseRoundedIcon /></IconButton></DialogTitle>
      <DialogContent dividers>
        {activity && <Stack spacing={2.25}>
          <Stack direction="row" spacing={1} flexWrap="wrap"><Chip color="primary" label={actionLabel(activity.action)} /><Chip variant="outlined" label={entityLabel(activity.entityType)} /></Stack>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2,minmax(0,1fr))' }, gap: 2 }}>
            <Box><Typography variant="caption" color="text.secondary">Performed by</Typography><Typography fontWeight={700}>{activity.actorName}</Typography><Typography variant="body2" color="text.secondary" sx={{ overflowWrap: 'anywhere' }}>{activity.actorEmail || 'System event'}</Typography></Box>
            <Box><Typography variant="caption" color="text.secondary">Target</Typography><Typography fontWeight={700} sx={{ overflowWrap: 'anywhere' }}>{activity.targetTitle}</Typography><Typography variant="body2" color="text.secondary">Entity ID: {activity.entityId ?? 'Not recorded'}</Typography></Box>
            <Box><Typography variant="caption" color="text.secondary">Action</Typography><Typography fontWeight={700}>{activity.action}</Typography></Box>
            <Box><Typography variant="caption" color="text.secondary">Date and time</Typography><Typography fontWeight={700}>{dateTime(activity.createdAt)}</Typography></Box>
          </Box>
          <Divider />
          <ChangeValues title="Previous values" value={activity.oldValue} />
          <ChangeValues title="New values" value={activity.newValue} />
          {!activity.oldValue && !activity.newValue && <Typography variant="body2" color="text.secondary">This event did not record field-level changes.</Typography>}
        </Stack>}
      </DialogContent>
    </Dialog>
  );
}
