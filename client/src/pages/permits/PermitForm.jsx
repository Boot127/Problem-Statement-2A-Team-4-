import { useState } from 'react';
import { Formik, Form } from 'formik';
import {
  Box,
  TextField,
  MenuItem,
  Button,
  Stack,
  Paper,
  Typography,
  Divider,
  CircularProgress,
  LinearProgress,
  Collapse,
  IconButton,
  Tooltip,
} from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import PaidOutlinedIcon from '@mui/icons-material/PaidOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import LinkOutlinedIcon from '@mui/icons-material/LinkOutlined';
import HealthAndSafetyOutlinedIcon from '@mui/icons-material/HealthAndSafetyOutlined';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { permitValidationSchema } from './permitValidation';
import { formCompleteness } from './formCompleteness';
import { COUNTRIES } from '../../utils/countries';
import {
  WORKER_TYPES,
  WORKER_TYPE_LABELS,
  VISIBILITY_LEVELS,
  VISIBILITY_LABELS,
  EDITABLE_PERMIT_STATUSES,
  PERMIT_STATUS_LABELS,
  INFORMATION_STATUSES,
  INFORMATION_STATUS_LABELS,
  INFORMATION_STATUS_HELP,
} from '../../utils/enums';

const gridSx = {
  display: 'grid',
  gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
  gap: 2.5,
};

// Section shell: icon + heading + description + optional collapse.
// `collapsible` is used for the advanced review fields, which most edits do not
// touch — they stay available but out of the way (improvement plan 9.3).
function FormSection({ icon: Icon, title, description, children, collapsible, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  const headingId = `form-section-${title.replace(/\s+/g, '-').toLowerCase()}`;

  return (
    <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
      <Stack
        direction="row"
        spacing={1}
        sx={{ alignItems: 'flex-start', justifyContent: 'space-between' }}
      >
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'flex-start' }}>
          <Box
            aria-hidden="true"
            sx={{
              width: 32,
              height: 32,
              borderRadius: 1.5,
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: 'primary.main',
              color: 'primary.contrastText',
            }}
          >
            <Icon fontSize="small" />
          </Box>
          <Box>
            <Typography variant="subtitle1" fontWeight={700} id={headingId}>
              {title}
            </Typography>
            {description && (
              <Typography variant="body2" color="text.secondary">
                {description}
              </Typography>
            )}
          </Box>
        </Stack>
        {collapsible && (
          <IconButton
            size="small"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-label={`${open ? 'Hide' : 'Show'} ${title}`}
          >
            {open ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </IconButton>
        )}
      </Stack>

      <Collapse in={open} unmountOnExit={false}>
        <Divider sx={{ mb: 3, mt: 2 }} />
        <Box sx={gridSx}>{children}</Box>
      </Collapse>
    </Paper>
  );
}

export default function PermitForm({
  initialValues,
  onSubmit,
  onCancel,
  submitLabel = 'Save',
  // Rendered above the sections so a duplicate warning appears before the user
  // has scrolled to the bottom to save.
  banner,
  onIdentityChange,
}) {
  return (
    <Formik
      initialValues={initialValues}
      validationSchema={permitValidationSchema}
      enableReinitialize
      onSubmit={onSubmit}
    >
      {({ values, errors, touched, handleChange, handleBlur, setFieldValue, isSubmitting }) => {
        const completion = formCompleteness(values);
        // Country + permit type are the duplicate-detection key; the page
        // debounces and queries whenever either settles.
        const notifyIdentity = (country, permitType) => {
          if (onIdentityChange) onIdentityChange({ countryCode: country, permitType });
        };

        return (
          <Form noValidate>
            {/* ---- completion indicator ---- */}
            <Paper variant="outlined" sx={{ p: 2.5, mb: 3 }}>
              <Stack
                direction="row"
                spacing={2}
                sx={{ justifyContent: 'space-between', alignItems: 'baseline', mb: 1 }}
              >
                <Typography variant="subtitle2" fontWeight={700}>
                  Permit information
                </Typography>
                <Typography variant="subtitle2" fontWeight={700} color="primary.main">
                  {completion.score}% complete
                </Typography>
              </Stack>
              <LinearProgress
                variant="determinate"
                value={completion.score}
                sx={{ height: 6, borderRadius: 1 }}
                aria-label={`Form completion: ${completion.score} percent, ${completion.completed} of ${completion.total} fields filled`}
              />
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                {completion.missing.length === 0
                  ? 'All permit fields are filled in.'
                  : `Still empty: ${completion.missing.join(', ')}.`}
              </Typography>
            </Paper>

            {banner}

            <FormSection
              icon={InfoOutlinedIcon}
              title="Basic Information"
              description="What this permit is called and which country it applies to."
            >
              <TextField
                required
                label="Permit Type"
                name="permitType"
                placeholder="e.g. 9G Pre-Arranged Employment"
                value={values.permitType}
                onChange={(e) => {
                  handleChange(e);
                  notifyIdentity(values.countryCode, e.target.value);
                }}
                onBlur={handleBlur}
                error={touched.permitType && Boolean(errors.permitType)}
                helperText={
                  (touched.permitType && errors.permitType) ||
                  'The official name of the pass or permit.'
                }
                fullWidth
              />

              <TextField
                required
                label="Title"
                name="title"
                placeholder="e.g. Singapore Employment Pass"
                value={values.title}
                onChange={handleChange}
                onBlur={handleBlur}
                error={touched.title && Boolean(errors.title)}
                helperText={
                  (touched.title && errors.title) || 'How staff will find this record in search.'
                }
                fullWidth
              />

              <TextField
                required
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
                  notifyIdentity(code, values.permitType);
                }}
                onBlur={handleBlur}
                error={touched.countryCode && Boolean(errors.countryCode)}
                helperText={
                  (touched.countryCode && errors.countryCode) ||
                  'Selecting a country fills in its currency.'
                }
                fullWidth
              >
                {COUNTRIES.map((c) => (
                  <MenuItem key={c.code} value={c.code}>
                    {c.flag} {c.name}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                label="Permit Holder Name"
                name="permitHolderName"
                placeholder="e.g. John Tan"
                value={values.permitHolderName}
                onChange={handleChange}
                onBlur={handleBlur}
                error={touched.permitHolderName && Boolean(errors.permitHolderName)}
                helperText={
                  (touched.permitHolderName && errors.permitHolderName) ||
                  'Optional. Helps staff identify and search for the permit holder.'
                }
                inputProps={{ maxLength: 200 }}
                fullWidth
              />

              <TextField
                label="Company / Client Name"
                name="clientCompanyName"
                placeholder="e.g. Company ABZ"
                value={values.clientCompanyName}
                onChange={handleChange}
                onBlur={handleBlur}
                error={touched.clientCompanyName && Boolean(errors.clientCompanyName)}
                helperText={
                  (touched.clientCompanyName && errors.clientCompanyName) ||
                  'Optional. A lightweight client reference, not a CRM record.'
                }
                inputProps={{ maxLength: 200 }}
                fullWidth
              />
            </FormSection>

            <FormSection
              icon={DescriptionOutlinedIcon}
              title="Permit Details"
              description="Describe the permit and who is eligible to apply."
            >
              <TextField
                label="Description"
                name="description"
                value={values.description}
                onChange={handleChange}
                onBlur={handleBlur}
                error={touched.description && Boolean(errors.description)}
                helperText={
                  (touched.description && errors.description) ||
                  'A short summary a colleague could read aloud to a client.'
                }
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
                helperText={
                  (touched.eligibilityCriteria && errors.eligibilityCriteria) ||
                  'Salary thresholds, qualifications, and employer conditions.'
                }
                multiline
                minRows={3}
                fullWidth
                sx={{ gridColumn: { sm: '1 / span 2' } }}
              />
            </FormSection>

            <FormSection
              icon={PaidOutlinedIcon}
              title="Processing and Fees"
              description="Timelines and government costs associated with this permit."
            >
              <TextField
                type="number"
                label="Processing Time (days)"
                name="processingTimeDays"
                value={values.processingTimeDays}
                onChange={handleChange}
                onBlur={handleBlur}
                error={touched.processingTimeDays && Boolean(errors.processingTimeDays)}
                helperText={
                  (touched.processingTimeDays && errors.processingTimeDays) ||
                  'Typical time from submission to decision.'
                }
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
                helperText={
                  (touched.validityMonths && errors.validityMonths) ||
                  'How long the permit lasts before renewal.'
                }
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
                helperText={
                  (touched.governmentFee && errors.governmentFee) ||
                  'Official fee only — exclude agent or service costs.'
                }
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
                helperText={
                  (touched.currencyCode && errors.currencyCode) || 'Three-letter ISO 4217 code.'
                }
                fullWidth
              />
            </FormSection>

            <FormSection
              icon={LockOutlinedIcon}
              title="Classification and Access"
              description="Who this permit applies to and who may view it."
            >
              <TextField
                required
                select
                label="Worker Type"
                name="workerType"
                value={values.workerType}
                onChange={handleChange}
                onBlur={handleBlur}
                error={touched.workerType && Boolean(errors.workerType)}
                helperText={
                  (touched.workerType && errors.workerType) ||
                  'Local, foreign worker, expatriate, or all employees.'
                }
                fullWidth
              >
                {WORKER_TYPES.map((wt) => (
                  <MenuItem key={wt} value={wt}>
                    {WORKER_TYPE_LABELS[wt]}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                required
                select
                label="Visibility"
                name="visibility"
                value={values.visibility}
                onChange={handleChange}
                onBlur={handleBlur}
                error={touched.visibility && Boolean(errors.visibility)}
                helperText={
                  (touched.visibility && errors.visibility) ||
                  'Client Shareable means staff may relay this to a client.'
                }
                fullWidth
              >
                {VISIBILITY_LEVELS.map((v) => (
                  <MenuItem key={v} value={v}>
                    {VISIBILITY_LABELS[v]}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                required
                select
                label="Status"
                name="status"
                value={values.status}
                onChange={handleChange}
                onBlur={handleBlur}
                error={touched.status && Boolean(errors.status)}
                helperText={
                  (touched.status && errors.status) ||
                  'Use the Archive action on the permit to set Archived.'
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

            <FormSection
              icon={LinkOutlinedIcon}
              title="Source Information"
              description="Reference link for this permit's official source."
            >
              <TextField
                label="Source URL"
                name="sourceUrl"
                placeholder="https://..."
                value={values.sourceUrl}
                onChange={handleChange}
                onBlur={handleBlur}
                error={touched.sourceUrl && Boolean(errors.sourceUrl)}
                helperText={
                  (touched.sourceUrl && errors.sourceUrl) ||
                  'Link to the government page this record was built from.'
                }
                fullWidth
                sx={{ gridColumn: { sm: '1 / span 2' } }}
              />
            </FormSection>

            <FormSection
              icon={HealthAndSafetyOutlinedIcon}
              title="Review and Information Health"
              description="When this permit was last verified, and when it should be checked again."
              collapsible
              defaultOpen={false}
            >
              <TextField
                type="date"
                label="Last Reviewed"
                name="lastReviewedAt"
                value={values.lastReviewedAt}
                onChange={handleChange}
                onBlur={handleBlur}
                error={touched.lastReviewedAt && Boolean(errors.lastReviewedAt)}
                helperText={
                  (touched.lastReviewedAt && errors.lastReviewedAt) ||
                  'When this record was last checked against its source.'
                }
                slotProps={{ inputLabel: { shrink: true } }}
                fullWidth
              />

              <TextField
                type="date"
                label="Next Review Due"
                name="nextReviewAt"
                value={values.nextReviewAt}
                onChange={handleChange}
                onBlur={handleBlur}
                error={touched.nextReviewAt && Boolean(errors.nextReviewAt)}
                helperText={
                  (touched.nextReviewAt && errors.nextReviewAt) ||
                  'Permits are flagged 30 days before this date.'
                }
                slotProps={{ inputLabel: { shrink: true } }}
                fullWidth
              />

              <TextField
                select
                label="Information Status"
                name="informationStatus"
                value={values.informationStatus}
                onChange={handleChange}
                onBlur={handleBlur}
                error={touched.informationStatus && Boolean(errors.informationStatus)}
                helperText={
                  (touched.informationStatus && errors.informationStatus) ||
                  INFORMATION_STATUS_HELP[values.informationStatus]
                }
                fullWidth
              >
                {INFORMATION_STATUSES.map((s) => (
                  <MenuItem key={s} value={s}>
                    {INFORMATION_STATUS_LABELS[s]}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                label="Review Notes"
                name="reviewNotes"
                placeholder="What was checked, and against which source?"
                value={values.reviewNotes}
                onChange={handleChange}
                onBlur={handleBlur}
                error={touched.reviewNotes && Boolean(errors.reviewNotes)}
                helperText={touched.reviewNotes && errors.reviewNotes}
                multiline
                minRows={2}
                fullWidth
                sx={{ gridColumn: { sm: '1 / span 2' } }}
              />
            </FormSection>

            {/* ---- sticky action bar ----
                The form is long enough that a footer-anchored Save would mean
                scrolling past six sections to submit a one-field edit. */}
            <Paper
              variant="outlined"
              sx={{
                position: 'sticky',
                bottom: 0,
                zIndex: 2,
                p: 2,
                mt: 3,
                borderRadius: 2,
                boxShadow: 3,
                bgcolor: 'background.paper',
              }}
            >
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={2}
                sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' } }}
              >
                <Typography variant="body2" color="text.secondary">
                  {completion.score}% of permit information filled in
                </Typography>
                <Stack direction="row" spacing={2} sx={{ justifyContent: 'flex-end' }}>
                  <Button onClick={onCancel} disabled={isSubmitting}>
                    Cancel
                  </Button>
                  <Tooltip title="Required fields are marked with an asterisk">
                    <span>
                      <Button
                        type="submit"
                        variant="contained"
                        disabled={isSubmitting}
                        startIcon={
                          isSubmitting ? <CircularProgress size={16} color="inherit" /> : null
                        }
                      >
                        {isSubmitting ? 'Saving…' : submitLabel}
                      </Button>
                    </span>
                  </Tooltip>
                </Stack>
              </Stack>
            </Paper>
          </Form>
        );
      }}
    </Formik>
  );
}
