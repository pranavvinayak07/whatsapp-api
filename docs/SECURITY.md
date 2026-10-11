# Vivegaa WhatsApp Dashboard - Security Architecture

## 1. Principles
- **Total Database Isolation**: Zero direct connection between WhatsApp database and Vivegaa School ERP database.
- **No Paid APIs or Leaked Tokens**: Completely self-hosted without reliance on Meta Graph API or Twilio credentials.
- **Ephemeral QR Codes & Encrypted Sessions**: Session keys are stored strictly in local Docker volumes (`/app/auth`) with restricted POSIX file permissions. Never transmit session keys to the browser.
- **RBAC Server-Side Enforcement**: All operations check session user roles (`SUPER_ADMIN`, `ADMIN`, `MESSAGING_STAFF`, `VIEWER`).
- **Idempotency & Replay Protection**: API calls accept `idempotencyKey` to prevent double-charging or duplicate messaging during transient network failures.
- **Webhook HMAC Signatures**: Outgoing webhooks are signed using `crypto.createHmac('sha256', secret)` with a 5-minute replay expiry window.
