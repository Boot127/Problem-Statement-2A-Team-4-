import { useCallback, useEffect, useState } from 'react';
import {
  Box,
  Paper,
  Stack,
  Typography,
  Button,
  Chip,
  IconButton,
  Tooltip,
  Alert,
  Divider,
  Skeleton,
  CircularProgress,
} from '@mui/material';
import UploadFileOutlinedIcon from '@mui/icons-material/UploadFileOutlined';
import PictureAsPdfOutlinedIcon from '@mui/icons-material/PictureAsPdfOutlined';
import ArticleOutlinedIcon from '@mui/icons-material/ArticleOutlined';
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import SwapHorizOutlinedIcon from '@mui/icons-material/SwapHorizOutlined';
import ArchiveOutlinedIcon from '@mui/icons-material/ArchiveOutlined';
import UnarchiveOutlinedIcon from '@mui/icons-material/UnarchiveOutlined';
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';
import AutoAwesomeOutlinedIcon from '@mui/icons-material/AutoAwesomeOutlined';
import DifferenceOutlinedIcon from '@mui/icons-material/DifferenceOutlined';
import FolderOffOutlinedIcon from '@mui/icons-material/FolderOffOutlined';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import SourceDocumentUploadDialog from './SourceDocumentUploadDialog';
import PermitExtractionDialog from './PermitExtractionDialog';
import PermitChangeReviewDialog from './PermitChangeReviewDialog';
import permitService from '../../api/permitService';
import { getApiErrorMessage } from '../../utils/apiError';
import { SOURCE_TYPE_LABELS } from '../../utils/enums';
import { formatFileSize, formatUploadDate, fileKind } from './sourceDocumentFormat';

// Source Documents section on the permit detail page (improvement plan 7.5).
//
// Owns its own data because uploads are multipart and don't fit the JSON detail
// response. It calls onChanged() after mutations so the parent can refresh the
// completeness score, which counts an attached source document.

function DocumentRow({ doc, busy, onDownload, onExtract, onCompare, onEdit, onReplace, onArchive, onRestore, onDelete }) {
  const archived = doc.status === 'ARCHIVED';
  const Icon = fileKind(doc.fileName) === 'PDF' ? PictureAsPdfOutlinedIcon : ArticleOutlinedIcon;

  return (
    <Paper
      component="li"
      variant="outlined"
      sx={{
        p: 2,
        borderColor: 'divider',
        opacity: archived ? 0.65 : 1,
        bgcolor: archived ? 'action.hover' : 'background.paper',
      }}
    >
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1.5}
        sx={{ justifyContent: 'space-between', alignItems: { sm: 'flex-start' } }}
      >
        <Stack direction="row" spacing={1.5} sx={{ minWidth: 0, alignItems: 'flex-start' }}>
          <Icon color={archived ? 'disabled' : 'error'} sx={{ mt: 0.25 }} />
          <Box sx={{ minWidth: 0 }}>
            <Stack
              direction="row"
              spacing={1}
              sx={{ alignItems: 'center', flexWrap: 'wrap', rowGap: 0.5 }}
            >
              <Typography variant="subtitle2" fontWeight={700} sx={{ wordBreak: 'break-word' }}>
                {doc.fileName}
              </Typography>
              <Chip size="small" variant="outlined" label={SOURCE_TYPE_LABELS[doc.sourceType] || doc.sourceType} />
              {archived && <Chip size="small" label="Archived" />}
            </Stack>
            {doc.description && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                {doc.description}
              </Typography>
            )}
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
              {formatFileSize(doc.fileSize)} · uploaded {formatUploadDate(doc.uploadedAt)}
            </Typography>
          </Box>
        </Stack>

        <Stack direction="row" spacing={0.25} sx={{ flexShrink: 0, color: 'text.secondary' }}>
          {!archived && (
            <Tooltip title="Extract permit suggestions">
              <span><IconButton size="small" disabled={busy} onClick={() => onExtract(doc)} aria-label={`Extract permit suggestions from ${doc.fileName}`}><AutoAwesomeOutlinedIcon fontSize="small" /></IconButton></span>
            </Tooltip>
          )}
          {!archived && (
            <Tooltip title="Check for changes">
              <span><IconButton size="small" disabled={busy} onClick={() => onCompare(doc)} aria-label={`Check ${doc.fileName} for changes`}><DifferenceOutlinedIcon fontSize="small" /></IconButton></span>
            </Tooltip>
          )}
          <Tooltip title="Download">
            <span>
              <IconButton
                size="small"
                onClick={() => onDownload(doc)}
                aria-label={`Download ${doc.fileName}`}
              >
                <DownloadOutlinedIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="Edit details">
            <span>
              <IconButton
                size="small"
                disabled={busy}
                onClick={() => onEdit(doc)}
                aria-label={`Edit details for ${doc.fileName}`}
              >
                <EditOutlinedIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
          {!archived && (
            <Tooltip title="Replace file">
              <span>
                <IconButton
                  size="small"
                  disabled={busy}
                  onClick={() => onReplace(doc)}
                  aria-label={`Replace the file for ${doc.fileName}`}
                >
                  <SwapHorizOutlinedIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
          )}
          {archived ? (
            <Tooltip title="Restore">
              <span>
                <IconButton
                  size="small"
                  disabled={busy}
                  onClick={() => onRestore(doc)}
                  aria-label={`Restore ${doc.fileName}`}
                >
                  <UnarchiveOutlinedIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
          ) : (
            <Tooltip title="Archive">
              <span>
                <IconButton
                  size="small"
                  disabled={busy}
                  onClick={() => onArchive(doc)}
                  aria-label={`Archive ${doc.fileName}`}
                >
                  <ArchiveOutlinedIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
          )}
          {/* Delete is only offered once archived, so destroying provenance is
              always a deliberate two-step action. */}
          {archived && (
            <Tooltip title="Delete permanently">
              <span>
                <IconButton
                  size="small"
                  color="error"
                  disabled={busy}
                  onClick={() => onDelete(doc)}
                  aria-label={`Permanently delete ${doc.fileName}`}
                >
                  <DeleteOutlineOutlinedIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
          )}
        </Stack>
      </Stack>
    </Paper>
  );
}

export default function SourceDocumentsPanel({ permitId, onChanged, compact = false, embedded = false, aiAssisted = false }) {
  const [documents, setDocuments] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [uploadDialog, setUploadDialog] = useState(null); // { mode, target } | null
  const [uploadError, setUploadError] = useState('');
  const [success, setSuccess] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [extractionTarget, setExtractionTarget] = useState(null);
  const [changeTarget, setChangeTarget] = useState(null);

  const fetchDocuments = useCallback(
    () =>
      permitService
        .listSourceDocuments(permitId)
        .then((data) => {
          setDocuments(data);
          setError('');
        })
        .catch((err) => {
          setError(getApiErrorMessage(err));
          setDocuments((current) => current ?? []);
        })
        .finally(() => setLoading(false)),
    [permitId]
  );

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  // Mutations refresh this panel AND ask the parent to reload, because an
  // attached source document changes the permit's completeness score.
  const run = async (action, { onError, successMessage } = {}) => {
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      await action();
      await fetchDocuments();
      if (onChanged) await onChanged();
      if (successMessage) setSuccess(successMessage);
      return true;
    } catch (err) {
      const message = getApiErrorMessage(err);
      if (onError) onError(message);
      else setError(message);
      return false;
    } finally {
      setBusy(false);
    }
  };

  const handleUpload = ({ file, description, sourceType, onProgress }) => {
    setUploadError('');
    return run(
      () =>
        uploadDialog.mode === 'edit'
          ? permitService.updateSourceDocument(permitId, uploadDialog.target.id, {
              description,
              sourceType,
            })
          : uploadDialog.mode === 'replace'
          ? permitService.replaceSourceDocumentFile(permitId, uploadDialog.target.id, file, {
              onProgress,
            })
          : permitService.uploadSourceDocument(permitId, file, {
              description,
              sourceType,
              onProgress,
            }),
      {
        onError: setUploadError,
        successMessage:
          uploadDialog.mode === 'edit'
            ? 'Source document details updated.'
            : uploadDialog.mode === 'replace'
              ? 'Source document file replaced.'
              : 'Source document uploaded.',
      }
    ).then((ok) => {
      if (ok) setUploadDialog(null);
      return ok;
    });
  };

  // Fetched as an authenticated XHR rather than a plain navigation: the
  // endpoint requires a token now, which window.open would not send. Not
  // routed through `run` because a download changes nothing — refetching the
  // list and notifying the parent afterwards would be pointless work.
  const handleDownload = async (doc) => {
    setError('');
    try {
      await permitService.downloadSourceDocument(permitId, doc.id, doc.fileName);
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  };

  const activeCount = documents?.filter((d) => d.status === 'ACTIVE').length ?? 0;
  const archivedCount = documents?.filter((d) => d.status === 'ARCHIVED').length ?? 0;

  return (
    <Paper variant={embedded ? undefined : 'outlined'} elevation={embedded ? 0 : undefined} sx={{ p: embedded ? 0 : { xs: 2, sm: compact ? 2.5 : 3 }, mb: embedded ? 0 : 4 }}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' }, mb: 2 }}
      >
        <Box>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <UploadFileOutlinedIcon fontSize="small" color="primary" />
            <Typography variant="h6" fontWeight={700}>
              {compact ? 'Source Evidence' : 'Source Documents'}
            </Typography>
          </Stack>
          <Typography variant="body2" color="text.secondary">
            {documents === null
              ? 'Loading…'
              : activeCount === 0 && archivedCount === 0
                ? 'The official PDFs and Word documents this permit was built from.'
                : `${activeCount} active${archivedCount ? ` · ${archivedCount} archived` : ''}`}
          </Typography>
        </Box>
        <Button
          size="small"
          variant="outlined"
          startIcon={<UploadFileOutlinedIcon />}
          disabled={busy}
          onClick={() => {
            setUploadError('');
            setUploadDialog({ mode: 'upload', target: null });
          }}
        >
          Upload Document
        </Button>
      </Stack>

      <Divider sx={{ mb: 2 }} />

      {aiAssisted && (
        <Alert severity="info" icon={<AutoAwesomeOutlinedIcon />} sx={{ mb: 2 }}>
          AI-assisted extraction has contributed to this Draft. Accepted suggestions were human-reviewed and the source remains attached as evidence.
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      {loading && (
        <Stack spacing={1}>
          {[0, 1].map((i) => (
            <Skeleton key={i} variant="rounded" height={76} />
          ))}
        </Stack>
      )}

      {!loading && documents?.length === 0 && (
        <Stack
          spacing={1}
          sx={{
            alignItems: 'center',
            textAlign: 'center',
            py: 4,
            px: 2,
            border: '1px dashed',
            borderColor: 'divider',
            borderRadius: 2,
            bgcolor: 'action.hover',
          }}
        >
          <FolderOffOutlinedIcon sx={{ fontSize: 32, color: 'text.disabled' }} />
          <Typography variant="subtitle2" fontWeight={700}>
            No source documents attached
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 460 }}>
            Attach the official guide or circular this permit was built from, so colleagues can
            verify the information instead of trusting it.
          </Typography>
          <Button
            size="small"
            variant="outlined"
            disabled={busy}
            onClick={() => {
              setUploadError('');
              setUploadDialog({ mode: 'upload', target: null });
            }}
            sx={{ mt: 1 }}
          >
            Upload the first document
          </Button>
        </Stack>
      )}

      {!loading && documents?.length > 0 && (
        <Stack component="ul" aria-label="Source documents" spacing={1.25} sx={{ listStyle: 'none', m: 0, p: 0 }}>
          {documents.map((doc) => (
            <DocumentRow
              key={doc.id}
              doc={doc}
              busy={busy}
              onDownload={handleDownload}
              onExtract={setExtractionTarget}
              onCompare={setChangeTarget}
              onEdit={(d) => {
                setUploadError('');
                setUploadDialog({ mode: 'edit', target: d });
              }}
              onReplace={(d) => {
                setUploadError('');
                setUploadDialog({ mode: 'replace', target: d });
              }}
              onArchive={(d) =>
                run(() => permitService.archiveSourceDocument(permitId, d.id), {
                  successMessage: 'Source document archived.',
                })
              }
              onRestore={(d) =>
                run(() => permitService.restoreSourceDocument(permitId, d.id), {
                  successMessage: 'Source document restored.',
                })
              }
              onDelete={(d) => setDeleteTarget(d)}
            />
          ))}
        </Stack>
      )}

      {busy && (
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mt: 2 }} aria-live="polite">
          <CircularProgress size={16} />
          <Typography variant="caption" color="text.secondary">
            Saving…
          </Typography>
        </Stack>
      )}

      <SourceDocumentUploadDialog
        key={uploadDialog ? `${uploadDialog.mode}-${uploadDialog.target?.id || 'new'}` : 'closed'}
        open={Boolean(uploadDialog)}
        mode={uploadDialog?.mode}
        target={uploadDialog?.target}
        errorMessage={uploadError}
        onSubmit={handleUpload}
        onClose={() => setUploadDialog(null)}
      />

      {extractionTarget && (
        <PermitExtractionDialog
          open
          permitId={permitId}
          document={extractionTarget}
          onClose={() => setExtractionTarget(null)}
          onSaved={async () => {
            setSuccess('Reviewed extraction saved as Draft.');
            await fetchDocuments();
            if (onChanged) await onChanged();
          }}
        />
      )}

      {changeTarget && (
        <PermitChangeReviewDialog
          open
          permitId={permitId}
          document={changeTarget}
          onClose={() => setChangeTarget(null)}
          onSaved={async () => {
            setSuccess('Accepted source changes saved as Draft.');
            await fetchDocuments();
            if (onChanged) await onChanged();
          }}
        />
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Permanently delete this source document?"
        message={
          deleteTarget
            ? `"${deleteTarget.fileName}" and its stored file will be removed for good. This cannot be undone — restoring it from the archive is usually the safer choice.`
            : ''
        }
        confirmLabel="Delete Permanently"
        confirmColor="error"
        onConfirm={async () => {
          await run(() => permitService.deleteSourceDocument(permitId, deleteTarget.id), {
            successMessage: 'Source document permanently deleted.',
          });
          setDeleteTarget(null);
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </Paper>
  );
}
