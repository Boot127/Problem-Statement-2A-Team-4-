import { Alert, Avatar, Box, Card, CardActionArea, CardContent, Chip, Skeleton, Stack, Typography } from '@mui/material';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined';
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined';
import HistoryOutlinedIcon from '@mui/icons-material/HistoryOutlined';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import ManageAccountsOutlinedIcon from '@mui/icons-material/ManageAccountsOutlined';
import SecurityOutlinedIcon from '@mui/icons-material/SecurityOutlined';
import VerifiedUserOutlinedIcon from '@mui/icons-material/VerifiedUserOutlined';
import { activityTitle, dateTime } from './activityPresentation';

const STATS = [
  { key: 'totalUsers', label: 'Total Users', icon: GroupsOutlinedIcon },
  { key: 'activeUsers', label: 'Active Users', icon: VerifiedUserOutlinedIcon },
  { key: 'administrators', label: 'Administrators', icon: SecurityOutlinedIcon },
  { key: 'archivedItems', label: 'Archived Items', icon: Inventory2OutlinedIcon },
  { key: 'pendingReviews', label: 'Pending Reviews', icon: FactCheckOutlinedIcon },
  { key: 'lockedAccounts', label: 'Locked Accounts', icon: LockOutlinedIcon },
];
const ACTIONS = [
  { title: 'Manage Users', path: '/admin/users', icon: ManageAccountsOutlinedIcon },
  { title: 'Archive Management', path: '/admin/archives', icon: Inventory2OutlinedIcon },
  { title: 'Activity History', path: '/admin/activity', icon: HistoryOutlinedIcon },
  { title: 'Access & Security', path: '/admin/security', icon: SecurityOutlinedIcon },
];

export default function AdminOverview({ overview, loading, error, onNavigate }) {
  const counts = overview?.counts || {};
  const attention = [
    { label: 'Locked accounts', value: counts.lockedAccounts, severity: 'warning', path: '/admin/security' },
    { label: 'Archived items', value: counts.archivedItems, severity: 'info', path: '/admin/archives' },
    { label: 'Pending reviews', value: counts.pendingReviews, severity: 'warning', path: '/reviews' },
  ].filter((item) => Number(item.value) > 0);
  return (
    <Stack spacing={3.5}>
      <Box><Typography variant="h6" fontWeight={750}>Platform overview</Typography><Typography variant="body2" color="text.secondary">Live administrative totals and actions from the current platform database.</Typography></Box>
      {error && <Alert severity="warning">{error}</Alert>}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2,minmax(0,1fr))', lg: 'repeat(3,minmax(0,1fr))' }, gap: 2 }}>
        {STATS.map(({ key, label, icon: Icon }) => <Card key={key} variant="outlined" sx={{ borderColor: 'rgba(30,58,138,.14)', minHeight: 112 }}><CardContent><Stack direction="row" alignItems="center" justifyContent="space-between"><Box>{loading ? <Skeleton width={36} height={38} /> : <Typography variant="h4" fontWeight={750}>{counts[key] ?? 0}</Typography>}<Typography variant="body2" color="text.secondary">{label}</Typography></Box><Avatar variant="rounded" sx={{ bgcolor: '#edf3ff', color: 'primary.main' }}><Icon /></Avatar></Stack></CardContent></Card>)}
      </Box>
      <Box><Typography variant="subtitle1" fontWeight={750} sx={{ mb: 1.5 }}>Administration Quick Actions</Typography><Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2,minmax(0,1fr))' }, gap: 1.5 }}>{ACTIONS.map(({ title, path, icon: Icon }) => <Card key={path} variant="outlined"><CardActionArea onClick={() => onNavigate(path)}><CardContent><Stack direction="row" spacing={1.5} alignItems="center"><Avatar variant="rounded" sx={{ bgcolor: 'primary.main' }}><Icon /></Avatar><Typography fontWeight={700} sx={{ flexGrow: 1 }}>{title}</Typography><ArrowForwardRoundedIcon color="action" /></Stack></CardContent></CardActionArea></Card>)}</Box></Box>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'minmax(0,1.25fr) minmax(280px,.75fr)' }, gap: 3 }}>
        <Box><Typography variant="subtitle1" fontWeight={750} sx={{ mb: 1.5 }}>Recent Administrative Activity</Typography><Stack spacing={1}>{loading ? [1,2,3].map((value) => <Skeleton key={value} variant="rounded" height={65} />) : overview?.recentActivity?.length ? overview.recentActivity.map((item) => <Card key={item.id} variant="outlined"><CardActionArea onClick={() => onNavigate('/admin/activity')}><CardContent sx={{ py: 1.25 }}><Typography variant="body2" fontWeight={700}>{activityTitle(item)}</Typography><Typography variant="caption" color="text.secondary">{item.actorName} · {dateTime(item.createdAt)}</Typography></CardContent></CardActionArea></Card>) : <Alert severity="info">No administrative activity has been recorded yet.</Alert>}</Stack></Box>
        <Box><Typography variant="subtitle1" fontWeight={750} sx={{ mb: 1.5 }}>Needs Attention</Typography><Card variant="outlined"><CardContent><Stack spacing={1.25}>{attention.length ? attention.map((item) => <CardActionArea key={item.label} onClick={() => onNavigate(item.path)} sx={{ borderRadius: 1.5, p: 1 }}><Stack direction="row" justifyContent="space-between" alignItems="center"><Typography variant="body2" fontWeight={650}>{item.label}</Typography><Chip size="small" color={item.severity} label={item.value} /></Stack></CardActionArea>) : <Alert severity="success">No administrative warnings require attention.</Alert>}</Stack></CardContent></Card></Box>
      </Box>
    </Stack>
  );
}
