import { describe, expect, it } from 'vitest';

import { matchBankTransactions } from '#/modules/sync/domain/import/match-bank-transactions.util.ts';
import type {
  ExistingTransaction,
  IncomingTransaction,
} from '#/modules/sync/domain/import/match-bank-transactions.util.ts';

const incoming = (
  overrides: Partial<IncomingTransaction> & { key: string },
): IncomingTransaction => ({
  providerRef: null,
  description: 'Mercado Central',
  amountCents: -15990,
  occurredOn: '2026-11-05',
  ...overrides,
});

const existing = (
  overrides: Partial<ExistingTransaction> & { transactionId: string; pluggyId: string },
): ExistingTransaction => ({
  providerRef: null,
  bankDescription: 'Mercado Central',
  bankAmountCents: -15990,
  bankOccurredOn: '2026-11-05',
  isRemovedByBank: false,
  ...overrides,
});

const match = (
  items: IncomingTransaction[],
  rows: ExistingTransaction[] = [],
  linked: [string, string][] = [],
) =>
  matchBankTransactions({
    incoming: items,
    linkedByPluggyId: new Map(linked),
    existing: rows,
  });

describe('matchBankTransactions: 1. the id of the Pluggy', () => {
  it('a transaction with a link is the one the link says, and nothing is created, relinked or removed', () => {
    const result = match(
      [incoming({ key: 'p1' })],
      [existing({ transactionId: 't1', pluggyId: 'p1' })],
      [['p1', 't1']],
    );

    expect(result).toEqual({
      matched: [{ key: 'p1', transactionId: 't1', isRelinked: false }],
      created: [],
      removedTransactionIds: [],
    });
  });

  it('a transaction with no link and nothing that looks like it is new', () => {
    const result = match([incoming({ key: 'p9' })]);

    expect(result.created.map((item) => item.key)).toEqual(['p9']);
    expect(result.matched).toEqual([]);
  });

  it('the same window again creates nothing (idempotency)', () => {
    const rows = [existing({ transactionId: 't1', pluggyId: 'p1' })];
    const first = match([incoming({ key: 'p1' })], rows, [['p1', 't1']]);
    const second = match([incoming({ key: 'p1' })], rows, [['p1', 't1']]);

    expect(second).toEqual(first);
    expect(second.created).toEqual([]);
  });
});

describe('matchBankTransactions: 2. the id the bank gives (providerId)', () => {
  it('the Pluggy recreated the transaction with another id: the link moves, nothing is created or removed', () => {
    const result = match(
      [
        incoming({
          key: 'p2',
          providerRef: 'OF-77',
          description: 'Mercado Central 2',
          amountCents: -16000,
        }),
      ],
      [existing({ transactionId: 't1', pluggyId: 'p1', providerRef: 'OF-77' })],
    );

    expect(result.matched).toEqual([{ key: 'p2', transactionId: 't1', isRelinked: true }]);
    expect(result.created).toEqual([]);
    expect(result.removedTransactionIds).toEqual([]);
  });

  it('needs the old one to have vanished: with the old id still coming, the new id is another transaction', () => {
    const result = match(
      [incoming({ key: 'p1' }), incoming({ key: 'p2', providerRef: 'OF-77' })],
      [existing({ transactionId: 't1', pluggyId: 'p1', providerRef: 'OF-77' })],
      [['p1', 't1']],
    );

    expect(result.created.map((item) => item.key)).toEqual(['p2']);
  });

  it('a provider id that is not the same matches nothing by itself', () => {
    const result = match(
      [
        incoming({
          key: 'p2',
          providerRef: 'OF-99',
          description: 'Outra',
          amountCents: -1,
          occurredOn: '2026-10-01',
        }),
      ],
      [existing({ transactionId: 't1', pluggyId: 'p1', providerRef: 'OF-77' })],
    );

    expect(result.created.map((item) => item.key)).toEqual(['p2']);
    expect(result.removedTransactionIds).toEqual(['t1']);
  });
});

describe('matchBankTransactions: 3. two of three fields of the original', () => {
  const vanished = existing({ transactionId: 't1', pluggyId: 'p1' });

  it.each([
    ['date, amount and description', {}],
    ['date and amount', { description: 'MERCADO CENTRAL SP' }],
    ['date and description', { amountCents: -16000 }],
    ['amount and description', { occurredOn: '2026-11-06' }],
  ])('%s: the same transaction again, with a new id', (_name, overrides) => {
    const result = match([incoming({ key: 'p2', ...overrides })], [vanished]);

    expect(result.matched).toEqual([{ key: 'p2', transactionId: 't1', isRelinked: true }]);
    expect(result.created).toEqual([]);
    expect(result.removedTransactionIds).toEqual([]);
  });

  it('one field only is not enough: it is new, and the old one is removed', () => {
    const result = match(
      [
        incoming({
          key: 'p2',
          description: 'OUTRA COISA',
          amountCents: -1,
          occurredOn: '2026-11-05',
        }),
      ],
      [vanished],
    );

    expect(result.created.map((item) => item.key)).toEqual(['p2']);
    expect(result.removedTransactionIds).toEqual(['t1']);
  });

  it('compares the description without case or accent', () => {
    const result = match(
      [incoming({ key: 'p2', description: 'mercado  CENTRAL', amountCents: -1 })],
      [existing({ transactionId: 't1', pluggyId: 'p1', bankDescription: 'Mercadó Central' })],
    );

    expect(result.matched).toHaveLength(1);
  });

  it('among several that could be it, the one that agrees in more fields wins', () => {
    const twoFields = existing({
      transactionId: 't1',
      pluggyId: 'p1',
      bankDescription: 'Outro nome',
    });
    const threeFields = existing({ transactionId: 't2', pluggyId: 'p2' });

    const result = match([incoming({ key: 'p9' })], [twoFields, threeFields]);

    expect(result.matched).toEqual([{ key: 'p9', transactionId: 't2', isRelinked: true }]);
    expect(result.removedTransactionIds).toEqual(['t1']);
  });

  it('a vanished transaction serves one new only', () => {
    const result = match(
      [incoming({ key: 'p8' }), incoming({ key: 'p9' })],
      [existing({ transactionId: 't1', pluggyId: 'p1' })],
    );

    expect(result.matched).toHaveLength(1);
    expect(result.created).toHaveLength(1);
  });

  it('with the same agreement, the nearest date wins', () => {
    const near = existing({
      transactionId: 't1',
      pluggyId: 'p1',
      bankOccurredOn: '2026-11-05',
      bankAmountCents: -1,
    });
    const far = existing({
      transactionId: 't2',
      pluggyId: 'p2',
      bankOccurredOn: '2026-11-01',
      bankAmountCents: -1,
    });

    const result = match(
      [incoming({ key: 'p9', amountCents: -1, occurredOn: '2026-11-04' })],
      [far, near],
    );

    expect(result.matched).toEqual([{ key: 'p9', transactionId: 't1', isRelinked: true }]);
  });
});

describe('matchBankTransactions: 4. removed', () => {
  it('what vanished from the window and matched nothing is removed', () => {
    const result = match([], [existing({ transactionId: 't1', pluggyId: 'p1' })]);

    expect(result.removedTransactionIds).toEqual(['t1']);
  });

  it('only after everything of the round matched: a vanished one that a new transaction is does not count as removed', () => {
    const result = match(
      [incoming({ key: 'p2' })],
      [existing({ transactionId: 't1', pluggyId: 'p1' })],
    );

    expect(result.removedTransactionIds).toEqual([]);
  });

  it('one that was removed before is not answered again', () => {
    const result = match(
      [],
      [existing({ transactionId: 't1', pluggyId: 'p1', isRemovedByBank: true })],
    );

    expect(result.removedTransactionIds).toEqual([]);
  });

  it('a removed one that comes back with its id is a match by id (the caller brings it back)', () => {
    const result = match(
      [incoming({ key: 'p1' })],
      [existing({ transactionId: 't1', pluggyId: 'p1', isRemovedByBank: true })],
      [['p1', 't1']],
    );

    expect(result.matched).toEqual([{ key: 'p1', transactionId: 't1', isRelinked: false }]);
    expect(result.removedTransactionIds).toEqual([]);
  });
});
