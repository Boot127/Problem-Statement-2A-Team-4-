import { useState } from 'react';
import { Box, Divider, IconButton, ListItemIcon, ListItemText, Menu, MenuItem, Paper, Stack, Typography } from '@mui/material';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';
import ContentCopyOutlinedIcon from '@mui/icons-material/ContentCopyOutlined';
import ArrowUpwardOutlinedIcon from '@mui/icons-material/ArrowUpwardOutlined';
import ArrowDownwardOutlinedIcon from '@mui/icons-material/ArrowDownwardOutlined';
import ScheduleOutlinedIcon from '@mui/icons-material/ScheduleOutlined';
import MoreVertOutlinedIcon from '@mui/icons-material/MoreVertOutlined';

const RAIL_WIDTH = 58;

export default function ProcessStepTimeline({ steps, disabled, onEdit, onDelete, onDuplicate, onMove }) {
  const [menu, setMenu] = useState(null);
  const closeMenu = () => setMenu(null);
  const act = (action) => { action(); closeMenu(); };

  return (
    <>
      <Box component="ol" aria-label="Process steps" sx={{ listStyle: 'none', m: 0, p: 0 }}>
        {steps.map((step, index) => {
          const isLast = index === steps.length - 1;
          return (
            <Box component="li" key={step.id} sx={{ display: 'flex', position: 'relative' }}>
              <Box sx={{ width: RAIL_WIDTH, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <Box aria-hidden="true" sx={{ width: 44, height: 44, borderRadius: '50%', bgcolor: 'primary.main', color: 'primary.contrastText', display: 'grid', placeItems: 'center', fontSize: 13, fontWeight: 900, flexShrink: 0, mt: 1.25, boxShadow: 1 }}>
                  {String(step.stepNumber).padStart(2, '0')}
                </Box>
                {!isLast && <Box aria-hidden="true" sx={{ flexGrow: 1, width: 3, bgcolor: 'primary.light', opacity: 0.28, my: 0.5, borderRadius: 2 }} />}
              </Box>

              <Paper variant="outlined" sx={{ flexGrow: 1, minWidth: 0, p: { xs: 2, sm: 2.5 }, mb: isLast ? 0 : 2, mt: 0.75, borderColor: 'divider', boxShadow: 0, transition: 'border-color 150ms, box-shadow 150ms', '&:hover': { borderColor: 'primary.light', boxShadow: 1 } }}>
                <Stack direction="row" spacing={1} sx={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Box sx={{ minWidth: 0, pr: 1 }}>
                    <Typography variant="overline" color="primary.main" fontWeight={900}>STEP {String(step.stepNumber).padStart(2, '0')}</Typography>
                    <Typography variant="h6" fontWeight={900} sx={{ color: 'text.primary', lineHeight: 1.3 }}>{step.stepTitle}</Typography>
                    <Typography variant="body2" sx={{ color: step.stepDetail ? 'text.secondary' : 'text.disabled', whiteSpace: 'pre-wrap', lineHeight: 1.7, mt: 0.75 }}>{step.stepDetail || 'No instructions recorded for this step.'}</Typography>
                    <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', mt: 1.5, width: 'fit-content', px: 1.1, py: 0.65, borderRadius: 1.5, bgcolor: 'action.hover', border: 1, borderColor: 'info.light' }}>
                      <ScheduleOutlinedIcon color="info" sx={{ fontSize: 17 }} />
                      <Box><Typography variant="caption" color="text.secondary" fontWeight={800} sx={{ display: 'block', lineHeight: 1 }}>EXPECTED TIMELINE</Typography><Typography variant="body2" color="info.main" fontWeight={800}>{step.expectedTimeline || 'Not recorded'}</Typography></Box>
                    </Stack>
                  </Box>
                  <IconButton size="small" disabled={disabled} onClick={(event) => setMenu({ anchor: event.currentTarget, index })} aria-label={`Actions for step ${step.stepNumber}: ${step.stepTitle}`} aria-haspopup="menu" aria-expanded={menu?.index === index ? 'true' : undefined}>
                    <MoreVertOutlinedIcon />
                  </IconButton>
                </Stack>
              </Paper>
            </Box>
          );
        })}
      </Box>

      <Menu anchorEl={menu?.anchor} open={Boolean(menu)} onClose={closeMenu} MenuListProps={{ 'aria-label': 'Step actions' }}>
        {menu && [
          <MenuItem key="edit" onClick={() => act(() => onEdit(steps[menu.index]))}><ListItemIcon><EditOutlinedIcon fontSize="small" /></ListItemIcon><ListItemText>Edit step</ListItemText></MenuItem>,
          <MenuItem key="duplicate" onClick={() => act(() => onDuplicate(steps[menu.index]))}><ListItemIcon><ContentCopyOutlinedIcon fontSize="small" /></ListItemIcon><ListItemText>Duplicate step</ListItemText></MenuItem>,
          <Divider key="divider-1" />,
          <MenuItem key="up" disabled={menu.index === 0} onClick={() => act(() => onMove(menu.index, menu.index - 1))}><ListItemIcon><ArrowUpwardOutlinedIcon fontSize="small" /></ListItemIcon><ListItemText>Move up</ListItemText></MenuItem>,
          <MenuItem key="down" disabled={menu.index === steps.length - 1} onClick={() => act(() => onMove(menu.index, menu.index + 1))}><ListItemIcon><ArrowDownwardOutlinedIcon fontSize="small" /></ListItemIcon><ListItemText>Move down</ListItemText></MenuItem>,
          <Divider key="divider-2" />,
          <MenuItem key="delete" onClick={() => act(() => onDelete(steps[menu.index]))} sx={{ color: 'error.main' }}><ListItemIcon><DeleteOutlineOutlinedIcon color="error" fontSize="small" /></ListItemIcon><ListItemText>Delete step</ListItemText></MenuItem>,
        ]}
      </Menu>
    </>
  );
}
