import { Chip } from '@mui/material';
import { VISIBILITY_LABELS } from '../../utils/enums';

// Shared badge rendering visibility_level (COMPLIANCE_ONLY / INTERNAL_STAFF / CLIENT_SHAREABLE)
const COLOR_MAP = {
  COMPLIANCE_ONLY: 'error',
  INTERNAL_STAFF: 'warning',
  CLIENT_SHAREABLE: 'success',
};

export default function VisibilityBadge({ visibility }) {
  if (!visibility) return null;
  return (
    <Chip
      size="small"
      label={VISIBILITY_LABELS[visibility] || visibility}
      color={COLOR_MAP[visibility] || 'default'}
    />
  );
}
