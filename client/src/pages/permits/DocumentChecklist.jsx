import { useState } from 'react';
import { Box, Chip, Divider, IconButton, ListItemIcon, ListItemText, Menu, MenuItem, Paper, Stack, Typography } from '@mui/material';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';
import ContentCopyOutlinedIcon from '@mui/icons-material/ContentCopyOutlined';
import ArrowUpwardOutlinedIcon from '@mui/icons-material/ArrowUpwardOutlined';
import ArrowDownwardOutlinedIcon from '@mui/icons-material/ArrowDownwardOutlined';
import CheckCircleOutlineOutlinedIcon from '@mui/icons-material/CheckCircleOutlineOutlined';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import StickyNote2OutlinedIcon from '@mui/icons-material/StickyNote2Outlined';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import MoreVertOutlinedIcon from '@mui/icons-material/MoreVertOutlined';
import PublishedWithChangesOutlinedIcon from '@mui/icons-material/PublishedWithChangesOutlined';

export default function DocumentChecklist({ documents, disabled, onEdit, onDelete, onDuplicate, onMove, onToggleMandatory }) {
  const [menu, setMenu] = useState(null);
  const groups = [
    { label: 'Mandatory Documents', countLabel: 'required', description: 'Every application should include these items.', mandatory: true, entries: [] },
    { label: 'Optional Documents', countLabel: 'optional', description: 'Supporting evidence that may strengthen or clarify the application.', mandatory: false, entries: [] },
  ];

  documents.forEach((doc, originalIndex) => groups[doc.isMandatory ? 0 : 1].entries.push({ doc, originalIndex }));
  const closeMenu = () => setMenu(null);
  const act = (action) => { action(); closeMenu(); };

  return (
    <>
      <Stack component="div" aria-label="Required documents" spacing={2}>
        {groups.filter((group) => group.entries.length > 0).map((group) => (
          <Paper key={group.label} variant="outlined" sx={{ overflow: 'hidden' }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={0.5} sx={{ p: 2, justifyContent: 'space-between', alignItems: { sm: 'center' }, bgcolor: 'grey.50', borderBottom: 1, borderColor: 'divider' }}>
              <Box>
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}><DescriptionOutlinedIcon color={group.mandatory ? 'error' : 'action'} /><Typography variant="subtitle1" fontWeight={900}>{group.label}</Typography></Stack>
                <Typography variant="body2" color="text.secondary">{group.description}</Typography>
              </Box>
              <Chip size="small" color={group.mandatory ? 'error' : 'default'} variant={group.mandatory ? 'filled' : 'outlined'} label={`${group.entries.length} ${group.countLabel}`} />
            </Stack>

            <Stack component="ul" sx={{ listStyle: 'none', m: 0, p: 0 }} divider={<Divider />}>
              {group.entries.map((entry, position) => {
                const { doc, originalIndex } = entry;
                return (
                  <Box component="li" key={doc.id} sx={{ p: { xs: 1.5, sm: 1.75 }, borderLeft: 4, borderLeftColor: group.mandatory ? 'error.main' : 'transparent' }}>
                    <Stack direction="row" spacing={1.25} sx={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <Stack direction="row" spacing={1.25} sx={{ minWidth: 0, alignItems: 'flex-start' }}>
                        <Box aria-hidden="true" sx={{ mt: 0.15, display: 'flex' }}>{group.mandatory ? <CheckCircleOutlineOutlinedIcon color="error" /> : <RadioButtonUncheckedIcon sx={{ color: 'text.disabled' }} />}</Box>
                        <Box sx={{ minWidth: 0 }}>
                          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', rowGap: 0.5 }}>
                            <Typography variant="subtitle2" fontWeight={900} sx={{ color: 'text.primary' }}>{doc.documentName}</Typography>
                            <Chip size="small" label={doc.isMandatory ? 'Mandatory' : 'Optional'} color={doc.isMandatory ? 'error' : 'default'} variant={doc.isMandatory ? 'filled' : 'outlined'} />
                          </Stack>
                          <Stack direction="row" spacing={0.65} sx={{ alignItems: 'flex-start', mt: 0.65 }}>
                            <StickyNote2OutlinedIcon sx={{ fontSize: 15, mt: 0.2, color: 'text.disabled' }} />
                            <Typography variant="body2" sx={{ color: doc.notes ? 'text.secondary' : 'text.disabled', whiteSpace: 'pre-wrap' }}>{doc.notes || 'No checklist notes recorded.'}</Typography>
                          </Stack>
                        </Box>
                      </Stack>
                      <IconButton
                        size="small"
                        disabled={disabled}
                        aria-label={`Actions for document: ${doc.documentName}`}
                        aria-haspopup="menu"
                        aria-expanded={menu?.doc.id === doc.id ? 'true' : undefined}
                        onClick={(event) => setMenu({ anchor: event.currentTarget, doc, originalIndex, previousIndex: position > 0 ? group.entries[position - 1].originalIndex : null, nextIndex: position < group.entries.length - 1 ? group.entries[position + 1].originalIndex : null })}
                      >
                        <MoreVertOutlinedIcon />
                      </IconButton>
                    </Stack>
                  </Box>
                );
              })}
            </Stack>
          </Paper>
        ))}
      </Stack>

      <Menu anchorEl={menu?.anchor} open={Boolean(menu)} onClose={closeMenu} MenuListProps={{ 'aria-label': 'Document actions' }}>
        {menu && [
          <MenuItem key="edit" onClick={() => act(() => onEdit(menu.doc))}><ListItemIcon><EditOutlinedIcon fontSize="small" /></ListItemIcon><ListItemText>Edit document</ListItemText></MenuItem>,
          <MenuItem key="toggle" onClick={() => act(() => onToggleMandatory(menu.doc))}><ListItemIcon><PublishedWithChangesOutlinedIcon fontSize="small" /></ListItemIcon><ListItemText>Mark {menu.doc.isMandatory ? 'optional' : 'mandatory'}</ListItemText></MenuItem>,
          <MenuItem key="duplicate" onClick={() => act(() => onDuplicate(menu.doc))}><ListItemIcon><ContentCopyOutlinedIcon fontSize="small" /></ListItemIcon><ListItemText>Duplicate document</ListItemText></MenuItem>,
          <Divider key="divider-1" />,
          <MenuItem key="up" disabled={menu.previousIndex === null} onClick={() => act(() => onMove(menu.originalIndex, menu.previousIndex))}><ListItemIcon><ArrowUpwardOutlinedIcon fontSize="small" /></ListItemIcon><ListItemText>Move up</ListItemText></MenuItem>,
          <MenuItem key="down" disabled={menu.nextIndex === null} onClick={() => act(() => onMove(menu.originalIndex, menu.nextIndex))}><ListItemIcon><ArrowDownwardOutlinedIcon fontSize="small" /></ListItemIcon><ListItemText>Move down</ListItemText></MenuItem>,
          <Divider key="divider-2" />,
          <MenuItem key="delete" onClick={() => act(() => onDelete(menu.doc))} sx={{ color: 'error.main' }}><ListItemIcon><DeleteOutlineOutlinedIcon color="error" fontSize="small" /></ListItemIcon><ListItemText>Delete document</ListItemText></MenuItem>,
        ]}
      </Menu>
    </>
  );
}
