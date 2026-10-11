# Deployment and recovery notes

Fresh databases are initialized by `prisma migrate deploy` before the API starts. The initial migration is checked in. For an existing database previously created with `prisma db push`, back it up and verify it matches `backend/prisma/schema.prisma` before baselining with `prisma migrate resolve --applied 20261011000000_initial`. Do not apply the initial create-table migration over existing tables.

The dashboard image builds its API rewrites using `INTERNAL_API_URL` (Docker build argument, default `http://api:3001`). Set that build argument when using a different internal hostname.

API keys must explicitly include resource scopes: `messages:read/write`, `contacts:read/write`, `templates:read/write`, `automation:write`, `campaigns:read/write`, `connection:read`, `queue:read`, and `media:read`. Existing keys may need replacement with appropriate scopes. Dashboard users authenticate using their session; service keys are never exposed to the browser. Only admins may see the pairing QR stream.

Jobs interrupted during delivery become FAILED after ten minutes without a worker heartbeat. Their error says delivery outcome is unknown. Inspect WhatsApp delivery before manually retrying; automatically retrying these could send duplicate notices.
