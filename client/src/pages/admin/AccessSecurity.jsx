import { Alert, Avatar, Box, Card, CardContent, Chip, Stack, Typography } from '@mui/material';
import AdminPanelSettingsOutlinedIcon from '@mui/icons-material/AdminPanelSettingsOutlined';
import LockPersonOutlinedIcon from '@mui/icons-material/LockPersonOutlined';
import SecurityOutlinedIcon from '@mui/icons-material/SecurityOutlined';
import { ROLE_LABELS, ROLES } from '../../utils/enums';
import { ROLE_PERMISSIONS, formatAccountDate, userProfile } from '../../utils/userProfile';
import { activityTitle, dateTime } from './activityPresentation';

export default function AccessSecurity({ users, overview }) {
  const securityActivity = (overview?.recentActivity || []).filter((item) => ['LOGIN','LOGOUT','USER_ROLE_CHANGED','RESTORE_ARCHIVED','PERMANENT_DELETE'].includes(item.action));
  return (
    <Stack spacing={3.5}>
      <Box><Typography variant="h6" fontWeight={750}>Access & Security</Typography><Typography variant="body2" color="text.secondary">Current account status, enforced shared RBAC and security limitations.</Typography></Box>
      <Box><Typography variant="subtitle1" fontWeight={750} sx={{ mb: 1.5 }}>Role Access Overview</Typography><Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2,minmax(0,1fr))' }, gap: 2 }}>{ROLES.map((role) => <Card key={role} variant="outlined"><CardContent><Stack direction="row" spacing={1.25} alignItems="center" sx={{ mb: 1.25 }}><Avatar variant="rounded" sx={{ bgcolor: '#edf3ff', color: 'primary.main' }}><AdminPanelSettingsOutlinedIcon /></Avatar><Typography fontWeight={750}>{ROLE_LABELS[role]}</Typography></Stack><Stack component="ul" spacing={0.75} sx={{ m: 0, pl: 2.5 }}>{ROLE_PERMISSIONS[role].map((permission) => <Typography component="li" variant="body2" key={permission}>{permission}</Typography>)}</Stack></CardContent></Card>)}</Box></Box>
      <Alert severity="warning" icon={<SecurityOutlinedIcon />}>
        <strong>Current enforcement gap:</strong> shared authentication/RBAC is enforced for Administration, Compliance Content, Legal Updates and audit access. The current Work Permit and Review route modules do not mount shared auth middleware, so their backend access is not included in the role claims above. This page reports the current implementation and does not modify teammate-owned routes.
      </Alert>
      <Box><Typography variant="subtitle1" fontWeight={750} sx={{ mb: 1.5 }}>Account Security</Typography><Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2,minmax(0,1fr))' }, gap: 1.5 }}>{users.map((user) => { const profile=userProfile(user); return <Card key={user.id} variant="outlined"><CardContent><Stack direction="row" spacing={1.5} alignItems="center"><Avatar sx={{ bgcolor: 'primary.main' }}><LockPersonOutlinedIcon /></Avatar><Box sx={{ flexGrow: 1, minWidth: 0 }}><Typography fontWeight={700}>{profile.displayName}</Typography><Typography variant="caption" color="text.secondary" sx={{ overflowWrap: 'anywhere' }}>{user.email}</Typography></Box><Chip size="small" color={profile.accountStatus==='ACTIVE'?'success':profile.accountStatus==='LOCKED'?'warning':'default'} label={profile.accountStatus} /></Stack><Box sx={{ mt: 1.5, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}><Typography variant="body2">Failed attempts: <strong>{user.failedAttempts ?? 0}</strong></Typography><Typography variant="body2">Last login: <strong>{formatAccountDate(user.lastLoginAt,'Never')}</strong></Typography></Box></CardContent></Card>; })}</Box></Box>
      <Box><Typography variant="subtitle1" fontWeight={750} sx={{ mb: 1.5 }}>Security Activity</Typography><Stack spacing={1}>{securityActivity.length ? securityActivity.map((item) => <Card key={item.id} variant="outlined"><CardContent sx={{ py: 1.25 }}><Typography variant="body2" fontWeight={700}>{activityTitle(item)}</Typography><Typography variant="caption" color="text.secondary">{item.actorName} · {dateTime(item.createdAt)}</Typography></CardContent></Card>) : <Alert severity="info">No recent security activity is available in the audit trail.</Alert>}</Stack></Box>
    </Stack>
  );
}
