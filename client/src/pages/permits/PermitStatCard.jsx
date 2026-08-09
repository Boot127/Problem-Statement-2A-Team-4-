import { Box, Paper, Stack, Typography } from '@mui/material';

// A single key-metric card for the permit detail page.
//
// Deliberately not another plain white Card: a tinted icon tile plus a left
// accent bar gives each metric its own identity, which is what the improvement
// plan asks for (Section 2.4 — "visually distinct summary cards").
//
// `tone` selects a palette key ('primary' | 'success' | 'warning' | 'info' |
// 'secondary' | 'error'); `muted` renders the neutral grey treatment used when
// a value is missing so gaps read as gaps rather than as real data.
export default function PermitStatCard({
  label,
  value,
  supporting,
  icon: Icon,
  tone = 'primary',
  muted = false,
}) {
  const accent = muted ? 'grey.400' : `${tone}.main`;

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2,
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
        borderColor: 'divider',
        // Left accent bar — the cheapest way to differentiate cards without
        // colouring whole surfaces, which would fight the page hierarchy.
        '&::before': {
          content: '""',
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: 4,
          bgcolor: accent,
        },
      }}
    >
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'flex-start', pl: 1 }}>
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: 2,
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: muted ? 'grey.100' : `${tone}.main`,
            color: muted ? 'text.disabled' : `${tone}.contrastText`,
          }}
        >
          <Icon fontSize="small" />
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography
            variant="caption"
            sx={{
              color: 'text.secondary',
              textTransform: 'uppercase',
              letterSpacing: 0.6,
              fontWeight: 700,
              display: 'block',
              lineHeight: 1.6,
            }}
          >
            {label}
          </Typography>
          <Typography
            variant="subtitle1"
            fontWeight={700}
            sx={{ lineHeight: 1.3, color: muted ? 'text.disabled' : 'text.primary' }}
          >
            {value}
          </Typography>
          {supporting && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
              {supporting}
            </Typography>
          )}
        </Box>
      </Stack>
    </Paper>
  );
}
