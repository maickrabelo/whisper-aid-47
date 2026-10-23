import { test, expect } from 'bun:test';
import { examDeadline } from '../../../src/lib/pcmsoExamStatus';
test('prior day is overdue, same day is due today, next day is upcoming', () => {
  expect(examDeadline('2026-10-22', 'solicitado', '2026-10-23')).toBe('vencido');
  expect(examDeadline('2026-10-23', 'agendado', '2026-10-23')).toBe('hoje');
  expect(examDeadline('2026-10-24', 'solicitado', '2026-10-23')).toBe('a_vencer');
});
test('attendance and cancellation close operational deadlines without declaring fitness', () => {
  expect(examDeadline('2026-10-22', 'cancelado', '2026-10-23')).toBe('encerrado');
  expect(examDeadline('2026-10-22', 'compareceu', '2026-10-23')).toBe('encerrado');
});