import { describe, expect, it } from 'vitest';

import { describeDueDate } from '#/features/bills/bill-list/utils/describe-due-date.util.ts';

const base = { dueOn: '2026-10-25', state: 'upcoming', settledOn: null, flow: 'out' } as const;

describe('describeDueDate', () => {
  it('says how many days are left', () => {
    expect(describeDueDate(base, '2026-10-22')).toBe('Vence 25/10, em 3 dias');
    expect(describeDueDate(base, '2026-10-24')).toBe('Vence 25/10, amanhã');
    expect(describeDueDate(base, '2026-10-25')).toBe('Vence hoje, 25/10');
  });

  it('says how long ago it was due', () => {
    expect(describeDueDate({ ...base, dueOn: '2026-10-20', state: 'overdue' }, '2026-10-22')).toBe(
      'Vence 20/10, venceu há 2 dias',
    );
    expect(describeDueDate({ ...base, dueOn: '2026-10-21', state: 'overdue' }, '2026-10-22')).toBe(
      'Vence 21/10, venceu há 1 dia',
    );
  });

  it('says "Sem data" when there is no due date', () => {
    expect(describeDueDate({ ...base, dueOn: null }, '2026-10-22')).toBe('Sem data');
  });

  it('says when it was paid or received once settled', () => {
    expect(
      describeDueDate({ ...base, state: 'settled', settledOn: '2026-09-28' }, '2026-10-22'),
    ).toBe('Paga em 28/09');
    expect(
      describeDueDate(
        { ...base, flow: 'in', state: 'settled', settledOn: '2026-10-14' },
        '2026-10-22',
      ),
    ).toBe('Recebido em 14/10');
    expect(describeDueDate({ ...base, state: 'settled' }, '2026-10-22')).toBe('Quitada');
  });
});
