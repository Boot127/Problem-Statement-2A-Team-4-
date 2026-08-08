import { Chip } from '@mui/material';
import { PERMIT_STATUS_LABELS, REVIEW_STATUS_LABELS } from '../../utils/enums';

// Shared chip rendering content/review status (Section 12)
const COLOR_MAP = {
  DRAFT: 'default',
  PUBLISHED: 'success',
  ARCHIVED: 'default',
  PENDING: 'warning',
  IN_REVIEW: 'info',
  APPROVED: 'success',
  CHANGES_REQUESTED: 'warning',
  REJECTED: 'error',
};

const LABEL_MAP = { ...PERMIT_STATUS_LABELS, ...REVIEW_STATUS_LABELS };

export default function StatusChip({ status }) {
  if (!status) return null;
  return (
    <Chip
      size="small"
      label={LABEL_MAP[status] || status}
      color={COLOR_MAP[status] || 'default'}
      variant={status === 'ARCHIVED' ? 'outlined' : 'filled'}
    />
  );
}
