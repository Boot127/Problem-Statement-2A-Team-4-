# HRCKMP — HR Compliance Knowledge Management Platform

A centralized, web-based system that consolidates labour laws, statutory benefits, and work-permit
processes for 10+ Asian countries into one authoritative source of truth — replacing the scattered
Word/Excel/PDF/email-newsletter workflow described in the client's original problem statement.

Full design detail lives in [`docs/HIGH_LEVEL_DESIGN.md`](docs/HIGH_LEVEL_DESIGN.md); the delivery
plan and phase breakdown live in [`docs/PROJECT_IMPLEMENTATION_PHASE.md`](docs/PROJECT_IMPLEMENTATION_PHASE.md);
role-by-role walkthroughs of the system in use live in [`docs/USE_CASES.md`](docs/USE_CASES.md).

## Stack

React (Vite) + Material UI on the frontend, Node.js/Express on the backend, SQLite for local
development with a Postgres/Neon-compatible data layer for production (`server/README.md` documents
the migration). See [`client/README.md`](client/README.md) and [`server/README.md`](server/README.md)
for setup instructions for each half of the app.

## Team & Feature Ownership

Per the High-Level Design (Section 5), each of the four developers owns one full-stack feature
end to end — database → API → UI — plus enhancements, alongside a shared foundation (auth, RBAC,
content visibility, audit logging, common UI) built collaboratively. The table below reflects actual
commit history, not just the plan.

| Developer | Feature | Primary contributor(s) (git author) |
|-----------|---------|-------------------------|
| **Developer 1** | Compliance Content Management — CRUD, benefit components, source attachments, AI writing assistant, cross-entity search, Postgres/Neon migration | Cheng Khai |
| **Developer 2** | Work Permit Management — CRUD, ordered process steps, document checklist, permit groups; also built Admin Archive Management (restore/permanently-delete across all archivable entities) | Dhiraj3927 |
| **Developer 3** | Review & Approval Workflow — state machine, comments, publish-and-version-snapshot, notifications | hi6817 |
| **Developer 4** | Legal Updates / Newsletter Management — CRUD, AI summarisation, relevance flagging, link-to-record | yikee81, yk |

Additional contributors visible in git history: **hmeal684-boop** (repository integration — merged
Developer 2's work-permit-management pull requests into `main`); **Boot127** (initial repository
scaffold and project documentation).

## Getting started

```bash
git clone https://github.com/Boot127/Problem-Statement-2A-Team-4-.git
cd Problem-Statement-2A-Team-4-

cd server && npm install && cp .env.example .env && npm run seed && npm run dev   # terminal 1
cd client && npm install && npm run dev                                           # terminal 2
```

Then open the client and log in with any seeded demo account (`server/README.md` lists them). See
that same file for the optional Postgres/Neon production setup.
