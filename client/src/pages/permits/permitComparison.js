import { countryName } from '../../utils/countries';
import {
  PERMIT_STATUS_LABELS,
  PROCESS_TYPE_LABELS,
  VISIBILITY_LABELS,
  WORKER_TYPE_LABELS,
} from '../../utils/enums';
import { summariseProcess } from './processSummary';

export function formatPermitFee(permit) {
  if (permit?.governmentFee !== 0 && !permit?.governmentFee) return 'Not recorded';
  return `${permit.currencyCode || ''} ${permit.governmentFee}`.trim();
}

export function buildComparisonRows(left, right) {
  const value = (permit, key, fallback = 'Not recorded') => permit?.[key] || fallback;
  return [
    { label: 'Country', left: countryName(left.countryCode), right: countryName(right.countryCode) },
    { label: 'Permit type', left: left.permitType, right: right.permitType },
    {
      label: 'Worker type',
      left: WORKER_TYPE_LABELS[left.workerType] || left.workerType,
      right: WORKER_TYPE_LABELS[right.workerType] || right.workerType,
    },
    {
      label: 'Processing time',
      left: left.processingTimeDays === 0 || left.processingTimeDays ? `${left.processingTimeDays} days` : 'Not recorded',
      right: right.processingTimeDays === 0 || right.processingTimeDays ? `${right.processingTimeDays} days` : 'Not recorded',
    },
    {
      label: 'Validity',
      left: left.validityMonths === 0 || left.validityMonths ? `${left.validityMonths} months` : 'Not recorded',
      right: right.validityMonths === 0 || right.validityMonths ? `${right.validityMonths} months` : 'Not recorded',
    },
    { label: 'Government fee', left: formatPermitFee(left), right: formatPermitFee(right) },
    {
      label: 'Visibility',
      left: VISIBILITY_LABELS[left.visibility] || left.visibility,
      right: VISIBILITY_LABELS[right.visibility] || right.visibility,
    },
    {
      label: 'Record status',
      left: PERMIT_STATUS_LABELS[left.status] || left.status,
      right: PERMIT_STATUS_LABELS[right.status] || right.status,
    },
    { label: 'Next review', left: value(left, 'nextReviewAt'), right: value(right, 'nextReviewAt') },
  ];
}

export function buildProcessComparison(permit, processType) {
  const steps = permit.steps?.[processType] || [];
  const documents = permit.documents?.[processType] || [];
  const summary = summariseProcess(steps, documents);
  return {
    processType,
    label: PROCESS_TYPE_LABELS[processType],
    ...summary,
  };
}
