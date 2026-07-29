# Functional Requirements
## Smart Civic Issue Reporting & Management Platform

**Source of Truth:** Master Prompt Sections 1–18  
**RBAC Reference:** Section 2 (Canonical RBAC Matrix)  
**Entities Reference:** Section 5 (Canonical Domain Model)

---

## FR-1: User Registration & Authentication

| ID | Requirement | Role | Priority |
|---|---|---|---|
| FR-1.1 | System shall allow user registration with name, email, phone, and password | All | High |
| FR-1.2 | System shall support authentication via LOCAL (email+password), GOOGLE OAuth2, and OTP | All | High |
| FR-1.3 | System shall issue JWT access tokens and refresh tokens upon successful authentication | All | High |
| FR-1.4 | System shall enforce password hashing using bcrypt | All | High |
| FR-1.5 | System shall support password reset via email OTP | ALL | Medium |
| FR-1.6 | System shall assign Role enum upon registration (default: CITIZEN) | CITIZEN | High |

---

## FR-2: Complaint Submission (Citizen)

| ID | Requirement | Role | Priority |
|---|---|---|---|
| FR-2.1 | Citizen shall submit a complaint by uploading at least one image (BEFORE type) | CITIZEN | High |
| FR-2.2 | System shall auto-capture GPS coordinates from the citizen's device at submission time | CITIZEN | High |
| FR-2.3 | Citizen shall provide a text description of the issue | CITIZEN | High |
| FR-2.4 | Citizen shall be able to set an emergencyFlag for life-safety issues (e.g., open manhole on highway) | CITIZEN | High |
| FR-2.5 | System shall immediately enqueue the submission for async AI inference and return an acknowledgment to the citizen | CITIZEN | High |
| FR-2.6 | System shall persist the complaint only after AI inference completes successfully | CITIZEN | High |
| FR-2.7 | Citizen shall be able to submit up to 5 images per complaint (BEFORE type) | CITIZEN | Medium |

---

## FR-3: AI Inference Pipeline

| ID | Requirement | Role | Priority |
|---|---|---|---|
| FR-3.1 | System shall asynchronously process the submitted image through CV model inference | System | High |
| FR-3.2 | AI pipeline shall return category, confidenceScore (0–1), severity, and estimatedResolutionHours | System | High |
| FR-3.3 | System shall map the detected category to a Department using the deterministic mapping in Section 7 | System | High |
| FR-3.4 | System shall perform duplicate detection against existing complaints (≤50m, same category, ≤72h, similarity ≥0.85) | System | High |
| FR-3.5 | If duplicate detected, system shall merge citizen as supporter (increment supportCount) instead of creating new complaint | System | High |

---

## FR-4: Priority Scoring

| ID | Requirement | Role | Priority |
|---|---|---|---|
| FR-4.1 | System shall compute priorityScore using the formula defined in Section 9 | System | High |
| FR-4.2 | System shall assign priorityBand (LOW/MEDIUM/HIGH/CRITICAL) based on priorityScore ranges | System | High |
| FR-4.3 | If emergencyFlag=true, system shall override score and set priorityBand to CRITICAL | System | High |
| FR-4.4 | Super Admin shall be able to modify priority factor weights via PriorityFactorConfig | SUPER_ADMIN | Medium |
| FR-4.5 | All priority factor weights must sum to 1.0 | System | High |

---

## FR-5: Geographic Resolution & Auto-Assignment

| ID | Requirement | Role | Priority |
|---|---|---|---|
| FR-5.1 | System shall determine the Ward by performing PostGIS point-in-polygon lookup on citizen GPS coordinates | System | High |
| FR-5.2 | System shall determine the responsible Department from the AI-inferred category via Section 7 mapping | System | High |
| FR-5.3 | System shall auto-assign the complaint to the primary officer (isPrimary=true) from WardDepartmentOfficer for the resolved ward+department | System | High |
| FR-5.4 | If no primary officer exists, system shall assign to any available officer in that ward+department | System | High |
| FR-5.5 | If no officer exists, system shall flag the complaint for Department Head manual assignment | System | High |

---

## FR-6: Complaint Status Management

| ID | Requirement | Role | Priority |
|---|---|---|---|
| FR-6.1 | System shall transition complaint status following the state machine in Section 4 | System | High |
| FR-6.2 | System shall record every status transition in ComplaintStatusHistory with actor, fromStatus, toStatus, reason, and timestamp | System | High |
| FR-6.3 | Field Officer shall accept or reject an assigned complaint with a reason | FIELD_OFFICER | High |
| FR-6.4 | Field Officer shall update status to WORK_STARTED, UNDER_INSPECTION, and RESOLVED with proof images (PROGRESS, AFTER) | FIELD_OFFICER | High |
| FR-6.5 | Citizen shall verify resolution by confirming CLOSED or disputing to REOPENED with a reason | CITIZEN | High |
| FR-6.6 | Department Head may override and reassign a complaint within the department | DEPARTMENT_HEAD | Medium |
| FR-6.7 | Commissioner may reassign a complaint across departments | MUNICIPAL_COMMISSIONER | Medium |

---

## FR-7: SLA Enforcement

| ID | Requirement | Role | Priority |
|---|---|---|---|
| FR-7.1 | System shall set slaDeadline = assignedAt + SLARule.durationHours per category | System | High |
| FR-7.2 | System shall display remaining SLA time on complaint detail for citizen and officer | All | High |
| FR-7.3 | System shall notify the officer when 80% of SLA duration has elapsed | FIELD_OFFICER | High |
| FR-7.4 | Super Admin shall be able to add/edit/delete SLA rules per category | SUPER_ADMIN | Medium |

---

## FR-8: Escalation Engine

| ID | Requirement | Role | Priority |
|---|---|---|---|
| FR-8.1 | System shall run a scheduled scan to detect complaints past SLA thresholds | System | High |
| FR-8.2 | System shall escalate per Section 11 ladder when SLA elapsed percentage is reached | System | High |
| FR-8.3 | Each escalation shall create an Escalation record with complaintId, level, triggeredAt, reason | System | High |
| FR-8.4 | Each escalation shall apply a performance penalty to the assigned officer | System | High |
| FR-8.5 | Each escalation shall fire notifications to the next escalation level and the citizen | System | High |

---

## FR-9: Officer Performance

| ID | Requirement | Role | Priority |
|---|---|---|---|
| FR-9.1 | System shall compute officer performance score using the formula in Section 12 | System | High |
| FR-9.2 | System shall assign performance grade per Section 12 thresholds | System | High |
| FR-9.3 | Officer shall view only their own performance score and grade | FIELD_OFFICER | Medium |
| FR-9.4 | Department Head shall view scores for all officers in their department | DEPARTMENT_HEAD | Medium |
| FR-9.5 | Commissioner shall view scores for all officers city-wide | MUNICIPAL_COMMISSIONER | Medium |
| FR-9.6 | Super Admin shall view all officer scores | SUPER_ADMIN | Medium |
| FR-9.7 | Performance shall never be exposed publicly | System | High |

---

## FR-10: Gamification & Rewards

| ID | Requirement | Role | Priority |
|---|---|---|---|
| FR-10.1 | System shall award points per Section 13 triggers | System | High |
| FR-10.2 | System shall maintain cumulative points per citizen and assign rewardLevel per Section 13 | System | High |
| FR-10.3 | System shall record every point transaction in RewardTransaction | System | High |
| FR-10.4 | System shall display a citizen leaderboard filterable by ward, city, and time range | CITIZEN | Medium |
| FR-10.5 | Citizen shall view their current points, level, and achievement history | CITIZEN | Medium |

---

## FR-11: Notifications

| ID | Requirement | Role | Priority |
|---|---|---|---|
| FR-11.1 | System shall send notifications per the Notification Matrix in Section 14 | System | High |
| FR-11.2 | System shall support PUSH, EMAIL, and SMS channels | System | High |
| FR-11.3 | System shall record each notification in the Notification entity | System | Medium |

---

## FR-12: Comments & Votes

| ID | Requirement | Role | Priority |
|---|---|---|---|
| FR-12.1 | Any authenticated user shall comment on any complaint | All | Medium |
| FR-12.2 | Citizen shall upvote (support) a complaint, with unique constraint per citizen+complaint | CITIZEN | Medium |
| FR-12.3 | supportCount shall increment when a citizen supports a complaint | System | Medium |
| FR-12.4 | supportCount feeds into priorityScore formula (normalizedSupportCount) | System | High |

---

## FR-13: Comments & Votes

| ID | Requirement | Role | Priority |
|---|---|---|---|
| FR-13.1 | Super Admin shall manage users (CRUD) | SUPER_ADMIN | High |
| FR-13.2 | Super Admin shall manage departments and category assignments | SUPER_ADMIN | High |
| FR-13.3 | Super Admin shall manage geographic hierarchy (Region, Zone, Ward with boundary GeoJSON) | SUPER_ADMIN | High |
| FR-13.4 | Super Admin shall manage WardDepartmentOfficer assignments | SUPER_ADMIN | High |
| FR-13.5 | Super Admin shall configure escalation rules | SUPER_ADMIN | Medium |

---

## FR-14: Analytics & Reporting

| ID | Requirement | Role | Priority |
|---|---|---|---|
| FR-14.1 | Department Head shall view department complaint volume, resolution rates, SLA compliance | DEPARTMENT_HEAD | Medium |
| FR-14.2 | Commissioner shall view city-wide dashboards with ward comparisons and heatmaps | MUNICIPAL_COMMISSIONER | Medium |
| FR-14.3 | Super Admin shall view system-wide analytics | SUPER_ADMIN | Medium |
| FR-14.4 | Authorized roles shall export reports in CSV/PDF format | DEPARTMENT_HEAD, MUNICIPAL_COMMISSIONER, SUPER_ADMIN | Low |

---

## FR-15: Audit Logging

| ID | Requirement | Role | Priority |
|---|---|---|---|
| FR-15.1 | Every state-changing action shall write an AuditLog entry (actorId, action, entityType, entityId, oldValue, newValue, timestamp) | System | High |
| FR-15.2 | AuditLog shall be append-only and immutable | System | High |
