# Vivegaa WhatsApp Dashboard - Coolify Deployment Guide

**Target Domain:** `https://whatsapp.vivegaaerp.in`  
**Host Environment:** Ubuntu Linux Server with Docker and Coolify  

---

## 1. Coolify Architecture

In Coolify, deploy this application either as a **Docker Compose Service** or as two connected services (Frontend + API Worker) with an attached PostgreSQL database.

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_DB: vivegaa_whatsapp
      POSTGRES_USER: whatsapp_user
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - internal_net

  api:
    build:
      context: ./backend
      dockerfile: Dockerfile
    restart: unless-stopped
    environment:
      NODE_ENV: production
      PORT: 3001
      DATABASE_URL: postgresql://whatsapp_user:${POSTGRES_PASSWORD}@postgres:5432/vivegaa_whatsapp
      SESSION_SECRET: ${SESSION_SECRET}
      ENCRYPTION_KEY: ${ENCRYPTION_KEY}
      INTERNAL_API_KEY: ${INTERNAL_API_KEY}
      BAILEYS_AUTH_DIR: /app/auth
      MEDIA_STORAGE_DIR: /app/media
      PUBLIC_APP_URL: https://whatsapp.vivegaaerp.in
    volumes:
      - baileys_auth:/app/auth
      - media_storage:/app/media
    depends_on:
      - postgres
    networks:
      - internal_net

  dashboard:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    restart: unless-stopped
    environment:
      NODE_ENV: production
      PORT: 3000
      NEXT_PUBLIC_API_URL: https://whatsapp.vivegaaerp.in/api
      INTERNAL_API_URL: http://api:3001
    depends_on:
      - api
    ports:
      - "3000:3000"
    networks:
      - internal_net

volumes:
  postgres_data:
  baileys_auth:
  media_storage:

networks:
  internal_net:
    driver: bridge
```

---

## 2. Persistent Storage Requirements
Three volumes must be persisted on the host:
1. `baileys_auth`: Holds multi-device keys, credentials, and app states. **Never lose this volume**, or the WhatsApp connection will be lost and require re-scanning.
2. `media_storage`: Holds uploaded and inbound media files (images, audio, PDF receipts).
3. `postgres_data`: Holds database tables for contacts, messages, templates, logs, and queue.

---

## 3. Coolify HTTPS & Reverse Proxy
- Domain configured in Coolify: `whatsapp.vivegaaerp.in`
- Coolify Traefik routing forwards `https://whatsapp.vivegaaerp.in` to the `dashboard` container on port 3000.
- Next.js dashboard proxies `/api/v1/*` internally to `http://api:3001/api/v1/*`. This keeps port 3001 completely private and hidden from the internet.
