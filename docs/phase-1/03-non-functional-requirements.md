# Non-Functional Requirements
## Smart Civic Issue Reporting & Management Platform

**Source of Truth:** Master Prompt Section 18  
**Traceability:** Each NFR is tagged to the relevant system concern

---

## NFR-1: Performance & Scalability

| ID | Requirement | Target | Measurement |
|---|---|---|---|
| NFR-1.1 | API response time for read operations (p95) | < 300ms | New Relic / CloudWatch |
| NFR-1.2 | API response time for write operations (p95) | < 500ms | New Relic / CloudWatch |
| NFR-1.3 | Complaint submission acknowledgment | < 2s (sync part) | Custom metric |
| NFR-1.4 | AI inference completion (async) | < 30s per image | Queue latency metric |
| NFR-1.5 | System shall handle concurrent load for a city of 5M+ population | 10,000 concurrent users | Load test (k6) |
| NFR-1.6 | Complaint listing with filters | < 1s for 100K records | Query execution time |
| NFR-1.7 | Dashboard aggregation queries | < 3s | Query execution time |
| NFR-1.8 | Horizontal scaling — each microservice shall scale independently | Auto-scale based on CPU/memory | HPA metrics |

---

## NFR-2: Availability & Reliability

| ID | Requirement | Target | Measurement |
|---|---|---|---|
| NFR-2.1 | System uptime | 99.9% (8.76h downtime/year max) | Uptime monitor |
| NFR-2.2 | Database failover | < 60s RTO | DR drill |
| NFR-2.3 | Data durability (complaints, images, audit logs) | 99.999999999% | S3 + RDS backup |
| NFR-2.4 | Automated daily backups with 30-day retention | Daily | Backup job logs |
| NFR-2.5 | Disaster recovery plan documented and tested quarterly | RPO < 1h, RTO < 4h | DR test report |

---

## NFR-3: Security

| ID | Requirement | Target | Standard |
|---|---|---|---|
| NFR-3.1 | Authentication — JWT with refresh token rotation | Access token: 15min, Refresh: 7d | OAuth2 best practices |
| NFR-3.2 | Password hashing | bcrypt, cost factor 12 | OWASP |
| NFR-3.3 | Image upload validation | MIME check + max 10MB + malware scan | OWASP |
| NFR-3.4 | Rate limiting per IP/user | 100 req/min per IP, 1000 req/min per user | Redis-based |
| NFR-3.5 | TLS encryption | TLS 1.2+ for all traffic | NIST |
| NFR-3.6 | Secrets management | AWS Secrets Manager / K8s secrets | AWS best practices |
| NFR-3.7 | RBAC enforcement at method level | `@PreAuthorize` matching Section 2 | Spring Security |
| NFR-3.8 | OWASP Top 10 mitigations | All addressed in Phase 7 | OWASP 2021 |
| NFR-3.9 | Audit trail completeness | Every state change logged, append-only | Compliance |

---

## NFR-4: Data & Storage

| ID | Requirement | Target | Notes |
|---|---|---|---|
| NFR-4.1 | Complaint records | Expected 50K–500K/year per city | Partition by month |
| NFR-4.2 | Image storage | Up to 10MB per image, avg 3 per complaint | S3 + CDN |
| NFR-4.3 | Status history retention | 7 years minimum | Archival policy |
| NFR-4.4 | Audit log retention | 7 years minimum | Append-only table |
| NFR-4.5 | PostGIS spatial queries | < 100ms for point-in-polygon | Spatial index on boundaries |

---

## NFR-5: Usability & Accessibility

| ID | Requirement | Target | Standard |
|---|---|---|---|
| NFR-5.1 | Accessibility compliance | WCAG 2.1 Level AA | WCAG |
| NFR-5.2 | Mobile responsiveness | All screens functional on 320px–1920px | Responsive design |
| NFR-5.3 | Supported browsers | Chrome, Firefox, Safari, Edge (last 2 major versions) | — |
| NFR-5.4 | Multi-language ready | i18n architecture for future Hindi + regional languages | i18next |
| NFR-5.5 | Citizen-facing UI load time | < 3s on 3G connection | Lighthouse |

---

## NFR-6: Maintainability & Extensibility

| ID | Requirement | Target | Standard |
|---|---|---|---|
| NFR-6.1 | Microservice architecture | 8 services per Section 15 | Clean Architecture |
| NFR-6.2 | API versioning | All endpoints under `/v1/`, breaking changes = version bump | OpenAPI |
| NFR-6.3 | Code coverage for critical paths | > 85% | JaCoCo |
| NFR-6.4 | Linting and formatting | ESLint + Prettier (frontend), Checkstyle + Spotless (backend) | CI gate |
| NFR-6.5 | Infrastructure as Code | Terraform for AWS, Helm for K8s | IaC best practices |

---

## NFR-7: Monitoring & Observability

| ID | Requirement | Target | Tool |
|---|---|---|---|
| NFR-7.1 | Structured logging | JSON format, correlation ID per request | Logback / CloudWatch |
| NFR-7.2 | Distributed tracing | Trace across all microservices | OpenTelemetry + Jaeger |
| NFR-7.3 | Metrics collection | CPU, memory, request rate, latency, error rate, queue depth | Prometheus + Grafana |
| NFR-7.4 | Health check endpoints | `/actuator/health` on every service | Spring Actuator |
| NFR-7.5 | SLA breach alerts | Real-time PagerDuty/OpsGenie for escalations | CloudWatch Alarms |

---

## NFR-8: Compliance & Legal

| ID | Requirement | Target | Standard |
|---|---|---|---|
| NFR-8.1 | Data privacy | Personal data encrypted at rest and in transit | GDPR / local law |
| NFR-8.2 | Data retention | 7 years for complaints and audits | Municipal records law |
| NFR-8.3 | Consent management | Citizen consent at registration for data collection | GDPR |
| NFR-8.4 | Image moderation | Automated NSFW/offensive content filter on upload | Safety standards |

---

## NFR-9: Portability & Cloud Readiness

| ID | Requirement | Target | Notes |
|---|---|---|---|
| NFR-9.1 | Containerized deployment | All services Dockerized | Docker |
| NFR-9.2 | Orchestration | Kubernetes manifests for all services | Helm |
| NFR-9.3 | Cloud-agnostic design | Abstracted via env vars, no hardcoded infra | 12-factor app |
| NFR-9.4 | CI/CD pipeline | Build → Test → Security Scan → Deploy | GitHub Actions |

---

## NFR-10: AI/ML Requirements

| ID | Requirement | Target | Notes |
|---|---|---|---|
| NFR-10.1 | Inference accuracy (top-1 category) | > 85% | Continuous monitoring |
| NFR-10.2 | Inference latency (per image) | < 5s (excluding queue wait) | GPU-backed inference |
| NFR-10.3 | False positive rate for duplicate detection | < 2% | Threshold tuning |
| NFR-10.4 | Model retraining pipeline | Monthly retrain on new labeled data | MLOps pipeline |
