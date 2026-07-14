import * as Yup from 'yup';
import { COUNTRIES } from '../../utils/countries';
import { WORKER_TYPES, VISIBILITY_LEVELS, EDITABLE_PERMIT_STATUSES } from '../../utils/enums';

const countryCodes = COUNTRIES.map((c) => c.code);

// Converts a blank text field into `undefined` so optional number fields
// don't fail Yup's typeError when the user clears the input.
const emptyToUndefined = (value, originalValue) =>
  originalValue === '' ? undefined : value;

export const permitValidationSchema = Yup.object({
  permitType: Yup.string().trim().required('Permit type is required').max(120),
  title: Yup.string().trim().required('Title is required').max(200),
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
});

export const emptyPermit = {
  permitType: '',
  title: '',
  countryCode: '',
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
};
