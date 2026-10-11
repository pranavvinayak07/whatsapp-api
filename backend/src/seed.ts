import { db } from './db.js';
import { hashPassword, hashApiKey } from './utils/crypto.js';

async function main() {
  console.log('Seeding Vivegaa WhatsApp Dashboard initial data...');

  // 1. Initial Super Admin User
  const adminEmail = 'admin@vivegaa.edu';
  const existingAdmin = await db.user.findUnique({ where: { email: adminEmail } });

  if (!existingAdmin) {
    const passwordHash = await hashPassword('Admin@123456');
    await db.user.create({
      data: {
        email: adminEmail,
        name: 'Vivegaa Super Admin',
        passwordHash,
        role: 'SUPER_ADMIN',
      },
    });
    console.log(`Created Super Admin: ${adminEmail} (password: Admin@123456)`);
  }

  // 2. Default School Templates
  const templates = [
    {
      name: 'Student Absent Notification',
      code: 'ATTENDANCE_ABSENT_DEFAULT',
      category: 'ATTENDANCE' as const,
      body: 'Dear {{parent_name}},\n\nYour child {{student_name}} of Class {{class}}-{{section}} was marked ABSENT on {{date}}.\n\nIf this was uninformed, please contact the school office immediately.\n\nRegards,\nVivegaa School CBSE',
      variables: ['parent_name', 'student_name', 'class', 'section', 'date'],
    },
    {
      name: 'Fee Payment Pending Reminder',
      code: 'FEE_REMINDER_DEFAULT',
      category: 'FEES' as const,
      body: 'Dear {{parent_name}},\n\nThis is a gentle reminder that the pending school fee of Rs. {{fee_amount}} for {{student_name}} (Class {{class}}-{{section}}) is due by {{due_date}}.\n\nPlease clear the dues to avoid late fee charges.\n\nAccounts Dept,\nVivegaa School CBSE',
      variables: ['parent_name', 'student_name', 'class', 'section', 'fee_amount', 'due_date'],
    },
    {
      name: 'School Bus Delay Alert',
      code: 'BUS_DELAY_ALERT',
      category: 'TRANSPORT' as const,
      body: 'Dear Parent,\n\nSchool Bus #{{bus_number}} on route {{route_name}} is experiencing a {{delay_minutes}} minute delay due to traffic conditions.\n\nExpected arrival at your stop shortly.\n\nTransport Dept,\nVivegaa School CBSE',
      variables: ['bus_number', 'route_name', 'delay_minutes'],
    },
    {
      name: 'Homework Assignment',
      code: 'HOMEWORK_DAILY',
      category: 'HOMEWORK' as const,
      body: 'Dear {{parent_name}},\n\nHomework assigned for {{student_name}} (Class {{class}}-{{section}}):\n\nSubject: {{subject}}\nTasks: {{homework_details}}\nSubmission Due: {{due_date}}\n\nAcademic Team,\nVivegaa School CBSE',
      variables: ['parent_name', 'student_name', 'class', 'section', 'subject', 'homework_details', 'due_date'],
    },
  ];

  for (const t of templates) {
    const existing = await db.messageTemplate.findUnique({ where: { code: t.code } });
    if (!existing) {
      const created = await db.messageTemplate.create({ data: t });
      console.log(`Created Template: ${created.name}`);

      // Create linked automation rule if attendance or fee
      if (t.code === 'ATTENDANCE_ABSENT_DEFAULT') {
        await db.automationRule.create({
          data: {
            name: 'Automatic Absence WhatsApp Alert',
            triggerType: 'ATTENDANCE_ABSENT',
            templateId: created.id,
            isEnabled: true,
          },
        });
      } else if (t.code === 'FEE_REMINDER_DEFAULT') {
        await db.automationRule.create({
          data: {
            name: 'Automatic Fee Reminder Alert',
            triggerType: 'FEE_REMINDER',
            templateId: created.id,
            isEnabled: true,
          },
        });
      }
    }
  }

  // 3. Initial API Key for Vivegaa ERP
  const erpKeyPrefix = 'vw_live_erp_prod';
  const existingKey = await db.apiKey.findUnique({ where: { keyPrefix: erpKeyPrefix } });
  if (!existingKey) {
    const rawKey = 'vw_live_erp_prod_vivegaa_school_integration_key_2026';
    await db.apiKey.create({
      data: {
        name: 'Vivegaa ERP Master Integration Key',
        keyPrefix: erpKeyPrefix,
        keyHash: hashApiKey(rawKey),
        scopes: ['messages:write', 'contacts:read', 'contacts:write', 'automation:write'],
      },
    });
    console.log(`Created ERP API Key: ${rawKey}`);
  }

  console.log('Seeding completed successfully!');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
