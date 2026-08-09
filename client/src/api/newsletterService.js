// Dev 4 — newsletters + detected_updates API calls (upload, list, get,
// update status, link). The actual implementation lives alongside the
// feature at features/newsletters/newsletterApi.js (same pattern as its
// NewsletterPage.jsx component) — this file re-exports it so anything
// importing the conventional client/src/api/* path still works.

export * from '../features/newsletters/newsletterApi.js';
