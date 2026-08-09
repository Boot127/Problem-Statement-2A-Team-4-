import { Box, Paper, Tab, Tabs, Typography } from '@mui/material';
import { useLocation, useNavigate } from 'react-router-dom';
import AppBreadcrumbs from '../../components/common/AppBreadcrumbs';
import PageHeader from '../../components/common/PageHeader';
import ArchiveManagement from './ArchiveManagement';

export default function AdminPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const section = location.pathname.endsWith('/archives') ? 'archives' : 'users';
  return (
    <Box>
      <AppBreadcrumbs items={[{ label: 'Dashboard', href: '/' }, { label: 'Administration' }]} />
      <PageHeader title="Administration" subtitle="Administrator-only platform controls and archive recovery." />
      <Paper variant="outlined" sx={{ mb: 3 }}>
        <Tabs value={section} onChange={(_event, value) => navigate(value === 'archives' ? '/admin/archives' : '/admin')} variant="scrollable" scrollButtons="auto">
          <Tab value="users" label="User Management" />
          <Tab value="archives" label="Archive Management" />
        </Tabs>
      </Paper>
      {section === 'archives' ? <ArchiveManagement /> : <Paper variant="outlined" sx={{ p: 4 }}><Typography variant="h6" fontWeight={700}>User Management</Typography><Typography color="text.secondary">User provisioning and role maintenance remain part of the shared administration roadmap.</Typography></Paper>}
    </Box>
  );
}
