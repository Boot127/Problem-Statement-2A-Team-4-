import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  AppBar,
  Avatar,
  Badge,
  Box,
  Container,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Stack,
  Toolbar,
  Tooltip,
  Typography,
  useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import BusinessCenterOutlinedIcon from '@mui/icons-material/BusinessCenterOutlined';
import ChevronLeftRoundedIcon from '@mui/icons-material/ChevronLeftRounded';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined';
import PersonOutlineRoundedIcon from '@mui/icons-material/PersonOutlineRounded';
import SecurityOutlinedIcon from '@mui/icons-material/SecurityOutlined';
import MenuIcon from '@mui/icons-material/Menu';
import NotificationsNoneOutlinedIcon from '@mui/icons-material/NotificationsNoneOutlined';
import reviewService from '../../api/reviewService';
import { useAuth } from '../../context/AuthContext';
import { ROLE_LABELS } from '../../utils/enums';
import { initialsForUser, userProfile } from '../../utils/userProfile';
import { NAV_ITEMS } from './navConfig';

const EXPANDED_DRAWER_WIDTH = 264;
const COLLAPSED_DRAWER_WIDTH = 80;
const SIDEBAR_STORAGE_KEY = 'hrckmp_sidebar_collapsed';

function isPathActive(path, pathname) {
  if (path === '/') return pathname === '/';
  return pathname === path || pathname.startsWith(`${path}/`);
}

export default function DashboardLayout({ children }) {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    () => localStorage.getItem(SIDEBAR_STORAGE_KEY) === 'true',
  );
  const [userMenuAnchor, setUserMenuAnchor] = useState(null);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const profile = userProfile(user);

  const visibleNavItems = useMemo(
    () => NAV_ITEMS.filter((item) => !item.roles || item.roles.includes(user?.role)),
    [user?.role],
  );
  const currentPage = visibleNavItems.find((item) => isPathActive(item.path, location.pathname));

  useEffect(() => {
    let active = true;
    reviewService
      .notifications()
      .then((items) => {
        if (active) setUnreadNotifications(items.filter((item) => !item.isRead).length);
      })
      .catch(() => {
        if (active) setUnreadNotifications(0);
      });
    return () => {
      active = false;
    };
  }, []);

  const toggleSidebar = () => {
    setSidebarCollapsed((current) => {
      const next = !current;
      localStorage.setItem(SIDEBAR_STORAGE_KEY, String(next));
      return next;
    });
  };

  const goTo = (path) => {
    navigate(path);
    if (!isDesktop) setMobileOpen(false);
  };

  const handleLogout = async () => {
    setUserMenuAnchor(null);
    await logout();
    navigate('/login', { replace: true });
  };

  const renderSidebar = (collapsed) => (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflowX: 'hidden' }}>
      <Toolbar />
      <Stack
        direction="row"
        alignItems="center"
        justifyContent={collapsed ? 'center' : 'space-between'}
        sx={{ minHeight: 72, px: collapsed ? 1.5 : 2.25 }}
      >
        <Stack direction="row" spacing={1.25} alignItems="center" sx={{ minWidth: 0 }}>
          <Avatar variant="rounded" sx={{ width: 38, height: 38, bgcolor: 'primary.main' }}>
            <BusinessCenterOutlinedIcon fontSize="small" />
          </Avatar>
          {!collapsed && (
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="subtitle1" fontWeight={800} color="primary.main" noWrap>
                HRCKMP
              </Typography>
              <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
                Compliance workspace
              </Typography>
            </Box>
          )}
        </Stack>
      </Stack>
      <Divider />
      <List component="nav" aria-label="Primary navigation" sx={{ flexGrow: 1, py: 1.5, px: 1 }}>
        {visibleNavItems.map(({ label, path, icon: Icon }) => {
          const active = isPathActive(path, location.pathname);
          const button = (
            <ListItemButton
              key={path}
              selected={active}
              onClick={() => goTo(path)}
              aria-label={collapsed ? label : undefined}
              sx={{
                minHeight: 46,
                justifyContent: collapsed ? 'center' : 'initial',
                borderRadius: 2,
                mb: 0.5,
                px: collapsed ? 1.25 : 1.5,
                color: active ? 'primary.main' : 'text.secondary',
                '&.Mui-selected': {
                  bgcolor: 'rgba(30,58,138,0.10)',
                  color: 'primary.main',
                  boxShadow: 'inset 3px 0 0 #1e3a8a',
                  '&:hover': { bgcolor: 'rgba(30,58,138,0.14)' },
                  '& .MuiListItemIcon-root': { color: 'primary.main' },
                },
                '&:focus-visible': { outline: '3px solid rgba(59,91,219,0.35)', outlineOffset: 1 },
              }}
            >
              <ListItemIcon
                sx={{
                  minWidth: 0,
                  mr: collapsed ? 0 : 1.5,
                  justifyContent: 'center',
                  color: 'inherit',
                }}
              >
                <Icon fontSize="small" />
              </ListItemIcon>
              {!collapsed && (
                <ListItemText
                  primary={label}
                  slotProps={{ primary: { fontSize: 14, fontWeight: active ? 700 : 550, noWrap: true } }}
                />
              )}
            </ListItemButton>
          );
          return collapsed ? (
            <Tooltip key={path} title={label} placement="right" arrow>
              {button}
            </Tooltip>
          ) : button;
        })}
      </List>
      {isDesktop && (
        <Box sx={{ p: 1, borderTop: '1px solid', borderColor: 'divider' }}>
          <Tooltip title={collapsed ? 'Expand navigation' : 'Collapse navigation'} placement="right" arrow>
            <ListItemButton
              onClick={toggleSidebar}
              aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'}
              sx={{ minHeight: 44, justifyContent: collapsed ? 'center' : 'initial', borderRadius: 2, px: collapsed ? 1.25 : 1.5 }}
            >
              <ListItemIcon sx={{ minWidth: 0, mr: collapsed ? 0 : 1.5, justifyContent: 'center' }}>
                {collapsed ? <ChevronRightRoundedIcon /> : <ChevronLeftRoundedIcon />}
              </ListItemIcon>
              {!collapsed && <ListItemText primary="Collapse" slotProps={{ primary: { fontSize: 14, fontWeight: 600 } }} />}
            </ListItemButton>
          </Tooltip>
        </Box>
      )}
    </Box>
  );

  const drawerWidth = sidebarCollapsed ? COLLAPSED_DRAWER_WIDTH : EXPANDED_DRAWER_WIDTH;

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default', overflowX: 'hidden' }}>
      <AppBar
        position="fixed"
        color="primary"
        elevation={0}
        sx={{ zIndex: (value) => value.zIndex.drawer + 1, borderBottom: '1px solid rgba(255,255,255,0.12)' }}
      >
        <Toolbar sx={{ gap: 1 }}>
          {!isDesktop && (
            <IconButton
              color="inherit"
              edge="start"
              aria-label="Open navigation menu"
              onClick={() => setMobileOpen(true)}
              sx={{ mr: 0.5 }}
            >
              <MenuIcon />
            </IconButton>
          )}
          {isDesktop && (
            <Tooltip title={sidebarCollapsed ? 'Expand navigation' : 'Collapse navigation'}>
              <IconButton
                color="inherit"
                edge="start"
                aria-label={sidebarCollapsed ? 'Expand navigation' : 'Collapse navigation'}
                onClick={toggleSidebar}
                sx={{ mr: 0.5 }}
              >
                {sidebarCollapsed ? <ChevronRightRoundedIcon /> : <ChevronLeftRoundedIcon />}
              </IconButton>
            </Tooltip>
          )}
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Typography variant="subtitle1" fontWeight={700} noWrap>
              {currentPage?.label || 'HR Compliance'}
            </Typography>
            <Typography
              variant="caption"
              noWrap
              sx={{ display: { xs: 'none', sm: 'block' }, color: 'rgba(255,255,255,0.72)', lineHeight: 1.1 }}
            >
              HR Compliance Knowledge Management Platform
            </Typography>
          </Box>
          <Tooltip title={unreadNotifications ? `${unreadNotifications} unread notifications` : 'Notifications'}>
            <IconButton
              color="inherit"
              aria-label={unreadNotifications ? `Notifications, ${unreadNotifications} unread` : 'Notifications'}
              onClick={() => navigate('/reviews')}
            >
              <Badge color="error" badgeContent={unreadNotifications} max={99} invisible={!unreadNotifications}>
                <NotificationsNoneOutlinedIcon />
              </Badge>
            </IconButton>
          </Tooltip>
          <Divider orientation="vertical" flexItem sx={{ borderColor: 'rgba(255,255,255,0.22)', my: 1.25 }} />
          <Stack
            component="button"
            type="button"
            direction="row"
            alignItems="center"
            spacing={1.25}
            onClick={(event) => setUserMenuAnchor(event.currentTarget)}
            aria-label="Open account menu"
            aria-haspopup="menu"
            sx={{
              border: 0,
              bgcolor: 'transparent',
              color: 'inherit',
              borderRadius: 2,
              p: 0.5,
              cursor: 'pointer',
              font: 'inherit',
              '&:hover': { bgcolor: 'rgba(255,255,255,0.10)' },
              '&:focus-visible': { outline: '2px solid white', outlineOffset: 2 },
            }}
          >
            <Box sx={{ display: { xs: 'none', sm: 'block' }, textAlign: 'right', maxWidth: 180 }}>
              <Typography variant="body2" fontWeight={700} noWrap>
                {profile.displayName}
              </Typography>
              <Typography variant="caption" noWrap sx={{ display: 'block', color: 'rgba(255,255,255,0.72)' }}>
                {ROLE_LABELS[user?.role] || user?.role}
              </Typography>
            </Box>
            <Avatar sx={{ width: 36, height: 36, bgcolor: 'secondary.main', fontSize: 14 }}>
              {initialsForUser(user)}
            </Avatar>
          </Stack>
          <Menu
            anchorEl={userMenuAnchor}
            open={Boolean(userMenuAnchor)}
            onClose={() => setUserMenuAnchor(null)}
            slotProps={{ paper: { sx: { mt: 1, minWidth: 220 } } }}
          >
            <Stack direction="row" spacing={1.25} alignItems="center" sx={{ px: 2, py: 1.25 }}>
              <Avatar sx={{ width: 38, height: 38, bgcolor: 'secondary.main', fontSize: 14 }}>
                {initialsForUser(user)}
              </Avatar>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="body2" fontWeight={700}>{profile.displayName}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {ROLE_LABELS[user?.role] || user?.role}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', overflowWrap: 'anywhere' }}>
                  {user?.email}
                </Typography>
              </Box>
            </Stack>
            <Divider />
            <MenuItem onClick={() => { setUserMenuAnchor(null); navigate('/profile'); }}>
              <ListItemIcon sx={{ minWidth: 34 }}>
                <PersonOutlineRoundedIcon fontSize="small" />
              </ListItemIcon>
              View Profile
            </MenuItem>
            {user?.role === 'admin' && (
              <MenuItem onClick={() => { setUserMenuAnchor(null); navigate('/admin/security'); }}>
                <ListItemIcon sx={{ minWidth: 34 }}>
                  <SecurityOutlinedIcon fontSize="small" />
                </ListItemIcon>
                Security Settings
              </MenuItem>
            )}
            <MenuItem onClick={handleLogout}>
              <ListItemIcon sx={{ minWidth: 34 }}>
                <LogoutOutlinedIcon fontSize="small" />
              </ListItemIcon>
              Sign out
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      {isDesktop ? (
        <Drawer
          variant="permanent"
          sx={{
            width: drawerWidth,
            flexShrink: 0,
            transition: theme.transitions.create('width', { duration: theme.transitions.duration.shorter }),
            '& .MuiDrawer-paper': {
              width: drawerWidth,
              boxSizing: 'border-box',
              borderRight: '1px solid',
              borderColor: 'divider',
              overflowX: 'hidden',
              transition: theme.transitions.create('width', { duration: theme.transitions.duration.shorter }),
            },
          }}
        >
          {renderSidebar(sidebarCollapsed)}
        </Drawer>
      ) : (
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{ '& .MuiDrawer-paper': { width: EXPANDED_DRAWER_WIDTH, boxSizing: 'border-box' } }}
        >
          {renderSidebar(false)}
        </Drawer>
      )}

      <Box component="main" sx={{ flexGrow: 1, minWidth: 0, width: { xs: '100%', md: `calc(100% - ${drawerWidth}px)` } }}>
        <Toolbar />
        <Container maxWidth="xl" sx={{ px: { xs: 2, sm: 3, lg: 4 }, py: { xs: 2.5, sm: 3.5, lg: 4 } }}>
          {children}
        </Container>
      </Box>
    </Box>
  );
}
