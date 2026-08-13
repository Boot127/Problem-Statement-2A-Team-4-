import {
  Avatar, Box, Card, CardContent, Chip, Divider, List, ListItem, ListItemIcon,
  ListItemText, Stack, Typography,
} from '@mui/material';
import BadgeOutlinedIcon from '@mui/icons-material/BadgeOutlined';
import BusinessOutlinedIcon from '@mui/icons-material/BusinessOutlined';
import CheckCircleOutlineRoundedIcon from '@mui/icons-material/CheckCircleOutlineRounded';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import EventOutlinedIcon from '@mui/icons-material/EventOutlined';
import LocationOnOutlinedIcon from '@mui/icons-material/LocationOnOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import ScheduleOutlinedIcon from '@mui/icons-material/ScheduleOutlined';
import { formatAccountDate, initialsForUser, userProfile } from '../../utils/userProfile';

const STATUS_COLOR = { ACTIVE: 'success', LOCKED: 'warning', DISABLED: 'default' };

function Detail({ icon: Icon, label, value }) {
  return (
    <Stack direction="row" spacing={1.5} alignItems="flex-start">
      <Icon color="action" fontSize="small" />
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="caption" color="text.secondary">{label}</Typography>
        <Typography variant="body2" fontWeight={600} sx={{ overflowWrap: 'anywhere' }}>{value}</Typography>
      </Box>
    </Stack>
  );
}

export default function UserProfileCard({ user }) {
  const profile = userProfile(user);
  return (
    <Stack spacing={2.5}>
      <Card variant="outlined" sx={{ borderColor: 'rgba(30,58,138,0.15)', bgcolor: '#f8faff' }}>
        <CardContent>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'flex-start', sm: 'center' }}>
            <Avatar sx={{ width: 64, height: 64, bgcolor: 'primary.main', fontSize: 22, fontWeight: 700 }}>
              {initialsForUser(profile)}
            </Avatar>
            <Box sx={{ flexGrow: 1, minWidth: 0 }}>
              <Typography variant="h5" color="text.primary" fontWeight={750}>{profile.displayName}</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ overflowWrap: 'anywhere' }}>{profile.email}</Typography>
              <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: 'wrap', gap: 0.5 }}>
                <Chip size="small" label={profile.roleLabel} color="primary" variant="outlined" />
                <Chip size="small" label={profile.accountStatus} color={STATUS_COLOR[profile.accountStatus]} />
              </Stack>
            </Box>
          </Stack>
        </CardContent>
      </Card>

      <Box>
        <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5 }}>Contact / Identity</Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' }, gap: 2 }}>
          <Detail icon={EmailOutlinedIcon} label="Email" value={profile.email} />
          <Detail icon={BadgeOutlinedIcon} label="Employee ID" value={profile.employeeId} />
          <Detail icon={BusinessOutlinedIcon} label="Department" value={profile.department} />
          <Detail icon={LocationOnOutlinedIcon} label="Office" value={profile.office} />
        </Box>
      </Box>
      <Divider />
      <Box>
        <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5 }}>Account</Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' }, gap: 2 }}>
          <Detail icon={LockOutlinedIcon} label="Role" value={profile.roleLabel} />
          <Detail icon={CheckCircleOutlineRoundedIcon} label="Account status" value={profile.accountStatus} />
          <Detail icon={EventOutlinedIcon} label="Joined" value={formatAccountDate(profile.createdAt)} />
          <Detail icon={ScheduleOutlinedIcon} label="Last login" value={formatAccountDate(profile.lastLoginAt, 'No login recorded')} />
        </Box>
      </Box>
      <Divider />
      <Box>
        <Typography variant="subtitle1" fontWeight={700}>Permissions</Typography>
        <List dense disablePadding sx={{ mt: 0.75 }}>
          {profile.permissions.map((permission) => (
            <ListItem key={permission} disableGutters>
              <ListItemIcon sx={{ minWidth: 30 }}><CheckCircleOutlineRoundedIcon color="success" fontSize="small" /></ListItemIcon>
              <ListItemText primary={permission} slotProps={{ primary: { variant: 'body2' } }} />
            </ListItem>
          ))}
        </List>
      </Box>
    </Stack>
  );
}
