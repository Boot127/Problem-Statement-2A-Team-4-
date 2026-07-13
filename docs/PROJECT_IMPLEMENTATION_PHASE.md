# PROJECT IMPLEMENTATION PHASE DOCUMENT
## HR Compliance Knowledge Management Platform (HRCKMP)

| Field | Value |
|-------|-------|
| **Document Title** | Project Implementation Phase Plan |
| **Project** | HR Compliance Knowledge Management Platform |
| **Version** | 2.1 |
| **Status** | For Submission |
| **Team Size** | 4 Developers |
| **Technology Stack** | React.js · Material UI · React Router · Axios · Formik + Yup · Node.js · Express.js · MySQL |

---

## Table of Contents

- [1. Overview & Methodology](#1-overview--methodology)
- [2. Team Structure & Feature Ownership](#2-team-structure--feature-ownership)
- [3. Shared Foundation](#3-shared-foundation)
- [4. Implementation Phases](#4-implementation-phases)
- [5. Phase Dependencies](#5-phase-dependencies)
- [6. Per-Developer View](#6-per-developer-view)
- [7. Mapping to the Assignment Timeline](#7-mapping-to-the-assignment-timeline)
- [8. Definition of Done](#8-definition-of-done)
- [9. Risk Register](#9-risk-register)

---

## 1. Overview & Methodology

This document defines the implementation plan for the **HR Compliance Knowledge Management Platform**, building on the approved High-Level Design (v2.1). The plan is organized into **logical, dependency-driven phases** rather than fixed calendar weeks: each phase has a clear objective, deliverables, owners, dependencies, and exit criteria, and a phase begins when its dependencies are met. Section 7 maps these phases onto the official assignment milestones for context.

**Methodology.** The team follows an **iterative, feature-owned approach**. Each of the four developers owns one main full-stack feature end to end (database → API → UI), so work proceeds largely in parallel once the shared foundation is in place. Coordination:

- A shared **Git repository** with feature branches and pull-request reviews, and regular commits with meaningful messages.
- A **Kanban/issue board** (e.g. GitHub Projects) tracking tasks per phase.
- **Weekly stand-ups** and short reviews at the end of each phase.
- An agreed **baseline API contract** before parallel development begins. This is a working baseline, not a permanent freeze: changes after the baseline are allowed but require a quick team review and a note in the shared contract document, so the frontend and backend stay in sync without being locked into early mistakes.

---

## 2. Team Structure & Feature Ownership

Each developer owns **one main feature** consisting of **basic CRUD plus enhanced capabilities**, satisfying the assignment requirement that every student develops at least one feature with basic and enhanced functions. All four also contribute to the shared foundation (Section 3).

| Developer | Main Feature | CRUD | Enhanced Capabilities |
|-----------|--------------|------|-----------------------|
| **Developer 1** | Compliance Content Management | Create / view / update / archive labour-law & benefit records | Local/foreign/expat classification · structured benefit components · AI grammar & professional rewriting · source-document attachments |
| **Developer 2** | Work Permit Management | Create / view / update / archive permit types | Ordered step-by-step process flow · required-document checklist · New / Renewal / Cancellation as child processes of one permit |
| **Developer 3** | Review & Approval Workflow | Create / view / update / archive review requests | Review-status machine (Pending → In Review → Approved, with Changes Requested / Rejected) · publish action that sets content to Published and writes a version snapshot · review comments · notifications |
| **Developer 4** | Legal Updates / Newsletter Management | Add / view / update / archive newsletters & detected updates | AI summarisation · relevance flagging · link a detected update to a compliance record |

**Balancing note.** Developer 1 carries the most enhancements (three). To keep the load even, the AI rewriting sub-feature is treated as Developer 1's "if time permits" enhancement — the CRUD, worker-type classification, and benefit components are the committed core, and AI rewriting is layered on once those are stable. Developers 3 and 4 both depend on the content produced by Developers 1 and 2, so the sequencing in Section 5 lets 1 and 2 expose their data shapes early.

---

## 3. Shared Foundation

Built collaboratively before feature work begins in earnest. All four developers contribute; one developer coordinates each shared component but everyone integrates against it.

- **Authentication & session management** — login, JWT issue/verify, logout, password hashing, failed-attempt throttling.
- **RBAC** — role model and `authorize(...roles)` middleware.
- **Content visibility** — `worker_type` and `visibility_level` are shared cross-cutting fields applied consistently to all applicable compliance content entities, with query-level enforcement living in the shared layer (this is deliberately *not* owned by any single developer).
- **Search & filters** — cross-entity keyword search with country/category/worker-type/status filters.
- **Audit logging** — insert-only audit trail written on every create/update/archive/publish.
- **Common UI** — layout shell, navigation, protected routes, shared tables, form controls, status chips, worker-type chip, visibility badge, confirm dialog.

---

## 4. Implementation Phases

Phases are logical and dependency-driven. Parallel work is expected wherever dependencies allow.

### Phase 0 — Contracts & Project Setup
**Objective.** Agree the baseline API contract and stand up the development environment.
**Owner.** All developers.
**Tasks.** Initialise the Git repo, client and server scaffolds, ESLint/Prettier, and environment config. Agree the shape of shared objects (user/role, content record, work permit, review request, newsletter/update) and the `worker_type` / `visibility_level` enums. Set up the issue board.
**Exit criteria.** Repo and scaffolds run locally; baseline API contract documented; shared enums fixed; everyone can commit and open a PR.

### Phase 1 — Shared Foundation
**Objective.** Deliver auth, RBAC, the database schema, visibility enforcement, and the common UI shell.
**Owner.** All developers (each takes a slice; e.g. one leads auth, one leads schema, one leads the UI shell, one leads audit logging).
**Tasks.** Implement login/JWT/logout; `authorize(...roles)`; create all tables from the HLD schema; implement the visibility filter middleware; build the app layout, protected routes, and shared components; implement audit-log writing and the base search endpoint.
**Dependencies.** Phase 0.
**Exit criteria.** A user can log in, receive a role-appropriate dashboard, and be correctly allowed/denied by role; the schema is created; the common UI shell and shared components are usable; audit entries are written.

### Phase 2 — Core CRUD (all four features, in parallel)
**Objective.** Each developer delivers the basic CRUD for their entity against the shared foundation.
**Owners.** Dev 1 → `compliance_records`; Dev 2 → `work_permits`; Dev 3 → `review_requests`; Dev 4 → `newsletters` + `detected_updates`.
**Tasks (per developer).** Repository + service + controller + routes for create/view/update/archive; the corresponding React pages (list, detail, create/edit form with Formik + Yup); apply `worker_type` and `visibility` on content entities; write audit entries.
**Dependencies.** Phase 1.
**Exit criteria.** Each feature supports full CRUD through the UI, respects RBAC and visibility, and is searchable.

### Phase 3 — Enhancements (all four features, in parallel)
**Objective.** Each developer adds the enhanced capabilities that lift their feature beyond basic CRUD.
**Tasks.**
- **Dev 1.** Benefit-components child records (rates, caps, worker type); source-document attachments; then the AI writing assistant (grammar/rewrite/summarise/translate with accept/reject).
- **Dev 2.** Ordered process steps and required-document checklist, each grouped by process type (New / Renewal / Cancellation) under one permit record.
- **Dev 3.** The full review-status machine (`PENDING → IN_REVIEW → APPROVED`, with `CHANGES_REQUESTED` / `REJECTED` / `ARCHIVED`) plus the **publish action** that flips an approved record's content status to `PUBLISHED` and writes a version snapshot; review comments; in-app notifications on transitions. Content status (`DRAFT / PUBLISHED / ARCHIVED`) is kept separate from review status.
- **Dev 4.** AI summarisation of an uploaded newsletter; relevance flagging into detected updates; linking a detected update to a compliance record.
**Dependencies.** Phase 2. Dev 1's AI assistant and Dev 4's summariser both depend on the shared `aiService` (built here, first used by whichever needs it first).
**Exit criteria.** Every feature demonstrates CRUD plus its enhancements end to end.

### Phase 4 — Cross-Feature Integration
**Objective.** Connect the four features into one coherent system.
**Tasks.** Wire Dev 3's review workflow to operate on Dev 1's and Dev 2's records (submit a record → approve → publish creates a version snapshot). Wire Dev 4's "link/raise review" so a confirmed detected update can open a review request against the linked compliance record. Ensure search returns results across all entities with visibility applied. Verify version history is written on publish.
**Dependencies.** Phase 3 for all features.
**Exit criteria.** A record can be created, sent through review, published, searched, and — when a newsletter flags a change — updated through the workflow, all in one flow.

### Phase 5 — Hardening, Audit & Security Review
**Objective.** Close security and quality gaps.
**Owner.** All developers; one coordinates the security checklist.
**Tasks.** Verify parameterized SQL everywhere; confirm RBAC and visibility on every endpoint (server-side); validate all inputs; confirm audit coverage; add graceful-degradation handling for AI-unavailable cases; tidy error handling and loading states.
**Dependencies.** Phase 4.
**Exit criteria.** Security checklist passes; no endpoint is unprotected; AI outages do not break core features.

### Phase 6 — Integration Testing & UAT
**Objective.** Prove the integrated system works with realistic data.
**Tasks.** Seed data for the 10 priority countries (Hong Kong, India, Indonesia, Japan, Malaysia, the Philippines, Singapore, South Korea, Thailand, Vietnam; with Myanmar, Australia, and New Zealand as second priority), using the client's spreadsheet for all countries and the four detailed-country document sets (Indonesia, Japan, Philippines, Singapore) for the richest records; write integration tests for the main flows; run user-acceptance scenarios per role (Compliance authoring; Sales/CS searching; workflow approval; newsletter flagging). Fix defects.
**Dependencies.** Phase 5.
**Exit criteria.** Main flows pass for every role; demo data is in place; known defects triaged.

### Phase 7 — Final Review & Demo Preparation
**Objective.** Prepare the integrated demo and documentation.
**Tasks.** Integrate all branches to main and resolve conflicts early; rehearse the demo (each developer demonstrates their feature end to end); prepare a backup recording; finalise the HLD, this plan, the README, and the AI-usage logs required for submission.
**Dependencies.** Phase 6.
**Exit criteria.** Integrated app runs smoothly; each developer can demo their feature; documents and AI logs complete.

---

## 5. Phase Dependencies

```
[P0 Contracts & Setup]
        │
        ▼
[P1 Shared Foundation]  (auth · RBAC · schema · visibility · common UI · audit)
        │
        ▼
[P2 Core CRUD]      Dev1 records │ Dev2 permits │ Dev3 reviews │ Dev4 newsletters   (parallel)
        │
        ▼
[P3 Enhancements]   Dev1 components/AI │ Dev2 steps/docs │ Dev3 workflow │ Dev4 AI flag  (parallel)
        │
        ▼
[P4 Cross-Feature Integration]   workflow wraps content · updates link to records · search
        │
        ▼
[P5 Hardening & Security Review]
        │
        ▼
[P6 Integration Testing & UAT]   seed 10+ countries · role scenarios
        │
        ▼
[P7 Final Review & Demo]
```

**Critical path:** P0 → P1 → P2 → P3 (workflow) → P4 → P6 → P7. Developer 3's workflow is on the critical path because integration depends on it, so it should not be the last enhancement started.

**Parallel tracks:** within P2 and P3 all four developers work independently against the shared contract. Dev 1 and Dev 2 should merge their CRUD early so Dev 3 (workflow) and Dev 4 (linking) have real targets to point at.

---

## 6. Per-Developer View

| Developer | Phase 1 (shared) | Phase 2 (CRUD) | Phase 3 (enhancements) | Phase 4+ |
|-----------|------------------|----------------|------------------------|----------|
| **Dev 1** | Schema / DB lead | `compliance_records` CRUD | Benefit components → attachments → AI writing assistant | Provide record targets for workflow & update-linking; support integration |
| **Dev 2** | Common UI shell | `work_permits` CRUD | Ordered steps → document checklist → New/Renewal/Cancellation processes | Provide permit targets for workflow; support integration |
| **Dev 3** | Auth / RBAC lead | `review_requests` CRUD | State machine → comments → notifications | Integrate workflow over records & permits (critical path) |
| **Dev 4** | Audit & base search | `newsletters` + `detected_updates` CRUD | AI summarisation → relevance flagging → link to record | Integrate update→review linking; help seed data |

Each developer's demo at final review: their entity's CRUD, then their enhancements, then their part in the integrated flow.

---

## 7. Mapping to the Assignment Timeline

The phases above are logical, not calendar-bound, but they align naturally with the official assignment milestones:

| Assignment milestone | What should be true |
|----------------------|---------------------|
| **Week 5 — task allocation plan** | Feature ownership (Section 2) and shared foundation (Section 3) agreed; Phase 0 done or underway. |
| **AI seat available (from Week 7)** | Phases 1–2 largely complete; AI-dependent work (Dev 1 assistant, Dev 4 summariser) scheduled for Phase 3 once the seat is available. |
| **Week 13 — interim review (design + demo + git history)** | Phases 2–3 demonstrable: core CRUD for all four features plus early enhancements, with meaningful git history. |
| **Week 14 — interim client update** | Able to show the client that both AI needs (writing assistance and update flagging) and the local/expat requirement are addressed. |
| **Week 16 — submission** | Phases 4–5 complete; integrated code with conflicts resolved. |
| **Week 17 — final review (integrated demo)** | Phases 6–7 complete: each developer demos their feature within the integrated app, with seed data for 10+ countries. |

The exact week each phase occupies is left flexible; the ordering and exit criteria are what matter.

---

## 8. Definition of Done

A task/feature is "done" when it is: implemented against the agreed contract; validated on both client and server; protected by RBAC and visibility where applicable; covered by an audit entry where it changes data; reviewed via pull request; demonstrably working in the integrated app; and committed with a meaningful message.

---

## 9. Risk Register

| ID | Risk | Likelihood | Impact | Mitigation |
|----|------|:----------:|:------:|------------|
| R1 | API contract drift between frontend and backend | Medium | Medium | Agree a baseline in P0; document changes; use mock responses so UI can progress before an endpoint is ready |
| R2 | Dev 3's workflow (critical path) starts too late | Medium | High | Sequence workflow early in P3; Dev 1/Dev 2 merge CRUD first so Dev 3 has targets |
| R3 | Developer 1 overloaded (three enhancements) | Medium | Medium | AI rewriting is the "if time permits" piece; core CRUD + worker type + components committed first |
| R4 | AI feature scope creep / unreliability | Medium | Medium | Keep both AI features human-in-the-loop and non-blocking; degrade gracefully if the service is down; keep AI usage logs |
| R5 | Messy real-world benefit data doesn't fit fields | Low | Medium | Benefit components use text rate fields + notes to capture caps/conditions; free text preserved in `full_text` |
| R6 | Integration conflicts discovered late | Medium | High | Integrate to main incrementally; resolve conflicts early (per assignment tip for Week 16) |
| R7 | Visibility rules applied only in UI, not server | Low | High | Enforce visibility in the data layer; include it in the P5 security checklist for every endpoint |
| R8 | Over-scoping beyond a student build | Medium | High | Stick to the MVP tier; keep MFA/SSO/queues/scaling in Future Enhancements only |
| R9 | Uneven git contribution across the team | Medium | Medium | Each developer owns a feature and commits to their own branch; PR reviews; check history before Week 13 |
| R10 | Demo failure on assessment day | Low | High | Rehearse the integrated demo; prepare seed data and a backup recording |

---

*End of Project Implementation Phase Document.*
