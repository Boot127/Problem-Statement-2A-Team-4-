-- ============================================================
-- HRCKMP — Schema (MySQL 8.0) | Engine: InnoDB | Charset: utf8mb4
-- Source: docs/HIGH_LEVEL_DESIGN.md, Section 12
-- ============================================================

-- worker_type    : 'LOCAL' | 'FOREIGN_WORKER' | 'EXPATRIATE' | 'ALL_EMPLOYEES'
-- visibility     : 'COMPLIANCE_ONLY' | 'INTERNAL_STAFF' | 'CLIENT_SHAREABLE'
-- content status : 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'   (state of a content record)
-- review status  : 'PENDING' | 'IN_REVIEW' | 'APPROVED' | 'CHANGES_REQUESTED'
--                  | 'REJECTED' | 'ARCHIVED'            (state of a review request)
-- Note: content status and review status are deliberately separate. A record is
-- DRAFT until an approved review is published; PUBLISHED is a fact about the
-- content, not about the review request. Superseded prior versions live in
-- record_versions, so no 'superseded' content status is needed.

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
    permit_holder_name   VARCHAR(200) NULL,
    client_company_name  VARCHAR(200) NULL,
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

-- ---------- PERMIT SOURCE DOCUMENTS (official evidence files, 1:M) ----------
-- Files are stored outside the web client. stored_file_name is generated by
-- the server; original_file_name is display/download metadata only.
CREATE TABLE permit_source_documents (
    source_document_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    permit_id          INT UNSIGNED NOT NULL,
    original_file_name VARCHAR(250) NOT NULL,
    stored_file_name   VARCHAR(100) NOT NULL,
    mime_type          VARCHAR(120) NOT NULL,
    file_size          BIGINT UNSIGNED NOT NULL,
    file_hash          CHAR(64) NULL,                 -- SHA-256 duplicate detection
    description        VARCHAR(500) NULL,
    source_type        ENUM('OFFICIAL_GUIDE','LEGISLATION','FORM','CIRCULAR',
                            'INTERNAL_NOTE','OTHER') NOT NULL DEFAULT 'OFFICIAL_GUIDE',
    status             ENUM('ACTIVE','ARCHIVED') NOT NULL DEFAULT 'ACTIVE',
    uploaded_by        INT UNSIGNED NULL,
    uploaded_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (source_document_id),
    UNIQUE KEY uq_permit_source_stored_name (stored_file_name),
    KEY idx_permit_source_permit (permit_id, status),
    CONSTRAINT fk_permit_source_permit FOREIGN KEY (permit_id)
        REFERENCES work_permits(permit_id) ON DELETE CASCADE,
    CONSTRAINT fk_permit_source_uploader FOREIGN KEY (uploaded_by)
        REFERENCES users(user_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------- PERMIT GROUPS (client/workspace organisation, M:N) ----------
-- Membership references master permits. A permit can be reused by many groups
-- without copying any Work Permit fields or process information.
CREATE TABLE permit_groups (
    group_id    INT UNSIGNED NOT NULL AUTO_INCREMENT,
    group_name  VARCHAR(160) NOT NULL,
    description VARCHAR(1000) NULL,
    status      ENUM('ACTIVE','ARCHIVED') NOT NULL DEFAULT 'ACTIVE',
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
                             ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (group_id),
    UNIQUE KEY uq_permit_groups_name (group_name),
    KEY idx_permit_groups_status (status, group_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE permit_group_members (
    group_id  INT UNSIGNED NOT NULL,
    permit_id INT UNSIGNED NOT NULL,
    added_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (group_id, permit_id),
    KEY idx_permit_group_members_permit (permit_id, group_id),
    CONSTRAINT fk_permit_group_members_group FOREIGN KEY (group_id)
        REFERENCES permit_groups(group_id) ON DELETE CASCADE,
    CONSTRAINT fk_permit_group_members_permit FOREIGN KEY (permit_id)
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
