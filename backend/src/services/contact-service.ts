import { db } from '../db.js';
import { normalizePhoneNumber } from '../utils/phone.js';

export class ContactService {
  public static async createContact(data: {
    fullName: string;
    phoneNumber: string;
    contactType?: any;
    studentId?: string;
    gradeClass?: string;
    section?: string;
    parentRelationship?: string;
    tags?: string[];
    notes?: string;
    consentStatus?: any;
  }) {
    const normalized = normalizePhoneNumber(data.phoneNumber);
    if (!normalized.isValid) {
      throw new Error(`Invalid phone number: ${data.phoneNumber}`);
    }

    const existing = await db.contact.findUnique({
      where: { e164Phone: normalized.e164 },
    });

    if (existing) {
      throw new Error(`Contact with phone number ${normalized.e164} already exists`);
    }

    const contact = await db.contact.create({
      data: {
        fullName: data.fullName.trim(),
        phoneNumber: data.phoneNumber.trim(),
        e164Phone: normalized.e164,
        countryCode: normalized.countryCode,
        contactType: data.contactType || 'PARENT',
        studentId: data.studentId?.trim() || null,
        gradeClass: data.gradeClass?.trim() || null,
        section: data.section?.trim() || null,
        parentRelationship: data.parentRelationship?.trim() || null,
        tags: data.tags || [],
        notes: data.notes?.trim() || null,
        consentStatus: data.consentStatus || 'OPTED_IN',
      },
    });

    // Record consent
    await db.contactConsent.create({
      data: {
        contactId: contact.id,
        status: contact.consentStatus,
        consentSource: 'ADMIN_ENTRY',
      },
    });

    return contact;
  }

  public static async importCsvContacts(csvContent: string): Promise<{ imported: number; skipped: number; errors: string[] }> {
    const lines = csvContent.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length < 2) {
      return { imported: 0, skipped: 0, errors: ['CSV contains no data rows'] };
    }

    const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
    const nameIdx = headers.findIndex((h) => h.includes('name'));
    const phoneIdx = headers.findIndex((h) => h.includes('phone') || h.includes('mobile'));
    const gradeIdx = headers.findIndex((h) => h.includes('class') || h.includes('grade'));
    const sectionIdx = headers.findIndex((h) => h.includes('section'));
    const studentIdx = headers.findIndex((h) => h.includes('student') || h.includes('admission'));

    if (nameIdx === -1 || phoneIdx === -1) {
      return { imported: 0, skipped: 0, errors: ['CSV must contain at least "name" and "phone" columns'] };
    }

    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (let i = 1; i < lines.length; i++) {
      const row = lines[i].split(',').map((v) => v.trim());
      const name = row[nameIdx];
      const phone = row[phoneIdx];

      if (!name || !phone) {
        skipped++;
        continue;
      }

      const normalized = normalizePhoneNumber(phone);
      if (!normalized.isValid) {
        skipped++;
        errors.push(`Row ${i + 1}: Invalid phone number "${phone}" for ${name}`);
        continue;
      }

      try {
        const existing = await db.contact.findUnique({
          where: { e164Phone: normalized.e164 },
        });

        if (existing) {
          skipped++;
          continue;
        }

        await db.contact.create({
          data: {
            fullName: name,
            phoneNumber: phone,
            e164Phone: normalized.e164,
            countryCode: normalized.countryCode,
            contactType: 'PARENT',
            gradeClass: gradeIdx !== -1 ? row[gradeIdx] : null,
            section: sectionIdx !== -1 ? row[sectionIdx] : null,
            studentId: studentIdx !== -1 ? row[studentIdx] : null,
            consentStatus: 'OPTED_IN',
          },
        });
        imported++;
      } catch (err: any) {
        skipped++;
        errors.push(`Row ${i + 1}: ${err?.message}`);
      }
    }

    return { imported, skipped, errors };
  }
}
