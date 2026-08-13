import { useMemo, useState } from 'react';
import {
  Alert, Avatar, Box, Button, Card, CardContent, Chip, Dialog, DialogContent, DialogTitle,
  FormControl, IconButton, InputAdornment, InputLabel, MenuItem, Select, Skeleton, Stack,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Tooltip,
  Typography, useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useNavigate } from 'react-router-dom';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import UserProfileCard from '../../components/profile/UserProfileCard';
import adminUserService from '../../api/adminUserService';
import { ROLE_LABELS, ROLES } from '../../utils/enums';
import { formatAccountDate, initialsForUser, userProfile } from '../../utils/userProfile';
import { useAuth } from '../../context/AuthContext';
import RoleChangeDialog from './RoleChangeDialog';

const STATUS_COLOR = { ACTIVE: 'success', LOCKED: 'warning', DISABLED: 'default' };

export default function UserManagement({ users, loading, error, onReload, onUserUpdated }) {
  const theme = useTheme();
  const mobile = useMediaQuery(theme.breakpoints.down('sm'));
  const navigate = useNavigate();
  const { user: currentUser, refreshUser } = useAuth();
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');
  const [selected, setSelected] = useState(null);
  const [change, setChange] = useState(null);
  const [busy, setBusy] = useState(false);
  const [changeError, setChangeError] = useState('');
  const [success, setSuccess] = useState('');

  const filtered = useMemo(() => users.filter((user) => {
    const profile = userProfile(user);
    const query = search.trim().toLowerCase();
    return (!query || profile.email.toLowerCase().includes(query) || profile.displayName.toLowerCase().includes(query))
      && (!role || user.role === role) && (!status || profile.accountStatus === status);
  }), [users, search, role, status]);

  const requestRole = (user, nextRole) => {
    if (nextRole === user.role) return;
    setChange({ user, role: nextRole }); setChangeError('');
  };
  const confirmRole = async () => {
    setBusy(true); setChangeError('');
    try {
      const updated = await adminUserService.changeRole(change.user.id, change.role);
      onUserUpdated(updated);
      setSuccess(`Updated ${updated.email} to ${ROLE_LABELS[updated.role]}.`);
      setChange(null);
      if (updated.id === currentUser?.id) {
        await refreshUser();
        navigate('/', { replace: true });
      }
    } catch (requestError) {
      setChangeError(requestError.response?.data?.message || 'Could not change this role.');
    } finally { setBusy(false); }
  };

  const roleSelect = (user) => (
    <FormControl size="small" sx={{ minWidth: 160 }}>
      <Select value={user.role} onChange={(event) => requestRole(user, event.target.value)} aria-label={`Role for ${user.email}`}>
        {ROLES.map((value) => <MenuItem key={value} value={value}>{ROLE_LABELS[value]}</MenuItem>)}
      </Select>
    </FormControl>
  );

  return (
    <Stack spacing={2.5}>
      <Box>
        <Typography variant="h6" fontWeight={750}>User Management</Typography>
        <Typography variant="body2" color="text.secondary">Manage roles for existing accounts. User creation and deletion are not available here.</Typography>
      </Box>
      {error && <Alert severity="error" action={<Button color="inherit" onClick={onReload}>Retry</Button>}>{error}</Alert>}
      {success && <Alert severity="success" onClose={() => setSuccess('')}>{success}</Alert>}
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
        <TextField fullWidth size="small" label="Search users" value={search} onChange={(event) => setSearch(event.target.value)} InputProps={{ startAdornment: <InputAdornment position="start"><SearchOutlinedIcon /></InputAdornment> }} />
        <FormControl size="small" sx={{ minWidth: { md: 190 } }}><InputLabel>Role</InputLabel><Select label="Role" value={role} onChange={(event) => setRole(event.target.value)}><MenuItem value="">All roles</MenuItem>{ROLES.map((value) => <MenuItem key={value} value={value}>{ROLE_LABELS[value]}</MenuItem>)}</Select></FormControl>
        <FormControl size="small" sx={{ minWidth: { md: 170 } }}><InputLabel>Status</InputLabel><Select label="Status" value={status} onChange={(event) => setStatus(event.target.value)}><MenuItem value="">All statuses</MenuItem>{['ACTIVE','LOCKED','DISABLED'].map((value) => <MenuItem key={value} value={value}>{value}</MenuItem>)}</Select></FormControl>
      </Stack>

      {loading ? <Stack spacing={1}>{[1,2,3,4].map((value) => <Skeleton key={value} variant="rounded" height={72} />)}</Stack>
        : filtered.length === 0 ? <Alert severity="info">No existing users match these filters.</Alert>
        : mobile ? (
          <Stack spacing={1.5}>
            {filtered.map((user) => { const profile = userProfile(user); return (
              <Card key={user.id} variant="outlined"><CardContent>
                <Stack spacing={1.5}>
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <Avatar sx={{ bgcolor: 'primary.main' }}>{initialsForUser(user)}</Avatar>
                    <Box sx={{ minWidth: 0, flexGrow: 1 }}><Typography fontWeight={700}>{profile.displayName}</Typography><Typography variant="body2" color="text.secondary" sx={{ overflowWrap: 'anywhere' }}>{user.email}</Typography></Box>
                    <Chip size="small" label={profile.accountStatus} color={STATUS_COLOR[profile.accountStatus]} />
                  </Stack>
                  <Typography variant="body2" color="text.secondary">
                    Last login: {formatAccountDate(user.lastLoginAt, 'No login recorded')}
                  </Typography>
                  {roleSelect(user)}
                  <Button startIcon={<VisibilityOutlinedIcon />} onClick={() => setSelected(user)}>View Profile</Button>
                </Stack>
              </CardContent></Card>
            ); })}
          </Stack>
        ) : (
          <TableContainer component={Card} variant="outlined">
            <Table><TableHead><TableRow><TableCell>User</TableCell><TableCell>Status</TableCell><TableCell>Last login</TableCell><TableCell>Role</TableCell><TableCell align="right">Actions</TableCell></TableRow></TableHead>
              <TableBody>{filtered.map((user) => { const profile = userProfile(user); return (
                <TableRow key={user.id} hover>
                  <TableCell><Stack direction="row" spacing={1.5} alignItems="center"><Avatar sx={{ bgcolor: 'primary.main', width: 38, height: 38 }}>{initialsForUser(user)}</Avatar><Box><Typography variant="body2" fontWeight={700}>{profile.displayName}</Typography><Typography variant="caption" color="text.secondary">{user.email}</Typography></Box></Stack></TableCell>
                  <TableCell><Chip size="small" label={profile.accountStatus} color={STATUS_COLOR[profile.accountStatus]} /></TableCell>
                  <TableCell>{formatAccountDate(user.lastLoginAt, 'No login recorded')}</TableCell>
                  <TableCell>{roleSelect(user)}</TableCell>
                  <TableCell align="right"><Tooltip title="View profile"><IconButton aria-label={`View profile for ${user.email}`} onClick={() => setSelected(user)}><VisibilityOutlinedIcon /></IconButton></Tooltip></TableCell>
                </TableRow>
              ); })}</TableBody>
            </Table>
          </TableContainer>
        )}

      <Dialog open={Boolean(selected)} onClose={() => setSelected(null)} fullWidth maxWidth="md" fullScreen={mobile}>
        <DialogTitle sx={{ pr: 6 }}>User Profile<IconButton aria-label="Close profile" onClick={() => setSelected(null)} sx={{ position: 'absolute', right: 12, top: 12 }}><CloseRoundedIcon /></IconButton></DialogTitle>
        <DialogContent dividers>{selected && <UserProfileCard user={selected} />}</DialogContent>
      </Dialog>
      <RoleChangeDialog change={change} busy={busy} error={changeError} onClose={() => setChange(null)} onConfirm={confirmRole} />
    </Stack>
  );
}
