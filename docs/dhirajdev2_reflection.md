# Dhiraj Dev 2 Reflection

## 1. My Role

I was Developer 2, mainly responsible for Work Permit Management. My feature grew from basic permit CRUD into a structured knowledge-management area. It now includes permit creation, viewing, editing and archiving; separate New, Renewal and Cancellation processes; ordered steps; required-document checklists; source PDF/DOCX evidence; Permit Groups; reminders and information-health indicators; comparison and guide export; and AI-assisted extraction, change review, Q&A and eligibility screening. I also contributed Work Permit support to the shared Admin Archive Management feature and later worked on the shared dashboard redesign.

My work covered React/MUI pages, Axios calls, Express routes, controllers, services, repositories and database design. The main evidence is in commits `165ce23`, `1cc3ddb`, `fb939e4`, `ab110e6` and `ca03982`.

## 2. How I Used AI

I used AI throughout the development cycle, not only to produce code. At the start, I used it to break the client problem into a realistic Dev 2 scope. The important question was whether the system was storing immigration knowledge or tracking individual applicants. That distinction guided many later decisions.

During design, I used AI to compare data models. For example, I reviewed whether New, Renewal and Cancellation should be separate permits, JSON inside one row, or related child records. During implementation, I used AI to draft and refine the route-controller-service-repository structure, validation, React states and MUI layouts. I then checked the suggestions against the existing repository so I did not duplicate tables, components or routes.

AI was also useful during debugging. The source-document extraction work required tracing the exact frontend request through `permitService.js`, `permitRoutes.js`, the extraction controller and provider. I used the same evidence-based approach when checking Gemini configuration, draft-only acceptance and source-document retention. For testing, AI helped me turn broad requirements into targeted checks for ordering, foreign keys, archive restoration, files, transaction rollback, builds and lint.

Finally, I used AI for integration work: inspecting Git status and diffs, checking teammate-owned boundaries, planning SQLite-to-PostgreSQL migration without resetting local data, and replacing fake dashboard values with existing APIs. I did not treat AI output as proof. I checked the code, schema, logs and test scripts before accepting a recommendation.

## 3. Where AI Added Value

### Work Permit structure

AI helped me reason about the relationship between the permit and its processes. The final schema keeps one master row in `work_permits`. `work_permit_steps` and `permit_documents` contain multiple rows linked by `permit_id` and classified by `process_type` (`NEW`, `RENEWAL` or `CANCELLATION`). Steps have an order, title, detail and expected timeline. Checklist rows have a mandatory flag, notes and sort order.

This was better than one large text or JSON field because each process can be queried, validated, reordered and displayed independently. It also avoided duplicating the same Singapore Employment Pass three times. The structure supports the visual process pages and lets Process Copy create independent destination child rows without copying the master permit.

### Safe archive behaviour

AI helped expand a simple Archive action into clearer lifecycle rules. Normal Work Permit use remains soft archive, preserving the record and its children. In the shared Admin Archive feature, restore returns a record to its previous Draft or Published state. Permanent deletion is Admin-only and checks for review or publication history first.

The strongest improvement was file and transaction safety. `adminArchiveService.js` stages managed files by renaming them, deletes database records in a transaction, then finishes file deletion. If the transaction fails, staged files are restored. Versioned review deletion is blocked instead of cascading through publication evidence. The disposable `testAdminArchives.js` script verifies permissions, restoration, dependent rows, files, audit actions and foreign keys.

### Database and repository work

AI sped up the move from the first frontend/local-storage prototype to real SQLite persistence in commit `1cc3ddb`. It also helped keep responsibilities separated across routes, controllers, services and repositories as the feature expanded.

Later, I used AI to design a PostgreSQL/Neon-compatible provider layer and migration tooling. The importer opens SQLite read-only, preserves IDs and relationships, imports in foreign-key order and refuses to copy into non-empty destination tables. Verification compares all six Dev 2 business tables, process-type counts and orphan rows. I deliberately documented that live Neon migration is still pending because no credentials were configured; I did not present architecture testing as a successful live deployment.

### Testing

AI made my testing more systematic. The migration documentation records an SQLite baseline of 17 permits, 38 steps, 42 checklist documents, eight source-document metadata rows and one group. It also records successful integrity and foreign-key checks and disposable regressions for CRUD/search, reordering, mandatory documents, Process Copy, groups, AI acceptance, Draft enforcement, source retention and rollback.

For Admin Archive Management, the automated script uses a temporary database and fixture files instead of risking real records. This changed my view of testing: destructive features need controlled test data, negative cases and recovery checks, not only a successful click-through.

## 4. AI Suggestions I Rejected or Significantly Changed

### 1. Application-case tracking

A possible AI-generated expansion was to store applicants, completion ticks and live application progress against the shared permit. I rejected this because the assignment’s Dev 2 entity is a reusable permit knowledge template, not an employee or CRM system. Completion states on the template would also be shared incorrectly between clients. The final repository has no application-case table.

### 2. Permanent deletion everywhere

A straightforward CRUD solution could expose Delete beside Edit. I changed this to normal-user Archive and limited restore/permanent deletion to the Admin Archive route protected by `auth` and `authorize('admin')`. This better preserves knowledge, supports recovery and reduces accidental loss.

### 3. Cascading through review history

It would have been easy to let foreign-key cascades remove every related row. I rejected that for published/versioned reviews. The service returns a conflict when publication history exists. Preserving evidence was more important than making every Delete request succeed.

### 4. Fake dashboard analytics

The early dashboard contained placeholder KPI numbers and invented recent activity. I rejected keeping these for presentation purposes. The final dashboard reads records, permits, pending reviews, newsletters, permit health, notifications and authorized audit activity from existing APIs. If data is unavailable, it shows an honest loading/error/empty state instead of a fake number.

### 5. Resetting data for PostgreSQL migration

A simpler migration approach would create a clean PostgreSQL database and seed it again. I changed this because the SQLite records and uploaded evidence represented real development data. The final importer is one-time, transactional and ID-preserving, and SQLite remains the rollback source. Live Neon cutover is clearly marked pending until credentials and verification are available.

## 5. What I Learned

The main lesson was that AI-generated code still needs ownership. A solution can compile while being wrong for the client, unsafe for data or incompatible with teammates’ work. Relational design decisions affected almost every later feature, especially process filtering, reordering, groups and migration.

I also learned that security cannot depend only on hiding a button. Admin Archive needed server-side role middleware, and uploads needed size/type checks, generated stored names, magic-byte validation and path containment. Archive and permanent delete are different business actions, and destructive tests should use disposable databases and files.

Integration was as important as building my own screens. I had to inspect Git history and diffs, preserve the shared database, avoid rewriting teammate features, and distinguish completed local work from untested live deployment. Most importantly, requirements must control the implementation; AI suggestions are options to evaluate, not instructions to follow automatically.

## 6. Final Reflection

AI accelerated my planning, coding, debugging, testing and integration work, especially when the Work Permit feature became large. However, I remained responsible for deciding scope, checking the actual repository, changing unsafe designs, rejecting unnecessary features, validating results and integrating with the team. My best outcomes came from giving AI precise context, testing its output, and improving the first answer rather than accepting it immediately.
