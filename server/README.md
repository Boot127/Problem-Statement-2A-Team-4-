# HRCKMP Server (Backend)

Express REST API for the HR Compliance Knowledge Management Platform. This
build implements the **shared foundation** (auth, RBAC, content visibility,
audit logging, search) plus **Developer 1's Compliance Content Management**
feature end to end, per `../docs/HIGH_LEVEL_DESIGN.md`.

## Scope of this build

Only the tables and routes needed for the shared foundation and Developer 1
exist yet:

- `countries`, `users`, `compliance_records`, `benefit_components`,
  `record_attachments`, `audit_logs`
- `POST /auth/login`, `POST /auth/logout`, `GET /auth/me`
- `GET/POST /records`, `GET/PUT /records/:id`, `PATCH /records/:id/archive`,
  `POST /records/:id/components`, `POST /records/:id/attachments`,
  `POST /records/:id/ai-assist`
- `GET /search`, `GET /audit-logs`

`work_permits` (Dev 2), `review_requests` (Dev 3), and
`newsletters`/`detected_updates` (Dev 4) are **not built** — their
route/controller/service/repository files are still the original TODO stubs
and are intentionally not mounted in `app.js`.

## Deviations from the HLD (and why)

1. **SQLite instead of MySQL 8.** Section 11/17 specifies MySQL, but no
   MySQL server is available in this environment, and `server/.gitignore`
   already had entries for generated SQLite `.db` files, suggesting the team
   anticipated this. `src/config/db.js` uses Node's built-in `node:sqlite`
   (`DatabaseSync`) — **zero extra dependencies, no native build step**,
   available unflagged from Node ~22.5+ (confirmed working on Node 24). The
   schema keeps the same table/column names and constraints as the MySQL DDL
   (ENUM → `TEXT` + `CHECK`, `AUTO_INCREMENT` → `INTEGER PRIMARY KEY
   AUTOINCREMENT`, `JSON`/`DATETIME` → `TEXT`), so swapping back to
   `mysql2` (already a dependency, untouched) later mainly touches
   `config/db.js` and the repository layer — services/controllers/routes
   don't reference SQL directly.
2. **No hard delete for compliance records.** FR-1.7 is explicit:
   "Archiving shall be a soft delete... records are never hard-deleted."
   There is no `DELETE /records/:id`, and the client only offers Archive.
   (An earlier client-only prototyping pass had added a "Delete Permanently"
   button before this backend existed — it's since been removed along with
   the rest of that prototype's localStorage-backed data model, to bring the
   client in line with FR-1.7 and this schema.)
3. **`worker_type` is a single enum value per record/component, and
   benefit-component rates are free text** (`employer_rate VARCHAR(120)`,
   not a number) — this matches the HLD schema exactly (Section 12, and risk
   R5: "benefit components use text rate fields + notes to capture
   caps/conditions"). The client (`client/src/pages/content/`) was reconciled
   to this shape: single-select worker type, free-text rate/cap fields, no
   client-only concepts the API doesn't support (rate history, bulk cap
   edits, computed "law status", optimistic edit locks). Editing an existing
   benefit component isn't possible from the UI either, matching the API,
   which only supports adding one (`POST /records/:id/components`).
4. **No `record_versions` table yet.** Per Section 12.2, a version snapshot
   is only written when an *approved review* is published (FR-3.5), which is
   Developer 3's review-workflow feature. Nothing populates `record_versions`
   without that workflow existing, so the table is deferred rather than
   built empty.
5. **`PUBLISHED` status is not reachable from this API.** Create always
   starts a record as `DRAFT`; update never changes `status`; the only other
   transition is `PATCH /records/:id/archive`. Publishing is exclusively
   Developer 3's action once the review workflow exists (Section 12.2).
6. **AI provider is Groq, not Anthropic Claude.** Section 16 names Claude
   specifically, but it has no ongoing free tier (billing required); Groq's
   API is free (no credit card) and OpenAI-compatible. See
   `src/services/aiService.js` — swapping providers again only touches
   `callAi()` in that file, not its `assist()` contract. Get a key at
   https://console.groq.com/keys and put it in `AI_API_KEY`.
   The assistant degrades to an offline heuristic when `AI_API_KEY` is unset
   *or* the API call fails (Section 16.3): `grammar`/`rewrite` use a small
   casual→formal dictionary and `translate` returns an honest "not available
   offline" note instead of fabricating a translation. The client's AI
   Suggestion panel visibly labels which one happened ("AI Suggestion
   (live)" vs "Offline Suggestion (not real AI)"), so a misconfigured key
   doesn't quietly masquerade as a working one.
7. **Search only covers `compliance_records`.** FR-0.7 is cross-entity, but
   the other three entities don't exist in this build yet — see
   `src/services/searchService.js` for the extension point.

## Setup

```bash
cd server
npm install
cp .env.example .env      # defaults are fine for local dev
npm run seed               # creates database/hrckmp.db, seeds countries + demo users + sample records
npm run dev                 # or: npm start
```

Requires **Node 22.5+** (for the built-in `node:sqlite` module — tested on
Node 24).

### Demo accounts (seeded)

| Email | Role |
|---|---|
| `compliance@hrckmp.test` | compliance |
| `sales@hrckmp.test` | sales |
| `cs@hrckmp.test` | customer_service |
| `admin@hrckmp.test` | admin |

Password for all: `Password123!`

To reseed from scratch, delete `database/hrckmp.db` and rerun `npm run seed`.

## Running the full stack

The React client (`client/`) is wired to this API — real JWT login
(`client/src/context/AuthContext.jsx`, `client/src/pages/LoginPage.jsx`),
an Axios instance with a request interceptor that attaches the token and a
response interceptor that redirects to `/login` on 401
(`client/src/api/axiosClient.js`), and `client/src/api/recordService.js`
calling `/records` directly instead of localStorage. `client/.env.example`
already points `VITE_API_BASE_URL` at `http://localhost:5000/api/v1`.

```bash
# terminal 1
cd server && npm run dev

# terminal 2
cd client
cp .env.example .env   # if you haven't already
npm run dev
```

Then open the client and log in with any seeded account below.

## Trying it

```bash
TOKEN=$(curl -s -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"compliance@hrckmp.test","password":"Password123!"}' | node -pe "JSON.parse(require('fs').readFileSync(0)).token")

curl http://localhost:5000/api/v1/records -H "Authorization: Bearer $TOKEN"
```

## What's still a TODO stub

`permitController.js`/`permitRepository.js`/`permitRoutes.js`,
`reviewController.js`/`reviewRepository.js`/`reviewRoutes.js`,
`newsletterController.js`/`newsletterRepository.js`/`newsletterRoutes.js`,
`workPermitService.js`, `reviewWorkflowService.js`,
`newsletterUpdateService.js` — untouched, for Developers 2, 3, and 4.
