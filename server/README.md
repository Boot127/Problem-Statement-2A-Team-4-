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
  `record_versions` (read-only from this side), `audit_logs` —
  `POST /auth/login`, `POST /auth/logout`, `GET /auth/me`,
  `GET/POST /records`, `GET/PUT /records/:id`, `PATCH /records/:id/archive`,
  `GET /records/:id/versions`,
  `POST /records/:id/components`, `PUT/DELETE /records/:id/components/:componentId`,
  `POST /records/:id/attachments`, `DELETE /records/:id/attachments/:attachmentId`,
  `POST /records/:id/ai-assist` (modes: `grammar`, `rewrite`, `summarise`,
  `translate`), `GET /search`, `GET /audit-logs`.
- **Dev 2 (Work Permit Management):** `work_permits` — `GET/POST /permits`,
  `GET/PUT /permits/:id`, `PATCH /permits/:id/archive`. Not yet behind auth
  (no `auth`/`authorize` middleware applied to `permitRoutes.js`) — that's
  Dev 2's call to make, not changed here.
- **Dev 3 (Review & Approval):** `review_requests`, `review_comments`,
  `notifications` — `GET/POST /reviews`, `GET/PUT /reviews/:id`,
  `PATCH /reviews/:id/transition`, `POST /reviews/:id/comments`,
  `POST /reviews/:id/publish`. Generic over `target_type`
  (`compliance_record` | `work_permit`); publishing writes a
  `record_versions`/`permit_versions` snapshot and flips the target's
  `status` to `PUBLISHED`. The Compliance Content detail page has a
  "Submit for Review" shortcut on `DRAFT` records that creates a review
  targeting it directly, and displays the resulting version history once
  published.
- `newsletters`/`detected_updates` (Dev 4) are **not built** — their
  route/controller/service/repository files are still the original TODO
  stubs and aren't mounted in `app.js`. (Dev 4 has a client-only newsletters
  page under `client/src/features/newsletters/` with no backend behind it
  yet.)

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
   foundation now genuinely exists. Benefit components can now be edited and
   removed (`PUT`/`DELETE /records/:id/components/:componentId`), not just
   added — the update/delete services always resolve the parent record via
   `getById` first, both to enforce visibility and to confirm the component
   actually belongs to that record before mutating it (a mismatched
   `:id`/`:componentId` pair 404s rather than touching the wrong record's
   data). Attachments got the same treatment: `DELETE
   /records/:id/attachments/:attachmentId` removes the DB row and does a
   best-effort delete of the file on disk (a missing file never fails the
   request — the DB row is the source of truth).
4. **`record_versions` is populated by Developer 3's review workflow, read
   by Developer 1's side.** Per Section 12.2, a version snapshot is written
   when an *approved review* is published (FR-3.5) — that write lives in
   `reviewRepository.js#publish()`, generic over `target_type`. Compliance
   Content only reads it back (`recordRepository.js#findVersions`, exposed
   as `GET /records/:id/versions`) and renders it as a version-history panel
   on the record detail page.
5. **`PUBLISHED` is now reachable, but only via the review workflow.**
   Create always starts a record as `DRAFT`; `PUT /records/:id` never
   changes `status`; `PATCH /records/:id/archive` is the only direct
   transition on the records API itself. Reaching `PUBLISHED` requires
   going through Developer 3's review workflow (`POST /reviews` with
   `targetType: 'compliance_record'` → transition to `APPROVED` →
   `POST /reviews/:id/publish`), which the record detail page's "Submit for
   Review" button starts for `DRAFT` records.
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

`newsletterController.js`/`newsletterRepository.js`/`newsletterRoutes.js`,
`newsletterUpdateService.js` — untouched, for Developer 4.
Developer 3's review workflow (`reviewController.js`/`reviewRepository.js`/
`reviewRoutes.js`/`reviewWorkflowService.js`) is implemented and mounted.
