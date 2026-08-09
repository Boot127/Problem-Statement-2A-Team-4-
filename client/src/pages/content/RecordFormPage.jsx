import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Box, Typography, Alert, Button } from '@mui/material';
import PageHeader from '../../components/common/PageHeader';
import AppBreadcrumbs from '../../components/common/AppBreadcrumbs';
import RecordForm from './RecordForm';
import recordService from '../../api/recordService';
import { emptyRecord } from './recordValidation';
import { useAuth } from '../../context/AuthContext';
import { ROLE_LABELS } from '../../utils/enums';

export default function RecordFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { role, canEdit } = useAuth();
  const isEdit = Boolean(id);
  const [initialValues, setInitialValues] = useState(isEdit ? null : emptyRecord);
  const [notFound, setNotFound] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  useEffect(() => {
    if (!isEdit) return;
    recordService.getById(id).then((record) => {
      if (!record) {
        setNotFound(true);
        return;
      }
      // Nullable DB columns (summary, fullText, effectiveDate, sourceUrl)
      // come back as `null`, which breaks controlled inputs and Yup's
      // string validators — coalesce to '' for the form.
      setInitialValues({
        ...emptyRecord,
        ...record,
        summary: record.summary || '',
        fullText: record.fullText || '',
        effectiveDate: record.effectiveDate || '',
        sourceUrl: record.sourceUrl || '',
      });
    });
  }, [id, isEdit]);

  const handleSubmit = async (values, { setSubmitting }) => {
    setSubmitError(null);
    try {
      if (isEdit) {
        const record = await recordService.update(id, values);
        navigate(`/content/${record.id}`);
        return;
      }

      const record = await recordService.create(values);
      // Benefit components can only be added one at a time (there's no bulk
      // create endpoint), so seed any the user added before the first save.
      for (const component of values.benefitComponents) {
        // eslint-disable-next-line no-await-in-loop
        await recordService.addComponent(record.id, component);
      }
      navigate(`/content/${record.id}`);
    } catch (err) {
      setSubmitError(err.response?.data?.message || err.response?.data?.errors?.join(', ') || 'Something went wrong. Please try again.');
      setSubmitting(false);
    }
  };

  const handleAiRewriteRequest = async (field, text, mode) => {
    if (!id) return null;
    return recordService.aiAssist(id, { mode: mode || 'rewrite', field, text });
  };

  if (!canEdit) {
    return (
      <Box>
        <AppBreadcrumbs items={[{ label: 'Dashboard', href: '/' }, { label: 'Compliance Content', href: '/content' }]} />
        <Alert severity="warning" sx={{ mb: 2 }}>
          Your role ({ROLE_LABELS[role] || role}) does not have permission to create or edit compliance records.
          Only Compliance staff may author content (Section 4).
        </Alert>
        <Button variant="contained" onClick={() => navigate('/content')}>
          Back to Compliance Content
        </Button>
      </Box>
    );
  }

  if (notFound) {
    return <Typography>Compliance record not found.</Typography>;
  }

  if (!initialValues) {
    return <Typography>Loading…</Typography>;
  }

  return (
    <Box>
      <AppBreadcrumbs
        items={[
          { label: 'Dashboard', href: '/' },
          { label: 'Compliance Content', href: '/content' },
          { label: isEdit ? 'Edit Record' : 'New Record' },
        ]}
      />
      <PageHeader
        title={isEdit ? 'Edit Compliance Record' : 'New Compliance Record'}
        subtitle={
          isEdit
            ? 'Update the details of this labour-law or benefit record.'
            : 'Create a new labour-law or statutory-benefit record for a country.'
        }
      />
      {submitError && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setSubmitError(null)}>
          {submitError}
        </Alert>
      )}
      <RecordForm
        recordId={isEdit ? id : undefined}
        initialValues={initialValues}
        onSubmit={handleSubmit}
        onCancel={() => navigate(isEdit ? `/content/${id}` : '/content')}
        onAiRewriteRequest={handleAiRewriteRequest}
        submitLabel={isEdit ? 'Save Changes' : 'Create Record'}
      />
    </Box>
  );
}
