import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardActionArea,
  CardContent,
  Typography,
  Stack,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Divider,
} from '@mui/material';
import ArticleOutlinedIcon from '@mui/icons-material/ArticleOutlined';
import AssignmentIndOutlinedIcon from '@mui/icons-material/AssignmentIndOutlined';
import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined';
import CampaignOutlinedIcon from '@mui/icons-material/CampaignOutlined';
import HistoryOutlinedIcon from '@mui/icons-material/HistoryOutlined';
import PageHeader from '../components/common/PageHeader';
import permitService from '../api/permitService';

// Compliance Content, Pending Reviews, and Detected Legal Updates are owned
// by the other three developers and are not implemented yet, so their counts
// are placeholder values. Active Work Permits reads real data from Dev 2's
// permitService since that feature is complete.
const SUMMARY_CARDS = [
  { key: 'records', label: 'Total Compliance Records', value: 42, icon: ArticleOutlinedIcon, color: 'primary' },
  { key: 'permits', label: 'Active Work Permits', icon: AssignmentIndOutlinedIcon, color: 'success', live: true },
  { key: 'reviews', label: 'Pending Reviews', value: 5, icon: FactCheckOutlinedIcon, color: 'warning' },
  { key: 'updates', label: 'Detected Legal Updates', value: 8, icon: CampaignOutlinedIcon, color: 'info' },
];

const QUICK_LINKS = [
  {
    label: 'Compliance Content Management',
    description: 'Manage labour laws, statutory benefits, and benefit components.',
    path: '/content',
    icon: ArticleOutlinedIcon,
  },
  {
    label: 'Work Permit Management',
    description: 'Create and maintain work-permit types by country.',
    path: '/permits',
    icon: AssignmentIndOutlinedIcon,
  },
  {
    label: 'Review & Approval Workflow',
    description: 'Track content submissions through review and publish.',
    path: '/reviews',
    icon: FactCheckOutlinedIcon,
  },
  {
    label: 'Legal Updates Management',
    description: 'Review AI-flagged newsletter updates for relevant countries.',
    path: '/updates',
    icon: CampaignOutlinedIcon,
  },
];

const RECENT_ACTIVITY = [
  { text: 'Singapore Employment Pass was published', time: '2 hours ago' },
  { text: 'Philippines AEP eligibility criteria updated', time: '5 hours ago' },
  { text: 'Vietnam Work Permit archived', time: 'Yesterday' },
  { text: 'Malaysia Employment Pass created', time: '2 days ago' },
];

export default function DashboardPage() {
  const navigate = useNavigate();
  const [activePermits, setActivePermits] = useState(null);

  useEffect(() => {
    permitService.list().then((permits) => {
      setActivePermits(permits.filter((p) => p.status !== 'ARCHIVED').length);
    });
  }, []);

  return (
    <Box>
      <PageHeader
        title="Dashboard"
        subtitle="An overview of compliance content, work permits, reviews, and legal updates."
      />

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(4, 1fr)' },
          gap: 2,
          mb: 4,
        }}
      >
        {SUMMARY_CARDS.map(({ key, label, value, icon: Icon, color, live }) => (
          <Card key={key} variant="outlined">
            <CardContent>
              <Stack direction="row" spacing={2} alignItems="center">
                <Avatar sx={{ bgcolor: `${color}.main`, width: 44, height: 44 }}>
                  <Icon fontSize="small" />
                </Avatar>
                <Box>
                  <Typography variant="h5" fontWeight={700}>
                    {live ? (activePermits ?? '—') : value}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {label}
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        ))}
      </Box>

      <Typography variant="h6" sx={{ mb: 2 }}>
        Quick Access
      </Typography>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
          gap: 2,
          mb: 4,
        }}
      >
        {QUICK_LINKS.map(({ label, description, path, icon: Icon }) => (
          <Card key={path} variant="outlined">
            <CardActionArea onClick={() => navigate(path)} sx={{ height: '100%', p: 0.5 }}>
              <CardContent>
                <Stack direction="row" spacing={2} alignItems="flex-start">
                  <Avatar sx={{ bgcolor: 'primary.main', width: 44, height: 44 }}>
                    <Icon fontSize="small" />
                  </Avatar>
                  <Box>
                    <Typography variant="subtitle1" fontWeight={600}>
                      {label}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {description}
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </CardActionArea>
          </Card>
        ))}
      </Box>

      <Typography variant="h6" sx={{ mb: 2 }}>
        Recent Activity
      </Typography>
      <Card variant="outlined">
        <List disablePadding>
          {RECENT_ACTIVITY.map((item, index) => (
            <Box key={item.text}>
              <ListItem>
                <ListItemAvatar>
                  <Avatar sx={{ width: 34, height: 34, bgcolor: 'grey.100', color: 'text.secondary' }}>
                    <HistoryOutlinedIcon fontSize="small" />
                  </Avatar>
                </ListItemAvatar>
                <ListItemText primary={item.text} secondary={item.time} />
              </ListItem>
              {index < RECENT_ACTIVITY.length - 1 && <Divider component="li" />}
            </Box>
          ))}
        </List>
      </Card>
    </Box>
  );
}
