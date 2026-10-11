import { db } from '../db.js';
import { signWebhookPayload } from '../utils/crypto.js';
import { logger } from '../utils/logger.js';

export class WebhookService {
  public static async dispatchEvent(eventType: string, payload: any) {
    const endpoints = await db.webhookEndpoint.findMany({
      where: {
        isEnabled: true,
        eventTypes: { has: eventType },
      },
    });

    if (endpoints.length === 0) return;

    const timestamp = Math.floor(Date.now() / 1000);
    const bodyString = JSON.stringify({
      event: eventType,
      timestamp,
      data: payload,
    });

    for (const ep of endpoints) {
      const signature = signWebhookPayload(`${timestamp}.${bodyString}`, ep.secret);

      try {
        const response = await fetch(ep.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Vivegaa-Timestamp': String(timestamp),
            'X-Vivegaa-Signature': signature,
            'User-Agent': 'Vivegaa-WhatsApp-Webhook/1.0',
          },
          body: bodyString,
          signal: AbortSignal.timeout(5000),
        });

        const respText = await response.text();

        await db.webhookDelivery.create({
          data: {
            endpointId: ep.id,
            eventType,
            payload,
            signature,
            statusCode: response.status,
            responseBody: respText.substring(0, 500),
            isSuccess: response.ok,
          },
        });

        await db.webhookEndpoint.update({
          where: { id: ep.id },
          data: { lastDeliveryAt: new Date() },
        });
      } catch (err: any) {
        logger.error({ err, endpoint: ep.url }, 'Failed to dispatch webhook');
        await db.webhookDelivery.create({
          data: {
            endpointId: ep.id,
            eventType,
            payload,
            signature,
            statusCode: 0,
            responseBody: err?.message?.substring(0, 500) || 'Connection timeout/failure',
            isSuccess: false,
          },
        });
      }
    }
  }
}
