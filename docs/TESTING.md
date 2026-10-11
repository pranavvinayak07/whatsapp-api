# Vivegaa WhatsApp Dashboard - Testing Strategy

## 1. Automated Testing
- **Unit & Integration Tests**:
  - Phone number formatting (E.164, Indian +91 normalization, international validation).
  - Variable template parsing and substitution logic (`{{student_name}}`, `{{fee_amount}}`, etc.).
  - PostgreSQL durable message queue state transitions (retries, exponential backoff, dead-lettering).
  - REST API validation, authentication, and HMAC signature verification.
  - Role-based authorization guard tests (`SUPER_ADMIN`, `ADMIN`, `MESSAGING_STAFF`, `VIEWER`).

## 2. Mocked Baileys WhatsApp Engine
- Baileys socket is decoupled via an adapter interface (`IWhatsAppService`).
- Unit and integration tests run against a mock socket simulating QR generation, connection state transitions, message sending, and delivery receipts without needing a physical phone connected during automated CI runs.

## 3. Manual Verification Checklist
- [ ] Connect real WhatsApp account via QR code on `/connections`.
- [ ] Send text, image, document (PDF), video, audio, location, contact card.
- [ ] Receive inbound message and verify it appears in the 3-column `/inbox`.
- [ ] Verify message persistence across container reboot.
- [ ] Test template preview and numbered fallback button reply.
