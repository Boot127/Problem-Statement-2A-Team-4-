import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Skeleton,
  Stack,
  Typography,
} from '@mui/material';
import AdminPanelSettingsOutlinedIcon from '@mui/icons-material/AdminPanelSettingsOutlined';
import ArticleOutlinedIcon from '@mui/icons-material/ArticleOutlined';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import AssignmentIndOutlinedIcon from '@mui/icons-material/AssignmentIndOutlined';
import CampaignOutlinedIcon from '@mui/icons-material/CampaignOutlined';
import CheckCircleOutlineRoundedIcon from '@mui/icons-material/CheckCircleOutlineRounded';
import ErrorOutlineRoundedIcon from '@mui/icons-material/ErrorOutlineRounded';
import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined';
import HistoryOutlinedIcon from '@mui/icons-material/HistoryOutlined';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined';
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
import dashboardService from '../api/dashboardService';
import { useAuth } from '../context/AuthContext';
import { REVIEW_STATE_LABELS } from '../utils/enums';
import { userProfile } from '../utils/userProfile';

const KPI_CARDS = [
  {
    key: 'records',
    label: 'Compliance Records',
    helper: 'Visible to your role',
    icon: ArticleOutlinedIcon,
    color: '#3159a6',
    tint: '#edf3ff',
  },
  {
    key: 'permits',
    label: 'Active Work Permits',
    helper: 'Draft and published',
    icon: AssignmentIndOutlinedIcon,
    color: '#16756d',
    tint: '#e9f7f4',
  },
  {
    key: 'reviews',
    label: 'Pending Reviews',
    helper: 'Awaiting review',
    icon: FactCheckOutlinedIcon,
    color: '#a65d08',
    tint: '#fff5e7',
  },
  {
    key: 'updates',
    label: 'Legal Updates',
    helper: 'Tracked newsletters',
    icon: CampaignOutlinedIcon,
    color: '#6851a3',
    tint: '#f3effc',
  },
];

const QUICK_LINKS = [
  {
    label: 'Compliance Content',
    description: 'Manage policies, statutory benefits, and supporting guidance.',
    path: '/content',
    icon: ArticleOutlinedIcon,
  },
  {
    label: 'Work Permit Management',
    description: 'Maintain permit guidance, process steps, and source evidence.',
    path: '/permits',
    icon: AssignmentIndOutlinedIcon,
  },
  {
    label: 'Review & Approval',
    description: 'Review submissions, comments, decisions, and publication status.',
    path: '/reviews',
    icon: FactCheckOutlinedIcon,
  },
  {
    label: 'Legal Updates',
    description: 'Assess newsletter updates and AI-assisted summaries.',
    path: '/updates',
    icon: CampaignOutlinedIcon,
  },
  {
    label: 'Search',
    description: 'Find compliance knowledge across the shared workspace.',
    path: '/search',
    icon: SearchOutlinedIcon,
  },
  {
    label: 'Administration',
    description: 'Manage administration tools and archived information.',
    path: '/admin',
    icon: AdminPanelSettingsOutlinedIcon,
    roles: ['admin'],
  },
];

const HEALTH_WARNINGS = [
  { key: 'OUTDATED', severity: 'error', label: 'Outdated' },
  { key: 'REVIEW_DUE', severity: 'warning', label: 'Review due' },
  { key: 'INCOMPLETE', severity: 'warning', label: 'Incomplete' },
  { key: 'DUE_SOON', severity: 'info', label: 'Due soon' },
];

const ENTITY_LABELS = {
  compliance_record: 'Compliance Content',
  work_permit: 'Work Permits',
  review_request: 'Review & Approval',
  newsletter: 'Legal Updates',
};

const ACTION_LABELS = {
  create: 'created',
  update: 'updated',
  archive: 'archived',
  publish: 'published',
  RESTORE_ARCHIVED: 'restored',
  PERMANENT_DELETE: 'permanently deleted',
};

function relativeTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Time unavailable';
  const seconds = Math.round((date.getTime() - Date.now()) / 1000);
  const ranges = [
    ['year', 31536000],
    ['month', 2592000],
    ['week', 604800],
    ['day', 86400],
    ['hour', 3600],
    ['minute', 60],
  ];
  const formatter = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
  for (const [unit, size] of ranges) {
    if (Math.abs(seconds) >= size) return formatter.format(Math.round(seconds / size), unit);
  }
  return 'Just now';
}

function activityDescription(item) {
  const module = ENTITY_LABELS[item.entityType] || 'Platform';
  const action = ACTION_LABELS[item.action] || String(item.action || 'changed').toLowerCase();
  const target = item.entityId ? ` #${item.entityId}` : '';
  return { title: `${module} item${target} ${action}`, module };
}

function SectionHeading({ title, description }) {
  return (
    <Box sx={{ mb: 2 }}>
      <Typography component="h2" variant="h6" fontWeight={700}>
        {title}
      </Typography>
      {description && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
          {description}
        </Typography>
      )}
    </Box>
  );
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [overview, setOverview] = useState(null);
  const [activity, setActivity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activityError, setActivityError] = useState(false);

  const canViewAudit = ['compliance', 'admin'].includes(user?.role);

  const fetchDashboard = useCallback(async () => {
    const overviewPromise = dashboardService.loadOverview();
    const activityPromise = canViewAudit
      ? dashboardService.loadActivity()
          .then((items) => ({ items, error: false }))
          .catch(() => ({ items: [], error: true }))
      : Promise.resolve({ items: [], error: false });

    const nextOverview = await overviewPromise.catch(() => ({
      metrics: Object.fromEntries(KPI_CARDS.map(({ key }) => [key, { value: null, error: true }])),
      health: null,
      healthError: true,
    }));
    const nextActivity = await activityPromise;
    return { overview: nextOverview, activity: nextActivity };
  }, [canViewAudit]);

  const retryDashboard = () => {
    setLoading(true);
    fetchDashboard().then((result) => {
      setOverview(result.overview);
      setActivity(result.activity.items);
      setActivityError(result.activity.error);
      setLoading(false);
    });
  };

  useEffect(() => {
    let active = true;
    fetchDashboard().then((result) => {
      if (!active) return;
      setOverview(result.overview);
      setActivity(result.activity.items);
      setActivityError(result.activity.error);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [fetchDashboard]);

  const firstName = userProfile(user).displayName.trim().split(/\s+/)[0];
  const today = useMemo(
    () => new Intl.DateTimeFormat(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date()),
    [],
  );
  const quickLinks = QUICK_LINKS.filter((item) => !item.roles || item.roles.includes(user?.role));
  const activeWarnings = overview?.health
    ? HEALTH_WARNINGS.filter((item) => (overview.health[item.key] ?? 0) > 0)
    : [];
  const hasMetricErrors = overview && Object.values(overview.metrics).some((metric) => metric.error);

  return (
    <Box>
      <Box
        component="header"
        sx={{
          mb: { xs: 3, md: 4 },
          p: { xs: 2.5, sm: 3 },
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 3,
          bgcolor: 'background.paper',
          boxShadow: '0 8px 26px rgba(30,58,138,0.06)',
        }}
      >
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} justifyContent="space-between">
          <Box>
            <Typography
              component="h1"
              variant="h4"
              sx={{
                color: (theme) => `${theme.palette.text.primary} !important`,
                fontSize: { xs: '1.75rem', sm: '2.125rem' },
                fontWeight: 750,
              }}
            >
              Dashboard
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mt: 0.75 }}>
              {firstName ? `Welcome back, ${firstName}. ` : 'Welcome back. '}
              Here is an overview of your compliance workspace.
            </Typography>
          </Box>
          <Chip
            label={today}
            variant="outlined"
            sx={{ alignSelf: { xs: 'flex-start', sm: 'center' }, bgcolor: 'grey.50' }}
          />
        </Stack>
      </Box>

      {hasMetricErrors && (
        <Alert
          severity="warning"
          sx={{ mb: 3 }}
          action={
            <Button color="inherit" size="small" startIcon={<RefreshRoundedIcon />} onClick={retryDashboard}>
              Retry
            </Button>
          }
        >
          Some dashboard information could not be refreshed. Available sections remain usable.
        </Alert>
      )}

      <Box
        aria-label="Workspace summary"
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(4, minmax(0, 1fr))' },
          gap: 2,
          mb: { xs: 4, md: 5 },
        }}
      >
        {KPI_CARDS.map(({ key, label, helper, icon: Icon, color, tint }) => {
          const metric = overview?.metrics?.[key];
          return (
            <Card
              key={key}
              variant="outlined"
              sx={{
                minHeight: 138,
                borderColor: 'rgba(30,58,138,0.12)',
                boxShadow: '0 5px 18px rgba(15,23,42,0.04)',
                transition: 'transform 160ms ease, box-shadow 160ms ease',
                '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 9px 24px rgba(15,23,42,0.08)' },
              }}
            >
              <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                  <Box>
                    {loading ? (
                      <Skeleton width={58} height={42} />
                    ) : (
                      <Typography variant="h4" fontWeight={750} color={metric?.error ? 'text.disabled' : 'text.primary'}>
                        {metric?.error ? '—' : metric?.value ?? 0}
                      </Typography>
                    )}
                    <Typography variant="subtitle2" fontWeight={700} sx={{ mt: 0.5 }}>
                      {label}
                    </Typography>
                    <Typography variant="caption" color={metric?.error ? 'error.main' : 'text.secondary'}>
                      {metric?.error ? 'Currently unavailable' : helper}
                    </Typography>
                  </Box>
                  <Avatar variant="rounded" sx={{ bgcolor: tint, color, width: 46, height: 46 }}>
                    <Icon />
                  </Avatar>
                </Stack>
              </CardContent>
            </Card>
          );
        })}
      </Box>

      <SectionHeading title="Quick Access" description="Open the tools you use most across the compliance workspace." />
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(3, minmax(0, 1fr))' },
          gap: 2,
          mb: { xs: 4, md: 5 },
        }}
      >
        {quickLinks.map(({ label, description, path, icon: Icon }) => (
          <Card
            key={path}
            variant="outlined"
            sx={{
              borderColor: 'divider',
              transition: 'transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease',
              '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 9px 24px rgba(15,23,42,0.08)', borderColor: 'primary.light' },
            }}
          >
            <CardActionArea onClick={() => navigate(path)} sx={{ height: '100%', p: 0.5 }}>
              <CardContent sx={{ minHeight: 142 }}>
                <Stack direction="row" spacing={1.75} alignItems="flex-start">
                  <Avatar variant="rounded" sx={{ bgcolor: '#edf3ff', color: 'primary.main', width: 42, height: 42 }}>
                    <Icon fontSize="small" />
                  </Avatar>
                  <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                    <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
                      <Typography variant="subtitle1" fontWeight={700}>
                        {label}
                      </Typography>
                      <ArrowForwardRoundedIcon color="action" fontSize="small" />
                    </Stack>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75, lineHeight: 1.55 }}>
                      {description}
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </CardActionArea>
          </Card>
        ))}
      </Box>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'minmax(0, 1fr)', lg: 'minmax(0, 1.35fr) minmax(300px, 0.65fr)' },
          gap: 3,
          alignItems: 'start',
        }}
      >
        <Box>
          <SectionHeading title="Recent Activity" description="Latest recorded changes in the compliance workspace." />
          <Card variant="outlined" sx={{ overflow: 'hidden' }}>
            {loading ? (
              <Stack spacing={2} sx={{ p: 2.5 }}>
                {[1, 2, 3].map((item) => <Skeleton key={item} variant="rounded" height={48} />)}
              </Stack>
            ) : activityError ? (
              <Stack alignItems="center" spacing={1} sx={{ px: 3, py: 5, textAlign: 'center' }}>
                <ErrorOutlineRoundedIcon color="action" />
                <Typography fontWeight={700}>Activity is temporarily unavailable</Typography>
                <Typography variant="body2" color="text.secondary">Refresh the dashboard to try again.</Typography>
              </Stack>
            ) : !canViewAudit ? (
              <Stack alignItems="center" spacing={1} sx={{ px: 3, py: 5, textAlign: 'center' }}>
                <HistoryOutlinedIcon color="action" />
                <Typography fontWeight={700}>Activity access is role-based</Typography>
                <Typography variant="body2" color="text.secondary">
                  The audit feed is available to Compliance and Administrator roles.
                </Typography>
              </Stack>
            ) : activity?.length === 0 ? (
              <Stack alignItems="center" spacing={1} sx={{ px: 3, py: 5, textAlign: 'center' }}>
                <HistoryOutlinedIcon color="action" />
                <Typography fontWeight={700}>No recorded activity yet</Typography>
                <Typography variant="body2" color="text.secondary">New audited changes will appear here.</Typography>
              </Stack>
            ) : (
              <List disablePadding aria-label="Recent audit activity">
                {activity?.map((item, index) => {
                  const description = activityDescription(item);
                  return (
                    <Box key={item.id}>
                      <ListItem sx={{ px: { xs: 2, sm: 2.5 }, py: 1.75 }}>
                        <ListItemAvatar>
                          <Avatar sx={{ width: 38, height: 38, bgcolor: '#edf3ff', color: 'primary.main' }}>
                            <HistoryOutlinedIcon fontSize="small" />
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={description.title}
                          secondary={`${description.module} • ${relativeTime(item.createdAt)}`}
                          slotProps={{ primary: { fontWeight: 650 }, secondary: { sx: { mt: 0.25 } } }}
                        />
                      </ListItem>
                      {index < activity.length - 1 && <Divider component="li" />}
                    </Box>
                  );
                })}
              </List>
            )}
          </Card>
        </Box>

        <Box>
          <SectionHeading title="Needs Attention" description="Work-permit information health and review readiness." />
          <Card variant="outlined">
            <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
              {loading ? (
                <Stack spacing={1.5}>
                  <Skeleton width="65%" height={36} />
                  {[1, 2, 3].map((item) => <Skeleton key={item} variant="rounded" height={42} />)}
                </Stack>
              ) : overview?.healthError ? (
                <Stack alignItems="center" spacing={1} sx={{ py: 3, textAlign: 'center' }}>
                  <ErrorOutlineRoundedIcon color="action" />
                  <Typography fontWeight={700}>Information health unavailable</Typography>
                  <Button size="small" startIcon={<RefreshRoundedIcon />} onClick={retryDashboard}>Retry</Button>
                </Stack>
              ) : activeWarnings.length === 0 ? (
                <Stack alignItems="center" spacing={1} sx={{ py: 3, textAlign: 'center' }}>
                  <CheckCircleOutlineRoundedIcon color="success" />
                  <Typography fontWeight={700}>No permit warnings</Typography>
                  <Typography variant="body2" color="text.secondary">Nothing currently needs attention.</Typography>
                </Stack>
              ) : (
                <Stack spacing={1.25}>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                    <WarningAmberOutlinedIcon color="warning" fontSize="small" />
                    <Typography variant="body2" color="text.secondary">
                      Average completeness <strong>{overview.health.averageCompleteness}%</strong>
                    </Typography>
                  </Stack>
                  {activeWarnings.map(({ key, severity, label }) => (
                    <Button
                      key={key}
                      variant="outlined"
                      color={severity}
                      onClick={() => navigate(`/permits?reviewState=${key}`)}
                      aria-label={`Open the ${REVIEW_STATE_LABELS[key].toLowerCase()} work permits`}
                      sx={{ justifyContent: 'space-between', px: 1.5, py: 1 }}
                    >
                      <span>{label}</span>
                      <Chip label={overview.health[key]} size="small" color={severity} />
                    </Button>
                  ))}
                </Stack>
              )}
            </CardContent>
          </Card>
        </Box>
      </Box>
    </Box>
  );
}
