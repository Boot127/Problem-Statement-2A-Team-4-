import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Box, Typography } from '@mui/material';
import PageHeader from '../../components/common/PageHeader';
import AppBreadcrumbs from '../../components/common/AppBreadcrumbs';
import PermitForm from './PermitForm';
import permitService from '../../api/permitService';
import { emptyPermit } from './permitValidation';

export default function PermitFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const [initialValues, setInitialValues] = useState(isEdit ? null : emptyPermit);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!isEdit) return;
    permitService.getById(id).then((permit) => {
      if (!permit) {
        setNotFound(true);
        return;
      }
      setInitialValues({ ...emptyPermit, ...permit });
    });
  }, [id, isEdit]);

  const handleSubmit = (values, { setSubmitting }) => {
    const action = isEdit ? permitService.update(id, values) : permitService.create(values);
    action.then((permit) => {
      setSubmitting(false);
      navigate(`/permits/${permit.id}`);
    });
  };

  if (notFound) {
    return <Typography>Work permit not found.</Typography>;
  }

  if (!initialValues) {
    return <Typography>Loading…</Typography>;
  }

  return (
    <Box>
      <AppBreadcrumbs
        items={[
          { label: 'Dashboard', href: '/' },
          { label: 'Work Permits', href: '/permits' },
          { label: isEdit ? 'Edit Permit' : 'New Permit' },
        ]}
      />
      <PageHeader
        title={isEdit ? 'Edit Work Permit' : 'New Work Permit'}
        subtitle={
          isEdit
            ? 'Update the details of this permit type.'
            : 'Create a new work-permit type for a country.'
        }
      />
      <PermitForm
        initialValues={initialValues}
        onSubmit={handleSubmit}
        onCancel={() => navigate(isEdit ? `/permits/${id}` : '/permits')}
        submitLabel={isEdit ? 'Save Changes' : 'Create Permit'}
      />
    </Box>
  );
}
