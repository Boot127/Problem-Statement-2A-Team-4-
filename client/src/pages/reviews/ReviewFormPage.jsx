import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Box, Typography, Alert } from '@mui/material';
import PageHeader from '../../components/common/PageHeader';
import AppBreadcrumbs from '../../components/common/AppBreadcrumbs';
import ReviewForm from './ReviewForm';
import reviewService from '../../api/reviewService';
import { emptyReview } from './reviewValidation';

export default function ReviewFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const [initialValues, setInitialValues] = useState(isEdit ? null : emptyReview);
  const [notFound, setNotFound] = useState(false);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    if (!isEdit) return;
    reviewService.getById(id).then((review) => {
      if (!review) {
        setNotFound(true);
        return;
      }
      setInitialValues({ ...emptyReview, ...review });
    });
  }, [id, isEdit]);

  const handleSubmit = (values, { setSubmitting }) => {
    setSubmitError('');
    const action = isEdit ? reviewService.update(id, values) : reviewService.create(values);
    action
      .then((review) => {
        navigate(`/reviews/${review.id}`);
      })
      .catch((err) => {
        setSubmitError(err.response?.data?.message || 'Something went wrong. Please try again.');
        setSubmitting(false);
      });
  };

  if (notFound) {
    return <Typography>Review request not found.</Typography>;
  }

  if (!initialValues) {
    return <Typography>Loading…</Typography>;
  }

  return (
    <Box>
      <AppBreadcrumbs
        items={[
          { label: 'Dashboard', href: '/' },
          { label: 'Review & Approval', href: '/reviews' },
          { label: isEdit ? 'Edit Review Request' : 'New Review Request' },
        ]}
      />
      <PageHeader
        title={isEdit ? 'Edit Review Request' : 'New Review Request'}
        subtitle={
          isEdit
            ? 'Update the details of this review request.'
            : 'Submit a new review request against a compliance record or work permit.'
        }
      />
      {submitError && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setSubmitError('')}>
          {submitError}
        </Alert>
      )}
      <ReviewForm
        initialValues={initialValues}
        onSubmit={handleSubmit}
        onCancel={() => navigate(isEdit ? `/reviews/${id}` : '/reviews')}
        submitLabel={isEdit ? 'Save Changes' : 'Create Review Request'}
        isEdit={isEdit}
      />
    </Box>
  );
}
