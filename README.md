# Vivegaa WhatsApp Dashboard

Production-oriented, self-hosted WhatsApp management platform for Vivegaa School CBSE built with **Baileys (Open-Source Multi-Device)**, **Next.js 14**, **Tailwind CSS**, **Node.js/Express**, and **PostgreSQL with Prisma**.

Deployable on Ubuntu Linux via Docker & Coolify at `https://whatsapp.vivegaaerp.in`.

---

## Key Highlights

- **100% Free & Self-Hosted**: Powered by `@whiskeysockets/baileys`. No Meta Cloud API, Twilio, or paid third-party monthly subscriptions.
- **Enterprise School Workflows**: Automated student absent notifications, fee reminders, homework updates, exam alerts, and bus transport notices.
- **Durable PostgreSQL Message Queue**: Controlled sending rates, automatic retries with exponential backoff, dead-letter queue, idempotency keys, and administrator pause/resume.
- **Rich Media & Attachments**: Send and receive text, images with captions, documents (PDF, DOCX, XLSX), audio notes, videos, locations, and contact cards.
- **Live QR Authentication & Reconnection**: Web-based pairing via WhatsApp Linked Devices with persistent session recovery across Docker reboots.
- **Interactive Buttons & Fallback Menus**: Experimental native WhatsApp buttons with automatic numbered-response fallbacks (`Reply 1 for X, 2 for Y`).
- **REST API for Vivegaa ERP**: Scoped API keys, HMAC-signed webhooks, and complete isolation from the ERP database.
- **Light Theme Modern SaaS UI**: White background, clean borders, WhatsApp green accents, mobile-responsive layout.

---

## Architecture Overview

```
Vivegaa WhatsApp Dashboard
  ├── Frontend: Next.js 14 + Tailwind CSS (Port 4000)
  ├── Backend: Node.js Express + Baileys Worker (Port 3001)
  ├── Database: PostgreSQL 16 + Prisma ORM
  └── Persistent Storage: Volumes for Baileys MultiFileAuth & Media Library
```

---

## Local Development Quickstart

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
2. Install workspace dependencies:
   ```bash
   npm install
   ```
3. Run database migrations:
   ```bash
   npm run prisma:migrate --workspace=backend
   ```
4. Start development servers:
   ```bash
   npm run dev
   ```

Frontend will run at `http://localhost:4000`, Backend API at `http://localhost:3001`.

---

## Documentation Links

- [Architecture Guide](docs/ARCHITECTURE.md)
- [Implementation Plan](docs/IMPLEMENTATION_PLAN.md)
- [Implementation Tracker](docs/IMPLEMENTATION_TRACKER.md)
- [REST API v1 Reference](docs/API_REFERENCE.md)
- [Coolify Deployment Guide](docs/COOLIFY_DEPLOYMENT.md)
- [Security Architecture](docs/SECURITY.md)
- [Testing Strategy](docs/TESTING.md)
