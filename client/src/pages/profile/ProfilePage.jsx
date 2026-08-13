import { Box, Button, Card, CardContent, Stack, Typography } from '@mui/material';
import SecurityOutlinedIcon from '@mui/icons-material/SecurityOutlined';
import { useNavigate } from 'react-router-dom';
import AppBreadcrumbs from '../../components/common/AppBreadcrumbs';
import PageHeader from '../../components/common/PageHeader';
import UserProfileCard from '../../components/profile/UserProfileCard';
import { useAuth } from '../../context/AuthContext';

export default function ProfilePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  return (
    <Box sx={{ maxWidth: 920, mx: 'auto' }}>
      <AppBreadcrumbs items={[{ label: 'Dashboard', href: '/' }, { label: 'My Profile' }]} />
      <PageHeader title="My Profile" subtitle="Your account identity, access level and platform permissions." />
      <Card variant="outlined" sx={{ boxShadow: '0 8px 28px rgba(15,23,42,0.06)' }}>
        <CardContent sx={{ p: { xs: 2, sm: 3.5 }, '&:last-child': { pb: { xs: 2, sm: 3.5 } } }}>
          <UserProfileCard user={user} />
        </CardContent>
      </Card>
      {user?.role === 'admin' && (
        <Card variant="outlined" sx={{ mt: 2.5, boxShadow: '0 8px 28px rgba(15,23,42,0.05)' }}>
          <CardContent>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }} justifyContent="space-between">
              <Box>
                <Typography variant="h6" fontWeight={800}>Account Security</Typography>
                <Typography variant="body2" color="text.secondary">
                  Review your Administrator access, account status and available sign-in protections.
                </Typography>
              </Box>
              <Button variant="outlined" startIcon={<SecurityOutlinedIcon />} onClick={() => navigate('/admin/security')}>
                Manage Security
              </Button>
            </Stack>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}
