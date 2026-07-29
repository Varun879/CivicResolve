# Software Requirements Specification (SRS)
## Smart Civic Issue Reporting & Management Platform

**Version:** 1.0  
**Phase:** 1 — Foundations  
**Source of Truth:** Master Prompt Sections 1–18  
**Date:** 2026-07-20

---

## 1. Introduction

### 1.1 Purpose
This SRS defines the complete requirements for the Smart Civic Issue Reporting & Management Platform — a government-grade system that enables citizens to photograph civic issues, automatically identifies the issue category and severity via computer vision, routes complaints to the correct department and officer, and tracks resolution with full accountability.

### 1.2 Scope
The platform covers the full lifecycle of a civic complaint: submission (with image + GPS), AI-powered categorization and severity assessment, duplicate detection, priority scoring, auto-assignment to the responsible ward officer, SLA-monitored resolution tracking, escalation on breach, citizen verification of resolution, officer performance measurement, and citizen gamification/rewards.

### 1.3 Definitions (from Canonical Domain Model — Section 5)

| Term | Definition |
|---|---|
| Complaint | A civic issue report submitted by a citizen containing category, description, severity, GPS coordinates, and images |
| Citizen | A registered user with role `CITIZEN` who reports and tracks complaints |
| Field Officer | Municipal employee (`FIELD_OFFICER`) assigned to resolve complaints in a ward+department |
| Department Head | Role `DEPARTMENT_HEAD` who oversees a department's officers and can reassign |
| Municipal Commissioner | Role `MUNICIPAL_COMMISSIONER` with city-wide oversight |
| Super Admin | Role `SUPER_ADMIN` with full system configuration and user management privileges |
| SLA | Service Level Agreement — maximum hours for complaint resolution per category |
| Escalation | Automatic elevation of an unresolved complaint to higher authority when SLA is breached |

### 1.4 References
- Master Prompt Sections 1–18 (canonical entities, enums, formulas, RBAC matrix)
- Phase 2 deliverables (ER Diagram, DDL Schema) will reference this SRS

---

## 2. System Actors

| Actor | Role Enum | Description |
|---|---|---|
| Citizen | `CITIZEN` | Registers, submits complaints, uploads images, tracks status, verifies resolution, comments, upvotes |
| Field Officer | `FIELD_OFFICER` | Accepts/rejects assignments, updates status, uploads progress/resolution proof, comments |
| Department Head | `DEPARTMENT_HEAD` | Views department complaints, reassigns officers, views department analytics and performance |
| Municipal Commissioner | `MUNICIPAL_COMMISSIONER` | City-wide oversight, reassigns across departments, views city analytics, exports reports |
| Super Admin | `SUPER_ADMIN` | Manages users/departments/regions, configures SLA rules, priority weights, escalation rules, full system access |

---

## 3. Canonical Enumerations Used (from Section 3)

- **ComplaintStatus:** `REPORTED, VERIFIED, ASSIGNED, ACCEPTED, WORK_STARTED, UNDER_INSPECTION, RESOLVED, CITIZEN_VERIFICATION, CLOSED, REJECTED, REOPENED`
- **Category (18 values):** `POTHOLE, DAMAGED_ROAD, FOOTPATH_DAMAGE, STREETLIGHT, TRAFFIC_SIGNAL, GARBAGE, ILLEGAL_DUMPING, OVERFLOWING_DUSTBIN, ANIMAL_CARCASS, DRAINAGE_BLOCKAGE, WATER_LOGGING, SEWAGE_OVERFLOW, WATER_LEAKAGE, OPEN_MANHOLE, FALLEN_TREE, PARK_MAINTENANCE, PUBLIC_PROPERTY_DAMAGE, OTHER`
- **Severity:** `LOW, MEDIUM, HIGH, CRITICAL`
- **PriorityBand:** `LOW, MEDIUM, HIGH, CRITICAL`
- **EscalationLevel:** `FIELD_OFFICER, ASSISTANT_ENGINEER, EXECUTIVE_ENGINEER, MUNICIPAL_COMMISSIONER, STATE_DASHBOARD`
- **ImageType:** `BEFORE, PROGRESS, AFTER`
- **NotificationChannel:** `PUSH, EMAIL, SMS`
- **AuthProvider:** `LOCAL, GOOGLE, OTP`
- **RewardLevel:** `BRONZE, SILVER, GOLD, DIAMOND, CITY_GUARDIAN`
- **PerformanceGrade:** `EXCELLENT, GOOD, AVERAGE, NEEDS_IMPROVEMENT, CRITICAL`

---

## 4. Complaint Lifecycle (from Section 4)

```
REPORTED → VERIFIED → ASSIGNED → ACCEPTED → WORK_STARTED → UNDER_INSPECTION → RESOLVED → CITIZEN_VERIFICATION → CLOSED
                                                                                                              ↓
                                                                                                           REOPENED → ASSIGNED
VERIFIED → REJECTED (invalid/spam/duplicate)
```

Every transition is recorded in `ComplaintStatusHistory` with actor, fromStatus, toStatus, reason, and timestamp.

---

## 5. Feature List

### 5.1 Citizen Features
- User registration and login (email/password, Google OAuth2, OTP)
- Submit complaint with photo (from camera/gallery) + auto-captured GPS
- View personal complaint history with status and SLA countdown
- Track individual complaint in real-time
- Verify resolution (confirm close or reopen)
- Comment on complaints
- Upvote/support complaints
- View reward points and achievement level
- View leaderboard
- Receive notifications (push, email)

### 5.2 Field Officer Features
- View assigned complaints dashboard
- Accept or reject assignment (with reason)
- Update complaint status with proof images
- View personal performance score and grade
- Receive SLA breach warnings
- Comment on assigned complaints

### 5.3 Department Head Features
- View department-wide complaints
- Reassign complaints to officers
- View officer performance scores (department)
- View department analytics
- Export department reports

### 5.4 Municipal Commissioner Features
- City-wide complaint dashboard with heatmaps
- Reassign complaints across departments
- View department and ward analytics
- View all officer performance scores
- Export city-wide reports

### 5.5 Super Admin Features
- Full CRUD on users, departments, regions, zones, wards
- Configure SLA rules per category
- Configure priority factor weights
- Configure escalation rules
- View all data across the system
- Manage permissions

---

## 6. AI Pipeline Requirements (from Section 7)

1. The system must accept image upload from citizen's device
2. The system must capture GPS coordinates from the citizen's device
3. The system must enqueue the image for asynchronous AI inference
4. The AI pipeline must return: `category`, `confidenceScore`, `severity`, `estimatedResolutionHours`
5. The category must map to a department using the deterministic mapping in Section 7
6. The complaint must not be persisted until AI inference completes
7. The citizen must receive an immediate acknowledgment upon submission

---

## 7. Duplicate Detection Requirements (from Section 8)

A new complaint must be merged into an existing complaint (increment `supportCount`) when ALL of the following hold:
- Distance ≤ 50m (PostGIS ST_DWithin)
- Same Category enum value
- Within 72 hours of the existing complaint's `createdAt`
- Image embedding cosine similarity ≥ 0.85

---

## 8. Priority Scoring Requirements (from Section 9)

The system must compute `priorityScore` using the formula:
```
0.30 * severityScore + 0.15 * roadImportance + 0.10 * schoolProximity +
0.10 * hospitalProximity + 0.10 * trafficDensity + 0.10 * populationDensity +
0.10 * normalizedSupportCount + 0.05 * weatherRiskFactor
```
All inputs normalized 0–1. Weights editable by Super Admin via `PriorityFactorConfig`. Bands: `0.00–0.25 → LOW`, `0.25–0.50 → MEDIUM`, `0.50–0.75 → HIGH`, `0.75–1.00 → CRITICAL`. An explicit `emergencyFlag` overrides all and forces `CRITICAL`.

---

## 9. SLA Requirements (from Section 10)

| Category | SLA Duration |
|---|---|
| emergencyFlag=true | 2 hours |
| FALLEN_TREE, OPEN_MANHOLE | 6 hours |
| SEWAGE_OVERFLOW | 12 hours |
| GARBAGE, OVERFLOWING_DUSTBIN, ANIMAL_CARCASS, ILLEGAL_DUMPING | 24 hours |
| STREETLIGHT, TRAFFIC_SIGNAL | 48 hours |
| DRAINAGE_BLOCKAGE, WATER_LOGGING, WATER_LEAKAGE | 72 hours |
| POTHOLE, FOOTPATH_DAMAGE | 96 hours |
| DAMAGED_ROAD, PUBLIC_PROPERTY_DAMAGE, PARK_MAINTENANCE | 7 days |
| OTHER | 7 days |

`slaDeadline = assignedAt + SLARule.durationHours`. SLA rules are configurable by Super Admin.

---

## 10. Escalation Requirements (from Section 11)

| SLA Elapsed | Escalation Level |
|---|---|
| 100% (deadline passed, no acceptance) | ASSISTANT_ENGINEER |
| 150% | EXECUTIVE_ENGINEER |
| 200% | MUNICIPAL_COMMISSIONER |
| 300% or 3rd escalation | STATE_DASHBOARD |

Each escalation creates an `Escalation` record, applies performance penalty, and fires notifications.

---

## 11. Officer Performance Requirements (from Section 12)

```
score = 40 * slaComplianceRate + 20 * (1 - normalizedAvgResolutionTime) +
        15 * (1 - escalationRate) + 15 * normalizedCitizenSatisfaction +
        10 * (1 - reopenRate)
```

Grades: `EXCELLENT 90–100`, `GOOD 75–89`, `AVERAGE 60–74`, `NEEDS_IMPROVEMENT 40–59`, `CRITICAL <40`.

---

## 12. Reward Requirements (from Section 13)

| Trigger | Points |
|---|---|
| Complaint passes verification | +10 |
| High-quality description (AI-judged) | +5 |
| ≥3 supporters on complaint | +10 |
| Complaint reaches CLOSED | +20 |

Levels: `BRONZE 0–99`, `SILVER 100–299`, `GOLD 300–699`, `DIAMOND 700–1499`, `CITY_GUARDIAN 1500+`.

---

## 13. Notification Requirements (from Section 14)

The system must send notifications for: submission confirmation, verification & assignment, officer acceptance/rejection, work started, SLA 80% warning, escalation, resolution awaiting verification, closure, and reopening — with channels (Push/Email/SMS) and recipients per the Notification Matrix (Section 14).

---

## 14. Geographic Hierarchy Requirements (from Section 6)

The system must implement `Region → Zone → Ward` hierarchy using PostGIS polygons. Auto-assignment of complaints to officers must use `WardDepartmentOfficer` as the single join mechanism. GPS point-in-polygon lookup determines the ward.

---

## 15. Security Requirements (from Section 17)

- JWT + refresh token authentication
- Spring Security method-level `@PreAuthorize` matching Section 2 RBAC matrix
- bcrypt password hashing
- Strict image upload validation (MIME type, size, malware scan)
- Redis-backed rate limiting
- Every state-changing action writes to AuditLog
- OTP and Google OAuth2 flows
- TLS everywhere
- Secrets via AWS Secrets Manager / K8s secrets
- OWASP Top 10 mitigations

---

## 16. Non-Functional Requirements (from Section 18)

- Scalable to city-wide load
- 99.9% availability target
- p95 API latency < 300ms (excluding async AI inference)
- WCAG 2.1 AA accessibility
- Structured logging + metrics + tracing
- Automated backups and documented disaster-recovery plan
- Multi-language UI ready architecture

---

## 17. Technical Architecture (from Section 15)

**Backend:** Spring Boot with microservice boundaries — Identity, Complaint, AI Inference, Geo/Assignment, SLA/Escalation, Performance/Rewards, Notification, Analytics services.

**Frontend:** React + TypeScript + Tailwind + ShadCN with feature-folder structure, route guards matching RBAC matrix, shared TypeScript types from canonical enums.

**Data:** PostgreSQL + PostGIS, Redis, AWS S3.

**Infra:** Docker, Kubernetes, GitHub Actions, AWS (EKS/RDS/S3/CloudFront), Kafka/SQS.

---

## 18. API Design Conventions (from Section 16)

- Resource paths map 1:1 to entities: `/api/v1/complaints`, `/api/v1/complaints/{id}/status`, etc.
- Standard response envelope: `{ success, data, error, meta }`
- Standard pagination: `page`, `size`, `totalElements`
- `@PreAuthorize` enforcement on every state-changing endpoint
- OpenAPI/Swagger docs generated from code, versioned `/v1`

---

## 19. Constraints and Assumptions

1. All enum values must match the canonical list in Section 3 exactly — no additions without updating the Master Prompt first.
2. The AI inference service is assumed to have been trained on a civic image dataset covering all 18 categories.
3. GPS coordinates are assumed to be accurate to within 10m (standard smartphone GPS).
4. The system assumes internet connectivity for all actors (offline mode is a future roadmap item).
5. Department-to-category mapping is deterministic and not left to the AI model.
