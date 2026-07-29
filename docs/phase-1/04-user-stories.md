# User Stories
## Smart Civic Issue Reporting & Management Platform

**Source of Truth:** Master Prompt Sections 1–18  
**Roles Referenced:** CITIZEN, FIELD_OFFICER, DEPARTMENT_HEAD, MUNICIPAL_COMMISSIONER, SUPER_ADMIN

---

## US-C: Citizen Stories

### US-C-1: Registration & Login
> As a **citizen**, I want to **register and log in using email, Google, or OTP** so that **I can access the platform securely without friction**.

**Acceptance Criteria:**
- Register with name, email, phone, and password
- Sign in with Google OAuth2
- Request OTP for phone-based authentication
- Receive JWT token upon successful authentication
- Reset password via email OTP

### US-C-2: Submit Complaint with Photo
> As a **citizen**, I want to **photograph a civic issue and submit it with my GPS location** so that **the system can identify and route the issue automatically**.

**Acceptance Criteria:**
- Capture or upload an image of the issue
- Auto-detect GPS coordinates (with permission)
- Optionally set emergencyFlag for urgent issues
- Add a text description
- Submit and receive an acknowledgment within 2 seconds
- View the complaint on my dashboard once AI processing completes

### US-C-3: Track Complaint Status
> As a **citizen**, I want to **track my complaint's status in real-time** so that **I know what action is being taken**.

**Acceptance Criteria:**
- View all my complaints in a list with current status
- Click into any complaint to see full details, including assigned officer, department, and SLA countdown
- View the complete status history timeline
- See images uploaded by the officer (PROGRESS, AFTER)

### US-C-4: Verify Resolution
> As a **citizen**, I want to **confirm or dispute the resolution** so that **I ensure the issue is actually fixed before it's closed**.

**Acceptance Criteria:**
- Receive notification when complaint is in CITIZEN_VERIFICATION status
- View the officer's resolution proof images
- Confirm resolution → status changes to CLOSED, receive +20 points
- Dispute with a reason → status changes to REOPENED, reassigned

### US-C-5: Support Other Complaints
> As a **citizen**, I want to **upvote and comment on complaints in my area** so that **I can amplify issues that need urgent attention**.

**Acceptance Criteria:**
- View nearby complaints on a map
- Upvote (support) a complaint once per complaint
- Add comments to any complaint
- See supportCount increment and affect priority scoring

### US-C-6: Earn Rewards
> As a **citizen**, I want to **earn points and achieve reward levels** so that **I feel recognized for contributing to my community**.

**Acceptance Criteria:**
- See my current points and rewardLevel on my profile
- See point transactions: +10 for verified, +5 for quality description, +10 for ≥3 supporters, +20 for closed
- View the leaderboard filtered by ward/city
- Track progress to next reward level

---

## US-FO: Field Officer Stories

### US-FO-1: View Assignments
> As a **field officer**, I want to **see all complaints assigned to me** so that **I know what work needs my attention**.

**Acceptance Criteria:**
- Dashboard shows assigned complaints sorted by SLA deadline (nearest first)
- Each row shows category, severity, priorityBand, location, and SLA countdown
- CRITICAL priority complaints are highlighted

### US-FO-2: Accept or Reject Assignment
> As a **field officer**, I want to **accept or reject a complaint assignment with a reason** so that **I can manage my workload responsibly**.

**Acceptance Criteria:**
- Accept → status transitions from ASSIGNED to ACCEPTED
- Reject → status transitions to VERIFIED with rejection reason, Department Head notified
- SLA clock starts ticking after acceptance

### US-FO-3: Update Complaint Progress
> As a **field officer**, I want to **update the complaint status and upload proof images** so that **the citizen and my superiors can see progress**.

**Acceptance Criteria:**
- Update status to WORK_STARTED with PROGRESS images
- Update status to UNDER_INSPECTION
- Update status to RESOLVED with AFTER images
- Add comments/notes with each update

### US-FO-4: View Performance Score
> As a **field officer**, I want to **see my performance score and grade** so that **I know how I am being evaluated**.

**Acceptance Criteria:**
- View current performanceScore (0–100)
- View performanceGrade (EXCELLENT/GOOD/AVERAGE/NEEDS_IMPROVEMENT/CRITICAL)
- See breakdown: SLA compliance, resolution time, escalation rate, satisfaction, reopen rate
- View performance history by period

### US-FO-5: Receive SLA Warnings
> As a **field officer**, I want to **receive a warning when 80% of SLA time has elapsed** so that **I can prioritize before escalation**.

**Acceptance Criteria:**
- Receive push notification and SMS at 80% SLA elapsed
- Complaint is visually marked on dashboard as at-risk
- Receive notification when complaint is escalated

---

## US-DH: Department Head Stories

### US-DH-1: Monitor Department Complaints
> As a **department head**, I want to **view all complaints assigned to my department** so that **I can monitor workload and performance**.

**Acceptance Criteria:**
- Dashboard shows all department complaints with filters (ward, status, severity, date range)
- View aggregate metrics: total complaints, resolved, SLA compliance %, avg resolution time
- Drill down into individual complaints

### US-DH-2: Reassign Complaints
> As a **department head**, I want to **reassign a complaint to a different officer in my department** so that **work is distributed effectively**.

**Acceptance Criteria:**
- View current assignment and officer workload
- Select a new officer from the department roster
- Enter reassignment reason
- Notification sent to new officer

### US-DH-3: View Officer Performance
> As a **department head**, I want to **see performance scores for all officers in my department** so that **I can identify training needs and top performers**.

**Acceptance Criteria:**
- Table of officers with current score and grade
- Sort by score, grade, escalation count
- Drill into individual officer's detailed performance record

### US-DH-4: Export Reports
> As a **department head**, I want to **export department reports in CSV/PDF** so that **I can share them in meetings**.

**Acceptance Criteria:**
- Filter by date range, ward, officer
- Export complaint summary report
- Export officer performance report
- Download via browser

---

## US-MC: Municipal Commissioner Stories

### US-MC-1: City-Wide Dashboard
> As a **municipal commissioner**, I want to **view city-wide analytics and heatmaps** so that **I can identify problem areas and allocate resources**.

**Acceptance Criteria:**
- Map view with complaint density heatmap
- Filters by ward, department, category, severity, date range
- Aggregate KPIs: total complaints, resolved %, avg resolution time, SLA compliance %, escalation rate
- Trend charts (weekly/monthly)

### US-MC-2: Cross-Department Reassignment
> As a **municipal commissioner**, I want to **reassign a complaint to a different department** so that **misrouted complaints are corrected**.

**Acceptance Criteria:**
- Override current department assignment
- Select new department and specific officer
- Notification sent to both old and new departments

### US-MC-3: City Performance Oversight
> As a **municipal commissioner**, I want to **view all officer and department performance scores** so that **I can hold department heads accountable**.

**Acceptance Criteria:**
- Department-wise performance rankings
- Officer performance distribution
- Identify consistently underperforming departments

---

## US-SA: Super Admin Stories

### US-SA-1: User Management
> As a **super admin**, I want to **create, update, deactivate, and manage all users and their roles** so that **the system's access control stays current**.

**Acceptance Criteria:**
- CRUD for all users
- Assign/change roles
- Activate/deactivate accounts
- Reset passwords

### US-SA-2: Configure SLA Rules
> As a **super admin**, I want to **set and modify SLA duration per category** so that **service levels reflect municipal policy**.

**Acceptance Criteria:**
- View/edit SLA rules table (category → durationHours)
- Add new category-SLA mapping
- Changes take effect for new assignments immediately

### US-SA-3: Manage Geographic Hierarchy
> As a **super admin**, I want to **define regions, zones, and wards with boundary GeoJSON** so that **GPS-based auto-assignment works correctly**.

**Acceptance Criteria:**
- CRUD for Region, Zone, Ward entities
- Upload/edit boundary GeoJSON polygons
- Validate polygon geometry (no overlaps, closed rings)

### US-SA-4: Configure Priority Weights
> As a **super admin**, I want to **adjust priority scoring factor weights** so that **the scoring algorithm reflects current municipal priorities**.

**Acceptance Criteria:**
- View/edit PriorityFactorConfig table
- Weights must sum to 1.0 (validation)
- Changes take effect for new complaints

### US-SA-5: System-Wide Access
> As a **super admin**, I want to **view any complaint, user, or report across the system** so that **I can audit and troubleshoot**.

**Acceptance Criteria:**
- Search/filter all entities
- View complete audit log
- Access all analytics and reports
- Impersonation not allowed (security constraint)
