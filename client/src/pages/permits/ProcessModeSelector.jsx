import { Box, Stack, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import AccountTreeOutlinedIcon from '@mui/icons-material/AccountTreeOutlined';
import MenuBookOutlinedIcon from '@mui/icons-material/MenuBookOutlined';

const MODES = [
  {
    value: 'template',
    label: 'Process Template',
    description: 'Manage the official reusable steps and checklist.',
    icon: AccountTreeOutlinedIcon,
  },
  {
    value: 'guided',
    label: 'Guided Mode',
    description: 'Walk through the process one step at a time.',
    icon: MenuBookOutlinedIcon,
  },
];

export default function ProcessModeSelector({ value, onChange }) {
  return (
    <ToggleButtonGroup
      exclusive
      fullWidth
      value={value}
      onChange={(_event, nextValue) => nextValue && onChange(nextValue)}
      aria-label="Process display mode"
      sx={{
        p: 0.75,
        bgcolor: 'grey.100',
        borderRadius: 2.5,
        gap: 0.75,
        '& .MuiToggleButtonGroup-grouped': {
          m: 0,
          border: '1px solid transparent',
          borderRadius: '10px !important',
          color: 'text.primary',
          textTransform: 'none',
          px: { xs: 1.25, sm: 2 },
          py: 1.25,
          minHeight: { xs: 80, sm: 74 },
          alignItems: 'stretch',
          '&:focus-visible': { outline: '3px solid', outlineColor: 'primary.light', outlineOffset: 2 },
        },
        '& .MuiToggleButton-root.Mui-selected': {
          bgcolor: 'primary.main',
          color: 'primary.contrastText',
          borderColor: 'primary.main',
          boxShadow: 2,
          '&:hover': { bgcolor: 'primary.dark' },
        },
      }}
    >
      {MODES.map(({ value: modeValue, label, description, icon: Icon }) => (
        <ToggleButton key={modeValue} value={modeValue} aria-label={label}>
          <Stack direction="row" spacing={{ xs: 0.75, sm: 1.25 }} sx={{ alignItems: 'flex-start', textAlign: 'left', width: '100%' }}>
            <Box sx={{ display: 'flex', mt: 0.15 }}><Icon /></Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="subtitle2" fontWeight={900} sx={{ color: 'inherit', lineHeight: 1.3 }}>{label}</Typography>
              <Typography variant="caption" sx={{ color: 'inherit', opacity: 0.82, lineHeight: 1.35, display: 'block', mt: 0.25 }}>{description}</Typography>
            </Box>
          </Stack>
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  );
}
