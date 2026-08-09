import { Box, Button, Chip, Paper, Skeleton, Stack, Typography } from '@mui/material';
import AddOutlinedIcon from '@mui/icons-material/AddOutlined';
import BusinessOutlinedIcon from '@mui/icons-material/BusinessOutlined';
import ArrowForwardOutlinedIcon from '@mui/icons-material/ArrowForwardOutlined';
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
import { countryName } from '../../utils/countries';

export default function PermitGroupsSection({ groups, loading, onCreate, onOpen }) {
  return (
    <Box component="section" aria-labelledby="permit-groups-heading" sx={{ mb: 4 }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' }, mb: 1.5 }}>
        <Box>
          <Typography id="permit-groups-heading" variant="overline" color="primary" fontWeight={900}>CLIENT / PERMIT GROUPS</Typography>
          <Typography variant="body2" color="text.secondary">Organise references to the same master permits for clients or internal teams.</Typography>
        </Box>
        <Button variant="outlined" startIcon={<AddOutlinedIcon />} onClick={onCreate}>Create Permit Group</Button>
      </Stack>

      {loading ? (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3,1fr)' }, gap: 2 }}>{[1, 2, 3].map((item) => <Skeleton key={item} variant="rounded" height={220} />)}</Box>
      ) : groups.length === 0 ? (
        <Paper variant="outlined" sx={{ p: 3, bgcolor: 'action.hover', textAlign: 'center' }}>
          <BusinessOutlinedIcon color="disabled" sx={{ fontSize: 38 }} />
          <Typography variant="subtitle1" fontWeight={800}>No permit groups yet</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>Create a group, then add existing Work Permit records without duplicating them.</Typography>
          <Button variant="contained" startIcon={<AddOutlinedIcon />} onClick={onCreate}>Create the first group</Button>
        </Paper>
      ) : (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2,1fr)', xl: 'repeat(3,1fr)' }, gap: 2 }}>
          {groups.map((group) => (
            <Paper key={group.id} variant="outlined" sx={{ p: 2.5, display: 'flex', flexDirection: 'column', minHeight: 230, borderTop: 4, borderTopColor: group.needsAttentionCount ? 'warning.main' : 'primary.main' }}>
              <Stack direction="row" spacing={1.25} sx={{ alignItems: 'flex-start' }}><Box sx={{ width: 42, height: 42, borderRadius: 2, bgcolor: 'primary.main', color: 'primary.contrastText', display: 'grid', placeItems: 'center', flexShrink: 0 }}><BusinessOutlinedIcon /></Box><Box sx={{ minWidth: 0 }}><Typography variant="h6" fontWeight={900}>{group.groupName}</Typography>{group.description && <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{group.description}</Typography>}</Box></Stack>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 1, my: 2 }}>
                <Box><Typography variant="h6" fontWeight={900}>{group.permitCount}</Typography><Typography variant="caption" color="text.secondary">Work Permits</Typography></Box>
                <Box><Typography variant="h6" fontWeight={900}>{group.countryCount}</Typography><Typography variant="caption" color="text.secondary">Countries</Typography></Box>
                <Box><Typography variant="h6" fontWeight={900} color={group.needsAttentionCount ? 'warning.main' : 'text.primary'}>{group.needsAttentionCount}</Typography><Typography variant="caption" color="text.secondary">Needs Attention</Typography></Box>
              </Box>
              <Stack direction="row" spacing={0.75} sx={{ flexWrap: 'wrap', gap: 0.75 }}>
                {group.countryCodes.slice(0, 4).map((code) => <Chip key={code} size="small" variant="outlined" label={countryName(code)} />)}
                {group.countryCodes.length > 4 && <Chip size="small" label={`+${group.countryCodes.length - 4}`} />}
                {group.reviewDueCount > 0 && <Chip size="small" color="warning" icon={<WarningAmberOutlinedIcon />} label={`${group.reviewDueCount} review due`} />}
              </Stack>
              <Box sx={{ flexGrow: 1 }} />
              <Button endIcon={<ArrowForwardOutlinedIcon />} onClick={() => onOpen(group.id)} sx={{ alignSelf: 'flex-start', mt: 2 }}>View Group</Button>
            </Paper>
          ))}
        </Box>
      )}
    </Box>
  );
}
