import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Badge,
  Box,
  Button,
  CircularProgress,
  Divider,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  Menu,
  Stack,
  Typography,
} from '@mui/material';
import NotificationsNoneOutlinedIcon from '@mui/icons-material/NotificationsNoneOutlined';
import reviewService from '../../api/reviewService';

export default function ReviewNotifications() {
  const navigate = useNavigate();
  const [anchor, setAnchor] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError('');
    try {
      setItems(await reviewService.notifications());
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load review notifications.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    reviewService.notifications()
      .then((data) => { if (active) setItems(data); })
      .catch((err) => { if (active) setError(err.response?.data?.message || 'Could not load review notifications.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const unread = items.filter((item) => !item.isRead).length;

  const openNotification = async (item) => {
    if (!item.isRead) {
      try {
        const updated = await reviewService.markNotificationRead(item.id);
        setItems((current) => current.map((entry) => entry.id === updated.id ? updated : entry));
      } catch (err) {
        setError(err.response?.data?.message || 'Could not mark the notification as read.');
        return;
      }
    }
    setAnchor(null);
    if (item.reviewId) navigate(`/reviews/${item.reviewId}`);
  };

  const markAllRead = async () => {
    setBusy(true);
    setError('');
    try {
      setItems(await reviewService.markAllNotificationsRead());
    } catch (err) {
      setError(err.response?.data?.message || 'Could not mark notifications as read.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <IconButton
        color="primary"
        aria-label={`${unread} unread review notifications`}
        onClick={(event) => { setAnchor(event.currentTarget); load(); }}
      >
        <Badge color="error" badgeContent={unread} max={99}>
          <NotificationsNoneOutlinedIcon />
        </Badge>
      </IconButton>
      <Menu
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={() => setAnchor(null)}
        slotProps={{ paper: { sx: { width: 380, maxWidth: 'calc(100vw - 24px)' } } }}
      >
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 2, py: 1 }}>
          <Typography variant="subtitle1" fontWeight={700}>Review notifications</Typography>
          <Button size="small" disabled={!unread || busy} onClick={markAllRead}>Mark all read</Button>
        </Stack>
        <Divider />
        {error && <Alert severity="error" sx={{ m: 1 }}>{error}</Alert>}
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}><CircularProgress size={24} /></Box>
        ) : items.length ? (
          <List disablePadding sx={{ maxHeight: 420, overflowY: 'auto' }}>
            {items.map((item) => (
              <ListItemButton key={item.id} selected={!item.isRead} onClick={() => openNotification(item)}>
                <ListItemText
                  primary={item.message}
                  secondary={new Date(item.createdAt).toLocaleString()}
                  slotProps={{ primary: { fontWeight: item.isRead ? 400 : 700 } }}
                />
              </ListItemButton>
            ))}
          </List>
        ) : (
          <Typography color="text.secondary" sx={{ p: 3, textAlign: 'center' }}>No review notifications yet.</Typography>
        )}
      </Menu>
    </>
  );
}
