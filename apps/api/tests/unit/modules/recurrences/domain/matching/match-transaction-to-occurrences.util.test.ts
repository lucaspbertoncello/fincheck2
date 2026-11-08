import { describe, expect, it } from 'vitest';

import { matchTransactionToOccurrences } from '#/modules/recurrences/domain/matching/match-transaction-to-occurrences.util.ts';
import type { MatchCandidate } from '#/modules/recurrences/domain/matching/match-transaction-to-occurrences.util.ts';

// The renda of Lucas in October 2026 (`recurrences.md`, "Casamento automático"): the allowance and
// the meal voucher from the same sender, the freelance Pix and the two salaries.
const MESADA: MatchCandidate = {
  occurrenceId: 'mesada',
  recurrenceId: 'r-mesada',
  kind: 'income',
  month: '2026-10',
  windowStartOn: '2026-10-01',
  windowEndOn: '2026-10-31',
  status: 'expected',
  paymentCount: 0,
  expectedCents: 85000,
  remainingCents: 85000,
  maxPayments: 2,
  matchText: 'PAI',
};
const VR: MatchCandidate = {
  ...MESADA,
  occurrenceId: 'vr',
  recurrenceId: 'r-vr',
  expectedCents: 77700,
  remainingCents: 77700,
  maxPayments: 1,
};
const MAXXY: MatchCandidate = {
  occurrenceId: 'maxxy',
  recurrenceId: 'r-maxxy',
  kind: 'income',
  month: '2026-10',
  windowStartOn: '2026-10-23',
  windowEndOn: '2026-10-27',
  status: 'expected',
  paymentCount: 0,
  expectedCents: 420000,
  remainingCents: 420000,
  maxPayments: 1,
  matchText: 'G PRADO',
};

function match(
  transaction: { on: string; cents: number; text: string; kind?: 'income' | 'expense' },
  candidates: MatchCandidate[],
) {
  return matchTransactionToOccurrences({
    transaction: {
      occurredOn: transaction.on,
      kind: transaction.kind ?? 'income',
      amountCents: transaction.cents,
      text: transaction.text,
    },
    candidates,
  });
}

describe('matchTransactionToOccurrences, the example of the contract (mesada x VR)', () => {
  it('ties R$ 425,00 to the allowance: it is one of its two parts and fits no other value', () => {
    expect(match({ on: '2026-10-03', cents: 42500, text: 'PAI PIX' }, [MESADA, VR])).toEqual({
      type: 'link',
      occurrenceId: 'mesada',
    });
  });

  it('ties the second R$ 425,00 to the allowance too: it is exactly what is left', () => {
    const half = { ...MESADA, status: 'partial' as const, paymentCount: 1, remainingCents: 42500 };

    expect(match({ on: '2026-10-20', cents: 42500, text: 'PAI PIX' }, [half, VR])).toEqual({
      type: 'link',
      occurrenceId: 'mesada',
    });
  });

  it('ties R$ 777,00 to the voucher: both fit the 15%, only the voucher is exact (R2)', () => {
    expect(match({ on: '2026-10-02', cents: 77700, text: 'PAI PIX' }, [MESADA, VR])).toEqual({
      type: 'link',
      occurrenceId: 'vr',
    });
  });

  it('sends R$ 600,00 to review: no value fits, the sender does, and both are offered', () => {
    expect(match({ on: '2026-10-04', cents: 60000, text: 'PAI PIX' }, [MESADA, VR])).toEqual({
      type: 'review',
      occurrenceIds: ['mesada', 'vr'],
    });
  });

  it('sends to review when two fit and none is exact: the choice is Lucas', () => {
    // 80000 is within 15% of 85000 (127.5) and of 77700 (116.55), and exact for neither.
    expect(match({ on: '2026-10-04', cents: 80000, text: 'PAI PIX' }, [MESADA, VR])).toEqual({
      type: 'review',
      occurrenceIds: ['mesada', 'vr'],
    });
  });

  it('does nothing when the sender is another one and no value fits', () => {
    expect(match({ on: '2026-10-04', cents: 60000, text: 'LOJA X' }, [MESADA, VR])).toEqual({
      type: 'none',
    });
  });
});

describe('matchTransactionToOccurrences, window and late', () => {
  it('ties the freelance Pix on the last day of the window (27/10) and not on the day after', () => {
    expect(match({ on: '2026-10-27', cents: 420000, text: 'G PRADO' }, [MAXXY])).toEqual({
      type: 'link',
      occurrenceId: 'maxxy',
    });
    expect(match({ on: '2026-10-28', cents: 420000, text: 'G PRADO' }, [MAXXY])).toEqual({
      type: 'none',
    });
  });

  it('does not tie a Pix from before the window starts', () => {
    expect(match({ on: '2026-10-22', cents: 420000, text: 'G PRADO' }, [MAXXY])).toEqual({
      type: 'none',
    });
  });

  it('ties a Pix after the window to the late occurrence: it has no limit to the right', () => {
    const late = { ...MAXXY, status: 'late' as const };

    expect(match({ on: '2026-10-29', cents: 420000, text: 'G PRADO' }, [late])).toEqual({
      type: 'link',
      occurrenceId: 'maxxy',
    });
    expect(match({ on: '2027-02-01', cents: 420000, text: 'G PRADO' }, [late])).toEqual({
      type: 'link',
      occurrenceId: 'maxxy',
    });
  });

  it('still starts at the window start for a late occurrence', () => {
    const late = { ...MAXXY, status: 'late' as const };

    expect(match({ on: '2026-10-10', cents: 420000, text: 'G PRADO' }, [late])).toEqual({
      type: 'none',
    });
  });

  it('keeps the oldest month of one recurrence: the late one of September takes the Pix before October', () => {
    const september = {
      ...MAXXY,
      occurrenceId: 'maxxy-sep',
      month: '2026-09',
      windowStartOn: '2026-09-23',
      windowEndOn: '2026-09-27',
      status: 'late' as const,
    };

    expect(match({ on: '2026-10-25', cents: 420000, text: 'G PRADO' }, [MAXXY, september])).toEqual(
      { type: 'link', occurrenceId: 'maxxy-sep' },
    );
  });
});

describe('matchTransactionToOccurrences, who and how much', () => {
  it('needs the match text inside the text of the transaction', () => {
    expect(match({ on: '2026-10-25', cents: 420000, text: 'FULANO' }, [MAXXY])).toEqual({
      type: 'none',
    });
  });

  it('without a match text, ties only a value that is exact (R$ 1,00)', () => {
    const noSender = { ...MAXXY, matchText: null };

    expect(match({ on: '2026-10-25', cents: 420100, text: 'QUALQUER' }, [noSender])).toEqual({
      type: 'link',
      occurrenceId: 'maxxy',
    });
    expect(match({ on: '2026-10-25', cents: 420101, text: 'QUALQUER' }, [noSender])).toEqual({
      type: 'none',
    });
    // 10% off would fit with a sender, but there is no sender to confirm it.
    expect(match({ on: '2026-10-25', cents: 380000, text: 'QUALQUER' }, [noSender])).toEqual({
      type: 'none',
    });
  });

  it('ties a value within 15% of the expected amount when the sender fits', () => {
    expect(match({ on: '2026-10-25', cents: 357000, text: 'G PRADO' }, [MAXXY])).toEqual({
      type: 'link',
      occurrenceId: 'maxxy',
    });
    expect(match({ on: '2026-10-25', cents: 356999, text: 'G PRADO' }, [MAXXY])).toEqual({
      type: 'review',
      occurrenceIds: ['maxxy'],
    });
  });

  it('does not tie a debit to an income occurrence', () => {
    expect(
      match({ on: '2026-10-25', cents: 420000, text: 'G PRADO', kind: 'expense' }, [MAXXY]),
    ).toEqual({ type: 'none' });
  });

  it('does not tie when the occurrence already has all its payments', () => {
    const full = { ...MESADA, status: 'partial' as const, paymentCount: 2, remainingCents: 100 };

    expect(match({ on: '2026-10-20', cents: 100, text: 'PAI' }, [full])).toEqual({ type: 'none' });
  });

  it('takes what is left as a target: R$ 300,00 left, R$ 300,00 paid', () => {
    const left = {
      ...MESADA,
      maxPayments: 3,
      status: 'partial' as const,
      paymentCount: 1,
      remainingCents: 30000,
    };

    expect(match({ on: '2026-10-20', cents: 30000, text: 'PAI' }, [left])).toEqual({
      type: 'link',
      occurrenceId: 'mesada',
    });
  });

  it('takes the part (rounded up) as a target: 3 parts of R$ 100,00 are R$ 33,34', () => {
    const three = {
      ...MESADA,
      expectedCents: 10000,
      remainingCents: 10000,
      maxPayments: 3,
      matchText: null,
    };

    expect(match({ on: '2026-10-20', cents: 3334, text: 'X' }, [three])).toEqual({
      type: 'link',
      occurrenceId: 'mesada',
    });
  });

  it('has nothing to tie when there is no candidate', () => {
    expect(match({ on: '2026-10-20', cents: 100, text: 'X' }, [])).toEqual({ type: 'none' });
  });
});
