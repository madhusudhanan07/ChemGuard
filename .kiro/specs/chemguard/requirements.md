ChemGuard — Laboratory Reagent Compatibility and Storage Assistant
Requirements Specification
Version: 1.1 (reviewed)  
Date: 2026-10-12  
Project Type: Student Competition MVP  
Technology Stack: React + Vite + Tailwind CSS · Node.js + Express · Firebase Firestore + Firebase Auth
---
1. Scope and Constraints
1.1 In Scope (MVP)
User authentication with role-based access control
Reagent inventory management (CRUD + archiving)
Storage location hierarchy (lab → cabinet → compartment)
Server-side deterministic chemical compatibility engine
Safety alerts with review workflow
SDS reference tracking and verification status
Audit log and downloadable reports (PDF or CSV)
Demonstration dataset of 10–15 reagents
1.2 Explicitly Out of Scope
AI chatbot or LLM-powered guidance
Automatic SDS text extraction
IoT or hardware integration
QR code scanning
Native mobile applications
Advanced analytics dashboards
Paid external APIs and paid Firebase features; the secure Express backend runs locally for the MVP demo
---
2. Authentication and Authorization (AUTH)
User Stories
As a user, I want to log in with my email and password so that I can securely access the system.
As a user, I want to log out so that my session is closed and my data is protected.
As an Administrator, I want to manage user roles so that only authorized staff can perform privileged operations.
As a Laboratory Staff member, I want to view inventory and trigger compatibility checks so that I can do my job without needing admin rights.
Acceptance Criteria
AUTH-1: When a user submits a valid email and password, the system SHALL authenticate via Firebase Authentication and grant a session token.
AUTH-2: When a user submits invalid credentials, the system SHALL display a clear error message and SHALL NOT grant access.
AUTH-3: When an unauthenticated request reaches a protected backend API endpoint, the server SHALL return HTTP 401 and SHALL NOT process the request.
AUTH-4: When a Laboratory Staff user attempts an Administrator-only action (e.g., user management, bulk delete), the system SHALL return HTTP 403 and display an "Insufficient permissions" message.
AUTH-5: When a user's session token expires or is revoked, subsequent API calls SHALL be rejected with HTTP 401 and the frontend SHALL redirect to the login screen.
AUTH-6: The backend SHALL verify all Firebase ID tokens using the Firebase Admin SDK. Client-supplied role claims SHALL NOT be trusted without server-side verification.
AUTH-7: Service account credentials SHALL reside only in the server environment. The frontend bundle SHALL never contain Firebase service account keys.
AUTH-8: The system SHALL provide an explicit one-time, locally documented bootstrap procedure for creating the first Administrator account; public self-registration SHALL NOT grant an Administrator role. All API routes SHALL enforce role-based permissions server-side, including routes using the Firebase Admin SDK (which bypasses client Firestore Security Rules).
Roles
Role	Permissions
Administrator	Manage users, locations, reagents, SDS verification, alert resolution and reports; read audit history; cannot edit/delete append-only audit events or bypass verified incompatibility blocks
Laboratory Staff	Read inventory, locations and alerts; create/edit reagent records and request storage assignments through validated backend APIs; cannot manage roles, verify own SDS sources, or alter audit logs
---
3. Dashboard (DASH)
User Stories
As a user, I want a summary view when I log in so that I can immediately understand the current safety state of the laboratory.
As a user, I want the dashboard to reflect live Firestore data so that I am not misled by stale or hardcoded figures.
Acceptance Criteria
DASH-1: When the dashboard loads, the system SHALL display the total count of active reagents retrieved from Firestore.
DASH-2: When the dashboard loads, the system SHALL display the total count of registered storage locations.
DASH-3: When the dashboard loads, the system SHALL display the count of unresolved safety alerts.
DASH-4: When the dashboard loads, the system SHALL display the count of reagents with missing or unverified SDS records.
DASH-5: When a new reagent, alert, or SDS record is created or updated, the dashboard counts SHALL reflect the change within one page refresh.
DASH-6: When the Firestore read fails, the dashboard SHALL display a clear error message and SHALL NOT show zero values as if they were genuine counts.
DASH-7: The dashboard SHALL list the five most recent safety events (alert creation, storage changes) with timestamp, involved chemicals, and location.
---
4. Reagent Inventory (INV)
User Stories
As a Laboratory Staff member, I want to register a new chemical reagent so that it is tracked in the inventory.
As a Laboratory Staff member, I want to edit reagent details so that the record stays accurate after re-labeling or concentration changes.
As a Laboratory Staff member, I want to search and filter reagents so that I can quickly find what I need.
As a Laboratory Staff member, I want to archive a reagent so that it is removed from active use without being permanently deleted.
As an Administrator, I want to view archived reagents so that I can restore or permanently remove them.
Mandatory Fields (must be present to save a reagent record)
Field	Notes
Chemical name	Free text, non-empty
Container / bottle ID	Unique identifier for each physical stock container; multiple containers may share a chemical name or CAS number
CAS number	Format: `\d{2,7}-\d{2}-\d{1}`
Concentration	Positive finite numeric value when known; otherwise record an explicit `UNKNOWN` value and flag for review
Concentration unit	e.g., mol/L, % w/v, mg/mL; required for a numeric concentration
Quantity on hand	Non-negative numeric value
Quantity unit	e.g., mL, g, L
Hazard class	At least one verified GHS hazard class, or explicit `UNKNOWN` if not yet documented
SDS source URL or reference	Required for `VERIFIED` and `UNVERIFIED`; may be blank only when status is `MISSING`
SDS verification status	Enum: `VERIFIED`, `UNVERIFIED`, `MISSING`
Acceptance Criteria
INV-1: When a user submits a new reagent form with all mandatory fields valid, the system SHALL persist the record to Firestore and display a success confirmation.
INV-2: When a user submits a reagent form with missing basic identity/container/quantity fields or contradictory SDS fields, the system SHALL highlight the invalid field(s) and SHALL NOT persist the record. An explicitly `MISSING` SDS, `UNKNOWN` hazard class, or unknown concentration may be saved as an incomplete inventory record but SHALL block automatic storage approval until reviewed.
INV-3: When a user submits a CAS number that does not match the required format, the system SHALL display an inline validation error and SHALL NOT persist the record.
INV-4: When a user searches by chemical name or CAS number, the system SHALL return only reagents whose name or CAS number contains the search string (case-insensitive).
INV-5: When a user archives a reagent, the system SHALL first ensure it has no active physical storage assignment. If one exists, archiving SHALL be blocked until an authorized user confirms physical removal and deactivates the assignment through the backend. Archived records SHALL be excluded from active inventory views but preserved in audit history.
INV-6: When an Administrator restores an archived reagent, the record SHALL be marked `archived: false` and SHALL reappear in the active inventory.
INV-7: When two concurrent users attempt to edit the same reagent simultaneously, the system SHALL use Firestore transactions to prevent a silent overwrite, and at least one user SHALL receive a conflict error.
INV-8: The system SHALL record an audit log entry for every create, edit, and archive action, including the acting user's UID and timestamp.
INV-9: When a reagent currently assigned to storage has its chemical identity, concentration, hazard class, or SDS status changed, the backend SHALL re-evaluate its storage conflicts and create a review alert when necessary; the record SHALL not silently retain a previous clearance. Accurate inventory corrections SHALL remain traceable even when they reveal a conflict.
INV-10: Each reagent inventory record SHALL represent one physical container identified by `containerId`; multiple containers may have the same CAS number, but a single container SHALL NOT have more than one active storage assignment.
---
5. Storage Management (STOR)
User Stories
As an Administrator, I want to register labs, cabinets, and compartments so that the storage hierarchy is defined before reagents are assigned.
As a Laboratory Staff member, I want to assign a reagent to a compartment so that its physical location is tracked.
As a Laboratory Staff member, I want to see all reagents in a compartment so that I can check for co-location.
As a user, I want to be prevented from assigning an incompatible reagent to a compartment so that unsafe co-storage is blocked automatically.
Acceptance Criteria
STOR-1: When an Administrator creates a storage location, the system SHALL require a unique name within its parent scope (e.g., cabinet names unique within a lab).
STOR-2: When a user attempts to assign a reagent to a compartment, the system SHALL call the compatibility engine before writing the assignment to Firestore.
STOR-3: When the compatibility engine returns `INCOMPATIBLE`, the system SHALL reject the assignment, SHALL NOT write to Firestore, and SHALL create a safety alert referencing the conflicting chemicals and documented source.
STOR-4: When the compatibility engine returns `NEEDS_REVIEW`, the system SHALL block the assignment and create a review alert. For the MVP, acknowledgement alone SHALL NOT override uncertainty: staff must supply the missing verified information, an Administrator must review it, and the compatibility check must be re-run before assignment. Verified `INCOMPATIBLE` results cannot be overridden in the MVP.
STOR-5: When the compatibility engine returns `NO_DOCUMENTED_CONFLICT`, the system SHALL permit the assignment and SHALL display a disclaimer: "No documented conflict found. This does not confirm the combination is universally safe."
STOR-6: When a compartment view is requested, the system SHALL list all currently active reagents assigned to that compartment with their name, CAS number, and hazard class.
STOR-7: Archiving SHALL NOT automatically mark a physically stored container as removed. Storage removal SHALL be a separate authorized action with confirmation of physical removal and an audit entry.
STOR-8: When a reagent is moved between compartments, the system SHALL validate the destination using current records and commit source removal and destination assignment atomically. If destination validation fails, the original location SHALL remain active.
---
6. Chemical Compatibility Engine (CCE)
User Stories
As a system, I want to evaluate whether a proposed reagent can safely be stored with existing compartment residents so that unsafe co-storage is caught before it is written to the database.
As a Laboratory Staff member, I want to see a clear explanation of any flagged incompatibility so that I understand the safety risk and its source.
Compatibility Result Definitions
Result	Meaning	Action
`INCOMPATIBLE`	At least one verified conflict rule fires	Block assignment; create alert
`NEEDS_REVIEW`	Insufficient verified data; uncertainty cannot be resolved automatically	Block; obtain and review verified evidence before a new check
`NO_DOCUMENTED_CONFLICT`	All applicable checks pass with no flagged conflict	Permit assignment; display safety disclaimer
Acceptance Criteria
CCE-1: When a compatibility check is requested, the engine SHALL run entirely on the backend and SHALL NOT rely on client-supplied logic or unverified client data.
CCE-2: When evaluating a reagent pair, the engine SHALL use only curated compatibility rules whose exact relationship is supported by a verifiable chemical-specific SDS, an authoritative incompatibility chart, or applicable storage guidance. Each rule SHALL store source title, publisher, section/page or table, document date/revision when available, stable URL/reference, rule version, and applicable chemical identities or classes. A general hazard-communication standard alone SHALL NOT be treated as evidence of a specific chemical-pair incompatibility.
CCE-3: When a rule fires as `INCOMPATIBLE`, the response SHALL include: the conflicting reagent's name and CAS number, the rule description, and the `source` citation.
CCE-4: The engine SHALL evaluate known verified conflicts first. If any applicable verified incompatibility rule matches, the final result SHALL be `INCOMPATIBLE`, even when some SDS information is missing. Otherwise, missing/unverified SDS, unknown hazard class or concentration, or insufficient verified rule coverage SHALL result in `NEEDS_REVIEW`.
CCE-5: When no applicable rule exists for a pair, the engine SHALL return `NEEDS_REVIEW` (not `NO_DOCUMENTED_CONFLICT`), because absence of a rule does not imply absence of hazard.
CCE-6: The engine SHALL return `NO_DOCUMENTED_CONFLICT` only if the proposed container and every existing container have verified required safety fields AND every evaluated pair falls within the explicitly documented coverage of the curated ruleset with no matching conflict. Lack of a matching conflict rule alone SHALL NOT be interpreted as affirmative coverage. Empty-compartment assignments still require verified reagent data and applicable compartment/storage constraints.
CCE-7: The compatibility ruleset SHALL be version-controlled and stored in a dedicated server-side module. Rules SHALL NOT be editable by end users through the application UI.
CCE-8: The engine SHALL never assert that a chemical combination is "safe." All pass results SHALL use the `NO_DOCUMENTED_CONFLICT` label and include the associated disclaimer text.
CCE-9: The system SHALL handle concurrent compatibility checks for the same compartment using a Firestore transaction or equivalent lock to prevent race conditions. Every storage assignment/removal transaction SHALL read and modify a shared compartment version document so concurrent writers cannot both approve based on the same stale occupancy snapshot.
CCE-10: Compatibility decisions SHALL include the checked rule version, rule coverage status, proposed container ID, target compartment ID, and timestamp for reproducibility. The system SHALL distinguish an inventory register from authoritative permission to store chemicals physically.
---
7. Safety Alerts (ALRT)
User Stories
As a user, I want to see a list of all active safety alerts so that I can prioritize responses.
As an Administrator, I want to acknowledge and close an alert after reviewing it so that the alert queue stays accurate.
As a user, I want each alert to show the source of the incompatibility rule so that I can verify the safety concern independently.
Acceptance Criteria
ALRT-1: When an `INCOMPATIBLE` result is returned by the compatibility engine, the system SHALL automatically create an alert record in Firestore containing: alert type, reagent names, CAS numbers, affected compartment, rule description, source citation, status (`OPEN`), and creation timestamp.
ALRT-2: When a `NEEDS_REVIEW` result is returned for a proposed assignment, the system SHALL create an alert with status `PENDING_REVIEW`. An Administrator may document a review, but the assignment remains blocked until missing information/rule coverage is resolved and a new check returns `NO_DOCUMENTED_CONFLICT`.
ALRT-3: When an Administrator acknowledges and closes an alert, the system SHALL record the reviewer's UID, timestamp, and a mandatory resolution note in the alert document.
ALRT-4: When the alert list is rendered, the system SHALL display alerts grouped by status (`OPEN`, `PENDING_REVIEW`, `CLOSED`) with the most recent `OPEN` alerts shown first.
ALRT-5: When an alert is closed, it SHALL remain visible in history and SHALL NOT be deleted from Firestore.
ALRT-6: The system SHALL record an audit log entry for every alert status transition.
---
8. SDS Information Management (SDS)
User Stories
As a Laboratory Staff member, I want to record the SDS reference URL or document identifier for each reagent so that safety information is traceable.
As an Administrator, I want to see a list of reagents with missing or unverified SDS records so that I can prioritize obtaining documentation.
As a user, I want to know which SDS sections are referenced so that I can quickly navigate to relevant safety guidance.
Acceptance Criteria
SDS-1: Each reagent record SHALL include an `sdsStatus` field with allowed values `VERIFIED`, `UNVERIFIED`, or `MISSING`.
SDS-2: When a reagent is saved with `sdsStatus = MISSING`, the system SHALL flag it in the dashboard missing-SDS count and in the SDS management view.
SDS-3: When an SDS reference is added or updated, the system SHALL record the update in the audit log with the acting user's UID.
SDS-4: The SDS record SHALL support free-text notes referencing specific SDS sections, in particular Section 7 (Handling and Storage) and Section 10 (Stability and Reactivity).
SDS-5: The system SHALL NOT generate, synthesize, or present fictional SDS content. All SDS data SHALL be user-supplied references to external authoritative documents.
SDS-6: When an SDS reference URL is saved, the system SHALL store it as-is and SHALL NOT attempt to fetch or validate its contents automatically. A populated URL SHALL NOT imply `VERIFIED` status.
SDS-7: An Administrator SHALL explicitly record who verified the SDS reference, when it was reviewed, and the identifiable manufacturer/product and SDS revision/date when available. The system SHALL not claim SDS content was machine-verified.
---
9. Audit Log and Reports (AUD)
User Stories
As an Administrator, I want to view a complete audit history so that I can investigate past actions.
As an Administrator, I want to download an inventory report so that I can share a snapshot with lab management.
As an Administrator, I want to download a safety summary report so that I can document compliance.
Acceptance Criteria
AUD-1: The system SHALL write an audit log entry to Firestore for each of the following events: user login, reagent create/edit/archive/restore, storage assignment create/remove, compatibility check result (including outcome and chemicals involved), alert create/update/close, and SDS status change.
AUD-2: Each audit log entry SHALL contain: event type, actor UID, actor role, affected resource ID, timestamp (UTC), and a human-readable summary.
AUD-3: When an Administrator views the audit log, entries SHALL be displayed in reverse-chronological order with filter controls for event type, date range, and actor.
AUD-4: When an Administrator requests an inventory report, the system SHALL generate a downloadable file (CSV or PDF) listing all active reagents with name, CAS number, concentration, quantity, hazard class, storage location, and SDS status.
AUD-5: When an Administrator requests a safety summary report, the system SHALL include all unresolved and recently closed alerts with reagent names, locations, rule descriptions, source citations, and resolution notes.
AUD-6: Reports SHALL reflect data at the time of generation. The report header SHALL include the generation timestamp and the acting user's name.
AUD-7: Audit log entries SHALL be append-only. Neither staff nor administrators SHALL be offered an API/UI operation to edit or delete an existing audit record. Backend role enforcement and database access controls SHALL protect this invariant.
---
10. Data Integrity and Concurrency (DATA)
Acceptance Criteria
DATA-1: All writes to protected Firestore collections (reagents, storage assignments, alerts, audit log) SHALL pass through the backend API. Direct client-side Firestore writes SHALL be blocked by Firestore Security Rules.
DATA-2: Storage assignment writes SHALL use a Firestore transaction that: (a) reads the authoritative reagent, ruleset-version and compartment/occupancy records before any write; (b) performs server-side compatibility evaluation against the read snapshot; (c) reads and updates a shared compartment version document to serialize concurrent modifications; and (d) writes a validated assignment only if the check permits it. Move/removal actions SHALL use the same concurrency strategy.
DATA-3: When a Firestore transaction fails due to a contention conflict, the system SHALL retry up to three times and, if still failing, SHALL return an error to the user with a prompt to retry.
DATA-4: Quantity SHALL be a non-negative finite number. Known numeric concentration SHALL be a positive finite number with a specified unit; the explicit `UNKNOWN` value SHALL trigger review. Both client and backend SHALL enforce these checks.
DATA-5: The CAS number field SHALL be validated against the pattern `^\d{2,7}-\d{2}-\d{1}$` on both client and server.
DATA-6: The backend SHALL validate lengths, data types and allowable values; the frontend SHALL escape untrusted text when rendering and SHALL not insert user strings as raw HTML. A simple allowlist SHALL constrain external SDS URL schemes to HTTPS (or explicit document identifiers).
---
11. Demonstration Dataset (DEMO)
Requirements
DEMO-1: The system SHALL include a seed script that populates Firestore with 10–15 reagents whose chemical properties, hazard classes, and CAS numbers are accurate to publicly available chemical databases (e.g., PubChem, NIST WebBook).
DEMO-2: The dataset SHALL include at least two reagent pairs with independently verifiable pair-specific incompatibility documentation from manufacturer SDS Section 10, a reputable chemical incompatibility chart, or an applicable authoritative storage reference. The cited document must actually support the tested pair; OSHA's general hazard-communication rule alone is not sufficient evidence of a particular pair conflict.
DEMO-3: The dataset SHALL include at least one reagent with `sdsStatus = MISSING` to demonstrate the missing-SDS alert path.
DEMO-4: The dataset SHALL include at least one reagent pair whose compatibility is genuinely unknown (no applicable rule in the ruleset), to demonstrate the `NEEDS_REVIEW` path.
DEMO-5: All reagent names, CAS numbers, hazard classes, and compatibility rules in the demonstration dataset SHALL be verified against their cited sources before use. No fabricated safety data is permitted.
---
12. Non-Functional Requirements (NFR)
NFR-1 — Responsiveness: The UI SHALL be usable on screens with a minimum viewport width of 1024 px and SHALL not break at widths up to 1920 px.
NFR-2 — Performance: Dashboard and inventory list pages SHALL complete their initial Firestore reads and render within 3 seconds on a standard broadband connection.
NFR-3 — Error messaging: Every failed API call or Firestore operation SHALL surface a user-visible error message that describes what went wrong without exposing internal stack traces or service account details.
NFR-4 — Accessibility: Interactive elements SHALL include accessible labels (`aria-label` or visible text) and SHALL be keyboard-navigable in a logical tab order (WCAG 2.1 AA target).
NFR-5 — Compatibility disclaimer persistence: The `NO_DOCUMENTED_CONFLICT` disclaimer text SHALL appear on the storage assignment confirmation screen and SHALL be stored in the assignment record so it is visible in audit history.
NFR-6 — Secret management: Firebase service account credentials SHALL be loaded only from server-side environment variables and SHALL never be committed to version control or bundled into the frontend.
NFR-7 — Budget constraint: Firestore and Firebase Authentication usage SHALL be sized for the available free quotas, without requiring a paid Firebase feature. The Node.js/Express trusted backend SHALL run locally for the MVP demo; hosted backend deployment is an optional later task and SHALL NOT be assumed included in Firebase Spark.
---
13. Edge Cases
ID	Scenario	Expected Behavior
EC-1	User assigns a reagent to a compartment that already contains it	System detects duplicate and rejects with validation error
EC-2	Reagent is archived while assigned to a compartment	Archive blocked until physical removal is confirmed and the active assignment is removed through the backend
EC-3	CAS number entered with extra whitespace	Backend trims whitespace before validation; trimmed value stored
EC-4	Compartment becomes empty before commit	Re-evaluate the committed snapshot; only proceed if the proposed reagent SDS/hazards and compartment restrictions are verified; otherwise return `NEEDS_REVIEW`
EC-5	Two users submit the same storage assignment at the same time	Firestore transaction ensures exactly one succeeds; the other receives a conflict error
EC-6	Admin deletes a storage location that still has active reagents	System rejects the deletion and lists the blocking assignments
EC-7	SDS URL field is populated but `sdsStatus` remains `UNVERIFIED`	Compatibility engine still returns `NEEDS_REVIEW` for pairs involving this reagent
EC-8	Report generation is requested when there are zero reagents	Report is generated with a header and an empty data section; no error is thrown
EC-9	User session token expires mid-session during a form submission	Backend rejects the request with HTTP 401; frontend intercepts, clears local session, and redirects to login without losing unsaved form data if possible
EC-10	Compatibility rule source becomes inaccessible at runtime	Preserve the original citation and reviewed source metadata; flag source for maintenance and never silently treat missing evidence as affirmative coverage
EC-11	A reagent is edited to become more hazardous while in storage	Re-evaluate current assignment, raise an alert for newly identified risk, and preserve physical-location visibility
EC-12	Unknown compatibility and a verified conflict both apply	`INCOMPATIBLE` takes precedence and the attempted assignment is blocked
EC-13	Two different bottles share the same CAS number	Both can be inventoried with separate container IDs and independently assigned
EC-14	Admin tries to edit an audit entry or directly approve a verified conflict	Reject action; no override route is provided
---
Review Notes (Version 1.1)
Clarified missing-SDS capture so the promised missing-information workflow is usable.
Prevented archived stock from disappearing from a real physical compartment without removal.
Made `INCOMPATIBLE` outrank `NEEDS_REVIEW`, with explicit ruleset-coverage requirements for non-conflict results.
Removed a weak Administrator override path for unknown/unverified storage assignments from the MVP.
Required verifiable pair-specific evidence instead of interpreting general regulations as pair-level chemical proof.
Clarified Firestore concurrency, authoritative backend permissions, initial Administrator setup, per-container identity, and local-backend deployment.
Safety limitation: This application provides inventory and decision support only; physical chemical segregation requires current manufacturer SDS guidance and review under the laboratory's approved safety procedures.