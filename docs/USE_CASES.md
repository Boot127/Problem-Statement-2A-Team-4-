# USE CASE DOCUMENT
## HR Compliance Knowledge Management Platform (HRCKMP)

| Field | Value |
|-------|-------|
| **Document Title** | Use Cases |
| **Project** | HR Compliance Knowledge Management Platform |
| **Companion document** | [`HIGH_LEVEL_DESIGN.md`](HIGH_LEVEL_DESIGN.md) — actors are defined in its [Section 4](HIGH_LEVEL_DESIGN.md#4-stakeholders-and-user-roles); every use case below cites the functional requirement(s) it satisfies from its [Section 6](HIGH_LEVEL_DESIGN.md#6-functional-requirements) |
| **Status** | For Submission |

---

## 1. Purpose

This document walks through how each actor defined in the HLD actually uses HRCKMP, end to end. Where the HLD specifies *what* the system must do (functional requirements, data model, API), this document shows *who* does *what, in what order, and why* — the scenarios the functional requirements exist to satisfy. Every use case below traces back to one or more `FR-x.y` entries in [HIGH_LEVEL_DESIGN.md Section 6](HIGH_LEVEL_DESIGN.md#6-functional-requirements).

## 2. Actors

Taken directly from [HIGH_LEVEL_DESIGN.md Section 4](HIGH_LEVEL_DESIGN.md#4-stakeholders-and-user-roles):

| Actor | Summary |
|-------|---------|
| **Compliance Staff** | Domain owners and the most privileged content role — create/edit/version/archive all compliance content, run the AI writing assistant, upload newsletters, triage AI-flagged updates. |
| **Sales Staff** | Read and search published, permitted content only. No editing rights. |
| **Customer Service Staff** | Read and search published, permitted content only. No editing rights. |
| **System Administrator** | Manages user accounts and roles, oversees the audit trail, configures system settings — manages *people and the system*; Compliance manages *content*. |

## 3. Use Case Summary

| ID | Use Case | Primary Actor | Related FR(s) |
|----|----------|----------------|----------------|
| UC-1 | Log in | All roles | FR-0.1 – FR-0.4 |
| UC-2 | Create, edit, and archive a compliance record | Compliance Staff | FR-1.1 – FR-1.3, FR-1.7 |
| UC-3 | Capture structured benefit components | Compliance Staff | FR-1.4 |
| UC-4 | Attach a source document to a record | Compliance Staff | FR-1.5 |
| UC-5 | Run the AI writing assistant | Compliance Staff | FR-1.6 |
| UC-6 | Search across compliance content and work permits | All roles | FR-0.5 – FR-0.7 |
| UC-7 | Create, edit, and archive a work permit with steps and checklist | Compliance Staff | FR-2.1 – FR-2.6 |
| UC-8 | Submit content for review | Compliance Staff | FR-3.1 |
| UC-9 | Review, comment on, and transition a review request | Compliance Staff (reviewer) | FR-3.2 – FR-3.4, FR-3.6 |
| UC-10 | Publish an approved review | Compliance Staff (reviewer) | FR-3.5 |
| UC-11 | Upload a newsletter and run AI summarisation | Compliance Staff | FR-4.1 – FR-4.3 |
| UC-12 | Triage a detected update | Compliance Staff | FR-4.4 – FR-4.6 |
| UC-13 | View the audit trail | Compliance Staff, System Administrator | FR-0.8 |
| UC-14 | Restore or permanently delete archived content | System Administrator | Extends the Administrator role in [Section 4.4](HIGH_LEVEL_DESIGN.md#44-system-administrator) — not separately enumerated as an FR in the HLD |

---

## UC-1 — Log In

**Actor:** All roles (Compliance, Sales, Customer Service, System Administrator)
**Related FR:** FR-0.1, FR-0.2, FR-0.3, FR-0.4

**Preconditions:** The user has an active account provisioned by a System Administrator.

**Main flow:**
1. User submits email and password on the login screen.
2. System verifies credentials; on success, issues a signed JWT carrying the user's role.
3. System redirects to the dashboard appropriate to the user's role.

**Alternate flows:**
- **Wrong credentials:** system returns a generic "invalid email or password" error (never reveals which field was wrong, to prevent account enumeration).
- **Too many failed attempts:** account is throttled/locked per FR-0.3 until a System Administrator intervenes.

**Postconditions:** User holds a valid JWT; every subsequent request is authorized server-side by role (FR-0.4) before any data is returned.

---

## UC-2 — Create, Edit, and Archive a Compliance Record

**Actor:** Compliance Staff
**Related FR:** FR-1.1, FR-1.2, FR-1.3, FR-1.7

**Preconditions:** User is logged in with the `compliance` role.

**Main flow:**
1. Compliance Staff opens Compliance Content Management and creates a new record: country, category (e.g. `SOCIAL_INSURANCE`, `TERMINATION`), title, summary, full text, effective date, source URL.
2. Staff sets the record's `worker_type` (local/foreign worker/expatriate/all employees) and `visibility_level` (compliance-only/internal-staff/client-shareable).
3. Record saves with `status = DRAFT`.
4. Staff can later update any field; edits are captured in the audit log (FR-0.8) without changing the published version (see UC-10).
5. When a record is no longer current, Staff archives it (soft delete — `status = ARCHIVED`; never hard-deleted, FR-1.7).

**Alternate flows:**
- **Duplicate detected:** the system flags an existing record with the same country + title + effective date rather than silently creating a second source of truth for the same fact.
- **Archived record edited:** rejected — an archived record must be restored (UC-14) before it can be edited again.

**Postconditions:** Record exists (or is archived) and is visible to every role whose permitted visibility level includes it.

---

## UC-3 — Capture Structured Benefit Components

**Actor:** Compliance Staff
**Related FR:** FR-1.4

**Preconditions:** A compliance record of a benefit nature exists and is not archived.

**Main flow:**
1. From the record's detail page, Staff adds a benefit component: name (e.g. "Pension Fund"), applicable worker type, employer rate, employee rate, cap/ceiling, calculation basis, notes.
2. Multi-part contributions (e.g. "Social 4.24% + Pension 2% capped at IDR 11m + Health 4% capped at IDR 12m") are captured as separate component rows rather than one prose paragraph.
3. Staff can later edit or remove a component; both actions re-verify the component belongs to the record being edited before touching it.

**Postconditions:** The record's benefit structure is queryable data, not just free text.

---

## UC-4 — Attach a Source Document

**Actor:** Compliance Staff
**Related FR:** FR-1.5

**Main flow:**
1. From the record's detail page, Staff uploads a source document (PDF/DOCX/XLSX/JPG/PNG, size- and type-validated) as provenance for the record's content.
2. Staff can later delete an attachment; the file is removed from disk on a best-effort basis (a missing file never blocks the delete).

**Postconditions:** Readers can trace a record's content back to the document it was built from.

---

## UC-5 — Run the AI Writing Assistant

**Actor:** Compliance Staff
**Related FR:** FR-1.6

**Preconditions:** Record exists; `AI_API_KEY` may or may not be configured (system degrades gracefully either way, per Section 16.3 of the HLD).

**Main flow:**
1. Staff selects a mode — grammar correction, professional rewrite, summarise, or translate — and a target field (summary or full text).
2. System sends the text to the AI provider and returns a suggestion.
3. Staff reviews the suggestion side by side with the original.
4. **Accept:** suggestion replaces the field locally; Staff still must save the record (a normal edit, going through the same audit trail as any other change) — the assistant never writes to the record directly.
5. **Reject:** suggestion is discarded; original text is untouched.

**Alternate flow:** AI service is unavailable or no API key is configured — system falls back to an offline heuristic and visibly labels the result "Offline Suggestion (not real AI)" rather than silently degrading.

**Postconditions:** Original content is never modified without an explicit human accept.

---

## UC-6 — Search Across Compliance Content and Work Permits

**Actor:** All roles
**Related FR:** FR-0.5, FR-0.6, FR-0.7

**Main flow:**
1. User enters a keyword and, optionally, country/category/worker-type/status filters.
2. System searches both `compliance_records` and `work_permits`, applying the caller's permitted visibility level to each before returning results (a Sales search never surfaces `COMPLIANCE_ONLY` content, even if the underlying record's own route doesn't enforce that itself).
3. Results are combined, sorted, and paginated.

**Postconditions:** User sees only content their role and visibility permissions allow, regardless of which entity type it came from.

---

## UC-7 — Create, Edit, and Archive a Work Permit

**Actor:** Compliance Staff
**Related FR:** FR-2.1 – FR-2.6

**Main flow:**
1. Staff creates a work permit type per country: permit type, description, eligibility criteria, processing time, validity period, government fee/currency, worker type, visibility.
2. For each process variant — **New**, **Renewal**, **Cancellation** — Staff adds an ordered list of process steps (sequence, title, detail, expected timeline) and a required-document checklist (name, mandatory flag, notes), so one permit type (e.g. the 9G visa) holds all three variants rather than being duplicated as three permit records.
3. Staff can later edit the permit or archive it (soft delete).

**Postconditions:** A permit record fully describes every process variant a client might need, in one place.

---

## UC-8 — Submit Content for Review

**Actor:** Compliance Staff
**Related FR:** FR-3.1

**Preconditions:** A `DRAFT` compliance record or work permit exists.

**Main flow:**
1. From the record's detail page, Staff clicks "Submit for Review," which creates a review request targeting that record directly (rather than navigating to Review & Approval Workflow and looking the record up manually).
2. Review request is created with `review_status = PENDING`.

**Postconditions:** A review request exists, pointing at the target record, ready for a reviewer to act on.

---

## UC-9 — Review, Comment On, and Transition a Review Request

**Actor:** Compliance Staff (acting as reviewer)
**Related FR:** FR-3.2, FR-3.3, FR-3.4, FR-3.6

**Main flow:**
1. Reviewer views pending review requests.
2. Reviewer moves the request through `PENDING → IN_REVIEW → APPROVED`, or diverts to `CHANGES_REQUESTED` / `REJECTED`. Each transition triggers an in-app notification.
3. Reviewer (or the submitter) may add comments at any point in the request's life.
4. Completed or rejected requests may later be archived.

**Postconditions:** The review request's status reflects the team's decision, independent of the target record's own `DRAFT`/`PUBLISHED`/`ARCHIVED` status.

---

## UC-10 — Publish an Approved Review

**Actor:** Compliance Staff (reviewer)
**Related FR:** FR-3.5

**Preconditions:** Review request status is `APPROVED` and has not already been published.

**Main flow:**
1. Reviewer publishes the request.
2. System writes a version snapshot of the target record into `record_versions`, increments the target's `version`, and flips the target's content `status` to `PUBLISHED`.
3. Notification is sent announcing the new published version.
4. On the target record's detail page, the new version now appears in its version history, linked back to the review that published it.

**Postconditions:** The record is retrievable to every permitted reader at its new published version; prior draft edits since the last publish are preserved only in the audit log, not as separate version rows (per HLD Section 12.2 — draft edits don't inflate the version count).

---

## UC-11 — Upload a Newsletter and Run AI Summarisation

**Actor:** Compliance Staff
**Related FR:** FR-4.1, FR-4.2, FR-4.3

**Main flow:**
1. Staff adds a newsletter record (title, country, source, published date, optional notes) and uploads the source file (`.txt`/`.pdf`/`.docx`).
2. Staff triggers AI summarisation: system extracts text from the file (falling back to the title/notes if extraction isn't supported for that file type), sends it to the AI provider, and stores the resulting summary plus a relevance flag and reason as a `detected_update` linked to the newsletter.
3. Re-running summarisation on the same newsletter overwrites the previous summary and resets its review decision back to pending, since the underlying content may have changed.

**Postconditions:** A candidate detected update exists, awaiting human review — the system never asserts a law has definitively changed.

---

## UC-12 — Triage a Detected Update

**Actor:** Compliance Staff
**Related FR:** FR-4.4, FR-4.5, FR-4.6

**Main flow:**
1. Staff reviews a newsletter's detected update: AI summary, flag reason, relevance.
2. **Confirm:** Staff links the update to an existing compliance record (`linked_compliance_area`) and may separately raise a review request (UC-8) to actually update that record.
3. **Dismiss:** Staff marks the update as not relevant; no further action taken.
4. Newsletter and its detected update may later be archived.

**Postconditions:** Every AI-flagged candidate ends in an explicit human decision — confirmed-and-linked or dismissed — never silently ignored.

---

## UC-13 — View the Audit Trail

**Actor:** Compliance Staff (own actions only), System Administrator (full trail)
**Related FR:** FR-0.8

**Main flow:**
1. User opens the audit log view.
2. Compliance Staff sees only entries where they are the acting user; System Administrator sees every entry across every user.
3. Each entry shows the user, action (create/update/archive/publish/login/logout), entity type and ID, and before/after values where applicable.

**Postconditions:** Every create, update, archive, and publish across the system is traceable to who did it and when, without exception.

---

## UC-14 — Restore or Permanently Delete Archived Content

**Actor:** System Administrator
**Related:** Extends the Administrator's role described in [HIGH_LEVEL_DESIGN.md Section 4.4](HIGH_LEVEL_DESIGN.md#44-system-administrator) ("oversees the audit trail, configures system settings"); implemented as Admin Archive Management, spanning all three archivable entity types, but not separately enumerated as an `FR-x.y` in the HLD's functional requirements.

**Preconditions:** User holds the `admin` role. A compliance record, work permit, or review request exists in `ARCHIVED` status.

**Main flow:**
1. Administrator opens Admin Archive Management and filters by entity type (compliance content / work permit / review).
2. **Restore:** Administrator restores an archived item to its prior status (the status it held immediately before archiving; if that isn't known, the system falls back to whether it has ever been published).
3. **Permanently delete:** Administrator permanently removes an archived item — but only if nothing else in the system references it (an item that has been reviewed or published has protected history and cannot be permanently deleted until that history is explained to be gone, which never happens automatically).
4. Every restore or permanent delete writes an audit entry (`RESTORE_ARCHIVED` / `PERMANENT_DELETE`), same as any other administrative action.

**Alternate flow:** Deletion is blocked with a 409-equivalent error if the item has review or publication history — this is a deliberate guard, not a bug, since permanently deleting a record that other data still points to (a review request, a version snapshot) would corrupt referential integrity.

**Postconditions:** Archived content is either returned to active use or permanently removed, always with an audit trail, and never in a way that orphans other records.
