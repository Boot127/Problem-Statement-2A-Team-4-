import { useEffect, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Alert, Box, Button, Chip, Paper, Skeleton, Stack, Typography } from '@mui/material';
import ArrowForwardOutlinedIcon from '@mui/icons-material/ArrowForwardOutlined';
import BusinessOutlinedIcon from '@mui/icons-material/BusinessOutlined';
import permitService from '../../api/permitService';

export default function PermitGroupMemberships({ permitId, navigationState }) {
  const [groups, setGroups] = useState(undefined);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    permitService.listPermitGroups(permitId)
      .then((data) => { if (active) setGroups(data); })
      .catch(() => { if (active) { setGroups([]); setError(true); } });
    return () => { active = false; };
  }, [permitId]);

  return (
    <Paper component="section" variant="outlined" sx={{ p: { xs: 2, sm: 2.5 }, mb: 3 }} aria-labelledby="permit-memberships-heading">
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 0.5 }}><BusinessOutlinedIcon color="primary" /><Typography id="permit-memberships-heading" variant="h6" fontWeight={800}>Client / Permit Groups</Typography></Stack>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>Groups reference this same master record and always receive its latest information.</Typography>
      {groups === undefined ? <Skeleton variant="rounded" height={38} /> : error ? <Alert severity="warning">Group memberships could not be loaded.</Alert> : groups.length === 0 ? <Typography variant="body2" color="text.disabled">This permit is not currently referenced by any active group.</Typography> : (
        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
          {groups.map((group) => <Chip key={group.id} component={RouterLink} clickable to={`/permits/groups/${group.id}`} state={{ ...navigationState, permitGroupHref: `/permits/groups/${group.id}`, permitGroupName: group.groupName }} icon={<BusinessOutlinedIcon />} label={group.groupName} variant="outlined" />)}
          <Box sx={{ flexGrow: 1 }} />
          <Button component={RouterLink} to={navigationState?.permitListHref || '/permits'} size="small" endIcon={<ArrowForwardOutlinedIcon />}>Manage Groups</Button>
        </Stack>
      )}
    </Paper>
  );
}
