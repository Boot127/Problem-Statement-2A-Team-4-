# Dev 2 Neon PostgreSQL Migration

## Current status — 9 August 2026

The PostgreSQL runtime, schema, migrations, one-time SQLite importer, verification tooling, async repositories, and rollback provider are implemented. The live Neon cutover is **pending** because this checkout does not currently define `DATABASE_URL` or `DATABASE_URL_DIRECT`. Until live migration and count verification pass, Dev 2 continues to use the safe SQLite fallback and `server/database/hrckmp.db` remains untouched.

## Architecture

- Runtime driver: `pg` with one application-level `Pool` in `server/src/config/postgresDb.js`.
- Provider boundary: `server/src/config/database.js`; `DB_PROVIDER=postgres` selects Neon and `DB_PROVIDER=sqlite` selects the legacy rollback source.
- Runtime URL: pooled Neon `DATABASE_URL`.
- Migration URL: direct Neon `DATABASE_URL_DIRECT`, falling back to `DATABASE_URL` only when a separate direct URL is unavailable.
- Transactions: one checked-out PostgreSQL client is retained through `AsyncLocalStorage`; nested repository operations share its `BEGIN`/`COMMIT`/`ROLLBACK` scope.
- SQL: all active Dev 2 repositories use async parameterized `$1`, `$2`, ... queries, `RETURNING`, PostgreSQL-safe aggregation, and explicit transactions.
- Health check: startup runs `SELECT 1` and logs only the provider name, never a URL or credentials.

The six business tables remain `work_permits`, `work_permit_steps`, `permit_documents`, `permit_source_documents`, `permit_groups`, and `permit_group_members`. `dev2_schema_migrations` stores applied migration names/checksums only.

## Configure Neon locally

From Neon Console → Project → Connect, copy the pooled and direct connection strings into `server/.env`. Do not put them in React/Vite variables and do not commit the file.

```dotenv
DB_PROVIDER=postgres
DATABASE_URL=postgresql://...pooled Neon URL...?sslmode=require
DATABASE_URL_DIRECT=postgresql://...direct Neon URL...?sslmode=require
ENABLE_DEV_SEED=false
```

`server/.env` is ignored by Git. `server/.env.example` contains placeholders only.

## First migration and verification

Stop writes to the SQLite-backed Dev 2 backend during the final copy, then run from `server/`:

```powershell
npm install
npm run db:migrate
npm run db:migrate:sqlite-to-postgres
npm run db:verify
npm start
```

The importer opens SQLite with `readonly: true`, imports in foreign-key-safe order inside one PostgreSQL transaction, preserves IDs/timestamps/statuses/hashes/relationships, converts `is_mandatory` to a PostgreSQL boolean, and advances identity sequences. It aborts if any destination business table is non-empty, so reruns cannot silently duplicate data. `db:verify` compares every table and process-type count and checks for orphan child/group rows.

`npm run db:seed` is separate and guarded twice: `ENABLE_DEV_SEED=true` must be explicit and `work_permits` must be empty. Do not run it for a migrated database.

## Storage behavior retained

- PDF/DOCX bytes remain under `server/uploads`; PostgreSQL stores metadata and the generated filename only. Neon does not make local uploads cloud-persistent.
- Reminder Centre results remain dynamically derived; there is no reminder table.
- AI extraction and change comparisons remain temporary until human acceptance. Accepted fields/steps/documents persist and force the permit to `DRAFT`; the source stays attached.
- Ask This Permit and Eligibility Checker results remain request/session-only.
- Process Copy creates independent destination step/document rows in one transaction; it never duplicates the master permit.

## Rollback

If setup, import, verification, or connectivity fails, set `DB_PROVIDER=sqlite` and restart. Do not delete `hrckmp.db`, its WAL files, or `server/uploads`. The shared async service/controller path supports both providers, so rollback does not require reverting repositories.

## Verification recorded before live cutover

- Read-only SQLite baseline: 17 permits, 38 steps, 42 checklist documents, 8 source metadata rows, 1 group, 0 memberships.
- Process counts: steps NEW 15 / RENEWAL 12 / CANCELLATION 11; documents NEW 17 / RENEWAL 14 / CANCELLATION 11.
- SQLite `integrity_check`: `ok`; foreign-key violations: 0; physical uploads: 8.
- Disposable-copy regression passed permit create/read/search, step reorder, mandatory document handling, process copy, group add/remove, AI extraction acceptance, AI change acceptance, Draft-only enforcement, source retention, and forced transaction rollback.
- All server JavaScript syntax checks passed; active Dev 2 repositories have no direct `better-sqlite3` or `sqliteDb` imports.
- Client production build passed (1,233 modules). Full client lint reports only the existing teammate-owned `AuthContext.jsx` Fast Refresh rule.
- `npm audit --omit=dev`: 0 vulnerabilities.
- The missing-configuration guard correctly refuses `DB_PROVIDER=postgres` without `DATABASE_URL`.

Live connection, schema execution, import, Neon count comparison, and full Neon API regression remain pending credentials and must not be reported as passed before those commands succeed.
