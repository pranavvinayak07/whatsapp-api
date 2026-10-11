# Vivegaa WhatsApp Dashboard - Architecture Summary

**Project:** Vivegaa WhatsApp Dashboard  
**Version:** 1.0  
**Target Host:** Ubuntu Linux / Docker / Coolify  
**Public Domain:** `https://whatsapp.vivegaaerp.in`  
**License / Mode:** Self-Hosted, Open-Source WhatsApp Automation (Baileys)  

---

## 1. System Overview

The Vivegaa WhatsApp Dashboard is a dedicated, production-grade, self-hosted WhatsApp management platform engineered for Vivegaa School CBSE. It operates completely independently of the existing Vivegaa ERP database and application runtime. An ERP outage will never disconnect WhatsApp, and a WhatsApp disconnect will never impact the school's core ERP system.

```
+-----------------------------------------------------------------------------------+
|                            VIVEGAA WHATSAPP PLATFORM                              |
|                                                                                   |
|   +-----------------------+                 +---------------------------------+   |
|   |   Next.js Dashboard   |  HTTP / SSE     |        Node.js Backend          |   |
|   |  Port 4000 (Reverse   | <-------------> |  Port 3001 (Internal / API v1)  |   |
|   |    Proxy / Public)    |                 |   (Express + TypeScript)        |   |
|   +-----------------------+                 +---------------------------------+   |
|                                                              |                    |
|                                     +------------------------+                    |
|                                     |                        |                    |
|                                     v                        v                    |
|                         +-----------------------+ +--------------------+          |
|                         |  PostgreSQL Database  | | Baileys Worker     |          |
|                         |  - Durable Message    | | - WhatsApp Web     |          |
|                         |    Queue              | |   Multi-Device WS  |          |
|                         |  - App Models         | | - MultiFile Auth   |          |
|                         +-----------------------+ +--------------------+          |
|                                     ^                        |                    |
|                                     |                        v                    |
+-------------------------------------|-------------- WhatsApp Servers -------------+
                                      |
                           +----------------------+
                           |  Vivegaa School ERP  |
                           |  - Authenticated     |
                           |    REST API (v1)     |
                           |  - Webhook Receiver  |
                           +----------------------+
```

---

## 2. Key Architectural Decisions

### 2.1 Independent Architecture & Database Isolation
- Zero shared database tables with Vivegaa ERP. The WhatsApp platform uses its own isolated PostgreSQL database schema and migrations.
- Communication with ERP occurs exclusively over authenticated REST API endpoints (`/api/v1`) using HMAC-signed API keys and webhook signatures.

### 2.2 Unofficial WhatsApp Engine (Baileys)
- Uses `@whiskeysockets/baileys@^6.7.24` for pure JavaScript multi-device WhatsApp Web connectivity.
- Explicitly avoids paid APIs (Meta Cloud API, Twilio, WATI, Interakt).
- State is preserved on persistent disk via `useMultiFileAuthState` inside the Docker volume (`/app/auth`), ensuring QR authentication survives server and container restarts.
- Automatic reconnect with exponential backoff (up to 5 attempts, non-infinite loops) and disconnection reason handling (`DisconnectReason.loggedOut`, `timedOut`, `connectionLost`).

### 2.3 PostgreSQL-Backed Durable Message Queue
- Message scheduling and automated dispatch use an ACID-compliant PostgreSQL queue.
- Status lifecycle: `PENDING` -> `PROCESSING` -> `SENT` -> `DELIVERED` -> `READ` (or `FAILED` / `CANCELLED`).
- Built-in rate limiting, exponential backoff retries (max 3-5 tries), idempotency keys, and administrator pause/resume toggles.
- Honest delivery statuses: Distinguishes between internal submission, WhatsApp server ACK, device delivery, and user read receipt.

### 2.4 Interactive Messages with Numbered Fallback
- Because native buttons are frequently altered or deprecated by WhatsApp on third-party multi-device clients, the system features:
  1. Capability detection & experimental native button payloads.
  2. Automatic numbered-response fallback:
     ```
     Reply:
     1 - View Fee Details
     2 - Contact School
     3 - Acknowledge
     ```
  3. Built-in inbound reply parser that triggers automated workflows based on numeric parent replies.

### 2.5 Security, Consent & Data Governance
- Scoped RBAC: `SUPER_ADMIN`, `ADMIN`, `MESSAGING_STAFF`, `VIEWER`.
- Parent consent tracking: Explicit consent flags prevent automated spam or non-consented bulk messages.
- E.164 phone number formatting with `+91` default for Indian mobile numbers while supporting international numbers.
- Zero credentials in frontend code or client-accessible bundles.
- Password hashing via `bcryptjs`, session management via encrypted HTTP-only cookies.
