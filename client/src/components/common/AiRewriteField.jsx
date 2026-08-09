import { useRef, useState } from 'react';
import { Box, TextField, MenuItem, Select, Button, Stack, Paper, Typography, Alert } from '@mui/material';
import AutoAwesomeOutlinedIcon from '@mui/icons-material/AutoAwesomeOutlined';
import { AI_ASSIST_MODES, AI_ASSIST_MODE_LABELS } from '../../utils/enums';

// A multiline TextField with an "AI Rewrite" affordance (FR-1.6 / Section
// 16.1). `onRewriteRequest(text, mode)` must resolve to the ai-assist
// response shape ({ suggestion, degraded, reason } — see
// recordService.aiAssist / server/src/services/aiService.js) — this
// component has no opinion on how the suggestion is produced, only how it's
// reviewed (accept/reject) and spliced back in. `degraded: true` means the
// server fell back to an offline heuristic instead of a real AI call
// (no/invalid AI_API_KEY, or the provider errored) — shown so that isn't
// mistaken for genuine AI output.
//
// Mode (grammar / rewrite / summarise / translate) is chosen per-field via
// the dropdown next to the action button — Section 16.1 names all four as
// things "a Compliance user can request."
//
// If the user has a text selection inside the field when they trigger the
// rewrite, only that selection is rewritten; otherwise the whole value is.
export default function AiRewriteField({
  label,
  name,
  value,
  onValueChange,
  onBlur,
  error,
  helperText,
  onRewriteRequest,
  disabledReason,
  minRows = 4,
  fullWidth = true,
  sx,
}) {
  const textareaRef = useRef(null);
  const [mode, setMode] = useState('rewrite');
  const [loading, setLoading] = useState(false);
  const [suggestion, setSuggestion] = useState(null);
  const [notice, setNotice] = useState(null);

  const handleRewrite = async () => {
    const el = textareaRef.current;
    const text = value || '';
    const hasSelection = el && el.selectionStart !== el.selectionEnd;
    const rangeStart = hasSelection ? el.selectionStart : 0;
    const rangeEnd = hasSelection ? el.selectionEnd : text.length;
    const target = text.slice(rangeStart, rangeEnd);

    if (!target.trim()) {
      setNotice('No content to rewrite. Please enter text first.');
      return;
    }

    setNotice(null);
    setLoading(true);
    try {
      const result = await onRewriteRequest(target, mode);
      if (!result?.suggestion) {
        setNotice(result?.note || 'AI writing assistant is temporarily unavailable. Please try again later.');
      } else {
        setSuggestion({
          rangeStart,
          rangeEnd,
          original: target,
          rewritten: result.suggestion,
          degraded: result.degraded,
          reason: result.reason,
        });
      }
    } catch (err) {
      setNotice(err.response?.data?.message || 'AI writing assistant is temporarily unavailable. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = () => {
    const text = value || '';
    const nextValue = `${text.slice(0, suggestion.rangeStart)}${suggestion.rewritten}${text.slice(suggestion.rangeEnd)}`;
    onValueChange(nextValue);
    setSuggestion(null);
  };

  const handleReject = () => setSuggestion(null);

  return (
    <Box sx={{ ...sx, display: 'flex', flexDirection: 'column' }}>
      <TextField
        label={label}
        name={name}
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        onBlur={onBlur}
        error={error}
        helperText={helperText}
        multiline
        minRows={minRows}
        fullWidth={fullWidth}
        inputRef={textareaRef}
      />
      <Stack direction="row" spacing={1} sx={{ mt: 1, alignItems: 'center' }}>
        <Select
          size="small"
          value={mode}
          onChange={(e) => setMode(e.target.value)}
          disabled={loading || Boolean(disabledReason)}
          sx={{ minWidth: 160 }}
        >
          {AI_ASSIST_MODES.map((m) => (
            <MenuItem key={m} value={m}>
              {AI_ASSIST_MODE_LABELS[m]}
            </MenuItem>
          ))}
        </Select>
        <Button
          size="small"
          startIcon={<AutoAwesomeOutlinedIcon fontSize="small" />}
          onClick={handleRewrite}
          disabled={loading || Boolean(disabledReason)}
        >
          {loading ? 'Working…' : 'Run'}
        </Button>
        {disabledReason && (
          <Typography variant="caption" color="text.secondary">
            {disabledReason}
          </Typography>
        )}
      </Stack>

      {notice && (
        <Alert severity="info" sx={{ mt: 1 }} onClose={() => setNotice(null)}>
          {notice}
        </Alert>
      )}

      {suggestion && (
        <Paper variant="outlined" sx={{ p: 2, mt: 1, bgcolor: 'action.hover' }}>
          <Typography variant="caption" color={suggestion.degraded ? 'warning.main' : 'success.main'} fontWeight={600}>
            {suggestion.degraded ? 'Offline Suggestion (not real AI)' : 'AI Suggestion (live)'}
          </Typography>
          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', my: 1 }}>
            {suggestion.rewritten}
          </Typography>
          {suggestion.degraded && suggestion.reason && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
              {suggestion.reason}
            </Typography>
          )}
          <Stack direction="row" spacing={1}>
            <Button size="small" variant="contained" onClick={handleAccept}>
              Accept
            </Button>
            <Button size="small" onClick={handleReject}>
              Reject
            </Button>
          </Stack>
        </Paper>
      )}
    </Box>
  );
}
