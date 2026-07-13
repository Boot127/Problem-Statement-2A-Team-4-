# HIGH-LEVEL DESIGN DOCUMENT
## HR Compliance Knowledge Management Platform (HRCKMP)

| Field | Value |
|-------|-------|
| **Document Title** | High-Level Design (HLD) |
| **Project** | HR Compliance Knowledge Management Platform |
| **Version** | 2.1 |
| **Status** | For Submission |
| **Team Size** | 4 Developers |
| **Technology Stack** | React.js · Material UI · React Router · Axios · Formik + Yup · Node.js · Express.js · MySQL |

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Business Problem](#2-business-problem)
3. [Objectives](#3-objectives)
4. [Stakeholders and User Roles](#4-stakeholders-and-user-roles)
5. [Feature Ownership (4 Developers)](#5-feature-ownership-4-developers)
6. [Functional Requirements](#6-functional-requirements)
7. [Scope: MVP / Optional / Future](#7-scope-mvp--optional--future)
8. [Non-Functional Requirements](#8-non-functional-requirements)
9. [System Architecture](#9-system-architecture)
10. [Frontend Architecture](#10-frontend-architecture)
11. [Backend Architecture](#11-backend-architecture)
12. [Database Design](#12-database-design)
13. [Entity Relationship Diagram](#13-entity-relationship-diagram)
14. [API Documentation](#14-api-documentation)
15. [Security Design](#15-security-design)
16. [AI Features](#16-ai-features)
17. [Folder Structure](#17-folder-structure)
18. [Future Enhancements](#18-future-enhancements)

---

## 1. Project Overview

The **HR Compliance Knowledge Management Platform (HRCKMP)** is a centralized, web-based system that consolidates labour laws, statutory benefits, and work-permit application processes for **10 or more Asian countries** into a single authoritative source of truth.

As confirmed in the client requirements meeting, the **10 priority countries** are: **Hong Kong, India, Indonesia, Japan, Malaysia, the Philippines, Singapore, South Korea, Thailand, and Vietnam**. **Myanmar, Australia, and New Zealand** are second-priority countries to be added subsequently. The design supports adding further countries without schema change.

Today the consultancy maintains this knowledge across Word documents, Excel spreadsheets, PDFs, and email newsletters saved in shared folders. Each staff member formats content differently, some countries have more detail than others, and the same fact can appear in two documents with two different values. This fragmentation produces inconsistent, hard-to-find, and frequently outdated information, which directly increases compliance risk and slows down the Sales, Customer Service, and Compliance teams who depend on it every day.

HRCKMP replaces that fragmented landscape with a structured relational repository, a fast filtered search experience, a controlled review-and-publication workflow with full version history, and two focused AI capabilities: an **AI writing assistant** that helps regional staff produce clear, professional English (and translate content), and **AI-assisted update flagging** that reads uploaded newsletters and surfaces items that *may* affect existing records for a compliance officer to confirm.

The platform is a classic three-tier web application:

- **Presentation tier** — a React.js single-page application using Material UI for a consistent, accessible component library, React Router for navigation, Axios for HTTP, and Formik + Yup for form management and validation.
- **Application tier** — a Node.js + Express.js REST API enforcing authentication, role-based authorization, content-visibility rules, business logic, and validation.
- **Data tier** — a normalized MySQL relational database storing all compliance content, version history, review activity, detected updates, audit logs, and user accounts.

The system is built for internal users of a small-to-medium professional services firm (Compliance, Sales, Customer Service, and an Administrator), which shapes its security, scale, and usability decisions.

---

## 2. Business Problem

The consultancy's compliance knowledge is the core asset of the business, yet it is managed in a way that undermines its value.

**Current pain points**

- **Fragmentation.** The same fact (for example, an employer social-security contribution rate) may exist in three different documents with three different values, and staff cannot tell which is correct.
- **Manual updates.** Updates are applied by hand, document by document, with no single point of control. Changes are easily missed or applied inconsistently.
- **Poor retrieval.** Finding information means opening and scanning many files across shared folders; there is no unified search. A Sales representative answering a client question may spend several minutes locating an answer that should take seconds.
- **Staleness.** Content silently becomes out of date when a country amends its rules, because nothing links the record to the source that changed.
- **No change awareness.** Labour-law changes arrive informally through newsletters (e.g. Lexology). There is no systematic process to notice a change and flag the affected record for review. The Compliance manager currently spends hours each week reading newsletters manually.
- **Compliance risk.** Advising a client on outdated statutory rules exposes both the client and the consultancy to legal and financial penalties.
- **Language quality.** Staff based in neighbouring countries produce content in English of varying quality; the manager needs help making entries grammatically correct and professionally worded, and translating where needed.
- **No accountability trail.** There is no record of who changed what, when, or why.

**Business impact.** Slow retrieval reduces billable productivity; inconsistent data erodes client trust; stale data creates direct legal/financial exposure; and the absence of an audit trail makes quality assurance and dispute resolution difficult. Coverage gaps also appear when the officer responsible for a country is on leave or when a regional public holiday closes an office. The firm therefore requires a platform that makes compliance knowledge **centralized, consistent, current, searchable, traceable, and proactively monitored.**

---

## 3. Objectives

1. **Centralize** all labour laws, statutory benefits, and work-permit processes for 10+ Asian countries into one relational system, eliminating document-and-folder sprawl.
2. **Standardize** the structure of compliance information so every country is documented against the same flexible schema and the same categories, enabling reliable cross-country comparison.
3. **Distinguish worker types.** Represent, for every applicable record, whether it applies to local employees, foreign workers, or expatriates — an explicit client requirement.
4. **Control content visibility** so that internal-only and commercially sensitive information is never exposed to client-facing users.
5. **Accelerate retrieval** through fast, filterable search across all content.
6. **Guarantee currency** by versioning every published record, tracking content status (draft / published / archived) separately from review-request status, and recording effective dates.
7. **Improve content quality** with an AI writing assistant that helps staff produce professional English and translate content, always under human review.
8. **Raise change awareness** with AI-assisted flagging of newsletter items that may affect existing records, routed to Compliance for confirmation.
9. **Provide traceability** through a complete, insert-only audit log of every create, update, and archive.
10. **Enforce access control** so each role performs only the actions appropriate to it.

---

## 4. Stakeholders and User Roles

Access is governed by two complementary mechanisms: **Role-Based Access Control (RBAC)**, which governs *what actions a user may perform*, and **content visibility levels**, which govern *what content a user may see* (see Section 15).

### 4.1 Compliance Staff
Domain owners and the most privileged content role. They create, edit, version, and archive all compliance content; run the AI writing assistant; upload newsletters; and triage AI-flagged updates.

### 4.2 Sales Staff
Consultants who use accurate compliance information to support pre-sales conversations and client advisory. Read and search published, permitted content only. No editing rights.

### 4.3 Customer Service Staff
Front-line staff answering client questions after the sale. Read and search published, permitted content only. No editing rights.

### 4.4 System Administrator
Technical custodian: manages user accounts and roles, oversees the audit trail, and configures system settings. Manages *people and the system*; Compliance manages *content*.

### 4.5 Role / Permission Summary

| Capability | Compliance | Sales | Customer Service | Administrator |
|------------|:----------:|:-----:|:----------------:|:-------------:|
| View & search permitted content | ✅ | ✅ | ✅ | ✅ |
| Create / edit / archive content | ✅ | ❌ | ❌ | ❌ |
| Run AI writing assistant | ✅ | ❌ | ❌ | ❌ |
| Upload newsletters / triage updates | ✅ | ❌ | ❌ | ❌ |
| Submit / review / approve / publish | ✅ | ❌ | ❌ | ❌ |
| See `COMPLIANCE_ONLY` content | ✅ | ❌ | ❌ | ✅ (view) |
| See `INTERNAL_STAFF` content | ✅ | ✅ | ✅ | ✅ |
| See `CLIENT_SHAREABLE` content | ✅ | ✅ | ✅ | ✅ |
| Manage users & roles | ❌ | ❌ | ❌ | ✅ |
| View audit logs | ✅ (own scope) | ❌ | ❌ | ✅ (all) |

Legend: ✅ allowed · ❌ not allowed.

---

## 5. Feature Ownership (4 Developers)

The assignment requires every student to develop **at least one feature with basic (CRUD) and enhanced functions**. The platform is therefore divided into **four main full-stack features**, one per developer, each a distinct entity with full CRUD plus enhancements. The four features are deliberately tied to the client's biggest pain points. A **shared foundation** (auth, RBAC, search, audit logging, common UI, and the cross-cutting `worker_type` and `visibility_level` fields) is built collaboratively.

| Developer | Main Feature | Core Entity | CRUD | Enhanced Capabilities |
|-----------|--------------|-------------|------|-----------------------|
| **Developer 1** | Compliance Content Management | `compliance_records` (labour laws + statutory benefits, incl. WICA, social insurance, termination, leave) | Create, view, update, archive records | Local/foreign/expat classification · structured benefit components (rates & caps) · AI grammar & professional rewriting · source-document attachments |
| **Developer 2** | Work Permit Management | `work_permits` | Create, view, update, archive permit types | Ordered step-by-step process flow · required-document checklist · New / Renewal / Cancellation as child processes of one permit |
| **Developer 3** | Review & Approval Workflow | `review_requests` (standalone entity that points at any content record) | Create submission, view pending reviews, update review status, archive/reject | Review-status machine (Pending → In Review → Approved, with Changes Requested / Rejected) · publish action (sets content to Published + writes version snapshot) · review comments · notifications |
| **Developer 4** | Legal Updates / Newsletter Management | `newsletters` + `detected_updates` | Upload/add newsletters, view detected updates, update review status, archive/dismiss | AI summarisation of newsletter items · relevance flagging · link a detected update to an existing compliance record |

### 5.1 Shared foundation (built together)
- **Authentication & session management** (login, JWT, logout).
- **RBAC** middleware (`authorize(...roles)`) and role model.
- **Content visibility** enforcement: `worker_type` and `visibility_level` are shared cross-cutting fields applied consistently to all applicable compliance content entities, with query-level enforcement in the shared layer.
- **Search & filters** across all content entities (country, category, worker type, status).
- **Audit logging** of every create / update / archive.
- **Common UI components** (page layout, tables, form controls, status chips, confirm dialogs).

### 5.2 How the four features connect
- Developer 3's workflow **wraps** the content produced by Developers 1 and 2 — a `review_request` references a target record and drives it through the publish lifecycle.
- Developer 4's detected updates **link back** to Developer 1's compliance records (and may raise a review through Developer 3's workflow).
- The content features rely on the **shared** `worker_type` and `visibility_level` fields (applied to applicable compliance content entities) and the shared search index, so these are defined once in the foundation, not inside any single feature.

---

## 6. Functional Requirements

Requirements are grouped by owner. Each is labelled `FR-x.y` for traceability to test cases.

### FR-0 Shared Foundation (all developers)
- **FR-0.1** Registered users shall log in with email and password; the system shall issue a signed JWT.
- **FR-0.2** The system shall log out users and invalidate the session.
- **FR-0.3** The system shall throttle or lock accounts after a configurable number of failed login attempts.
- **FR-0.4** Authorization shall be enforced server-side, per role, on every protected route.
- **FR-0.5** Every content record shall carry a `worker_type` (`LOCAL`, `FOREIGN_WORKER`, `EXPATRIATE`, `ALL_EMPLOYEES`).
- **FR-0.6** Every content record shall carry a `visibility_level` (`COMPLIANCE_ONLY`, `INTERNAL_STAFF`, `CLIENT_SHAREABLE`); queries shall exclude content the user's role may not see. `CLIENT_SHAREABLE` denotes information staff are permitted to communicate to a client — the platform itself remains internal-only (clients do not log in).
- **FR-0.7** All authenticated users shall search across permitted content and filter by country, category, worker type, and status.
- **FR-0.8** The system shall write an immutable audit entry for every create, update, and archive.

### FR-1 Compliance Content Management (Developer 1)
- **FR-1.1** Compliance staff shall create, view, update, and archive compliance records, each linked to one country.
- **FR-1.2** Each record shall carry a category (e.g. `LABOUR_LAW`, `SOCIAL_INSURANCE`, `WICA`, `TERMINATION`, `ANNUAL_LEAVE`, `SICK_LEAVE`, `MATERNITY_PATERNITY`, `STATUTORY_BENEFIT`, `GENERAL_GUIDELINE`), a title, summary, full text, effective date, source URL, version, and status.
- **FR-1.3** Each record shall record its applicable `worker_type` and `visibility_level`.
- **FR-1.4** Records of a benefit nature shall support structured **benefit components** (component name, employer rate, employee rate, cap/ceiling, worker type, notes) so that multi-part contributions (e.g. social + pension + health with separate caps) are captured as data, not only prose.
- **FR-1.5** Compliance staff shall attach source documents (PDF/DOCX) to a record for provenance.
- **FR-1.6** Compliance staff shall invoke the **AI writing assistant** on a record's text to improve grammar, rewrite professionally, summarise, or translate; suggestions are shown for accept/reject and never overwrite published content automatically (see Section 16).
- **FR-1.7** Archiving shall be a soft delete (content `status = ARCHIVED`); records are never hard-deleted.

### FR-2 Work Permit Management (Developer 2)
- **FR-2.1** Compliance staff shall create, view, update, and archive work-permit types per country.
- **FR-2.2** Each permit shall record permit type, description, eligibility criteria, processing time, validity period, government fee & currency, worker type, and visibility level.
- **FR-2.3** Each permit shall support, for each process type (New / Renewal / Cancellation), an **ordered list of process steps** (sequence number, title, description, expected timeline), stored as structured child records rather than a text blob.
- **FR-2.4** Each permit shall support a **required-document checklist** per process type (document name, mandatory flag, notes, sort order), since a renewal may need a different checklist from a new application.
- **FR-2.5** Each permit shall be modeled as a single record holding up to three **process flows** — **New**, **Renewal**, and **Cancellation** — rather than as three separate permit records, so that one permit type (e.g. the 9G visa) is a single item with its process variants grouped beneath it.
- **FR-2.6** Archiving shall be a soft delete.

### FR-3 Review & Approval Workflow (Developer 3)
- **FR-3.1** Compliance staff shall create a review request that references a target content record (a compliance record or a work permit).
- **FR-3.2** Staff shall view pending review requests assigned to or visible to them.
- **FR-3.3** A reviewer shall move a review request through its status: `PENDING → IN_REVIEW → APPROVED`, or `CHANGES_REQUESTED` / `REJECTED`; completed requests may be `ARCHIVED`. This review status is tracked independently of the target record's content status.
- **FR-3.4** Reviewers shall add **review comments** to a request.
- **FR-3.5** When a request reaches `APPROVED`, a Compliance user may **publish** the revision: this sets the target record's content status to `PUBLISHED`, makes it retrievable to permitted readers, and creates a new version snapshot in `record_versions`. Draft edits made before publication are recorded in the audit log but do **not** create a new published version.
- **FR-3.6** State transitions shall trigger **notifications** to the relevant users (in-app; email optional).
- **FR-3.7** Completed or rejected requests shall be archivable.

### FR-4 Legal Updates / Newsletter Management (Developer 4)
- **FR-4.1** Compliance staff shall upload or add a newsletter (PDF/text), optionally tagged to a country and source.
- **FR-4.2** The system shall extract the newsletter text and record processing status (`pending → processing → processed / failed`).
- **FR-4.3** The system shall use AI to **summarise** the newsletter and identify individual items that *may* be relevant labour-law or immigration updates (see Section 16). The system presents these as candidate **detected updates** for human review; it does not assert that a law has definitively changed.
- **FR-4.4** Each detected update shall carry a summary, a relevance indicator, a review status (`new / reviewing / confirmed / dismissed`), and optional links.
- **FR-4.5** Compliance staff shall review a detected update and **link it to an existing compliance record**, dismiss it, or raise a review request (FR-3) to update that record.
- **FR-4.6** Detected updates and newsletters shall be archivable.

---

## 7. Scope: MVP / Optional / Future

To keep the build realistic for a four-person student team and to avoid a large design-implementation gap, features are tiered. The MVP is what the team commits to demonstrate.

### MVP (committed)
- Email/password login with JWT
- RBAC + content visibility levels
- Compliance Content Management (CRUD + worker type + benefit components + AI writing assistant + source attachment)
- Work Permit Management (CRUD + ordered steps + document checklist + process variants)
- Review & Approval workflow (CRUD + state machine + comments + in-app notifications)
- Legal Updates / Newsletter Management (CRUD + AI summarisation + relevance flagging + link to record)
- Search & filters across content
- Version history
- Audit logging

### Optional (if time permits)
- Email notifications (in addition to in-app)
- PDF export of a record or country pack
- Bulk import of legacy content from the existing spreadsheet
- Country-comparison view

### Future Enhancements (documented, not built)
- Automated newsletter ingestion via email/RSS (no manual upload)
- Semantic/embedding search and a natural-language Q&A assistant
- Multi-language UI localization
- M365 SSO and Multi-Factor Authentication (MFA)
- SMS/Teams/Slack notification channels
- Redis/RabbitMQ job queues and horizontal scaling
- Public/client-facing self-service portal
- Public Holidays calendar module

---

## 8. Non-Functional Requirements

Scoped to an internal tool for a small team; enterprise-scale items are deferred to Section 18.

### NFR-1 Security
- Passwords stored with bcrypt (work factor ≥ 12); never stored or logged in plaintext.
- All traffic over HTTPS/TLS in deployment.
- All endpoints except login require a valid JWT; authorization enforced server-side per role.
- All inputs validated; all SQL parameterized to prevent injection; output encoded to prevent XSS.
- Content visibility enforced in every content query, not only in the UI.

### NFR-2 Performance
- Typical search and list queries return within ~2 seconds on the project dataset.
- List endpoints are paginated (default 20, max 100) and never return unbounded result sets.
- AI calls run without blocking core CRUD; the UI shows a clear loading state.

### NFR-3 Usability
- UI follows Material Design via MUI for consistency and reasonable accessibility.
- Common tasks (search, open a record) reachable in three clicks or fewer from the dashboard.
- Forms provide inline, field-level validation (Formik + Yup).

### NFR-4 Maintainability
- Layered structure: routes → controllers → services → data access, with clear separation of concerns.
- ESLint + Prettier; consistent naming.
- API versioned under `/api/v1`.
- Secrets and configuration in environment variables, never hard-coded.

### NFR-5 Reliability
- The system degrades gracefully: if an AI feature is unavailable, content, search, and workflow remain fully functional.
- Regular database backups with a documented restore procedure.

---

## 9. System Architecture

```
        ┌─────────────────────────────────────────────┐
        │                 CLIENT (Browser)             │
        │   React SPA · MUI · React Router · Axios      │
        │   Formik + Yup · Auth context · Route guards  │
        └───────────────────────┬─────────────────────┘
                                 │  HTTPS / JSON (JWT in header)
                                 ▼
        ┌─────────────────────────────────────────────┐
        │           APPLICATION TIER (Node/Express)     │
        │                                               │
        │  Middleware:  auth (JWT) · rbac · visibility  │
        │               validate · errorHandler         │
        │                                               │
        │  Routes → Controllers → Services → Repos       │
        │                                               │
        │  Feature services:                             │
        │   • ComplianceContentService  (Dev 1)          │
        │   • WorkPermitService         (Dev 2)          │
        │   • ReviewWorkflowService     (Dev 3)          │
        │   • NewsletterUpdateService   (Dev 4)          │
        │  Shared services: Auth · Search · Audit · AI    │
        └───────────────────────┬─────────────────────┘
                                 │  parameterized SQL (mysql2)
                                 ▼
        ┌─────────────────────────────────────────────┐
        │              DATA TIER (MySQL 8, InnoDB)      │
        │  users · countries · compliance_records ·     │
        │  benefit_components · work_permits ·          │
        │  work_permit_steps · permit_documents ·       │
        │  review_requests · review_comments ·          │
        │  newsletters · detected_updates ·             │
        │  record_versions · audit_logs                 │
        └───────────────────────┬─────────────────────┘
                                 │  outbound HTTPS
                                 ▼
        ┌─────────────────────────────────────────────┐
        │        EXTERNAL AI SERVICE (Anthropic Claude) │
        │  Writing assistant · Newsletter summarisation  │
        └─────────────────────────────────────────────┘
```

The API is stateless (all session state in the JWT and the database), which keeps the design simple and testable.

---

## 10. Frontend Architecture

**Technology roles.** React builds the component-based UI; React Router handles client-side navigation and protected routes; Axios centralizes HTTP with a base instance and interceptors that attach the JWT and handle 401s; Formik + Yup manage form state and validation; MUI provides the component library and theme.

**Layered structure.**
- `pages/` — route-level views, grouped by the four features (`content/`, `permits/`, `reviews/`, `updates/`) plus `search/`, `admin/`, `LoginPage`, `DashboardPage`.
- `components/` — reusable UI: `common/` (PageHeader, StatusChip, ConfirmDialog, WorkerTypeChip, VisibilityBadge), `forms/`, `tables/`.
- `api/` — one Axios service module per resource.
- `context/` — `AuthContext` (current user, role, token).
- `routes/` — `AppRoutes`, `ProtectedRoute` (auth + role guard).
- `hooks/`, `utils/`.

**Cross-cutting concerns.** A single Axios instance injects the token and redirects to login on 401. `ProtectedRoute` guards by authentication and role. The visibility badge and worker-type chip are shared components so all four features render these consistently.

---

## 11. Backend Architecture

**Layered design.**
1. **Routes** — map HTTP verbs/paths to controllers; apply `auth`, `rbac`, and `validate` middleware.
2. **Controllers** — parse/validate the request, call a service, shape the response.
3. **Services** — business logic and transactions (one service per feature, plus shared Auth/Search/Audit/AI).
4. **Repositories** — parameterized SQL data access.

**Cross-cutting middleware.** `auth` verifies the JWT; `rbac` enforces role; `visibility` filters content by the caller's permitted visibility levels; `validate` checks the request body; `errorHandler` formats errors consistently.

**Module overview.**
- `authService` — login, token issue/verify, password hashing.
- `complianceContentService` — Dev 1 CRUD, benefit components, attachments, AI-writing calls.
- `workPermitService` — Dev 2 CRUD, steps, documents, process variants.
- `reviewWorkflowService` — Dev 3 review requests, state machine, comments, notifications.
- `newsletterUpdateService` — Dev 4 upload, text extraction, AI summarisation, detected updates, linking.
- `searchService`, `auditService`, `aiService` — shared.

---

## 12. Database Design

MySQL 8.0, InnoDB, `utf8mb4` (full Unicode for multi-country content). Monetary values use `DECIMAL`; timestamps use `DATETIME`; referential integrity enforced with foreign keys. Designed to Third Normal Form: multi-valued attributes (benefit components, permit steps, permit documents, review comments) are normalized into child tables.

Two cross-cutting enumerations are used across content tables:

```sql
-- worker_type    : 'LOCAL' | 'FOREIGN_WORKER' | 'EXPATRIATE' | 'ALL_EMPLOYEES'
-- visibility     : 'COMPLIANCE_ONLY' | 'INTERNAL_STAFF' | 'CLIENT_SHAREABLE'
-- content status : 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'   (state of a content record)
-- review status  : 'PENDING' | 'IN_REVIEW' | 'APPROVED' | 'CHANGES_REQUESTED'
--                  | 'REJECTED' | 'ARCHIVED'            (state of a review request)
-- Note: content status and review status are deliberately separate. A record is
-- DRAFT until an approved review is published; PUBLISHED is a fact about the
-- content, not about the review request. Superseded prior versions live in
-- record_versions, so no 'superseded' content status is needed.
```

### 12.1 CREATE TABLE statements

```sql
-- ============================================================
-- HRCKMP — Schema (MySQL 8.0) | Engine: InnoDB | Charset: utf8mb4
-- ============================================================

-- ---------- COUNTRIES ----------
CREATE TABLE countries (
    country_id    INT UNSIGNED NOT NULL AUTO_INCREMENT,
    country_code  CHAR(2)      NOT NULL,             -- ISO 3166-1 alpha-2
    country_name  VARCHAR(100) NOT NULL,
    region        VARCHAR(50)  NULL,
    currency_code CHAR(3)      NULL,                 -- ISO 4217
    is_active     BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
                               ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (country_id),
    UNIQUE KEY uq_country_code (country_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------- USERS ----------
CREATE TABLE users (
    user_id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
    full_name       VARCHAR(120) NOT NULL,
    email           VARCHAR(160) NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,           -- bcrypt
    role            ENUM('compliance','sales','customer_service','admin') NOT NULL,
    is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
    failed_attempts TINYINT UNSIGNED NOT NULL DEFAULT 0,
    last_login_at   DATETIME     NULL,
    created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
                                 ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id),
    UNIQUE KEY uq_users_email (email),
    KEY idx_users_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- DEVELOPER 1 — Compliance Content Management
-- ============================================================

-- ---------- COMPLIANCE RECORDS (labour laws + statutory benefits) ----------
CREATE TABLE compliance_records (
    record_id      INT UNSIGNED NOT NULL AUTO_INCREMENT,
    country_id     INT UNSIGNED NOT NULL,
    category       ENUM('LABOUR_LAW','SOCIAL_INSURANCE','WICA','TERMINATION',
                        'ANNUAL_LEAVE','SICK_LEAVE','MATERNITY_PATERNITY',
                        'WORKING_HOURS','STATUTORY_BENEFIT','GENERAL_GUIDELINE',
                        'OTHER') NOT NULL,
    title          VARCHAR(200) NOT NULL,
    summary        VARCHAR(500) NULL,
    full_text      MEDIUMTEXT   NULL,
    worker_type    ENUM('LOCAL','FOREIGN_WORKER','EXPATRIATE','ALL_EMPLOYEES')
                                NOT NULL DEFAULT 'ALL_EMPLOYEES',
    visibility     ENUM('COMPLIANCE_ONLY','INTERNAL_STAFF','CLIENT_SHAREABLE')
                                NOT NULL DEFAULT 'INTERNAL_STAFF',
    effective_date DATE         NULL,
    source_url     VARCHAR(500) NULL,
    version        INT UNSIGNED NOT NULL DEFAULT 1,
    status         ENUM('DRAFT','PUBLISHED','ARCHIVED')
                                NOT NULL DEFAULT 'DRAFT',
    created_by     INT UNSIGNED NULL,
    updated_by     INT UNSIGNED NULL,
    created_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
                                ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (record_id),
    KEY idx_rec_country (country_id),
    KEY idx_rec_category (category),
    KEY idx_rec_status (status),
    KEY idx_rec_worker (worker_type),
    KEY idx_rec_visibility (visibility),
    CONSTRAINT fk_rec_country FOREIGN KEY (country_id)
        REFERENCES countries(country_id) ON DELETE RESTRICT,
    CONSTRAINT fk_rec_created FOREIGN KEY (created_by)
        REFERENCES users(user_id) ON DELETE SET NULL,
    CONSTRAINT fk_rec_updated FOREIGN KEY (updated_by)
        REFERENCES users(user_id) ON DELETE SET NULL,
    FULLTEXT KEY ft_rec_search (title, summary, full_text)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------- BENEFIT COMPONENTS (structured rates/caps, 1:M) ----------
-- Captures multi-part contributions such as "Social 4.24% + Pension 2%
-- capped at IDR 11m + Health 4% capped at IDR 12m" as discrete rows.
CREATE TABLE benefit_components (
    component_id     INT UNSIGNED NOT NULL AUTO_INCREMENT,
    record_id        INT UNSIGNED NOT NULL,
    component_name   VARCHAR(150) NOT NULL,           -- e.g. 'Pension Fund'
    worker_type      ENUM('LOCAL','FOREIGN_WORKER','EXPATRIATE','ALL_EMPLOYEES')
                                  NOT NULL DEFAULT 'ALL_EMPLOYEES',
    employer_rate    VARCHAR(120) NULL,               -- text: rates vary/have conditions
    employee_rate    VARCHAR(120) NULL,
    cap_ceiling      VARCHAR(150) NULL,               -- e.g. 'IDR 11,086,300 / month'
    calculation_basis VARCHAR(200) NULL,              -- e.g. 'monthly gross salary'
    notes            VARCHAR(500) NULL,
    sort_order       INT UNSIGNED NOT NULL DEFAULT 0,
    PRIMARY KEY (component_id),
    KEY idx_comp_record (record_id),
    CONSTRAINT fk_comp_record FOREIGN KEY (record_id)
        REFERENCES compliance_records(record_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------- RECORD ATTACHMENTS (source documents, 1:M) ----------
CREATE TABLE record_attachments (
    attachment_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    record_id     INT UNSIGNED NOT NULL,
    file_name     VARCHAR(250) NOT NULL,
    file_path     VARCHAR(500) NOT NULL,
    file_type     VARCHAR(60)  NULL,
    uploaded_by   INT UNSIGNED NULL,
    uploaded_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (attachment_id),
    KEY idx_att_record (record_id),
    CONSTRAINT fk_att_record FOREIGN KEY (record_id)
        REFERENCES compliance_records(record_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- DEVELOPER 2 — Work Permit Management
-- ============================================================

CREATE TABLE work_permits (
    permit_id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
    country_id           INT UNSIGNED NOT NULL,
    permit_type          VARCHAR(120) NOT NULL,       -- e.g. '9G Pre-Arranged Employment'
    title                VARCHAR(200) NOT NULL,
    description          MEDIUMTEXT   NULL,
    eligibility_criteria MEDIUMTEXT   NULL,
    processing_time_days INT UNSIGNED NULL,
    validity_months      INT UNSIGNED NULL,
    government_fee       DECIMAL(12,2) NULL,
    currency_code        CHAR(3)      NULL,
    worker_type          ENUM('LOCAL','FOREIGN_WORKER','EXPATRIATE','ALL_EMPLOYEES')
                                      NOT NULL DEFAULT 'FOREIGN_WORKER',
    visibility           ENUM('COMPLIANCE_ONLY','INTERNAL_STAFF','CLIENT_SHAREABLE')
                                      NOT NULL DEFAULT 'INTERNAL_STAFF',
    source_url           VARCHAR(500) NULL,
    version              INT UNSIGNED NOT NULL DEFAULT 1,
    status               ENUM('DRAFT','PUBLISHED','ARCHIVED')
                                      NOT NULL DEFAULT 'DRAFT',
    created_by           INT UNSIGNED NULL,
    updated_by           INT UNSIGNED NULL,
    created_at           DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at           DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
                                      ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (permit_id),
    KEY idx_permit_country (country_id),
    KEY idx_permit_status (status),
    CONSTRAINT fk_permit_country FOREIGN KEY (country_id)
        REFERENCES countries(country_id) ON DELETE RESTRICT,
    CONSTRAINT fk_permit_created FOREIGN KEY (created_by)
        REFERENCES users(user_id) ON DELETE SET NULL,
    CONSTRAINT fk_permit_updated FOREIGN KEY (updated_by)
        REFERENCES users(user_id) ON DELETE SET NULL,
    FULLTEXT KEY ft_permit_search (title, description, eligibility_criteria)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------- WORK PERMIT STEPS (ordered process flow, 1:M) ----------
-- New / Renewal / Cancellation are modeled as child PROCESSES of one permit:
-- the ordered steps are grouped by process_type, so a single permit (e.g. '9G')
-- holds up to three step sequences rather than being duplicated as three permits.
CREATE TABLE work_permit_steps (
    step_id        INT UNSIGNED NOT NULL AUTO_INCREMENT,
    permit_id      INT UNSIGNED NOT NULL,
    process_type   ENUM('NEW','RENEWAL','CANCELLATION') NOT NULL DEFAULT 'NEW',
    step_number    INT UNSIGNED NOT NULL,
    step_title     VARCHAR(200) NOT NULL,
    step_detail    MEDIUMTEXT   NULL,
    expected_timeline VARCHAR(120) NULL,              -- e.g. '15 days publication'
    PRIMARY KEY (step_id),
    KEY idx_step_permit (permit_id, process_type),
    CONSTRAINT fk_step_permit FOREIGN KEY (permit_id)
        REFERENCES work_permits(permit_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------- PERMIT DOCUMENTS (required-document checklist, 1:M) ----------
-- Also grouped by process_type: a renewal may require a different checklist
-- from a new application.
CREATE TABLE permit_documents (
    document_id   INT UNSIGNED NOT NULL AUTO_INCREMENT,
    permit_id     INT UNSIGNED NOT NULL,
    process_type  ENUM('NEW','RENEWAL','CANCELLATION') NOT NULL DEFAULT 'NEW',
    document_name VARCHAR(200) NOT NULL,
    is_mandatory  BOOLEAN      NOT NULL DEFAULT TRUE,
    notes         VARCHAR(500) NULL,
    sort_order    INT UNSIGNED NOT NULL DEFAULT 0,
    PRIMARY KEY (document_id),
    KEY idx_docs_permit (permit_id, process_type),
    CONSTRAINT fk_docs_permit FOREIGN KEY (permit_id)
        REFERENCES work_permits(permit_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- DEVELOPER 3 — Review & Approval Workflow
-- ============================================================

-- Standalone entity that points at ANY content record (polymorphic by type).
-- Review status is SEPARATE from content status: this table tracks the review
-- request; publishing is an ACTION taken when a request reaches APPROVED, which
-- flips the target record's own status to PUBLISHED and writes a version snapshot.
CREATE TABLE review_requests (
    request_id     INT UNSIGNED NOT NULL AUTO_INCREMENT,
    target_type    ENUM('compliance_record','work_permit') NOT NULL,
    target_id      INT UNSIGNED NOT NULL,             -- FK enforced in application layer
    title          VARCHAR(200) NOT NULL,
    review_status  ENUM('PENDING','IN_REVIEW','APPROVED','CHANGES_REQUESTED',
                        'REJECTED','ARCHIVED')
                                NOT NULL DEFAULT 'PENDING',
    submitted_by   INT UNSIGNED NULL,
    reviewed_by    INT UNSIGNED NULL,
    submitted_at   DATETIME     NULL,
    reviewed_at    DATETIME     NULL,
    published_at   DATETIME     NULL,                 -- set when approved revision is published
    created_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
                                ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (request_id),
    KEY idx_rr_status (review_status),
    KEY idx_rr_target (target_type, target_id),
    CONSTRAINT fk_rr_submitter FOREIGN KEY (submitted_by)
        REFERENCES users(user_id) ON DELETE SET NULL,
    CONSTRAINT fk_rr_reviewer FOREIGN KEY (reviewed_by)
        REFERENCES users(user_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------- REVIEW COMMENTS (1:M) ----------
CREATE TABLE review_comments (
    comment_id  INT UNSIGNED NOT NULL AUTO_INCREMENT,
    request_id  INT UNSIGNED NOT NULL,
    author_id   INT UNSIGNED NULL,
    comment     MEDIUMTEXT   NOT NULL,
    created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (comment_id),
    KEY idx_rc_request (request_id),
    CONSTRAINT fk_rc_request FOREIGN KEY (request_id)
        REFERENCES review_requests(request_id) ON DELETE CASCADE,
    CONSTRAINT fk_rc_author FOREIGN KEY (author_id)
        REFERENCES users(user_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------- NOTIFICATIONS (1:M to users) ----------
CREATE TABLE notifications (
    notification_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id         INT UNSIGNED NOT NULL,
    message         VARCHAR(500) NOT NULL,
    link_url        VARCHAR(500) NULL,
    is_read         BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (notification_id),
    KEY idx_notif_user (user_id, is_read),
    CONSTRAINT fk_notif_user FOREIGN KEY (user_id)
        REFERENCES users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- DEVELOPER 4 — Legal Updates / Newsletter Management
-- ============================================================

CREATE TABLE newsletters (
    newsletter_id     INT UNSIGNED NOT NULL AUTO_INCREMENT,
    country_id        INT UNSIGNED NULL,              -- may be multi/unknown
    title             VARCHAR(250) NOT NULL,
    source            VARCHAR(200) NULL,              -- e.g. 'Lexology'
    publication_date  DATE         NULL,
    file_path         VARCHAR(500) NULL,
    raw_content       LONGTEXT     NULL,              -- extracted text
    ai_summary        MEDIUMTEXT   NULL,              -- AI overall summary
    processing_status ENUM('pending','processing','processed','failed')
                                   NOT NULL DEFAULT 'pending',
    uploaded_by       INT UNSIGNED NULL,
    created_at        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    processed_at      DATETIME     NULL,
    PRIMARY KEY (newsletter_id),
    KEY idx_news_country (country_id),
    KEY idx_news_status (processing_status),
    CONSTRAINT fk_news_country FOREIGN KEY (country_id)
        REFERENCES countries(country_id) ON DELETE SET NULL,
    CONSTRAINT fk_news_uploader FOREIGN KEY (uploaded_by)
        REFERENCES users(user_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------- DETECTED UPDATES (AI-flagged candidate items, 1:M) ----------
CREATE TABLE detected_updates (
    update_id        INT UNSIGNED NOT NULL AUTO_INCREMENT,
    newsletter_id    INT UNSIGNED NOT NULL,
    country_id       INT UNSIGNED NULL,
    item_summary     MEDIUMTEXT   NOT NULL,           -- AI summary of the item
    relevance        ENUM('high','medium','low') NOT NULL DEFAULT 'medium',
    review_status    ENUM('new','reviewing','confirmed','dismissed')
                                  NOT NULL DEFAULT 'new',
    linked_record_id INT UNSIGNED NULL,               -- link to compliance record
    reviewed_by      INT UNSIGNED NULL,
    created_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    reviewed_at      DATETIME     NULL,
    PRIMARY KEY (update_id),
    KEY idx_du_news (newsletter_id),
    KEY idx_du_status (review_status),
    CONSTRAINT fk_du_news FOREIGN KEY (newsletter_id)
        REFERENCES newsletters(newsletter_id) ON DELETE CASCADE,
    CONSTRAINT fk_du_country FOREIGN KEY (country_id)
        REFERENCES countries(country_id) ON DELETE SET NULL,
    CONSTRAINT fk_du_record FOREIGN KEY (linked_record_id)
        REFERENCES compliance_records(record_id) ON DELETE SET NULL,
    CONSTRAINT fk_du_reviewer FOREIGN KEY (reviewed_by)
        REFERENCES users(user_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- SHARED — Versioning & Audit
-- ============================================================

-- ---------- RECORD VERSIONS (version snapshots for content) ----------
CREATE TABLE record_versions (
    version_id    INT UNSIGNED NOT NULL AUTO_INCREMENT,
    target_type   ENUM('compliance_record','work_permit') NOT NULL,
    target_id     INT UNSIGNED NOT NULL,
    version       INT UNSIGNED NOT NULL,
    snapshot_json JSON         NOT NULL,              -- full record state at publish
    changed_by    INT UNSIGNED NULL,
    changed_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (version_id),
    KEY idx_ver_target (target_type, target_id),
    CONSTRAINT fk_ver_user FOREIGN KEY (changed_by)
        REFERENCES users(user_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------- AUDIT LOGS (immutable, insert-only) ----------
CREATE TABLE audit_logs (
    log_id      BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id     INT UNSIGNED    NULL,
    action      ENUM('create','update','archive','login','logout','publish') NOT NULL,
    entity_type VARCHAR(60)     NOT NULL,
    entity_id   INT UNSIGNED    NULL,
    old_value   JSON            NULL,
    new_value   JSON            NULL,
    created_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (log_id),
    KEY idx_audit_user (user_id),
    KEY idx_audit_entity (entity_type, entity_id),
    CONSTRAINT fk_audit_user FOREIGN KEY (user_id)
        REFERENCES users(user_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### 12.2 Versioning model

Content status and version snapshots are kept deliberately simple and predictable:

- A content record's `status` is `DRAFT`, `PUBLISHED`, or `ARCHIVED`.
- **A new official version snapshot (`record_versions` row) is created only when an approved revision is published.** Each publish increments the record's `version` and stores a full snapshot.
- **Draft edits do not create a new published version.** They are recorded in `audit_logs` (who changed what, when) so no change is lost, but the published version number only advances on publish.

The result is a clean public history — Version 1 (Published) → Version 2 (Published) → Version 3 (Published) — while day-to-day draft edits remain fully traceable in the audit log without inflating the version count.

### 12.3 Relationship summary

| Relationship | Type | Owner |
|--------------|------|-------|
| countries → compliance_records | 1 : M | Dev 1 |
| compliance_records → benefit_components | 1 : M | Dev 1 |
| compliance_records → record_attachments | 1 : M | Dev 1 |
| countries → work_permits | 1 : M | Dev 2 |
| work_permits → work_permit_steps | 1 : M | Dev 2 |
| work_permits → permit_documents | 1 : M | Dev 2 |
| review_requests → content record | M : 1 (polymorphic) | Dev 3 |
| review_requests → review_comments | 1 : M | Dev 3 |
| users → notifications | 1 : M | Dev 3 |
| newsletters → detected_updates | 1 : M | Dev 4 |
| detected_updates → compliance_records | M : 1 (optional link) | Dev 4 → Dev 1 |
| content record → record_versions | 1 : M | Shared |
| users → audit_logs | 1 : M | Shared |

---

## 13. Entity Relationship Diagram

```
                         ┌───────────┐
                         │ countries │
                         └─────┬─────┘
             ┌─────────────────┼──────────────────┐
             │                 │                  │
       ┌─────▼──────┐   ┌──────▼──────┐    ┌──────▼──────┐
       │ compliance │   │ work_permits │    │ newsletters │
       │  _records  │   │   (Dev 2)    │    │   (Dev 4)   │
       │  (Dev 1)   │   └──┬────────┬──┘    └──────┬──────┘
       └──┬──────┬──┘      │        │              │
          │      │    ┌────▼───┐ ┌──▼─────────┐    │
   ┌──────▼─┐ ┌──▼──┐ │ permit │ │ work_permit│    │
   │benefit │ │record│ │_docs   │ │  _steps    │    │
   │_compo  │ │_attach│└────────┘ └────────────┘    │
   │nents   │ └──────┘                       ┌──────▼────────┐
   └────────┘                                │ detected_     │
        ▲                                    │  updates      │
        │        link (optional)             └──────┬────────┘
        └────────────────────────────────────────-─┘

       ┌────────────────┐         ┌─────────────┐      ┌───────────┐
       │ review_requests │────────▶│content record│      │   users   │
       │    (Dev 3)      │ target  │(compliance / │      └─────┬─────┘
       └───┬─────────┬───┘         │  work_permit)│            │
           │         │             └─────────────┘   ┌─────────┼──────────┐
   ┌───────▼──┐ ┌────▼─────────┐               ┌─────▼───┐ ┌───▼────┐ ┌───▼─────┐
   │  review  │ │ notifications │               │ record  │ │ audit  │ │ (roles) │
   │ _comments│ │   (→ users)   │               │_versions│ │ _logs  │ │         │
   └──────────┘ └───────────────┘               └─────────┘ └────────┘ └─────────┘
```

---

## 14. API Documentation

Global conventions: base path `/api/v1`; JSON request/response; JWT in `Authorization: Bearer <token>`; list endpoints paginated (`?page=&limit=`); write actions restricted to Compliance; all content reads filtered by the caller's permitted `visibility`.

### 14.1 Authentication (shared)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/login` | Log in, returns JWT |
| POST | `/auth/logout` | Invalidate session |
| GET | `/auth/me` | Current user + role |

### 14.2 Compliance Content (Dev 1)  *(read: all · write: Compliance)*
| Method | Path | Description |
|--------|------|-------------|
| GET | `/records` | List/filter records (country, category, worker_type, status) |
| GET | `/records/:id` | Get one record + components + attachments |
| POST | `/records` | Create record |
| PUT | `/records/:id` | Update record |
| PATCH | `/records/:id/archive` | Soft-delete |
| POST | `/records/:id/components` | Add benefit component |
| POST | `/records/:id/attachments` | Upload source document |
| POST | `/records/:id/ai-assist` | AI writing assistant (grammar/rewrite/summarise/translate) → returns suggestion |

### 14.3 Work Permits (Dev 2)  *(read: all · write: Compliance)*
| Method | Path | Description |
|--------|------|-------------|
| GET | `/permits` | List/filter permits (country, status) |
| GET | `/permits/:id` | Get one permit + steps + documents |
| POST | `/permits` | Create permit |
| PUT | `/permits/:id` | Update permit |
| PATCH | `/permits/:id/archive` | Soft-delete |
| POST | `/permits/:id/steps` | Add/reorder a process step (for a given process_type) |
| POST | `/permits/:id/documents` | Add a checklist document (for a given process_type) |

### 14.4 Review & Approval (Dev 3)  *(Compliance)*
| Method | Path | Description |
|--------|------|-------------|
| GET | `/reviews` | List review requests (filter by state) |
| GET | `/reviews/:id` | Get request + comments |
| POST | `/reviews` | Create review request for a target record |
| PATCH | `/reviews/:id/transition` | Change review status (in_review / approve / request_changes / reject / archive) |
| POST | `/reviews/:id/publish` | Publish an APPROVED revision → sets target record to PUBLISHED + writes version snapshot |
| POST | `/reviews/:id/comments` | Add review comment |
| GET | `/notifications` | Current user's notifications |

### 14.5 Legal Updates / Newsletters (Dev 4)  *(Compliance)*
| Method | Path | Description |
|--------|------|-------------|
| GET | `/newsletters` | List newsletters |
| POST | `/newsletters` | Upload newsletter (multipart) |
| GET | `/newsletters/:id` | Get newsletter + AI summary + detected updates |
| GET | `/updates` | List detected updates (filter by status/relevance) |
| PATCH | `/updates/:id` | Update review status |
| PATCH | `/updates/:id/link` | Link a detected update to a compliance record |

### 14.6 Search & Audit (shared)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/search` | Cross-entity keyword search + filters |
| GET | `/audit-logs` | Admin: view audit trail |

---

## 15. Security Design

- **Authentication.** Email/password; bcrypt-hashed passwords; signed JWT with expiry; failed-attempt throttling.
- **Authorization (RBAC).** `authorize(...roles)` middleware guards every protected route server-side; the UI hides controls a role cannot use, but the server is the source of truth.
- **Content visibility.** Every content query is filtered by the caller's permitted visibility levels (`CLIENT_SHAREABLE` ⊂ `INTERNAL_STAFF` ⊂ `COMPLIANCE_ONLY`). Sensitive commercial data (set-up fees, tax-filing fees, service tax, exchange-rate buffers, partner arrangements) defaults to `COMPLIANCE_ONLY`; labour-law and benefit content that staff may relay to clients can be marked `CLIENT_SHAREABLE`. `CLIENT_SHAREABLE` governs what staff are permitted to communicate to a client — clients do not have accounts. Visibility is enforced in the data layer, not only the UI.
- **Input validation.** Formik + Yup on the client; server-side validation on every write.
- **SQL injection prevention.** All queries parameterized via `mysql2` prepared statements.
- **XSS prevention.** Output encoding; sanitisation of rich-text fields.
- **Audit logging.** Insert-only `audit_logs` capturing user, action, entity, and before/after values for every create, update, archive, and publish.
- **Secrets.** Database credentials, JWT secret, and AI API key in environment variables.

---

## 16. AI Features

The platform uses AI (Anthropic Claude) for **two** clearly-bounded, human-in-the-loop capabilities. AI never edits published legal content automatically; a compliance officer always reviews and accepts.

### 16.1 AI Writing Assistant (Developer 1)
**Purpose.** Directly answers the client's stated AI need: staff in neighbouring countries produce English of varying quality, and the manager wants help making entries clear, correct, and professional — and translating where needed.

**Functions.** On any record's text, a Compliance user can request: improve grammar, rewrite professionally, summarise, translate into English, or translate from English.

**Workflow.**
```
Original staff content
        ↓
POST /records/:id/ai-assist   (mode = grammar | rewrite | summarise | translate)
        ↓
AI returns a suggestion (original text is NOT modified)
        ↓
User reviews suggestion side-by-side
        ↓
Accept  → saved as a new DRAFT (goes through the normal review workflow)
Reject  → discarded, original unchanged
```
The assistant produces a draft suggestion only; publishing still requires the Developer 3 review-and-approve workflow.

### 16.2 AI-Assisted Update Flagging (Developer 4)
**Purpose.** Converts the manager's manual "read newsletters and hope nothing was missed" habit into a systematic, reviewable process — while being honest that AI *flags candidates*, it does not decide that a law has changed.

**Workflow.**
```
Compliance uploads newsletter (PDF / text)
        ↓
Extract text  (status: processing)
        ↓
AI summarises the newsletter and identifies individual items that
MAY be relevant labour-law / immigration updates, with a relevance level
        ↓
System stores candidate DETECTED UPDATES (review_status = new)
        ↓
Compliance reviews each candidate:
   • Confirm → link to an existing compliance record and/or
     raise a review request (Dev 3) to update it
   • Dismiss → mark as not relevant
```
The system never asserts that a law definitively changed; every candidate is confirmed or dismissed by a human. If the AI service is unavailable, newsletters can still be uploaded and read; only auto-summarisation is deferred.

### 16.3 Graceful degradation
Both AI features degrade cleanly: content management, work permits, workflow, search, and newsletter storage all function without the AI service. AI adds assistance; it is never a hard dependency for core operations.

### 16.4 Language support
Per the client meeting, **English is the default interface language and the authoritative language for stored content.** AI-assisted content translation (into and from English, via the writing assistant in Section 16.1) is supported so regional staff can work in their own language and produce an authoritative English record. Full multilingual localisation of the user interface is a documented future enhancement (Section 18) rather than an MVP commitment, so the client's "support multiple languages" requirement is addressed at the content level now, with interface localisation planned.

---

## 17. Folder Structure

```
hr-compliance-platform/
├── README.md
├── .gitignore
│
├── client/                              # React frontend (SPA)
│   ├── src/
│   │   ├── main.jsx
│   │   ├── App.jsx
│   │   ├── theme/theme.js
│   │   ├── routes/ (AppRoutes, ProtectedRoute)
│   │   ├── context/AuthContext.jsx
│   │   ├── api/                          # Axios service per resource
│   │   │   ├── axiosClient.js
│   │   │   ├── authService.js
│   │   │   ├── recordService.js          # Dev 1
│   │   │   ├── permitService.js          # Dev 2
│   │   │   ├── reviewService.js          # Dev 3
│   │   │   ├── newsletterService.js      # Dev 4
│   │   │   └── searchService.js          # shared
│   │   ├── pages/
│   │   │   ├── LoginPage.jsx
│   │   │   ├── DashboardPage.jsx
│   │   │   ├── content/                  # Dev 1
│   │   │   ├── permits/                  # Dev 2
│   │   │   ├── reviews/                  # Dev 3
│   │   │   ├── updates/                  # Dev 4
│   │   │   ├── search/                   # shared
│   │   │   └── admin/                     # users, audit logs
│   │   ├── components/ (common, forms, tables)
│   │   ├── hooks/  utils/  assets/
│   │   └── .env.example
│   └── package.json
│
├── server/                              # Express backend (REST API)
│   ├── src/
│   │   ├── index.js  app.js
│   │   ├── config/ (db.js, env.js)
│   │   ├── middleware/ (auth, rbac, visibility, validate, errorHandler)
│   │   ├── routes/
│   │   │   ├── authRoutes.js
│   │   │   ├── recordRoutes.js           # Dev 1
│   │   │   ├── permitRoutes.js           # Dev 2
│   │   │   ├── reviewRoutes.js           # Dev 3
│   │   │   ├── newsletterRoutes.js       # Dev 4
│   │   │   ├── searchRoutes.js  auditRoutes.js
│   │   ├── controllers/                  # mirrors routes
│   │   ├── services/
│   │   │   ├── complianceContentService.js  # Dev 1
│   │   │   ├── workPermitService.js          # Dev 2
│   │   │   ├── reviewWorkflowService.js      # Dev 3
│   │   │   ├── newsletterUpdateService.js    # Dev 4
│   │   │   ├── aiService.js                   # shared (Claude calls)
│   │   │   ├── searchService.js  auditService.js
│   │   ├── repositories/                 # parameterized SQL
│   │   └── utils/
│   ├── tests/
│   └── package.json
│
└── docs/
    ├── HIGH_LEVEL_DESIGN.md
    ├── PROJECT_IMPLEMENTATION_PHASE.md
    └── database/schema.sql
```

---

## 18. Future Enhancements

Documented for completeness; **out of scope** for the build.

1. Automated newsletter ingestion via email/RSS (no manual upload).
2. Semantic/embedding search and a natural-language Q&A assistant with cited sources.
3. Multi-language UI localization (Bahasa, Thai, Vietnamese, etc.).
4. M365 Single Sign-On and Multi-Factor Authentication.
5. Additional notification channels (email digests, Teams/Slack, SMS).
6. Job queues (Redis/RabbitMQ) and horizontal scaling behind a load balancer.
7. Public/client-facing self-service portal exposing curated `CLIENT_SHAREABLE` content.
8. Country-comparison dashboards and freshness KPIs.
9. Public Holidays calendar module (supports leave/coverage planning).
10. AI feedback loop: officers mark flags as useful/not to tune relevance over time.

---

*End of High-Level Design Document.*
