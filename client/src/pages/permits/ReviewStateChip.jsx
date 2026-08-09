import { Chip, Tooltip } from '@mui/material';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import ScheduleOutlinedIcon from '@mui/icons-material/ScheduleOutlined';
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
import ErrorOutlineOutlinedIcon from '@mui/icons-material/ErrorOutlineOutlined';
import HelpOutlineOutlinedIcon from '@mui/icons-material/HelpOutlineOutlined';
import { REVIEW_STATE_LABELS, REVIEW_STATE_COLORS } from '../../utils/enums';

// Badge for a permit's DERIVED review state. Kept local to the permits feature
// rather than in components/common — review state is a Work Permit concept and
// the shared folder is team-wide space.
//
// Every state carries an icon as well as a colour, so the meaning does not
// depend on colour perception alone.
const ICONS = {
  CURRENT: CheckCircleOutlinedIcon,
  DUE_SOON: ScheduleOutlinedIcon,
  REVIEW_DUE: WarningAmberOutlinedIcon,
  OUTDATED: ErrorOutlineOutlinedIcon,
  INCOMPLETE: HelpOutlineOutlinedIcon,
};

const EXPLANATIONS = {
  CURRENT: 'Reviewed recently and complete enough to rely on.',
  DUE_SOON: 'The next review date falls within the next 14 days.',
  REVIEW_DUE: 'The review date has passed, or the record is flagged for review.',
  OUTDATED: 'Flagged as outdated — do not rely on this record until it is updated.',
  INCOMPLETE: 'Key information is missing, including the new-application process.',
};

export default function ReviewStateChip({ state, size = 'small', showIcon = true }) {
  if (!state) return null;
  const Icon = ICONS[state];
  const label = REVIEW_STATE_LABELS[state] || state;

  return (
    <Tooltip title={EXPLANATIONS[state] || ''}>
      <Chip
        size={size}
        label={label}
        color={REVIEW_STATE_COLORS[state] || 'default'}
        variant={state === 'CURRENT' ? 'outlined' : 'filled'}
        icon={showIcon && Icon ? <Icon /> : undefined}
        // The tooltip is mouse-only; this keeps the meaning available to
        // screen readers and to keyboard users.
        aria-label={`Review state: ${label}. ${EXPLANATIONS[state] || ''}`}
      />
    </Tooltip>
  );
}
