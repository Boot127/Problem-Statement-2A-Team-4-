import * as Yup from 'yup';
import { COUNTRIES } from '../../utils/countries';
import { WORKER_TYPES, VISIBILITY_LEVELS, RECORD_CATEGORIES } from '../../utils/enums';

const countryCodes = COUNTRIES.map((c) => c.code);

// Benefit components deliberately use free-text rate/cap fields, not numbers
// — matches server/src/config/db.js (benefit_components.employer_rate etc.
// are TEXT), which follows HLD risk R5: real contribution rules ("Social
// 4.24% + Pension 2% capped at IDR 11m") don't fit clean numeric columns.
// .nullable() on the optional fields matters here: components fetched from
// the server (GET /records/:id) come back with SQL NULL -> null for any rate
// field the user left blank, and Yup's string() type-checks reject null.
const componentSchema = Yup.object({
  componentName: Yup.string().trim().required('Component name is required').max(150),
  workerType: Yup.string().oneOf(WORKER_TYPES).required('Worker type is required'),
  employerRate: Yup.string().max(120).nullable(),
  employeeRate: Yup.string().max(120).nullable(),
  capCeiling: Yup.string().max(150).nullable(),
  calculationBasis: Yup.string().max(200).nullable(),
  notes: Yup.string().max(500).nullable(),
});

export const recordValidationSchema = Yup.object({
  title: Yup.string().trim().required('Title is required').max(200),
  countryCode: Yup.string()
    .oneOf(countryCodes, 'Select a country')
    .required('Country is required'),
  category: Yup.string()
    .oneOf(RECORD_CATEGORIES, 'Select a category')
    .required('Category is required'),
  summary: Yup.string().max(500).nullable(),
  fullText: Yup.string().max(20000).nullable(),
  workerType: Yup.string().oneOf(WORKER_TYPES).required('Worker type is required'),
  visibility: Yup.string().oneOf(VISIBILITY_LEVELS).required('Visibility is required'),
  effectiveDate: Yup.string().nullable(),
  sourceUrl: Yup.string().trim().url('Enter a valid URL').nullable(),
  benefitComponents: Yup.array().of(componentSchema),
});

export const emptyComponent = {
  componentName: '',
  workerType: 'ALL_EMPLOYEES',
  employerRate: '',
  employeeRate: '',
  capCeiling: '',
  calculationBasis: '',
  notes: '',
};

export const emptyRecord = {
  title: '',
  countryCode: '',
  category: '',
  summary: '',
  fullText: '',
  workerType: 'ALL_EMPLOYEES',
  visibility: 'INTERNAL_STAFF',
  effectiveDate: '',
  sourceUrl: '',
  benefitComponents: [],
  attachments: [],
};
