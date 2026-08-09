import * as Yup from 'yup';
import { COUNTRIES } from '../../utils/countries';
import {
  WORKER_TYPES,
  VISIBILITY_LEVELS,
  EDITABLE_PERMIT_STATUSES,
  INFORMATION_STATUSES,
} from '../../utils/enums';

const countryCodes = COUNTRIES.map((c) => c.code);

// `<input type="date">` yields '' when cleared and YYYY-MM-DD otherwise, which
// is exactly what the API expects — so the only rule is the format itself.
const isoDate = () =>
  Yup.string()
    .trim()
    .matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Use a valid date', excludeEmptyString: true });

// Converts a blank text field into `undefined` so optional number fields
// don't fail Yup's typeError when the user clears the input.
const emptyToUndefined = (value, originalValue) =>
  originalValue === '' ? undefined : value;

export const permitValidationSchema = Yup.object({
  permitType: Yup.string().trim().required('Permit type is required').max(120),
  title: Yup.string().trim().required('Title is required').max(200),
  permitHolderName: Yup.string().trim().max(200, 'Maximum 200 characters'),
  clientCompanyName: Yup.string().trim().max(200, 'Maximum 200 characters'),
  countryCode: Yup.string().oneOf(countryCodes, 'Select a country').required('Country is required'),
  description: Yup.string().max(2000),
  eligibilityCriteria: Yup.string().max(2000),
  processingTimeDays: Yup.number()
    .transform(emptyToUndefined)
    .typeError('Must be a number')
    .positive('Must be positive')
    .integer('Must be a whole number')
    .nullable(),
  validityMonths: Yup.number()
    .transform(emptyToUndefined)
    .typeError('Must be a number')
    .positive('Must be positive')
    .integer('Must be a whole number')
    .nullable(),
  governmentFee: Yup.number()
    .transform(emptyToUndefined)
    .typeError('Must be a number')
    .min(0, 'Cannot be negative')
    .nullable(),
  currencyCode: Yup.string().trim().length(3, 'Use a 3-letter currency code').uppercase(),
  workerType: Yup.string().oneOf(WORKER_TYPES).required('Worker type is required'),
  visibility: Yup.string().oneOf(VISIBILITY_LEVELS).required('Visibility is required'),
  sourceUrl: Yup.string().trim().url('Enter a valid URL'),
  status: Yup.string().oneOf(EDITABLE_PERMIT_STATUSES).required('Status is required'),
  lastReviewedAt: isoDate(),
  nextReviewAt: isoDate().test(
    'after-last-reviewed',
    'Next review must be after the last review date',
    // A next-review date before the last review is almost always a typo, and
    // it would make the derived "overdue" figure meaningless.
    function (value) {
      const { lastReviewedAt } = this.parent;
      if (!value || !lastReviewedAt) return true;
      return value > lastReviewedAt;
    }
  ),
  reviewNotes: Yup.string().max(1000, 'Maximum 1000 characters'),
  informationStatus: Yup.string().oneOf(INFORMATION_STATUSES).required(),
});

// --- Recording a review (improvement plan Section 10.2) ---

export const reviewValidationSchema = Yup.object({
  reviewedOn: isoDate().required('Review date is required'),
  nextReviewAt: isoDate().test(
    'after-reviewed-on',
    'Next review must be after the review date',
    function (value) {
      const { reviewedOn } = this.parent;
      if (!value || !reviewedOn) return true;
      return value > reviewedOn;
    }
  ),
  reviewNotes: Yup.string().max(1000, 'Maximum 1000 characters'),
  informationStatus: Yup.string().oneOf(INFORMATION_STATUSES).required(),
});

// --- Process step (FR-2.3) ---

export const stepValidationSchema = Yup.object({
  stepTitle: Yup.string().trim().required('Step title is required').max(200, 'Maximum 200 characters'),
  stepDetail: Yup.string().max(2000, 'Maximum 2000 characters'),
  expectedTimeline: Yup.string().trim().max(120, 'Maximum 120 characters'),
});

export const emptyStep = {
  stepTitle: '',
  stepDetail: '',
  expectedTimeline: '',
};

// --- Required-document checklist (FR-2.4) ---

export const documentValidationSchema = Yup.object({
  documentName: Yup.string()
    .trim()
    .required('Document name is required')
    .max(200, 'Maximum 200 characters'),
  isMandatory: Yup.boolean().required(),
  notes: Yup.string().max(500, 'Maximum 500 characters'),
});

export const emptyDocument = {
  documentName: '',
  isMandatory: true,
  notes: '',
};

export const emptyPermit = {
  permitType: '',
  title: '',
  countryCode: '',
  permitHolderName: '',
  clientCompanyName: '',
  description: '',
  eligibilityCriteria: '',
  processingTimeDays: '',
  validityMonths: '',
  governmentFee: '',
  currencyCode: '',
  workerType: 'FOREIGN_WORKER',
  visibility: 'INTERNAL_STAFF',
  sourceUrl: '',
  status: 'DRAFT',
  lastReviewedAt: '',
  nextReviewAt: '',
  reviewNotes: '',
  informationStatus: 'CURRENT',
};
