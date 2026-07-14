import { Formik, Form } from 'formik';
import { Box, TextField, MenuItem, Button, Stack, Paper, Typography, Divider } from '@mui/material';
import { permitValidationSchema } from './permitValidation';
import { COUNTRIES } from '../../utils/countries';
import {
  WORKER_TYPES,
  WORKER_TYPE_LABELS,
  VISIBILITY_LEVELS,
  VISIBILITY_LABELS,
  EDITABLE_PERMIT_STATUSES,
  PERMIT_STATUS_LABELS,
} from '../../utils/enums';

const gridSx = {
  display: 'grid',
  gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
  gap: 2,
};

function FormSection({ title, description, children }) {
  return (
    <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
      <Typography variant="subtitle1" fontWeight={600}>
        {title}
      </Typography>
      {description && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {description}
        </Typography>
      )}
      <Divider sx={{ mb: 2.5, mt: description ? 0 : 1.5 }} />
      <Box sx={gridSx}>{children}</Box>
    </Paper>
  );
}

export default function PermitForm({ initialValues, onSubmit, onCancel, submitLabel = 'Save' }) {
  return (
    <Formik
      initialValues={initialValues}
      validationSchema={permitValidationSchema}
      enableReinitialize
      onSubmit={onSubmit}
    >
      {({ values, errors, touched, handleChange, handleBlur, setFieldValue, isSubmitting }) => (
        <Form noValidate>
          <FormSection title="Basic Information" description="What this permit is called and which country it applies to.">
            <TextField
              label="Permit Type"
              name="permitType"
              placeholder="e.g. 9G Pre-Arranged Employment"
              value={values.permitType}
              onChange={handleChange}
              onBlur={handleBlur}
              error={touched.permitType && Boolean(errors.permitType)}
              helperText={touched.permitType && errors.permitType}
              fullWidth
            />

            <TextField
              label="Title"
              name="title"
              value={values.title}
              onChange={handleChange}
              onBlur={handleBlur}
              error={touched.title && Boolean(errors.title)}
              helperText={touched.title && errors.title}
              fullWidth
            />

            <TextField
              select
              label="Country"
              name="countryCode"
              value={values.countryCode}
              onChange={(e) => {
                const code = e.target.value;
                setFieldValue('countryCode', code);
                const country = COUNTRIES.find((c) => c.code === code);
                if (country && !values.currencyCode) {
                  setFieldValue('currencyCode', country.currency);
                }
              }}
              onBlur={handleBlur}
              error={touched.countryCode && Boolean(errors.countryCode)}
              helperText={touched.countryCode && errors.countryCode}
              fullWidth
            >
              {COUNTRIES.map((c) => (
                <MenuItem key={c.code} value={c.code}>
                  {c.name}
                </MenuItem>
              ))}
            </TextField>
          </FormSection>

          <FormSection title="Permit Details" description="Describe the permit and who is eligible to apply.">
            <TextField
              label="Description"
              name="description"
              value={values.description}
              onChange={handleChange}
              onBlur={handleBlur}
              error={touched.description && Boolean(errors.description)}
              helperText={touched.description && errors.description}
              multiline
              minRows={3}
              fullWidth
              sx={{ gridColumn: { sm: '1 / span 2' } }}
            />

            <TextField
              label="Eligibility Criteria"
              name="eligibilityCriteria"
              value={values.eligibilityCriteria}
              onChange={handleChange}
              onBlur={handleBlur}
              error={touched.eligibilityCriteria && Boolean(errors.eligibilityCriteria)}
              helperText={touched.eligibilityCriteria && errors.eligibilityCriteria}
              multiline
              minRows={3}
              fullWidth
              sx={{ gridColumn: { sm: '1 / span 2' } }}
            />
          </FormSection>

          <FormSection title="Processing and Fees" description="Timelines and government costs associated with this permit.">
            <TextField
              type="number"
              label="Processing Time (days)"
              name="processingTimeDays"
              value={values.processingTimeDays}
              onChange={handleChange}
              onBlur={handleBlur}
              error={touched.processingTimeDays && Boolean(errors.processingTimeDays)}
              helperText={touched.processingTimeDays && errors.processingTimeDays}
              fullWidth
            />

            <TextField
              type="number"
              label="Validity (months)"
              name="validityMonths"
              value={values.validityMonths}
              onChange={handleChange}
              onBlur={handleBlur}
              error={touched.validityMonths && Boolean(errors.validityMonths)}
              helperText={touched.validityMonths && errors.validityMonths}
              fullWidth
            />

            <TextField
              type="number"
              label="Government Fee"
              name="governmentFee"
              value={values.governmentFee}
              onChange={handleChange}
              onBlur={handleBlur}
              error={touched.governmentFee && Boolean(errors.governmentFee)}
              helperText={touched.governmentFee && errors.governmentFee}
              fullWidth
            />

            <TextField
              label="Currency Code"
              name="currencyCode"
              placeholder="e.g. SGD"
              value={values.currencyCode}
              onChange={handleChange}
              onBlur={handleBlur}
              error={touched.currencyCode && Boolean(errors.currencyCode)}
              helperText={touched.currencyCode && errors.currencyCode}
              fullWidth
            />
          </FormSection>

          <FormSection
            title="Classification and Access"
            description="Who this permit applies to and who may view it."
          >
            <TextField
              select
              label="Worker Type"
              name="workerType"
              value={values.workerType}
              onChange={handleChange}
              onBlur={handleBlur}
              error={touched.workerType && Boolean(errors.workerType)}
              helperText={touched.workerType && errors.workerType}
              fullWidth
            >
              {WORKER_TYPES.map((wt) => (
                <MenuItem key={wt} value={wt}>
                  {WORKER_TYPE_LABELS[wt]}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              select
              label="Visibility"
              name="visibility"
              value={values.visibility}
              onChange={handleChange}
              onBlur={handleBlur}
              error={touched.visibility && Boolean(errors.visibility)}
              helperText={touched.visibility && errors.visibility}
              fullWidth
            >
              {VISIBILITY_LEVELS.map((v) => (
                <MenuItem key={v} value={v}>
                  {VISIBILITY_LABELS[v]}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              select
              label="Status"
              name="status"
              value={values.status}
              onChange={handleChange}
              onBlur={handleBlur}
              error={touched.status && Boolean(errors.status)}
              helperText={
                (touched.status && errors.status) ||
                'Use the Archive action on the permit to set Archived'
              }
              fullWidth
            >
              {EDITABLE_PERMIT_STATUSES.map((s) => (
                <MenuItem key={s} value={s}>
                  {PERMIT_STATUS_LABELS[s]}
                </MenuItem>
              ))}
            </TextField>
          </FormSection>

          <FormSection title="Source Information" description="Reference link for this permit's official source.">
            <TextField
              label="Source URL"
              name="sourceUrl"
              placeholder="https://..."
              value={values.sourceUrl}
              onChange={handleChange}
              onBlur={handleBlur}
              error={touched.sourceUrl && Boolean(errors.sourceUrl)}
              helperText={touched.sourceUrl && errors.sourceUrl}
              fullWidth
              sx={{ gridColumn: { sm: '1 / span 2' } }}
            />
          </FormSection>

          <Stack direction="row" spacing={2} justifyContent="flex-end">
            <Button onClick={onCancel} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" variant="contained" disabled={isSubmitting}>
              {submitLabel}
            </Button>
          </Stack>
        </Form>
      )}
    </Formik>
  );
}
