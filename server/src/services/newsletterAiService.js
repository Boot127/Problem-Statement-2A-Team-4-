// Dev 4 — AI summarisation + relevance-flagging for newsletter text.
// Ported from the standalone newsletter-crud-starter prototype. Uses the
// team's existing aiService (Groq, keyed off AI_API_KEY — see
// services/aiService.js) for the summary when a key is configured, and a
// deterministic keyword check for flagging, so the feature is fully
// demoable offline exactly like the original prototype and never depends
// on a live AI call to function (same "core CRUD never depends on AI"
// principle as aiService.js).

const aiService = require('./aiService');

const LEGAL_CHANGE_KEYWORDS = [
  'amend',
  'amendment',
  'effective from',
  'effective date',
  'new requirement',
  'revised',
  'statutory',
  'minimum wage',
  'levy',
  'quota',
  'work permit',
  'work pass',
  'cpf',
  'increase',
  'mandatory',
  'compliance deadline',
];

function keywordFlag(text) {
  const lowerText = text.toLowerCase();
  const matched = LEGAL_CHANGE_KEYWORDS.filter((keyword) => lowerText.includes(keyword));

  return {
    flagged: matched.length > 0,
    reason:
      matched.length > 0
        ? `Contains legal-change indicator terms: ${matched.slice(0, 3).join(', ')}.`
        : null,
  };
}

function truncate(text) {
  const trimmed = text.trim().replace(/\s+/g, ' ');
  if (!trimmed) return 'No readable content was found in the uploaded file.';
  return trimmed.length > 280 ? `${trimmed.slice(0, 280)}...` : trimmed;
}

// Summarise newsletter text and flag whether it looks like a genuine
// labour-law change. Always returns a usable result — never throws — so a
// misconfigured/absent AI key degrades to the offline heuristic instead of
// breaking the summarise button.
async function analyseNewsletterText(text) {
  const { flagged, reason } = keywordFlag(text);

  try {
    const { suggestion, degraded } = await aiService.assist('summarise', text);
    return {
      summary: suggestion || truncate(text),
      flagged,
      reason: degraded ? `${reason || ''} (offline heuristic summary — AI service unavailable)`.trim() : reason,
    };
  } catch (err) {
    console.error('newsletterAiService: summarise failed, using offline fallback:', err.message);
    return { summary: truncate(text), flagged, reason };
  }
}

module.exports = { analyseNewsletterText };
