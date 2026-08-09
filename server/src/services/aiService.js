// Shared — AI calls for the writing assistant and (future) newsletter
// summarisation (Section 16). Degrades gracefully when AI_API_KEY is unset
// or the call fails (Section 16.3): core CRUD never depends on this
// service succeeding.
//
// Provider: Groq (https://console.groq.com), not Anthropic. The HLD
// (Section 9/16) names Anthropic Claude specifically, but that requires a
// paid/billed account with no ongoing free tier. Groq's API is
// OpenAI-compatible (POST /openai/v1/chat/completions) and has a free tier
// with no credit card required, which is what AI_API_KEY is provisioned
// against here. Swapping back to Anthropic (or any other provider) only
// touches `callAi` below — `assist()`'s contract (mode in, {suggestion,
// degraded, reason} out) doesn't change.

const config = require('../config/env');

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.3-70b-versatile';

const MODE_INSTRUCTIONS = {
  grammar: 'Fix grammar and spelling only. Keep the meaning, length, and tone as close to the original as possible.',
  rewrite: 'Rewrite this HR/labour-law text in clear, professional English suitable for a compliance record.',
  summarise: 'Summarise this text in 1-2 sentences, preserving any figures, dates, and legal terms exactly.',
  translate: 'Translate this text into clear, professional English, preserving any figures, dates, and legal terms exactly.',
};

async function callAi(mode, text) {
  const instruction = MODE_INSTRUCTIONS[mode] || MODE_INSTRUCTIONS.rewrite;
  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${config.aiApiKey}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      temperature: 0.3,
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: `${instruction}\n\nRespond with only the rewritten text, no preamble or quotation marks.\n\nText:\n${text}`,
        },
      ],
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Groq API error ${response.status}: ${body.slice(0, 200)}`);
  }

  const data = await response.json();
  return data?.choices?.[0]?.message?.content?.trim() || null;
}

// Heuristic fallback used when AI_API_KEY is not configured, so the writing
// assistant remains demonstrable without a live API key.
const CASUAL_TO_FORMAL = [
  [/\bgotta\b/gi, 'is required to'],
  [/\bgonna\b/gi, 'is going to'],
  [/\bwanna\b/gi, 'wants to'],
  [/\bcan't\b/gi, 'cannot'],
  [/\bdon't\b/gi, 'do not'],
  [/\bdoesn't\b/gi, 'does not'],
  [/\bwon't\b/gi, 'will not'],
];

function heuristicRewrite(text) {
  let result = text.trim();
  CASUAL_TO_FORMAL.forEach(([pattern, replacement]) => {
    result = result.replace(pattern, replacement);
  });
  const capitalized = result.charAt(0).toUpperCase() + result.slice(1);
  return /[.!?]$/.test(capitalized) ? capitalized : `${capitalized}.`;
}

function heuristicSummarise(text) {
  const sentences = text.trim().split(/(?<=[.!?])\s+/).filter(Boolean);
  return sentences.slice(0, 2).join(' ') || text.trim();
}

function fallback(mode, text, reason) {
  if (mode === 'translate') {
    // No offline translation engine is available; be honest about the gap
    // rather than fabricating a translation (Section 16.3).
    return { suggestion: null, degraded: true, reason, note: `Translation requires the AI service. ${reason}` };
  }
  if (mode === 'summarise') {
    return { suggestion: heuristicSummarise(text), degraded: true, reason };
  }
  return { suggestion: heuristicRewrite(text), degraded: true, reason };
}

// mode: 'grammar' | 'rewrite' | 'summarise' | 'translate'
async function assist(mode, text) {
  if (!text || !text.trim()) {
    const err = new Error('No content to rewrite. Please provide text first.');
    err.status = 400;
    throw err;
  }

  if (!config.aiApiKey) {
    return fallback(mode, text, 'AI_API_KEY is not configured, so this used an offline heuristic instead of a real AI call.');
  }

  try {
    const suggestion = await callAi(mode, text);
    return { suggestion, degraded: false };
  } catch (err) {
    // AI outage must never break the writing assistant entirely (NFR-5) —
    // fall back to the offline heuristic instead of surfacing a 5xx. But
    // don't swallow the reason: a misconfigured/invalid key should be
    // obvious to whoever's testing, not silently indistinguishable from a
    // working call.
    console.error('aiService: Groq call failed, falling back to heuristic:', err.message);
    return fallback(mode, text, `The AI API call failed (${err.message}), so this used an offline heuristic instead.`);
  }
}

module.exports = { assist };
