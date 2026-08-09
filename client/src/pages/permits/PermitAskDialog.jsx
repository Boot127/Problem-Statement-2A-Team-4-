import { useState } from 'react';
import {
  Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent,
  DialogTitle, Divider, Paper, Stack, TextField, Typography,
} from '@mui/material';
import QuestionAnswerOutlinedIcon from '@mui/icons-material/QuestionAnswerOutlined';
import SourceOutlinedIcon from '@mui/icons-material/SourceOutlined';
import SendOutlinedIcon from '@mui/icons-material/SendOutlined';
import permitService from '../../api/permitService';
import { getApiErrorMessage } from '../../utils/apiError';

const SUGGESTIONS = [
  'What are the eligibility requirements?',
  'What documents are needed for a new application?',
  'What documents are needed for renewal?',
  'How long does renewal take?',
  'What is the government fee?',
  'What happens during cancellation?',
  'Which process is incomplete?',
];

export default function PermitAskDialog({ open, permit, onClose }) {
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const ask = async (text = question) => {
    const trimmed = text.trim();
    if (trimmed.length < 3) return;
    setQuestion('');
    setLoading(true);
    setError('');
    try {
      const response = await permitService.askPermit(permit.id, trimmed);
      setMessages((current) => [...current, { question: trimmed, ...response }]);
    } catch (err) {
      setError(getApiErrorMessage(err));
      setQuestion(trimmed);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={loading ? undefined : onClose} fullWidth maxWidth="md" aria-labelledby="ask-permit-title">
      <DialogTitle id="ask-permit-title">
        <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center' }}><QuestionAnswerOutlinedIcon color="primary" /><Box><Typography variant="h6" fontWeight={900}>Ask {permit.title}</Typography><Typography variant="body2" color="text.secondary">Ask about eligibility, fees, application steps, renewal, cancellation, or required documents.</Typography></Box></Stack>
      </DialogTitle>
      <DialogContent dividers>
        <Alert severity="info" sx={{ mb: 2 }}>Answers use only information stored for this permit. Verify important guidance against the cited official source.</Alert>
        <Stack direction="row" spacing={0.75} sx={{ flexWrap: 'wrap', gap: 0.75, mb: 2 }}>
          {SUGGESTIONS.map((item) => <Chip key={item} label={item} clickable variant="outlined" onClick={() => ask(item)} disabled={loading} />)}
        </Stack>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Stack spacing={1.5} sx={{ maxHeight: 420, overflowY: 'auto', pr: 0.5 }} aria-live="polite">
          {messages.length === 0 && <Paper variant="outlined" sx={{ p: 3, textAlign: 'center', bgcolor: 'action.hover' }}><QuestionAnswerOutlinedIcon color="disabled" sx={{ fontSize: 34 }} /><Typography variant="subtitle2" fontWeight={800}>Ask a question about this permit</Typography><Typography variant="body2" color="text.secondary">The assistant cannot search other permits or provide unsupported legal advice.</Typography></Paper>}
          {messages.map((message, index) => (
            <Box key={`${message.question}-${index}`}>
              <Paper sx={{ p: 1.5, ml: { xs: 2, sm: 8 }, bgcolor: 'primary.main', color: 'primary.contrastText' }}><Typography variant="body2" fontWeight={700}>{message.question}</Typography></Paper>
              <Paper variant="outlined" sx={{ p: 2, mr: { xs: 2, sm: 8 }, mt: 1 }}>
                <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>{message.answer}</Typography>
                <Divider sx={{ my: 1.5 }} />
                <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 0.75 }}><SourceOutlinedIcon fontSize="small" color="action" /><Typography variant="caption" fontWeight={800}>Sources</Typography>{message.citations.length ? message.citations.map((citation) => <Chip key={`${citation.type}-${citation.label}`} size="small" variant="outlined" label={citation.label} />) : <Typography variant="caption" color="text.secondary">No stored source supports an answer.</Typography>}</Stack>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>Provider: {message.providerMode}</Typography>
              </Paper>
            </Box>
          ))}
          {loading && <Stack direction="row" spacing={1} sx={{ alignItems: 'center', py: 1 }}><CircularProgress size={18} /><Typography variant="body2" color="text.secondary">Checking this permit’s stored information…</Typography></Stack>}
        </Stack>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mt: 2, alignItems: 'stretch' }}>
          <TextField fullWidth label="Ask a question" value={question} onChange={(event) => setQuestion(event.target.value)} inputProps={{ maxLength: 500 }} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); ask(); } }} disabled={loading} />
          <Button variant="contained" endIcon={<SendOutlinedIcon />} onClick={() => ask()} disabled={loading || question.trim().length < 3} sx={{ minWidth: 110 }}>Ask</Button>
        </Stack>
      </DialogContent>
      <DialogActions><Button onClick={onClose} disabled={loading}>Close</Button></DialogActions>
    </Dialog>
  );
}
