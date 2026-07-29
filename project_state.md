# CivicResolve Project State & Architecture

## Overview
CivicResolve is a modern, real-time civic engagement platform designed to bridge the gap between citizens reporting municipal issues and field officers resolving them. The platform consists of a Spring Boot backend providing RESTful APIs and real-time updates (via Server-Sent Events), and a React+Vite frontend for the user interfaces.

## Project Structure
The repository is split into several directories. The active codebase is primarily located in `backend` and `frontend`.

- **`backend/`**: A Java Spring Boot application (Gradle build).
- **`frontend/`**: A React application built with Vite and Tailwind CSS.
- **`db/`**, **`k8s/`**, **`docs/`**: Supporting configuration for databases, Kubernetes deployments, and documentation.
- **Other directories** (e.g., `citizen_portal_civicsmart`, `executive_analytics_dashboard_civicsmart`, `officer_task_management_civicsmart`): Prototyping or design artifact folders (primarily containing HTML/images from initial concepts). 

## 1. Backend Architecture (Spring Boot)

### Core Technologies
- **Java 21**, **Spring Boot 3.2.4**
- **Spring Data JPA** with **Hibernate Spatial** (for PostGIS operations)
- **Spring Security** with stateless **JWT Authentication**
- **PostgreSQL** database (configured via application properties/environment variables)

### Module Breakdown
- **Controllers (`com.civic.platform.api.controllers`)**:
  - `AuthController.java`: Handles user registration, login, and JWT generation.
  - `ComplaintController.java`: Manages complaint creation (reports), fetching complaints by citizen, proximity search (`/nearby`), verification, comments, and upvoting. Integrates with the `SseService` to broadcast updates.
  - `OfficerController.java`: Endpoints for officers to view their assigned complaints and update statuses (e.g., to `WORK_STARTED` or `RESOLVED`).
  - `SseController.java`: Exposes the `/api/v1/sse/subscribe/{complaintId}` endpoint for real-time Server-Sent Events.
  - `AiController.java`, `AnalyticsController.java`, `NotificationController.java`, `RewardController.java`, `UserController.java`: Manage additional platform functionalities like AI analytics, notifications, gamification, and user profiles.

- **Services (`com.civic.platform.domain.services`)**:
  - `SseService.java`: Manages concurrent `SseEmitter` instances to push real-time updates to connected frontend clients when a complaint's state changes.
  - `AiInferenceService.java`: Connects with AI models to analyze uploaded images and classify complaints.
  - `AssignmentService.java`: Determines the closest and most appropriate field officer for a new complaint using spatial calculations (Haversine formula).
  - `PriorityEngine.java` / `SlaEngine.java`: Calculates SLA deadlines and priority scores based on AI severity, support counts, and escalation paths.

- **Security (`com.civic.platform.security`)**:
  - `SecurityConfig.java`: Configures RBAC (Role-Based Access Control) using `@PreAuthorize`. Secures all endpoints except `/api/v1/auth/**`, `/actuator/health/**`, and the newly added `/api/v1/sse/**`.
  - `JwtAuthenticationFilter.java`: Validates standard JWT Bearer tokens.

### Database Entities & Relationships
- **User**: Represents Citizens, Field Officers, Department Heads, and Commissioners. Officers have specific spatial attributes (`location` / `department`).
- **Complaint**: The core entity. Linked to a `Citizen` (reporter), an `AssignedOfficer`, and potentially a `SuperiorOfficer` if escalated. Tracks state (`ComplaintStatus`), coordinates, priority, and SLA deadlines.
- **Vote / Comment**: Allow community interaction on a specific `Complaint`.
- **Notification**: Stores alerts sent to users regarding complaint state transitions.

## 2. Frontend Architecture (React + Vite)

### Core Technologies
- **React 19**, **Vite**
- **Tailwind CSS** (for styling)
- **Axios** (for API communication)
- **React Router DOM** (for navigation)

### Module Breakdown
- **`src/api/`**: Contains Axios interceptor logic (`client.ts`) and specific API endpoints (`complaints.ts`, `auth.ts`, `rewards.ts`). The `client.ts` automatically attaches the JWT token to outgoing requests.
- **`src/pages/`**:
  - `CitizenDashboard.tsx`: Displays the citizen's reports and nearby reports using geolocation. Integrates gamification stats.
  - `ComplaintDetail.tsx`: Shows the full timeline of a specific report. Subscribes to the backend's SSE stream (`EventSource`) to automatically re-fetch data instantly when an officer updates the status—completely eliminating manual refresh and polling delays.
  - `OfficerDashboard.tsx`: Dashboard for field officers to view their assigned tasks and submit resolutions (including GPS verification and photos).
  - `AdminDashboard.tsx`, `CommissionerDashboard.tsx`, `DeptHeadDashboard.tsx`: Dashboards for higher officials to manage escalations and system analytics.
  - `ReportIssue.tsx`: Form for citizens to upload photos and GPS data to create a new complaint.

## 3. The Real-Time Status Workflow

1. **Assignment**: A citizen submits a report. The backend AI classifies it and the `AssignmentService` assigns it to an officer. Status is `ASSIGNED`.
2. **Officer Update**: The field officer logs into `OfficerDashboard.tsx`, views the assignment, and updates the status to `ACCEPTED` or `WORK_STARTED` via `OfficerController.java`.
3. **SSE Broadcast**: `OfficerController` saves the state and calls `sseService.emitComplaintUpdate(complaintId)`.
4. **Instant Citizen Refresh**: The citizen, viewing `ComplaintDetail.tsx`, has an open `EventSource` connection to the SSE endpoint. The frontend immediately receives the `COMPLAINT_UPDATE` signal and silently re-fetches the latest complaint data, updating the tracking UI timeline instantly without any manual reload.
5. **Resolution**: The officer submits a resolution photo and GPS coordinates (must be within 10 meters of the issue). Status updates to `RESOLVED`, and the cycle repeats, pushing the final verification prompt to the citizen in real-time.

---
*Generated by Antigravity IDE Agent.*
