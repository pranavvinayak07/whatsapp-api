# Vivegaa WhatsApp Dashboard - REST API v1 Reference

All external API endpoints are routed under `/api/v1` and require an authorized API key provided via the `X-API-Key` HTTP header.

## Authentication
```http
X-API-Key: vw_live_xxxxxxxxxxxxxxxxxxxxxxxx
```

---

## 1. Outbound Messaging

### POST `/api/v1/messages/text`
Send a single text message to a WhatsApp number.
```json
{
  "recipient": "+919876543210",
  "message": "Hello from Vivegaa School CBSE",
  "idempotencyKey": "req_123456"
}
```

### POST `/api/v1/messages/image`
Send an image with optional caption.
```json
{
  "recipient": "+919876543210",
  "mediaUrl": "https://example.com/photo.jpg", // or base64Data
  "caption": "Annual Sports Day Highlights",
  "idempotencyKey": "req_123457"
}
```

### POST `/api/v1/messages/document`
Send a document (PDF, DOCX, XLSX, etc.).
```json
{
  "recipient": "+919876543210",
  "mediaUrl": "https://example.com/receipt.pdf",
  "fileName": "Fee_Receipt_Oct2026.pdf",
  "caption": "Please find attached your fee receipt.",
  "idempotencyKey": "req_123458"
}
```

### POST `/api/v1/messages/interactive`
Send an interactive message with fallback.
```json
{
  "recipient": "+919876543210",
  "title": "Fee Reminder",
  "body": "Dear Parent, fee payment of Rs. 5000 is pending for Rahul (VII-A).",
  "footer": "Vivegaa School Accounts",
  "buttons": [
    { "id": "btn_pay", "label": "View Fee Details" },
    { "id": "btn_contact", "label": "Contact School" },
    { "id": "btn_ack", "label": "Acknowledge" }
  ]
}
```

---

## 2. Inbound & Delivery Webhooks
When configured, the backend dispatches signed webhooks to the ERP with the following headers:
- `X-Vivegaa-Signature`: `sha256=<hex_hmac>`
- `X-Vivegaa-Timestamp`: `<unix_timestamp>`

Payload example:
```json
{
  "event": "message.delivered",
  "messageId": "msg_987654",
  "remoteJid": "919876543210@s.whatsapp.net",
  "status": "DELIVERED",
  "timestamp": 1791702000
}
```
