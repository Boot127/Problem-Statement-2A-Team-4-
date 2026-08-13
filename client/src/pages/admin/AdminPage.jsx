import { useCallback, useEffect, useState } from 'react';
import { Box, Card, CardContent, Tab, Tabs } from '@mui/material';
import DashboardOutlinedIcon from '@mui/icons-material/DashboardOutlined';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import ManageAccountsOutlinedIcon from '@mui/icons-material/ManageAccountsOutlined';
import HistoryOutlinedIcon from '@mui/icons-material/HistoryOutlined';
import SecurityOutlinedIcon from '@mui/icons-material/SecurityOutlined';
import { useLocation, useNavigate } from 'react-router-dom';
import adminActivityService from '../../api/adminActivityService';
import adminUserService from '../../api/adminUserService';
import AppBreadcrumbs from '../../components/common/AppBreadcrumbs';
import PageHeader from '../../components/common/PageHeader';
import AdminOverview from './AdminOverview';
import ArchiveManagement from './ArchiveManagement';
import UserManagement from './UserManagement';
import ActivityHistory from './ActivityHistory';
import AccessSecurity from './AccessSecurity';

const SECTIONS = [
  { value: 'overview', label: 'Overview', path: '/admin', icon: DashboardOutlinedIcon },
  { value: 'users', label: 'User Management', path: '/admin/users', icon: ManageAccountsOutlinedIcon },
  { value: 'archives', label: 'Archive Management', path: '/admin/archives', icon: Inventory2OutlinedIcon },
  { value: 'activity', label: 'Activity History', path: '/admin/activity', icon: HistoryOutlinedIcon },
  { value: 'security', label: 'Access & Security', path: '/admin/security', icon: SecurityOutlinedIcon },
];

export default function AdminPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const section = SECTIONS.find((item) => item.path !== '/admin' && location.pathname.endsWith(item.path))?.value || 'overview';
  const [users, setUsers] = useState([]);
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchUsers = useCallback(() => adminUserService.list(), []);
  const fetchOverview = useCallback(() => adminActivityService.overview(), []);
  const loadUsers = useCallback(() => {
    setLoading(true);
    return fetchUsers()
      .then((items) => { setUsers(items); setError(''); })
      .catch((requestError) => setError(requestError.response?.data?.message || 'Could not load existing users.'))
      .finally(() => setLoading(false));
  }, [fetchUsers]);

  useEffect(() => {
    let active = true;
    Promise.allSettled([fetchUsers(), fetchOverview()])
      .then(([userResult, overviewResult]) => {
        if (!active) return;
        if (userResult.status === 'fulfilled') setUsers(userResult.value);
        if (overviewResult.status === 'fulfilled') setOverview(overviewResult.value);
        const failure = userResult.status === 'rejected' ? userResult.reason
          : overviewResult.status === 'rejected' ? overviewResult.reason : null;
        setError(failure?.response?.data?.message || (failure ? 'Could not load all Administration data.' : ''));
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [fetchOverview, fetchUsers]);

  const updateUser = (updated) => {
    setUsers((current) => current.map((user) => user.id === updated.id ? updated : user));
    fetchOverview().then(setOverview).catch(() => {});
  };

  return (
    <Box>
      <AppBreadcrumbs items={[{ label: 'Dashboard', href: '/' }, { label: 'Administration' }]} />
      <PageHeader title="Administration" subtitle="Administrator-only controls for accounts, archives, activity and platform access." />
      <Card variant="outlined" sx={{ mb: 3, boxShadow: '0 6px 22px rgba(15,23,42,.05)', overflow: 'visible' }}>
        <Tabs
          value={section}
          onChange={(_event, value) => navigate(SECTIONS.find((item) => item.value === value).path)}
          variant="scrollable"
          scrollButtons="auto"
          aria-label="Administration sections"
          sx={{ px: { xs: 0.5, sm: 1.5 }, '& .MuiTab-root': { minHeight: 60, fontWeight: 700 } }}
        >
          {SECTIONS.map(({ value, label, icon: Icon }) => <Tab key={value} value={value} label={label} icon={<Icon fontSize="small" />} iconPosition="start" />)}
        </Tabs>
      </Card>
      <Card variant="outlined" sx={{ boxShadow: '0 8px 28px rgba(15,23,42,.05)' }}>
        <CardContent sx={{ p: { xs: 2, sm: 3 }, '&:last-child': { pb: { xs: 2, sm: 3 } } }}>
          {section === 'overview' && <AdminOverview overview={overview} loading={loading} error={error} onNavigate={navigate} />}
          {section === 'users' && <UserManagement users={users} loading={loading} error={error} onReload={loadUsers} onUserUpdated={updateUser} />}
          {section === 'archives' && <ArchiveManagement />}
          {section === 'activity' && <ActivityHistory />}
          {section === 'security' && <AccessSecurity users={users} overview={overview} loading={loading} error={error} />}
        </CardContent>
      </Card>
    </Box>
  );
}
