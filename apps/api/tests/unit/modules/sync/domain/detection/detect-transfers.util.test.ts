import { describe, expect, it } from 'vitest';

import { detectTransfers } from '#/modules/sync/domain/detection/detect-transfers.util.ts';
import type { DetectionItem } from '#/modules/sync/domain/detection/detection-item.type.ts';

let sequence = 0;

function item(overrides: Partial<DetectionItem> = {}): DetectionItem {
  sequence += 1;

  return {
    id: `item-${String(sequence).padStart(3, '0')}`,
    accountId: 'checking',
    isCard: false,
    amountCents: -10000,
    occurredOn: '2026-11-05',
    description: 'Pix',
    nature: 'expense',
    natureSetBy: 'system',
    hasUserCategory: false,
    isSplit: false,
    isLinked: false,
    isNew: true,
    ...overrides,
  };
}

const out = (overrides: Partial<DetectionItem> = {}) =>
  item({ accountId: 'checking', amountCents: -10000, ...overrides });
const into = (overrides: Partial<DetectionItem> = {}) =>
  item({ accountId: 'savings', amountCents: 10000, nature: 'income', ...overrides });

const detect = (items: DetectionItem[], excluded: string[] = []) =>
  detectTransfers({ items, excluded: new Set(excluded) });

describe('detectTransfers', () => {
  it('pairs the debit of one account with the credit of another of the same value, the debit first', () => {
    const debit = out();
    const credit = into();

    expect(detect([credit, debit])).toEqual([{ firstId: debit.id, secondId: credit.id }]);
  });

  it('tolerates R$ 0,01 of difference and no more', () => {
    expect(detect([out(), into({ amountCents: 10001 })])).toHaveLength(1);
    expect(detect([out(), into({ amountCents: 10002 })])).toEqual([]);
  });

  it('tolerates 2 days apart and no more', () => {
    expect(
      detect([out({ occurredOn: '2026-11-05' }), into({ occurredOn: '2026-11-07' })]),
    ).toHaveLength(1);
    expect(detect([out({ occurredOn: '2026-11-05' }), into({ occurredOn: '2026-11-08' })])).toEqual(
      [],
    );
  });

  it('never pairs two legs of the same account', () => {
    expect(detect([out(), into({ accountId: 'checking' })])).toEqual([]);
  });

  it('never takes a card: a pair with the credit of a card is a payment of invoice, not a transfer', () => {
    const credit = item({ accountId: 'card', isCard: true, amountCents: 10000 });

    expect(detect([out(), credit])).toEqual([]);
  });

  it('what the detectors of payment marked (excluded) does not enter', () => {
    const debit = out();
    const credit = into();

    expect(detect([debit, credit], [debit.id])).toEqual([]);
  });

  it('only a pair with a new transaction is looked for: two old ones left alone stay alone', () => {
    expect(detect([out({ isNew: false }), into({ isNew: false })])).toEqual([]);
  });

  it('the new leg finds an old partner', () => {
    expect(detect([out({ isNew: false }), into({ isNew: true })])).toHaveLength(1);
  });

  it('a transaction pairs once; the nearer date wins', () => {
    const debit = out({ occurredOn: '2026-11-05' });
    const near = into({ occurredOn: '2026-11-05' });
    const far = into({ occurredOn: '2026-11-07' });

    expect(detect([debit, far, near])).toEqual([{ firstId: debit.id, secondId: near.id }]);
  });

  it('the best pairing wins whatever the order of the items', () => {
    const a = out({ occurredOn: '2026-11-04' });
    const b = out({ occurredOn: '2026-11-06' });
    const credit = into({ occurredOn: '2026-11-06' });

    expect(detect([a, b, credit])).toEqual([{ firstId: b.id, secondId: credit.id }]);
    expect(detect([credit, b, a])).toEqual([{ firstId: b.id, secondId: credit.id }]);
  });

  it.each([
    ['chosen by Lucas', { natureSetBy: 'user' as const }],
    ['split', { isSplit: true }],
    ['linked to what it pays', { isLinked: true }],
    ['categorized by Lucas', { hasUserCategory: true }],
    ['a payment of invoice already', { nature: 'invoice_payment' as const }],
    ['a transfer already', { nature: 'transfer' as const }],
  ])('a leg that is %s is left alone', (_name, overrides) => {
    expect(detect([out(overrides), into()])).toEqual([]);
    expect(detect([out(), into(overrides)])).toEqual([]);
  });
});
