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
  FormControlLabel,
  Switch,
} from '@mui/material';
import { documentValidationSchema, emptyDocument } from './permitValidation';
import { PROCESS_TYPE_LABELS } from '../../utils/enums';

// Add/edit dialog for a single required-document checklist item.
export default function DocumentFormDialog({
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
        initialValues={initialValues ? { ...emptyDocument, ...initialValues } : emptyDocument}
        validationSchema={documentValidationSchema}
        enableReinitialize
        onSubmit={onSubmit}
      >
        {({ values, errors, touched, handleChange, handleBlur, setFieldValue, isSubmitting }) => (
          <Form noValidate>
            <DialogTitle>
              {isEdit ? 'Edit Required Document' : 'Add Required Document'}
              {` — ${PROCESS_TYPE_LABELS[processType]}`}
            </DialogTitle>
            <DialogContent>
              <Stack spacing={2.5} sx={{ mt: 1 }}>
                {errorMessage && <Alert severity="error">{errorMessage}</Alert>}
                <TextField
                  autoFocus
                  label="Document Name"
                  name="documentName"
                  placeholder="e.g. Passport copy (valid 6+ months)"
                  value={values.documentName}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  error={touched.documentName && Boolean(errors.documentName)}
                  helperText={touched.documentName && errors.documentName}
                  fullWidth
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={Boolean(values.isMandatory)}
                      onChange={(e) => setFieldValue('isMandatory', e.target.checked)}
                      name="isMandatory"
                    />
                  }
                  label={values.isMandatory ? 'Mandatory document' : 'Optional document'}
                />
                <TextField
                  label="Notes"
                  name="notes"
                  placeholder="e.g. Must be certified as a true copy"
                  value={values.notes}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  error={touched.notes && Boolean(errors.notes)}
                  helperText={touched.notes && errors.notes}
                  multiline
                  minRows={2}
                  fullWidth
                />
              </Stack>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
              <Button onClick={onClose} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" variant="contained" disabled={isSubmitting}>
                {isSubmitting ? 'Saving…' : isEdit ? 'Save Document' : 'Add Document'}
              </Button>
            </DialogActions>
          </Form>
        )}
      </Formik>
    </Dialog>
  );
}
