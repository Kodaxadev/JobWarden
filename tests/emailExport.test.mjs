import { test } from 'node:test';
import assert from 'node:assert/strict';
import { emailSummary } from '../js/export/emailExport.js';
import { createIncident } from '../js/domain/incidentModel.js';

test('emailSummary reads as a mini report with counts + who', () => {
  const items = [
    createIncident({ incidentDate: '2026-06-10', types: ['late_meal'], clockIn: '09:00', clockOut: '17:30', meal: { start: '14:45', end: '15:10' } }),
    createIncident({ incidentDate: '2026-06-12', types: ['missed_meal'], clockIn: '09:00', clockOut: '15:30' }),
  ];
  const body = emailSummary(items, { employeeName: 'A. Worker', employer: 'Acme Warehouse' });
  assert.match(body, /Employee: A\. Worker/);
  assert.match(body, /Employer: Acme Warehouse/);
  assert.match(body, /2 record\(s\)/);
  assert.match(body, /Late lunch/);
  assert.match(body, /not legal advice/i);
});
