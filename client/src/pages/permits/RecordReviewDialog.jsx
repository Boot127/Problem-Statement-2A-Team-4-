import { Formik, Form } from 'formik';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Button,
  Stack,
  Alert,
  Typography,
  CircularProgress,
} from '@mui/material';
import { reviewValidationSchema } from './permitValidation';
import {
  INFORMATION_STATUSES,
  INFORMATION_STATUS_LABELS,
  INFORMATION_STATUS_HELP,
} from '../../utils/enums';

const today = () => new Date().toISOString().slice(0, 10);

// Records a compliance review against a permit (improvement plan Section 10.2).
// Separate from the main edit form because recording a review is a distinct,
// frequent action that shouldn't require opening and re-saving the whole permit.
export default function RecordReviewDialog({ open, permit, errorMessage, onSubmit, onClose }) {
  const initialValues = {
    reviewedOn: today(),
    // Blank means "let the server apply the standard 6-month cadence".
    nextReviewAt: '',
    reviewNotes: permit?.reviewNotes || '',
    informationStatus: 'CURRENT',
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <Formik
        initialValues={initialValues}
        validationSchema={reviewValidationSchema}
        enableReinitialize
        onSubmit={onSubmit}
      >
        {({ values, errors, touched, handleChange, handleBlur, isSubmitting }) => (
          <Form noValidate>
            <DialogTitle>Record a review</DialogTitle>
            <DialogContent dividers>
              {errorMessage && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {errorMessage}
                </Alert>
              )}
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
                Confirm you have checked this permit against its official source. Leave the next
                review date blank to schedule it six months from the review date.
              </Typography>

              <Stack spacing={2.5}>
                <TextField
                  type="date"
                  label="Reviewed on"
                  name="reviewedOn"
                  value={values.reviewedOn}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  error={touched.reviewedOn && Boolean(errors.reviewedOn)}
                  helperText={touched.reviewedOn && errors.reviewedOn}
                  slotProps={{ inputLabel: { shrink: true } }}
                  fullWidth
                />

                <TextField
                  type="date"
                  label="Next review due"
                  name="nextReviewAt"
                  value={values.nextReviewAt}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  error={touched.nextReviewAt && Boolean(errors.nextReviewAt)}
                  helperText={
                    (touched.nextReviewAt && errors.nextReviewAt) ||
                    'Optional — defaults to six months after the review date.'
                  }
                  slotProps={{ inputLabel: { shrink: true } }}
                  fullWidth
                />

                <TextField
                  select
                  label="Information status"
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
                  label="Review notes"
                  name="reviewNotes"
                  placeholder="What did you check, and against which source?"
                  value={values.reviewNotes}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  error={touched.reviewNotes && Boolean(errors.reviewNotes)}
                  helperText={touched.reviewNotes && errors.reviewNotes}
                  multiline
                  minRows={3}
                  fullWidth
                />
              </Stack>
            </DialogContent>
            <DialogActions sx={{ px: 3, py: 2 }}>
              <Button onClick={onClose} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="contained"
                disabled={isSubmitting}
                startIcon={isSubmitting ? <CircularProgress size={16} color="inherit" /> : null}
              >
                {isSubmitting ? 'Saving…' : 'Save Review'}
              </Button>
            </DialogActions>
          </Form>
        )}
      </Formik>
    </Dialog>
  );
}
