# HRCKMP Server (Backend)

Express REST API for the HR Compliance Knowledge Management Platform. This
implements the **shared foundation** (auth, RBAC, content visibility, audit
logging, search) plus **Developer 1's Compliance Content Management**
feature end to end, per `../docs/HIGH_LEVEL_DESIGN.md` — integrated with
**Developer 2's Work Permit Management** feature, which already had its own
working SQLite backend before this was merged in.

## Scope of this build

- **Shared foundation + Dev 1 (Compliance Content):** `countries`, `users`,
  `compliance_records`, `benefit_components`, `record_attachments`,
  `audit_logs` — `POST /auth/login`, `POST /auth/logout`, `GET /auth/me`,
  `GET/POST /records`, `GET/PUT /records/:id`, `PATCH /records/:id/archive`,
  `POST /records/:id/components`, `POST /records/:id/attachments`,
  `POST /records/:id/ai-assist`, `GET /search`, `GET /audit-logs`.
- **Dev 2 (Work Permit Management):** `work_permits` — `GET/POST /permits`,
  `GET/PUT /permits/:id`, `PATCH /permits/:id/archive`. Not yet behind auth
  (no `auth`/`authorize` middleware applied to `permitRoutes.js`) — that's
  Dev 2's call to make, not changed here.
- `review_requests` (Dev 3) and `newsletters`/`detected_updates` (Dev 4) are
  **not built** — their route/controller/service/repository files are still
  the original TODO stubs and aren't mounted in `app.js`. (Dev 4 has a
  client-only newsletters page under `client/src/features/newsletters/`
  with no backend behind it yet.)

## One shared SQLite database, two connections

`server/database/schema.sql` is the single source of truth for the schema —
every statement is `CREATE ... IF NOT EXISTS`, so it's safe to apply from
multiple places. Two files open a connection to the same
`server/database/hrckmp.db` and each apply the full schema on startup:

- `src/config/db.js` — the shared foundation connection (auth, records).
  Was an empty placeholder before this merge; now implemented on
  `better-sqlite3` (see below).
- `src/config/sqliteDb.js` — Dev 2's Work Permit connection, unchanged.

Both use `env.sqliteDbPath` (`SQLITE_DB_PATH` in `.env`) for the file
location, so there's exactly one database file, not two.

## Deviations from the HLD (and why)

1. **SQLite instead of MySQL 8.** Section 11/17 specifies MySQL, but no
   MySQL server is available in this environment. Uses `better-sqlite3`
   (the driver Dev 2's Work Permit feature already depended on — this was
   originally built against Node's built-in `node:sqlite` instead, but was
   switched to `better-sqlite3` when merging with Dev 2's work so the whole
   team is on one driver; both have an essentially identical
   `prepare/run/get/all` API, so no repository code needed to change). The
   schema keeps the same table/column names and constraints as the MySQL DDL
   (ENUM → `TEXT` + `CHECK`, `AUTO_INCREMENT` → `INTEGER PRIMARY KEY
   AUTOINCREMENT`, `JSON`/`DATETIME` → `TEXT`), so swapping to `mysql2`
   (already a dependency, unused) later mainly touches `config/db.js` and
   the repository layer.
2. **No hard delete for compliance records.** FR-1.7 is explicit:
   "Archiving shall be a soft delete... records are never hard-deleted."
   There is no `DELETE /records/:id`, and the client only offers Archive.
3. **`worker_type` is a single enum value per record/component, and
   benefit-component rates are free text** (`employer_rate TEXT`, not a
   number) — matches the HLD schema exactly (Section 12, and risk R5:
   "benefit components use text rate fields + notes to capture
   caps/conditions"). Unlike `work_permits` (which stores `country_code`
   directly, no FK — a deliberate simplification since a shared countries
   table was "out of scope" for that feature alone), `compliance_records`
   uses a real normalized `countries` table with a FK, since a shared
   foundation now genuinely exists. Editing an existing benefit component
   isn't possible from the UI, matching the API, which only supports adding
   one (`POST /records/:id/components`).
4. **No `record_versions` table yet.** Per Section 12.2, a version snapshot
   is only written when an *approved review* is published (FR-3.5), which is
   Developer 3's review-workflow feature. Nothing populates `record_versions`
   without that workflow existing, so the table is deferred rather than
   built empty.
5. **`PUBLISHED` status is not reachable from the compliance-records API.**
   Create always starts a record as `DRAFT`; update never changes `status`;
   the only other transition is `PATCH /records/:id/archive`. Publishing is
   exclusively Developer 3's action once the review workflow exists.
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
7. **Search covers `compliance_records` and `work_permits`, not reviews or
   newsletters.** FR-0.7 is cross-entity; Search is now an explicit Dev 1
   responsibility (HLD Section 5) rather than an unclaimed shared-foundation
   item. `searchService.js` calls into `complianceContentService` and
   `workPermitService` rather than duplicating their filtering SQL.
   Reviews/newsletters aren't included — they're workflow objects without
   their own `visibility_level`, not browsable content — but adding them
   later is just another fetch+normalize branch.
   **Note:** `permitRoutes.js` has no `auth`/`authorize` middleware, so
   `/permits` itself returns everything regardless of caller. Search applies
   the shared visibility rule to permits itself (post-query, in
   `searchService.js`) rather than relying on an enforcement that doesn't
   exist yet on that route — verified: a `sales` search never surfaces a
   `COMPLIANCE_ONLY` permit or record, even though `GET /permits` directly
   would.

## Setup

```bash
cd server
npm install
cp .env.example .env      # defaults are fine for local dev
npm run seed               # creates database/hrckmp.db, seeds countries + demo users + sample records + permits
npm run dev                 # or: npm start
```

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

The React client is wired to this API with real JWT login
(`client/src/context/AuthContext.jsx`, `client/src/pages/LoginPage.jsx`), an
Axios instance with a request interceptor that attaches the token and a
response interceptor that redirects to `/login` on 401
(`client/src/api/axiosClient.js`). `client/vite.config.js` proxies `/api`
and `/uploads` to `http://localhost:5000`, so **no `client/.env` is needed**
for local dev — it works out of the box.

```bash
# terminal 1
cd server && npm run dev

# terminal 2
cd client && npm run dev
```

Then open the client and log in with any seeded account above.

## Trying it

```bash
TOKEN=$(curl -s -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"compliance@hrckmp.test","password":"Password123!"}' | node -pe "JSON.parse(require('fs').readFileSync(0)).token")

curl http://localhost:5000/api/v1/records -H "Authorization: Bearer $TOKEN"
curl http://localhost:5000/api/v1/permits
```

## What's still a TODO stub

`reviewController.js`/`reviewRepository.js`/`reviewRoutes.js`,
`newsletterController.js`/`newsletterRepository.js`/`newsletterRoutes.js`,
`reviewWorkflowService.js`, `newsletterUpdateService.js` — untouched, for
Developers 3 and 4.
