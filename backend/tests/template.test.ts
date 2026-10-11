import test from 'node:test';
import assert from 'node:assert';
import { TemplateService } from '../src/services/template-service.js';

test('TemplateService extracts variables accurately', () => {
  const body = 'Dear {{parent_name}}, your child {{student_name}} of Class {{class}}-{{section}} was absent.';
  const vars = TemplateService.extractVariables(body);
  assert.deepStrictEqual(vars, ['parent_name', 'student_name', 'class', 'section']);
});

test('TemplateService renders variables correctly', () => {
  const body = 'Hello {{parent_name}}, your fee of Rs. {{fee_amount}} is due on {{due_date}}.';
  const rendered = TemplateService.render(body, {
    parent_name: 'Mr. Ramesh',
    fee_amount: 5000,
    due_date: '15-Oct-2026',
  });

  assert.strictEqual(rendered, 'Hello Mr. Ramesh, your fee of Rs. 5000 is due on 15-Oct-2026.');
});

test('TemplateService detects missing variables', () => {
  const body = 'Dear {{parent_name}}, exam for {{student_name}} begins on {{date}}.';
  const validation = TemplateService.validateRequiredVariables(body, {
    parent_name: 'Priya',
    // student_name and date missing
  });

  assert.strictEqual(validation.isValid, false);
  assert.deepStrictEqual(validation.missing, ['student_name', 'date']);
});
