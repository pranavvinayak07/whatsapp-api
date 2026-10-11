# Vivegaa WhatsApp Dashboard - Implementation Plan

**Version:** 1.0  
**Target Host:** Ubuntu Linux / Docker / Coolify  
**Target Domain:** `https://whatsapp.vivegaaerp.in`  

---

## Phases Overview

### Phase 1: Foundation & Project Scaffolding
- Initialize monorepo / workspace with root `package.json`, `backend/`, and `frontend/`.
- Configure TypeScript, ESLint, Tailwind CSS, Lucide icons in Frontend.
- Configure Express + TypeScript, Prisma ORM, and database connection in Backend.
- Set up Dockerfiles and `docker-compose.yml` with persistent volumes (`/app/auth`, `/app/media`, `postgres_data`).
- Environment variable schemas and Zod validations for both services.

### Phase 2: Authentication, Security & Administration
- Prisma models: `User`, `Role`, `Permission`, `AuditLog`, `SystemSetting`.
- RBAC roles: `SUPER_ADMIN`, `ADMIN`, `MESSAGING_STAFF`, `VIEWER`.
- Password hashing with bcrypt, session token generation, HTTP-only cookie support.
- User management API and audit logging middleware.
- Admin dashboard layout (Modern SaaS light theme, white background, subtle gray borders, green WhatsApp accents).

### Phase 3: Baileys WhatsApp Engine & Connection Management
- Integrated Baileys connection service using `useMultiFileAuthState`.
- Persistent session storage on volume (`/app/auth`).
- Event listeners for `connection.update`, `creds.update`, `messages.upsert`, `messages.update`.
- QR code generation and real-time streaming to the dashboard via SSE (Server-Sent Events).
- Graceful reconnection logic with exponential backoff (bounded to 5 attempts, preventing infinite loops).
- Connection state endpoints: `GET /api/v1/connection/status`, `POST /api/v1/connection/connect`, `POST /api/v1/connection/disconnect`, `POST /api/v1/connection/logout`.

### Phase 4: Message Composer & Core Messaging
- Phone number validation and E.164 normalization (+91 default, universal international support).
- Supported outbound formats:
  - Text messages with emoji support and character counter.
  - Image messages with captions.
  - Document messages (PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, TXT, CSV, ZIP) with MIME validation.
  - Video and Audio/Voice-note messaging.
  - Location and Contact vCard messages.
  - Quoted replies and emoji reactions.
  - Edit and Delete operations where Baileys/WhatsApp protocol permits.

### Phase 5: Inbox, Real-Time Conversations & Contacts
- Conversation storage: `Conversation`, `Message`, `MessageAttachment`, `MessageStatusEvent`.
- Deduplication using WhatsApp remote JID and message ID.
- Inbound message processing: saves text, downloads and stores media attachments in persistent volume `/app/media`.
- 3-column Inbox UI:
  - Left: Search, unread counts, conversation list with preview.
  - Center: Message thread, bubbles, attachment renderers, composer, reactions.
  - Right: Contact card, student reference, tags, staff assignment, internal notes.
- Contact Management: CRUD, CSV import/export, student IDs, parent relationships, tags, and consent flags.

### Phase 6: Message Templates & Interactive Fallback
- Template models with category filters (Attendance, Fees, Homework, Exams, Transport, General).
- Variable injection: `{{student_name}}`, `{{parent_name}}`, `{{class}}`, `{{section}}`, `{{date}}`, `{{fee_amount}}`, etc.
- Interactive messages:
  - Native WhatsApp button payloads where supported.
  - Automatic numbered-response fallback:
    ```
    Reply:
    1 - Option A
    2 - Option B
    ```
  - Inbound reply parser to automate responses to numeric replies.

### Phase 7: PostgreSQL Durable Message Queue & School Automation
- Queue schema: `QueuedMessage` with states `PENDING`, `PROCESSING`, `SENT`, `DELIVERED`, `READ`, `FAILED`, `CANCELLED`.
- Worker execution with configurable throughput, backoff retries, and idempotency keys.
- Automation rule engine:
  - `ATTENDANCE_ABSENT`, `ATTENDANCE_LATE`, `FEE_REMINDER`, `FEE_RECEIPT`, `HOMEWORK_NOTIFICATION`, `EXAM_ANNOUNCEMENT`, `TRANSPORT_ALERT`, `BUS_DELAY`.
  - Consent validation before queuing automated school messages.
  - Pause/resume queue control for administrators.

### Phase 8: External ERP Integration API & Webhooks
- Base route `/api/v1` with scoped API Key authentication (`x-api-key`).
- Standardized REST endpoints:
  - Messaging: `/messages/text`, `/messages/image`, `/messages/document`, etc.
  - Contacts & Templates: `/contacts`, `/contacts/import`, `/templates`.
  - Automation: `/automation/events`.
  - Queue & Status: `/connection/status`, `/queue/status`, `/health`.
- Outgoing webhook dispatcher for delivery events and incoming messages with HMAC-SHA256 signatures and timestamp replay protection.

### Phase 9: Media Library, Analytics, Settings & Logs
- Dedicated Media Library for uploaded attachments with storage metrics and cleanups.
- Analytics dashboard: Total sent, delivered, read, failed, pending, active chats, uptime.
- System logs and audit trail viewer.
- General settings: default country code, rate limits, retry limits, consent enforcement policies.

### Phase 10: Docker & Coolify Deployment Hardening & Testing
- Multi-container `docker-compose.yml` with health checks and volume mappings.
- Dockerfiles for backend API and frontend Next.js.
- Complete automated test suite using mocked Baileys and real Prisma migrations.
- Detailed production deployment guide (`DEPLOYMENT.md` and `COOLIFY_DEPLOYMENT.md`).
