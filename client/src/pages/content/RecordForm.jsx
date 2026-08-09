import { Formik, Form, FieldArray } from 'formik';
import { Box, TextField, MenuItem, Button, Stack, Paper, Typography, Divider, IconButton } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import { recordValidationSchema, emptyComponent } from './recordValidation';
import { COUNTRIES } from '../../utils/countries';
import AiRewriteField from '../../components/common/AiRewriteField';
import {
  WORKER_TYPES,
  WORKER_TYPE_LABELS,
  VISIBILITY_LEVELS,
  VISIBILITY_LABELS,
  RECORD_CATEGORIES,
  RECORD_CATEGORY_LABELS,
} from '../../utils/enums';

const gridSx = {
  display: 'grid',
  gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
  gap: 2,
};

function FormSection({ title, description, plain, children }) {
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
      {plain ? <Box>{children}</Box> : <Box sx={gridSx}>{children}</Box>}
    </Paper>
  );
}

// recordId is undefined for a brand-new record — AI Rewrite needs a saved
// record (POST /records/:id/ai-assist), so it's disabled until the first save.
export default function RecordForm({ recordId, initialValues, onSubmit, onCancel, onAiRewriteRequest, submitLabel = 'Save' }) {
  return (
    <Formik
      initialValues={initialValues}
      validationSchema={recordValidationSchema}
      enableReinitialize
      onSubmit={onSubmit}
    >
      {({ values, errors, touched, handleChange, handleBlur, setFieldValue, isSubmitting }) => (
        <Form noValidate>
          <FormSection
            title="Basic Information"
            description="What this record is about and which country it applies to."
          >
            <TextField
              label="Title"
              name="title"
              placeholder="e.g. Singapore CPF Contribution Rates"
              value={values.title}
              onChange={handleChange}
              onBlur={handleBlur}
              error={touched.title && Boolean(errors.title)}
              helperText={touched.title && errors.title}
              fullWidth
              sx={{ gridColumn: { sm: '1 / span 2' } }}
            />

            <TextField
              select
              label="Country"
              name="countryCode"
              value={values.countryCode}
              onChange={(e) => setFieldValue('countryCode', e.target.value)}
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

            <TextField
              select
              label="Category"
              name="category"
              value={values.category}
              onChange={handleChange}
              onBlur={handleBlur}
              error={touched.category && Boolean(errors.category)}
              helperText={touched.category && errors.category}
              fullWidth
            >
              {RECORD_CATEGORIES.map((c) => (
                <MenuItem key={c} value={c}>
                  {RECORD_CATEGORY_LABELS[c]}
                </MenuItem>
              ))}
            </TextField>
          </FormSection>

          <FormSection
            title="Content"
            description={
              recordId
                ? 'A short summary and the full details of this labour-law or benefit record. Highlight part of the text to rewrite only that selection.'
                : 'A short summary and the full details of this labour-law or benefit record. Save the record once to unlock AI Rewrite.'
            }
          >
            <AiRewriteField
              label="Summary"
              name="summary"
              value={values.summary}
              onValueChange={(next) => setFieldValue('summary', next)}
              onBlur={handleBlur}
              error={touched.summary && Boolean(errors.summary)}
              helperText={touched.summary && errors.summary}
              onRewriteRequest={(text, mode) => onAiRewriteRequest('summary', text, mode)}
              disabledReason={recordId ? undefined : 'Save first'}
              minRows={2}
              sx={{ gridColumn: { sm: '1 / span 2' } }}
            />

            <AiRewriteField
              label="Full Text"
              name="fullText"
              value={values.fullText}
              onValueChange={(next) => setFieldValue('fullText', next)}
              onBlur={handleBlur}
              error={touched.fullText && Boolean(errors.fullText)}
              helperText={touched.fullText && errors.fullText}
              onRewriteRequest={(text, mode) => onAiRewriteRequest('fullText', text, mode)}
              disabledReason={recordId ? undefined : 'Save first'}
              minRows={5}
              sx={{ gridColumn: { sm: '1 / span 2' } }}
            />
          </FormSection>

          <FormSection
            title="Classification and Access"
            description="Who this record applies to and who may view it."
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
              type="date"
              label="Effective Date"
              name="effectiveDate"
              value={values.effectiveDate || ''}
              onChange={handleChange}
              onBlur={handleBlur}
              error={touched.effectiveDate && Boolean(errors.effectiveDate)}
              helperText={touched.effectiveDate && errors.effectiveDate}
              fullWidth
              slotProps={{ inputLabel: { shrink: true } }}
            />
          </FormSection>

          {/* The API only supports adding benefit components (POST /records/:id/components) —
              there's no update/delete endpoint, so once a component is saved it can only be
              managed from the detail page. This section is therefore only shown before the
              first save, to seed a new record's initial components. */}
          {!recordId && (
          <FieldArray name="benefitComponents">
            {({ push, remove }) => (
              <FormSection
                title="Benefit Components"
                description="Structured contribution rates/caps for records of a benefit nature (FR-1.4). Rates and caps are free text since real-world rules rarely reduce to a single number. You can add more after saving from the record's detail page."
                plain
              >
                <Stack spacing={2}>
                  {values.benefitComponents.length === 0 && (
                    <Typography variant="body2" color="text.secondary">
                      No benefit components added yet.
                    </Typography>
                  )}
                  {values.benefitComponents.map((component, index) => {
                    const componentErrors = errors.benefitComponents?.[index] || {};
                    const componentTouched = touched.benefitComponents?.[index] || {};
                    return (
                      <Paper key={index} variant="outlined" sx={{ p: 2.5 }}>
                        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <Typography variant="subtitle2" fontWeight={600}>
                            Component {index + 1}
                          </Typography>
                          <IconButton size="small" color="error" onClick={() => remove(index)}>
                            <DeleteOutlinedIcon fontSize="small" />
                          </IconButton>
                        </Stack>

                        <Box sx={{ ...gridSx, mt: 1 }}>
                          <TextField
                            label="Component Name"
                            name={`benefitComponents.${index}.componentName`}
                            placeholder="e.g. Pension Fund"
                            value={component.componentName}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            error={componentTouched.componentName && Boolean(componentErrors.componentName)}
                            helperText={componentTouched.componentName && componentErrors.componentName}
                            fullWidth
                            sx={{ gridColumn: { sm: '1 / span 2' } }}
                          />

                          <TextField
                            select
                            label="Worker Type"
                            name={`benefitComponents.${index}.workerType`}
                            value={component.workerType}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            fullWidth
                          >
                            {WORKER_TYPES.map((wt) => (
                              <MenuItem key={wt} value={wt}>
                                {WORKER_TYPE_LABELS[wt]}
                              </MenuItem>
                            ))}
                          </TextField>

                          <TextField
                            label="Calculation Basis"
                            name={`benefitComponents.${index}.calculationBasis`}
                            placeholder="e.g. monthly gross salary"
                            value={component.calculationBasis}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            fullWidth
                          />

                          <TextField
                            label="Employer Rate"
                            name={`benefitComponents.${index}.employerRate`}
                            placeholder="e.g. 4.24%"
                            value={component.employerRate}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            fullWidth
                          />

                          <TextField
                            label="Employee Rate"
                            name={`benefitComponents.${index}.employeeRate`}
                            placeholder="e.g. 2%"
                            value={component.employeeRate}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            fullWidth
                          />

                          <TextField
                            label="Cap / Ceiling"
                            name={`benefitComponents.${index}.capCeiling`}
                            placeholder="e.g. IDR 11,086,300 / month"
                            value={component.capCeiling}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            fullWidth
                            sx={{ gridColumn: { sm: '1 / span 2' } }}
                          />

                          <TextField
                            label="Notes"
                            name={`benefitComponents.${index}.notes`}
                            value={component.notes}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            multiline
                            minRows={2}
                            fullWidth
                            sx={{ gridColumn: { sm: '1 / span 2' } }}
                          />
                        </Box>
                      </Paper>
                    );
                  })}

                  <Button startIcon={<AddIcon />} onClick={() => push({ ...emptyComponent })} sx={{ alignSelf: 'flex-start' }}>
                    Add Component
                  </Button>
                </Stack>
              </FormSection>
            )}
          </FieldArray>
          )}

          <FormSection
            title="Source Information"
            description="Reference link for this record's official source. Source document attachments are managed from the record's detail page."
          >
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

          <Stack direction="row" spacing={2} sx={{ justifyContent: 'flex-end' }}>
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
