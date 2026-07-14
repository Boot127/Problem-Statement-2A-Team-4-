import { Chip } from '@mui/material';
import { WORKER_TYPE_LABELS } from '../../utils/enums';

// Shared chip rendering worker_type (LOCAL / FOREIGN_WORKER / EXPATRIATE / ALL_EMPLOYEES)
export default function WorkerTypeChip({ workerType }) {
  if (!workerType) return null;
  return (
    <Chip size="small" variant="outlined" label={WORKER_TYPE_LABELS[workerType] || workerType} />
  );
}
