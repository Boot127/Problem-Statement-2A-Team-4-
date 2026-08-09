import { useState } from 'react';
import {
  Box,
  Paper,
  Tabs,
  Tab,
  Typography,
  Stack,
  Divider,
  Button,
  Alert,
  CircularProgress,
} from '@mui/material';
import ChecklistOutlinedIcon from '@mui/icons-material/ChecklistOutlined';
import FormatListNumberedOutlinedIcon from '@mui/icons-material/FormatListNumberedOutlined';
import AddIcon from '@mui/icons-material/Add';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import StepFormDialog from './StepFormDialog';
import DocumentFormDialog from './DocumentFormDialog';
import ProcessStepTimeline from './ProcessStepTimeline';
import DocumentChecklist from './DocumentChecklist';
import TemplateCompletenessPanel from './TemplateCompletenessPanel';
import permitService from '../../api/permitService';
import { getApiErrorMessage } from '../../utils/apiError';
import { PROCESS_TYPES, PROCESS_TYPE_LABELS } from '../../utils/enums';
import { summariseProcess, formatTimelineEstimate } from './processSummary';

// Process steps and required-document checklist for one permit, grouped by
// process type (New / Renewal / Cancellation) per FR-2.3 / FR-2.4 / FR-2.5.
// Handles its own add/edit/delete/reorder calls and asks the parent to reload
// via onChanged() so the detail page stays the single source of truth.

// Empty state with a direct call to action — a blank panel gives the user
// nothing to do, which is the state most permits start in.
function EmptyState({ icon: Icon, title, description, actionLabel, onAction, disabled, onExtract }) {
  return (
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
      <Icon sx={{ fontSize: 32, color: 'text.disabled' }} />
      <Typography variant="subtitle2" fontWeight={700}>
        {title}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 420 }}>
        {description}
      </Typography>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mt: 1 }}>
        <Button size="small" variant="contained" onClick={onAction} disabled={disabled}>
          {actionLabel}
        </Button>
        {onExtract && (
          <Button size="small" variant="outlined" onClick={onExtract} disabled={disabled}>
            Extract From Source
          </Button>
        )}
      </Stack>
    </Stack>
  );
}

// Section heading shared by the steps and documents halves of a panel.
function SectionHeading({ icon: Icon, title, description, actionLabel, onAction, disabled }) {
  return (
    <>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1}
        sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' } }}
      >
        <Box>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <Icon fontSize="small" color="primary" />
            <Typography variant="subtitle1" fontWeight={700}>
              {title}
            </Typography>
          </Stack>
          <Typography variant="body2" color="text.secondary">
            {description}
          </Typography>
        </Box>
        <Button
          size="small"
          variant="outlined"
          startIcon={<AddIcon />}
          disabled={disabled}
          onClick={onAction}
        >
          {actionLabel}
        </Button>
      </Stack>
      <Divider sx={{ my: 2 }} />
    </>
  );
}

export default function PermitProcessTabs({
  permitId,
  steps,
  documents,
  onChanged,
  fixedProcessType,
  onExtractFromSource,
}) {
  const [activeTab, setActiveTab] = useState(0);
  const activeType = fixedProcessType || PROCESS_TYPES[activeTab];

  // busy blocks every mutating control while a request is in flight, which
  // also prevents duplicate submissions from double-clicks.
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const [stepDialog, setStepDialog] = useState(null); // { step } | { step: null }
  const [stepDialogError, setStepDialogError] = useState('');
  const [documentDialog, setDocumentDialog] = useState(null);
  const [documentDialogError, setDocumentDialogError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null); // { kind, item }

  // The API always returns all three keys; default defensively anyway.
  const activeSteps = steps?.[activeType] ?? [];
  const activeDocuments = documents?.[activeType] ?? [];
  const summary = summariseProcess(activeSteps, activeDocuments);
  const timelineEstimate = formatTimelineEstimate(summary.timeline);

  // Runs a mutation, surfaces failures instead of failing silently, and
  // refreshes the parent on success.
  const run = async (action, { onError } = {}) => {
    setBusy(true);
    setError('');
    try {
      await action();
      await onChanged();
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

  const handleStepSubmit = async (values, { setSubmitting }) => {
    setStepDialogError('');
    const payload = { ...values, processType: activeType };
    const ok = await run(
      () =>
        stepDialog.step
          ? permitService.updateStep(permitId, stepDialog.step.id, payload)
          : permitService.createStep(permitId, payload),
      { onError: setStepDialogError }
    );
    setSubmitting(false);
    if (ok) setStepDialog(null);
  };

  const handleDocumentSubmit = async (values, { setSubmitting }) => {
    setDocumentDialogError('');
    const payload = { ...values, processType: activeType };
    const ok = await run(
      () =>
        documentDialog.document
          ? permitService.updateDocument(permitId, documentDialog.document.id, payload)
          : permitService.createDocument(permitId, payload),
      { onError: setDocumentDialogError }
    );
    setSubmitting(false);
    if (ok) setDocumentDialog(null);
  };

  const handleDelete = async () => {
    const { kind, item } = deleteTarget;
    await run(() =>
      kind === 'step'
        ? permitService.deleteStep(permitId, item.id)
        : permitService.deleteDocument(permitId, item.id)
    );
    setDeleteTarget(null);
  };

  // Duplicate appends a copy at the end of the current process type; the API
  // assigns the next stepNumber/sortOrder itself.
  const duplicateStep = (step) =>
    run(() =>
      permitService.createStep(permitId, {
        processType: activeType,
        stepTitle: `${step.stepTitle} (copy)`.slice(0, 200),
        stepDetail: step.stepDetail,
        expectedTimeline: step.expectedTimeline,
      })
    );

  const duplicateDocument = (doc) =>
    run(() =>
      permitService.createDocument(permitId, {
        processType: activeType,
        documentName: `${doc.documentName} (copy)`.slice(0, 200),
        isMandatory: doc.isMandatory,
        notes: doc.notes,
      })
    );

  // Inline mandatory/optional flip — the most common checklist edit, so it
  // shouldn't require opening the dialog.
  const toggleMandatory = (doc) =>
    run(() =>
      permitService.updateDocument(permitId, doc.id, {
        processType: activeType,
        documentName: doc.documentName,
        isMandatory: !doc.isMandatory,
        notes: doc.notes,
      })
    );

  // Swaps two entries and sends the full ordered id list, which is what the
  // reorder endpoints require.
  const moveStep = (from, to) => {
    const ids = activeSteps.map((s) => s.id);
    [ids[from], ids[to]] = [ids[to], ids[from]];
    run(() => permitService.reorderSteps(permitId, activeType, ids));
  };

  const moveDocument = (from, to) => {
    const ids = activeDocuments.map((d) => d.id);
    [ids[from], ids[to]] = [ids[to], ids[from]];
    run(() => permitService.reorderDocuments(permitId, activeType, ids));
  };

  const openAddStep = () => {
    setStepDialogError('');
    setStepDialog({ step: null });
  };

  const openAddDocument = () => {
    setDocumentDialogError('');
    setDocumentDialog({ document: null });
  };

  return (
    <Paper variant="outlined" sx={{ mb: 3, overflow: 'hidden' }}>
      {!fixedProcessType && <Tabs
        value={activeTab}
        onChange={(_e, next) => {
          setActiveTab(next);
          setError('');
        }}
        variant="scrollable"
        scrollButtons="auto"
        allowScrollButtonsMobile
        aria-label="Permit process types"
        sx={{
          bgcolor: 'background.paper',
          p: 1,
          '& .MuiTabs-indicator': { display: 'none' },
          '& .MuiTab-root': {
            textTransform: 'none',
            minHeight: 76,
            minWidth: { xs: 190, sm: 220 },
            alignItems: 'flex-start',
            border: 1,
            borderColor: 'divider',
            borderRadius: 2,
            mx: 0.5,
            px: 2,
          },
          '& .MuiTab-root.Mui-selected': {
            bgcolor: 'primary.main',
            color: 'primary.contrastText',
            borderColor: 'primary.main',
            boxShadow: 2,
          },
          '& .MuiTab-root.Mui-selected .MuiTypography-root': { color: 'inherit' },
        }}
      >
        {PROCESS_TYPES.map((type) => {
          const typeSteps = steps?.[type] ?? [];
          const typeDocuments = documents?.[type] ?? [];
          const s = summariseProcess(typeSteps, typeDocuments);
          // ✓ both flows present · ⚠ one half missing · ○ nothing recorded yet
          const StatusIcon = s.isComplete
            ? CheckCircleOutlinedIcon
            : s.isEmpty
              ? RadioButtonUncheckedIcon
              : WarningAmberOutlinedIcon;
          const statusColor = s.isComplete
            ? 'success.main'
            : s.isEmpty
              ? 'text.disabled'
              : 'warning.main';
          const statusText = s.isComplete
            ? 'complete'
            : s.isEmpty
              ? 'nothing recorded'
              : s.stepCount === 0
                ? 'no steps'
                : 'no documents';

          return (
            <Tab
              key={type}
              id={`process-tab-${type}`}
              aria-controls={`process-panel-${type}`}
              label={
                <Box sx={{ textAlign: 'left' }}>
                  <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
                    <StatusIcon sx={{ fontSize: 16, color: statusColor }} />
                    <Typography variant="body2" fontWeight={700}>
                      {PROCESS_TYPE_LABELS[type]}
                    </Typography>
                  </Stack>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    {s.stepCount} {s.stepCount === 1 ? 'step' : 'steps'} · {s.documentCount}{' '}
                    {s.documentCount === 1 ? 'document' : 'documents'}
                  </Typography>
                  {/* Screen readers get the indicator's meaning, not just its colour. */}
                  <Box component="span" sx={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>
                    {statusText}
                  </Box>
                </Box>
              }
            />
          );
        })}
      </Tabs>}

      <Box
        role="tabpanel"
        id={`process-panel-${activeType}`}
        aria-labelledby={fixedProcessType ? undefined : `process-tab-${activeType}`}
        aria-label={fixedProcessType ? `${PROCESS_TYPE_LABELS[activeType]} process workspace` : undefined}
        sx={{ p: { xs: 2, sm: 3 } }}
      >
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {!fixedProcessType && <Box sx={{ mb: 2 }}>
          <Typography variant="h5" component="h3" fontWeight={800}>
            {PROCESS_TYPE_LABELS[activeType]}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {summary.stepCount} {summary.stepCount === 1 ? 'Step' : 'Steps'} ·{' '}
            {summary.documentCount} Required {summary.documentCount === 1 ? 'Document' : 'Documents'} ·{' '}
            {timelineEstimate ? `Approx. ${timelineEstimate.replace('≈ ', '')}` : 'Timeline not recorded'}
          </Typography>
        </Box>}

        <TemplateCompletenessPanel steps={activeSteps} documents={activeDocuments} summary={summary} timelineEstimate={timelineEstimate} />

        {/* ---------- process steps ---------- */}
        <SectionHeading
          icon={FormatListNumberedOutlinedIcon}
          title="Process Steps"
          description={`Ordered steps for the ${PROCESS_TYPE_LABELS[activeType].toLowerCase()} process.`}
          actionLabel="Add Step"
          onAction={openAddStep}
          disabled={busy}
        />

        {activeSteps.length === 0 ? (
          <EmptyState
            icon={FormatListNumberedOutlinedIcon}
            title="No process steps yet"
            description={`Add the steps an applicant follows for the ${PROCESS_TYPE_LABELS[
              activeType
            ].toLowerCase()} process, in the order they happen.`}
            actionLabel="Add the first step"
            onAction={openAddStep}
            disabled={busy}
            onExtract={onExtractFromSource}
          />
        ) : (
          <ProcessStepTimeline
            steps={activeSteps}
            disabled={busy}
            onEdit={(step) => {
              setStepDialogError('');
              setStepDialog({ step });
            }}
            onDelete={(step) => setDeleteTarget({ kind: 'step', item: step })}
            onDuplicate={duplicateStep}
            onMove={moveStep}
          />
        )}

        {/* ---------- required documents ---------- */}
        <Box sx={{ mt: 4 }}>
          <SectionHeading
            icon={ChecklistOutlinedIcon}
            title="Required Documents"
            description={
              summary.documentCount > 0
                ? `${summary.documentCount} total · ${summary.mandatoryCount} mandatory · ${summary.optionalCount} optional`
                : `Checklist for the ${PROCESS_TYPE_LABELS[activeType].toLowerCase()} process.`
            }
            actionLabel="Add Document"
            onAction={openAddDocument}
            disabled={busy}
          />

          {activeDocuments.length === 0 ? (
            <EmptyState
              icon={ChecklistOutlinedIcon}
              title="No required documents yet"
              description="Build the checklist an applicant must supply. Mark each item mandatory or optional so staff know what is negotiable."
              actionLabel="Add the first document"
              onAction={openAddDocument}
              disabled={busy}
              onExtract={onExtractFromSource}
            />
          ) : (
            <DocumentChecklist
              documents={activeDocuments}
              disabled={busy}
              onEdit={(doc) => {
                setDocumentDialogError('');
                setDocumentDialog({ document: doc });
              }}
              onDelete={(doc) => setDeleteTarget({ kind: 'document', item: doc })}
              onDuplicate={duplicateDocument}
              onMove={moveDocument}
              onToggleMandatory={toggleMandatory}
            />
          )}
        </Box>

        {busy && (
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mt: 3 }} aria-live="polite">
            <CircularProgress size={16} />
            <Typography variant="caption" color="text.secondary">
              Saving…
            </Typography>
          </Stack>
        )}
      </Box>

      <StepFormDialog
        open={Boolean(stepDialog)}
        processType={activeType}
        initialValues={stepDialog?.step || null}
        errorMessage={stepDialogError}
        onSubmit={handleStepSubmit}
        onClose={() => setStepDialog(null)}
      />

      <DocumentFormDialog
        open={Boolean(documentDialog)}
        processType={activeType}
        initialValues={documentDialog?.document || null}
        errorMessage={documentDialogError}
        onSubmit={handleDocumentSubmit}
        onClose={() => setDocumentDialog(null)}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title={deleteTarget?.kind === 'step' ? 'Delete this process step?' : 'Delete this required document?'}
        message={
          deleteTarget
            ? `"${
                deleteTarget.kind === 'step'
                  ? deleteTarget.item.stepTitle
                  : deleteTarget.item.documentName
              }" will be permanently removed from this process. This action cannot be undone.`
            : ''
        }
        confirmLabel="Delete"
        confirmColor="error"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </Paper>
  );
}
