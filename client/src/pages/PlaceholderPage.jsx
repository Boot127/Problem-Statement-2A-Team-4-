import { Box, Paper, Typography } from '@mui/material';
import PageHeader from '../components/common/PageHeader';
import AppBreadcrumbs from '../components/common/AppBreadcrumbs';

// Generic "not yet implemented" page for features owned by the other three
// developers. Only the shared shell + navigation link exist for these areas.
export default function PlaceholderPage({ title }) {
  return (
    <Box>
      <AppBreadcrumbs items={[{ label: 'Dashboard', href: '/' }, { label: title }]} />
      <PageHeader title={title} />
      <Paper variant="outlined" sx={{ p: 6, textAlign: 'center' }}>
        <Typography variant="h6" gutterBottom>
          {title}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          This feature will be implemented by the assigned developer.
        </Typography>
      </Paper>
    </Box>
  );
}
