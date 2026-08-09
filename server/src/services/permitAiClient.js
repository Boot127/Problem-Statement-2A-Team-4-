const env = require('../config/env');

const DEFAULT_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';
const DEFAULT_MODEL = 'gemini-2.0-flash';
const REQUEST_TIMEOUT_MS = 45_000;

function parseJsonContent(content) {
  const cleaned = String(content || '').replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch (error) {
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start >= 0 && end > start) return JSON.parse(cleaned.slice(start, end + 1));
    throw error;
  }
}

function getPermitAiConfig() {
  return {
    provider: String(env.permitAiProvider || 'mock').trim().toLowerCase(),
    endpoint: env.permitAiEndpoint || DEFAULT_ENDPOINT,
    apiKey: env.permitAiApiKey || '',
    model: env.permitAiModel || DEFAULT_MODEL,
  };
}

async function requestStructured({ system, prompt, schema, schemaName, featureLabel = 'AI request' }) {
  const config = getPermitAiConfig();
  if (config.provider !== 'compatible') {
    const error = new Error(`Live ${featureLabel.toLowerCase()} requires PERMIT_AI_PROVIDER=compatible.`);
    error.status = 503;
    throw error;
  }
  if (!config.apiKey) {
    const error = new Error(`Live ${featureLabel.toLowerCase()} requires PERMIT_AI_API_KEY.`);
    error.status = 503;
    throw error;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let response;
  try {
    response = await fetch(config.endpoint, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        temperature: 0,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: prompt },
        ],
        response_format: {
          type: 'json_schema',
          json_schema: { name: schemaName, strict: true, schema },
        },
      }),
    });
  } catch (error) {
    const providerError = new Error(
      error.name === 'AbortError'
        ? `${featureLabel} timed out. Try again with a smaller source document.`
        : `${featureLabel} provider is unavailable. Try again later.`
    );
    providerError.status = 502;
    throw providerError;
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    const message = response.status === 429
      ? `${featureLabel} provider quota or rate limit was reached. Try again later.`
      : `${featureLabel} provider request failed (${response.status}).`;
    const providerError = new Error(message);
    providerError.status = 502;
    throw providerError;
  }

  const payload = await response.json();
  const content = payload?.choices?.[0]?.message?.content;
  if (!content) {
    const error = new Error(`${featureLabel} provider returned no structured content.`);
    error.status = 502;
    throw error;
  }
  try {
    return parseJsonContent(content);
  } catch {
    const error = new Error(`${featureLabel} provider returned malformed structured content.`);
    error.status = 502;
    throw error;
  }
}

module.exports = { getPermitAiConfig, requestStructured };
