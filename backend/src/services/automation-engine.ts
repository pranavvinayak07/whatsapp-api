import { db } from '../db.js';
import { queueService } from '../queue/queue-service.js';
import { TemplateService } from './template-service.js';
import { logger } from '../utils/logger.js';

export interface SchoolAutomationEventPayload {
  triggerType:
    | 'ATTENDANCE_ABSENT'
    | 'ATTENDANCE_LATE'
    | 'FEE_REMINDER'
    | 'FEE_RECEIPT'
    | 'HOMEWORK_NOTIFICATION'
    | 'EXAM_ANNOUNCEMENT'
    | 'EXAM_RESULT'
    | 'TRANSPORT_ALERT'
    | 'BUS_DELAY'
    | 'SCHOOL_ANNOUNCEMENT'
    | 'EVENT_NOTIFICATION'
    | 'GENERAL_NOTIFICATION';
  studentId?: string;
  parentPhone?: string;
  variables: Record<string, any>;
  externalEventId?: string;
  idempotencyKey?: string;
}

export class AutomationEngine {
  public static async processEvent(payload: SchoolAutomationEventPayload) {
    logger.info({ trigger: payload.triggerType, studentId: payload.studentId }, 'Received school automation event');

    // 1. Find active automation rule for this trigger
    const rule = await db.automationRule.findFirst({
      where: {
        triggerType: payload.triggerType as any,
        isEnabled: true,
      },
      include: {
        template: true,
      },
    });

    if (!rule || !rule.template) {
      return {
        status: 'SKIPPED',
        reason: `No enabled automation rule found for trigger type: ${payload.triggerType}`,
      };
    }

    // 2. Resolve Contact
    let contact = null;
    if (payload.studentId) {
      contact = await db.contact.findFirst({
        where: { studentId: payload.studentId },
      });
    }

    if (!contact && payload.parentPhone) {
      contact = await db.contact.findFirst({
        where: {
          phoneNumber: { contains: payload.parentPhone.slice(-10) },
        },
      });
    }

    if (!contact) {
      return {
        status: 'SKIPPED',
        reason: `No registered contact found for student ${payload.studentId || ''} / phone ${payload.parentPhone || ''}`,
      };
    }

    // 3. Verify Consent
    if (contact.consentStatus === 'OPTED_OUT') {
      return {
        status: 'SKIPPED',
        reason: `Contact ${contact.fullName} (${contact.e164Phone}) has opted out of automated WhatsApp messages`,
      };
    }

    // 4. Render Message Template
    const templateBody = rule.template.body;
    const mergedVars = {
      parent_name: contact.fullName,
      student_name: payload.variables.student_name || contact.fullName,
      class: payload.variables.class || contact.gradeClass || '',
      section: payload.variables.section || contact.section || '',
      date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
      ...payload.variables,
    };

    const renderedText = TemplateService.render(templateBody, mergedVars);

    // 5. Enqueue in PostgreSQL durable queue
    const queued = await queueService.enqueue({
      recipient: contact.e164Phone,
      messageType: 'TEXT',
      payload: { text: renderedText },
      idempotencyKey: payload.idempotencyKey || payload.externalEventId,
      priority: payload.triggerType === 'ATTENDANCE_ABSENT' ? 10 : 5,
    });

    // 6. Record Automation Event
    await db.automationEvent.create({
      data: {
        ruleId: rule.id,
        externalEventId: payload.externalEventId,
        payload: payload as any,
        status: 'PROCESSED',
        resultMessage: `Queued message ID ${queued.id} for ${contact.e164Phone}`,
        idempotencyKey: payload.idempotencyKey,
      },
    });

    return {
      status: 'PROCESSED',
      queuedMessageId: queued.id,
      recipient: contact.e164Phone,
    };
  }
}
