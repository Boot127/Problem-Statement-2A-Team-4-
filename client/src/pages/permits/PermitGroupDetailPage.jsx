import { useEffect, useMemo, useState } from 'react';
import { Link as RouterLink, useLocation, useParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  Paper,
  Skeleton,
  Stack,
  Typography,
} from '@mui/material';
import AddOutlinedIcon from '@mui/icons-material/AddOutlined';
import ArchiveOutlinedIcon from '@mui/icons-material/ArchiveOutlined';
import BusinessOutlinedIcon from '@mui/icons-material/BusinessOutlined';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import PublicOutlinedIcon from '@mui/icons-material/PublicOutlined';
import RemoveCircleOutlineOutlinedIcon from '@mui/icons-material/RemoveCircleOutlineOutlined';
import RestoreOutlinedIcon from '@mui/icons-material/RestoreOutlined';
import AppBreadcrumbs from '../../components/common/AppBreadcrumbs';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import StatusChip from '../../components/common/StatusChip';
import permitService from '../../api/permitService';
import { getApiErrorMessage } from '../../utils/apiError';
import { countryFlag, countryName } from '../../utils/countries';
import { PROCESS_TYPE_LABELS, PROCESS_TYPES } from '../../utils/enums';
import PermitGroupDialog from './PermitGroupDialog';
import PermitGroupMemberDialog from './PermitGroupMemberDialog';
import ReviewStateChip from './ReviewStateChip';
import { summariseProcess } from './processSummary';
import {
  getPermitNavigation,
  permitNavigationState,
} from './permitNavigation';

function Metric({ value, label, tone = 'primary' }) {
  return (
    <Paper variant="outlined" sx={{ p: 2, borderTop: 4, borderTopColor: `${tone}.main` }}>
      <Typography variant="h5" fontWeight={900}>{value}</Typography>
      <Typography variant="body2" color="text.secondary">{label}</Typography>
    </Paper>
  );
}

function ProcessCoverage({ permit }) {
  return (
    <Stack direction="row" spacing={0.75} sx={{ flexWrap: 'wrap', gap: 0.75 }} aria-label="Process coverage">
      {PROCESS_TYPES.map((type) => {
        const summary = summariseProcess(permit.steps?.[type] || [], permit.documents?.[type] || []);
        return (
          <Chip
            key={type}
            size="small"
            variant={summary.isComplete ? 'filled' : 'outlined'}
            color={summary.isComplete ? 'success' : summary.isEmpty ? 'default' : 'warning'}
            icon={summary.isComplete ? <CheckCircleOutlinedIcon /> : undefined}
            label={`${PROCESS_TYPE_LABELS[type]} ${summary.isComplete ? 'complete' : summary.isEmpty ? 'not covered' : 'partial'}`}
          />
        );
      })}
    </Stack>
  );
}

function PermitCard({ permit, disabled, onRemove, navigationState }) {
  return (
    <Paper variant="outlined" sx={{ p: 2.25 }}>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ justifyContent: 'space-between', alignItems: { md: 'flex-start' } }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h6" fontWeight={850}>{permit.title}</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.25 }}>{permit.permitType}</Typography>
          <Stack direction="row" spacing={0.75} sx={{ flexWrap: 'wrap', gap: 0.75, mb: 1.25 }}>
            <StatusChip status={permit.status} />
            <ReviewStateChip state={permit.health?.reviewState} />
          </Stack>
          <ProcessCoverage permit={permit} />
        </Box>
        <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
          <Button component={RouterLink} to={`/permits/${permit.id}`} state={navigationState} variant="outlined">View Permit</Button>
          <Button color="error" startIcon={<RemoveCircleOutlineOutlinedIcon />} disabled={disabled} onClick={() => onRemove(permit)} aria-label={`Remove ${permit.title} from group`}>Remove</Button>
        </Stack>
      </Stack>
    </Paper>
  );
}

export default function PermitGroupDetailPage() {
  const { groupId } = useParams();
  const location = useLocation();
  const navigation = getPermitNavigation(location);
  const [group, setGroup] = useState(undefined);
  const [error, setError] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [statusConfirm, setStatusConfirm] = useState(false);
  const [removeTarget, setRemoveTarget] = useState(null);
  const [working, setWorking] = useState(false);

  const load = () => permitService.getGroup(groupId)
    .then((data) => { setGroup(data); setError(''); return data; })
    .catch((err) => { setError(getApiErrorMessage(err)); setGroup((current) => current ?? null); });

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId]);

  const byCountry = useMemo(() => {
    const map = new Map();
    (group?.permits || []).forEach((permit) => {
      if (!map.has(permit.countryCode)) map.set(permit.countryCode, []);
      map.get(permit.countryCode).push(permit);
    });
    return [...map.entries()];
  }, [group]);

  if (group === undefined) {
    return <Stack spacing={2}><Skeleton width={260} /><Skeleton variant="rounded" height={170} /><Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4,1fr)' }, gap: 2 }}>{[1, 2, 3, 4].map((item) => <Skeleton key={item} variant="rounded" height={95} />)}</Box><Skeleton variant="rounded" height={250} /></Stack>;
  }

  if (!group) {
    return <Box><AppBreadcrumbs items={[{ label: 'Dashboard', href: '/' }, { label: 'Work Permits', href: navigation.listHref }, { label: 'Permit Groups', href: `${navigation.listHref}#permit-groups-heading` }, { label: 'Unavailable' }]} back={{ label: 'Back to Work Permits', href: navigation.listHref }} /><Alert severity="error" sx={{ mb: 2 }}>{error || 'Permit group not found.'}</Alert></Box>;
  }

  const archived = group.status === 'ARCHIVED';
  const navigationState = permitNavigationState(location, {
    permitGroupHref: `/permits/groups/${group.id}`,
    permitGroupName: group.groupName,
  });

  const changeStatus = async () => {
    setWorking(true);
    try {
      await (archived ? permitService.restoreGroup(group.id) : permitService.archiveGroup(group.id));
      setStatusConfirm(false);
      await load();
    } catch (err) { setError(getApiErrorMessage(err)); } finally { setWorking(false); }
  };

  const removeMember = async () => {
    if (!removeTarget) return;
    setWorking(true);
    try {
      await permitService.removePermitFromGroup(group.id, removeTarget.id);
      setRemoveTarget(null);
      await load();
    } catch (err) { setError(getApiErrorMessage(err)); } finally { setWorking(false); }
  };

  return (
    <Box>
      <AppBreadcrumbs
        items={[
          { label: 'Dashboard', href: '/' },
          { label: 'Work Permits', href: navigation.listHref },
          { label: 'Permit Groups', href: `${navigation.listHref}#permit-groups-heading` },
          { label: group.groupName },
        ]}
        back={{ label: 'Back to Work Permits', href: navigation.listHref }}
      />

      <Paper variant="outlined" sx={{ p: { xs: 2.5, md: 3.5 }, mb: 2.5, bgcolor: 'primary.dark', color: 'primary.contrastText', borderColor: 'primary.dark' }}>
        <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2.5} sx={{ justifyContent: 'space-between', alignItems: { lg: 'flex-start' } }}>
          <Stack direction="row" spacing={2}>
            <Box sx={{ width: 62, height: 62, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.14)', display: 'grid', placeItems: 'center', flexShrink: 0 }}><BusinessOutlinedIcon fontSize="large" /></Box>
            <Box>
              <Typography variant="overline" sx={{ opacity: 0.8 }}>Client / Permit Group</Typography>
              <Typography variant="h3" component="h1" fontWeight={900} sx={{ fontSize: { xs: '1.8rem', md: '2.3rem' } }}>{group.groupName}</Typography>
              {group.description && <Typography variant="body1" sx={{ opacity: 0.85, mt: 0.5, maxWidth: 720 }}>{group.description}</Typography>}
              {archived && <Chip label="Archived Group" color="warning" sx={{ mt: 1.5 }} />}
            </Box>
          </Stack>
          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
            <Button variant="contained" color="inherit" startIcon={<AddOutlinedIcon />} disabled={archived} onClick={() => setAddOpen(true)} sx={{ bgcolor: 'common.white', color: 'primary.main' }}>Add Existing Permit</Button>
            <Button color="inherit" startIcon={<EditOutlinedIcon />} onClick={() => setEditOpen(true)}>Edit Group</Button>
            <Button color="inherit" startIcon={archived ? <RestoreOutlinedIcon /> : <ArchiveOutlinedIcon />} onClick={() => setStatusConfirm(true)}>{archived ? 'Restore Group' : 'Archive Group'}</Button>
          </Stack>
        </Stack>
      </Paper>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {archived && <Alert severity="info" sx={{ mb: 2 }}>This group is archived. Its permit references are preserved; restore it to add or remove permits.</Alert>}

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4,1fr)' }, gap: 1.5, mb: 3 }}>
        <Metric value={group.permitCount} label="Work Permits" />
        <Metric value={group.countryCount} label="Countries" tone="info" />
        <Metric value={group.needsAttentionCount} label="Need Attention" tone={group.needsAttentionCount ? 'warning' : 'success'} />
        <Metric value={group.reviewDueCount} label="Review Due" tone={group.reviewDueCount ? 'error' : 'success'} />
      </Box>

      <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' }, mb: 1.5 }}>
        <Box><Typography variant="overline" color="primary" fontWeight={900}>GROUP PERMITS</Typography><Typography variant="body2" color="text.secondary">Live references to master Work Permit records, organised by country.</Typography></Box>
        <Button startIcon={<AddOutlinedIcon />} disabled={archived} onClick={() => setAddOpen(true)}>Add Existing Permit</Button>
      </Stack>

      {byCountry.length === 0 ? (
        <Paper variant="outlined" sx={{ p: 4, textAlign: 'center', bgcolor: 'action.hover' }}>
          <BusinessOutlinedIcon color="disabled" sx={{ fontSize: 40 }} />
          <Typography variant="h6" fontWeight={850}>No permits in this group</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>Add an existing master permit. The permit will not be copied or moved.</Typography>
          <Button variant="contained" startIcon={<AddOutlinedIcon />} disabled={archived} onClick={() => setAddOpen(true)}>Add Existing Permit</Button>
        </Paper>
      ) : (
        <Stack spacing={3}>
          {byCountry.map(([code, permits]) => (
            <Box component="section" key={code} aria-labelledby={`country-${code}`}>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1.25 }}><Typography aria-hidden="true" sx={{ fontSize: 28 }}>{countryFlag(code)}</Typography><PublicOutlinedIcon color="primary" /><Typography id={`country-${code}`} variant="h5" fontWeight={900}>{countryName(code)}</Typography><Chip size="small" label={`${permits.length} ${permits.length === 1 ? 'permit' : 'permits'}`} /></Stack>
              <Divider sx={{ mb: 1.5 }} />
              <Stack spacing={1.5}>{permits.map((permit) => <PermitCard key={permit.id} permit={permit} disabled={archived || working} onRemove={setRemoveTarget} navigationState={navigationState} />)}</Stack>
            </Box>
          ))}
        </Stack>
      )}

      {addOpen && <PermitGroupMemberDialog open group={group} onClose={() => setAddOpen(false)} onSubmit={(permitId) => permitService.addPermitToGroup(group.id, permitId).then(load)} />}
      {editOpen && <PermitGroupDialog open group={group} onClose={() => setEditOpen(false)} onSubmit={(values) => permitService.updateGroup(group.id, values).then(load)} />}
      <ConfirmDialog open={statusConfirm} title={archived ? 'Restore permit group?' : 'Archive permit group?'} message={archived ? `Restore "${group.groupName}" so its memberships can be managed again?` : `Archive "${group.groupName}"? Its permit references will be preserved and no Work Permit record will be changed.`} confirmLabel={archived ? 'Restore Group' : 'Archive Group'} confirmColor={archived ? 'primary' : 'error'} onConfirm={changeStatus} onCancel={() => setStatusConfirm(false)} />
      <ConfirmDialog open={Boolean(removeTarget)} title="Remove permit from group?" message={removeTarget ? `Remove "${removeTarget.title}" from this group? The master Work Permit record will not be deleted or changed.` : ''} confirmLabel="Remove from Group" confirmColor="error" onConfirm={removeMember} onCancel={() => setRemoveTarget(null)} />
    </Box>
  );
}
