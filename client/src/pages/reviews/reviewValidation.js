import * as Yup from 'yup';
import { TARGET_TYPES, EDITABLE_REVIEW_STATUSES } from '../../utils/enums';

export const reviewValidationSchema = Yup.object({
  title: Yup.string().trim().required('Title is required').max(200),
  description: Yup.string().trim().max(2000, 'Description must be 2000 characters or fewer'),
  targetType: Yup.string().oneOf(TARGET_TYPES, 'Select a target type').required('Target type is required'),
  targetId: Yup.number()
    .typeError('Must be a number')
    .integer('Must be a whole number')
    .positive('Must be positive')
    .required('Target id is required'),
  reviewStatus: Yup.string().oneOf(EDITABLE_REVIEW_STATUSES).required('Review status is required'),
});

export const emptyReview = {
  title: '',
  description: '',
  targetType: 'work_permit',
  targetId: '',
  reviewStatus: 'PENDING',
};
