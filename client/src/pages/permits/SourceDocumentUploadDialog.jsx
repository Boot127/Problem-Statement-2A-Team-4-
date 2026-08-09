import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  Stack,
  Typography,
  Alert,
  Box,
  LinearProgress,
  CircularProgress,
} from '@mui/material';
import CloudUploadOutlinedIcon from '@mui/icons-material/CloudUploadOutlined';
import InsertDriveFileOutlinedIcon from '@mui/icons-material/InsertDriveFileOutlined';
import { SOURCE_TYPES, SOURCE_TYPE_LABELS } from '../../utils/enums';
import { formatFileSize, ACCEPTED_UPLOAD_TYPES, MAX_UPLOAD_MB } from './sourceDocumentFormat';

// Upload / replace dialog for a permit's source documents.
//
// `mode` is 'upload' (new record) or 'replace' (swap the file behind an
// existing record, keeping its id and metadata). Replace hides the metadata
// fields because those are edited separately.
export default function SourceDocumentUploadDialog({
  open,
  mode = 'upload',
  target,
  errorMessage,
  onSubmit,
  onClose,
}) {
  const [file, setFile] = useState(null);
  const [description, setDescription] = useState(target?.description || '');
  const [sourceType, setSourceType] = useState(target?.sourceType || 'OFFICIAL_GUIDE');
  const [progress, setProgress] = useState(null);
  const [localError, setLocalError] = useState('');
  const isReplace = mode === 'replace';
  const isEdit = mode === 'edit';
  const needsFile = !isEdit;

  const reset = () => {
    setFile(null);
    setDescription('');
    setSourceType('OFFICIAL_GUIDE');
    setProgress(null);
    setLocalError('');
  };

  const handleClose = () => {
    if (progress !== null) return; // never close mid-upload
    reset();
    onClose();
  };

  // Client-side pre-checks. The server re-validates everything including the
  // file's actual bytes — this only saves the user a round trip.
  const handleFile = (chosen) => {
    setLocalError('');
    if (!chosen) return;
    const extension = chosen.name.slice(chosen.name.lastIndexOf('.')).toLowerCase();
    if (!ACCEPTED_UPLOAD_TYPES.includes(extension)) {
      setLocalError(`Only ${ACCEPTED_UPLOAD_TYPES.join(' and ')} files are accepted.`);
      setFile(null);
      return;
    }
    if (chosen.size === 0) {
      setLocalError('That file is empty.');
      setFile(null);
      return;
    }
    if (chosen.size > MAX_UPLOAD_MB * 1024 * 1024) {
      setLocalError(`File must be ${MAX_UPLOAD_MB} MB or smaller.`);
      setFile(null);
      return;
    }
    setFile(chosen);
  };

  const handleSubmit = async () => {
    if (needsFile && !file) {
      setLocalError('Choose a file to upload.');
      return;
    }
    setProgress(0);
    const ok = await onSubmit({ file, description, sourceType, onProgress: setProgress });
    setProgress(null);
    if (ok) reset();
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
      <DialogTitle>
        {isReplace
          ? 'Replace source document'
          : isEdit
            ? 'Edit source document details'
            : 'Upload a source document'}
      </DialogTitle>
      <DialogContent dividers>
        {(errorMessage || localError) && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {localError || errorMessage}
          </Alert>
        )}

        {isReplace && target && (
          <Alert severity="info" sx={{ mb: 2 }}>
            Replacing the file behind <strong>{target.fileName}</strong>. The record and its
            description are kept; only the file changes.
          </Alert>
        )}

        {!isEdit && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Attach the official {ACCEPTED_UPLOAD_TYPES.join(' or ')} this permit was built from, so
            colleagues can verify the content rather than trust it. Maximum {MAX_UPLOAD_MB} MB.
          </Typography>
        )}

        {/* The native input is visually hidden but still the real control, so
            keyboard focus and screen readers behave normally. */}
        {!isEdit && <Box
          component="label"
          htmlFor="source-document-file"
          sx={{
            display: 'block',
            border: '2px dashed',
            borderColor: file ? 'primary.main' : 'divider',
            borderRadius: 2,
            p: 3,
            textAlign: 'center',
            cursor: 'pointer',
            bgcolor: file ? 'action.hover' : 'transparent',
            '&:hover': { borderColor: 'primary.light' },
            '&:focus-within': { outline: '2px solid', outlineColor: 'primary.main' },
          }}
        >
          <input
            id="source-document-file"
            type="file"
            accept={ACCEPTED_UPLOAD_TYPES.join(',')}
            onChange={(e) => handleFile(e.target.files?.[0])}
            style={{
              position: 'absolute',
              width: 1,
              height: 1,
              opacity: 0,
              overflow: 'hidden',
            }}
          />
          {file ? (
            <Stack spacing={0.5} sx={{ alignItems: 'center' }}>
              <InsertDriveFileOutlinedIcon color="primary" />
              <Typography variant="subtitle2" fontWeight={700}>
                {file.name}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {formatFileSize(file.size)} · click to choose a different file
              </Typography>
            </Stack>
          ) : (
            <Stack spacing={0.5} sx={{ alignItems: 'center' }}>
              <CloudUploadOutlinedIcon sx={{ color: 'text.disabled' }} />
              <Typography variant="subtitle2" fontWeight={700}>
                Choose a file
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {ACCEPTED_UPLOAD_TYPES.join(' or ')} · up to {MAX_UPLOAD_MB} MB
              </Typography>
            </Stack>
          )}
        </Box>}

        {!isReplace && (
          <Stack spacing={2.5} sx={{ mt: 3 }}>
            <TextField
              select
              label="Source Type"
              value={sourceType}
              onChange={(e) => setSourceType(e.target.value)}
              helperText="What kind of document this is."
              fullWidth
            >
              {SOURCE_TYPES.map((s) => (
                <MenuItem key={s} value={s}>
                  {SOURCE_TYPE_LABELS[s]}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              label="Description"
              placeholder="e.g. MOM Employment Pass guide, retrieved August 2026"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              helperText="Optional. Which edition or date this document is."
              multiline
              minRows={2}
              fullWidth
            />
          </Stack>
        )}

        {progress !== null && !isEdit && (
          <Box sx={{ mt: 3 }} aria-live="polite">
            <Typography variant="caption" color="text.secondary">
              Uploading… {progress}%
            </Typography>
            <LinearProgress variant="determinate" value={progress} sx={{ mt: 0.5 }} />
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={handleClose} disabled={progress !== null}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={progress !== null || (needsFile && !file)}
          startIcon={progress !== null ? <CircularProgress size={16} color="inherit" /> : null}
        >
          {progress !== null
            ? isEdit
              ? 'Saving…'
              : 'Uploading…'
            : isReplace
              ? 'Replace File'
              : isEdit
                ? 'Save Details'
                : 'Upload'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
