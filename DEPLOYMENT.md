# Production Deployment Guide - Vivegaa WhatsApp Dashboard

This guide provides instructions for deploying the Vivegaa WhatsApp Dashboard on an Ubuntu Linux server managed by Coolify.

**Target Domain:** `https://whatsapp.vivegaaerp.in`  
**Primary Tech Stack:** Node.js, Express, Baileys, Next.js, PostgreSQL, Docker  

---

## 1. Prerequisites on Host Server

- Ubuntu 22.04 LTS or 24.04 LTS
- Docker Engine 24+ & Docker Compose v2
- Coolify v4 installed and running
- DNS A Record pointing `whatsapp.vivegaaerp.in` to the server's public IP address
- Minimum 2GB RAM free for containers

---

## 2. Coolify Deployment Options

### Option A: Coolify Docker Compose (Recommended)
1. In Coolify dashboard, select your Project and choose **New Resource** -> **Docker Compose**.
2. Point Coolify to this Git repository or paste the content of `docker-compose.yml`.
3. Configure Environment Variables in the Coolify UI:
   - `POSTGRES_PASSWORD`: Strong random 32-character password.
   - `SESSION_SECRET`: Random 32-byte hexadecimal string.
   - `ENCRYPTION_KEY`: Random 32-byte hexadecimal string.
   - `INTERNAL_API_KEY`: Strong key for Vivegaa ERP communication.
   - `PUBLIC_APP_URL`: `https://whatsapp.vivegaaerp.in`.
4. In Coolify application settings for the `dashboard` service, set:
   - Output Type / Resource Type: `Web Application`
   - FQDN: `https://whatsapp.vivegaaerp.in`
   - Port: `4000`
5. Click **Deploy**. Coolify will pull/build the containers, create Traefik SSL certificates automatically via Let's Encrypt, and start the system.

---

## 3. Persistent Volumes Verification
Ensure Docker persistent volumes are properly mounted:
- `baileys_auth` -> `/app/auth` (contains WhatsApp session keys; must never be deleted during updates)
- `media_storage` -> `/app/media` (contains uploaded images, documents, PDFs, voice recordings)
- `postgres_data` -> `/var/lib/postgresql/data` (dedicated WhatsApp database)

---

## 4. Post-Deployment Verification
1. Access `https://whatsapp.vivegaaerp.in` in your browser.
2. Log in using initial superadmin credentials:
   - **Email:** `admin@vivegaa.edu`
   - **Password:** Configured during initial seeding
3. Navigate to **WhatsApp Connections** (`/connections`).
4. Click **Connect** and scan the displayed QR code with your designated school WhatsApp phone (WhatsApp Settings -> Linked Devices -> Link a Device).
5. Verify status changes to **CONNECTED** with green badge and phone number displayed.
6. Send a test message to verify delivery.
