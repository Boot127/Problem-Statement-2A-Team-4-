import { Formik, Form } from 'formik';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Stack,
  Alert,
} from '@mui/material';
import { stepValidationSchema, emptyStep } from './permitValidation';
import { PROCESS_TYPE_LABELS } from '../../utils/enums';

// Add/edit dialog for a single process step. `initialValues` is null when
// adding; pass the existing step to edit it.
export default function StepFormDialog({
  open,
  processType,
  initialValues,
  errorMessage,
  onSubmit,
  onClose,
}) {
  const isEdit = Boolean(initialValues);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <Formik
        initialValues={initialValues ? { ...emptyStep, ...initialValues } : emptyStep}
        validationSchema={stepValidationSchema}
        enableReinitialize
        onSubmit={onSubmit}
      >
        {({ values, errors, touched, handleChange, handleBlur, isSubmitting }) => (
          <Form noValidate>
            <DialogTitle>
              {isEdit ? 'Edit Process Step' : 'Add Process Step'}
              {` — ${PROCESS_TYPE_LABELS[processType]}`}
            </DialogTitle>
            <DialogContent>
              <Stack spacing={2.5} sx={{ mt: 1 }}>
                {errorMessage && <Alert severity="error">{errorMessage}</Alert>}
                <TextField
                  autoFocus
                  label="Step Title"
                  name="stepTitle"
                  placeholder="e.g. Submit application to the ministry"
                  value={values.stepTitle}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  error={touched.stepTitle && Boolean(errors.stepTitle)}
                  helperText={touched.stepTitle && errors.stepTitle}
                  fullWidth
                />
                <TextField
                  label="Step Detail"
                  name="stepDetail"
                  value={values.stepDetail}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  error={touched.stepDetail && Boolean(errors.stepDetail)}
                  helperText={touched.stepDetail && errors.stepDetail}
                  multiline
                  minRows={3}
                  fullWidth
                />
                <TextField
                  label="Expected Timeline"
                  name="expectedTimeline"
                  placeholder="e.g. 15 working days"
                  value={values.expectedTimeline}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  error={touched.expectedTimeline && Boolean(errors.expectedTimeline)}
                  helperText={touched.expectedTimeline && errors.expectedTimeline}
                  fullWidth
                />
              </Stack>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
              <Button onClick={onClose} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" variant="contained" disabled={isSubmitting}>
                {isSubmitting ? 'Saving…' : isEdit ? 'Save Step' : 'Add Step'}
              </Button>
            </DialogActions>
          </Form>
        )}
      </Formik>
    </Dialog>
  );
}
