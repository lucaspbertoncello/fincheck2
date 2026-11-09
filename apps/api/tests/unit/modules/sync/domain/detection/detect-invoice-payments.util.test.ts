import { describe, expect, it } from 'vitest';

import { detectInvoicePayments } from '#/modules/sync/domain/detection/detect-invoice-payments.util.ts';
import type { PayableInvoice } from '#/modules/sync/domain/detection/detect-invoice-payments.util.ts';
import type { DetectionItem } from '#/modules/sync/domain/detection/detection-item.type.ts';

let sequence = 0;

function item(overrides: Partial<DetectionItem> = {}): DetectionItem {
  sequence += 1;

  return {
    id: `item-${String(sequence)}`,
    accountId: 'checking',
    isCard: false,
    amountCents: -10000,
    occurredOn: '2026-11-05',
    description: 'Pix enviado',
    nature: 'expense',
    natureSetBy: 'system',
    hasUserCategory: false,
    isSplit: false,
    isLinked: false,
    isNew: true,
    ...overrides,
  };
}

const credit = (overrides: Partial<DetectionItem> = {}) =>
  item({ accountId: 'card', isCard: true, amountCents: 10000, ...overrides });
const debit = (overrides: Partial<DetectionItem> = {}) =>
  item({ amountCents: -10000, ...overrides });

const detect = (items: DetectionItem[], invoices: PayableInvoice[] = []) =>
  detectInvoicePayments({ items, invoices }).toSorted();

describe('detectInvoicePayments: credit on the card', () => {
  it.each(['PAGAMENTO RECEBIDO', 'Pgto fatura', 'pag fatura nubank', 'Pagamento de fatura'])(
    'a credit that says "%s" is a payment',
    (description) => {
      const payment = credit({ description });

      expect(detect([payment])).toEqual([payment.id]);
    },
  );

  it('reads whole words: "PGTOS" and "PAGAMENTOS" say nothing', () => {
    const refund = credit({ description: 'ESTORNO PGTOS LOJA' });

    expect(detect([refund])).toEqual([]);
  });

  it('a credit with no marker and no debit that mirrors it is a refund, not a payment', () => {
    expect(detect([credit({ description: 'ESTORNO AMAZON' })])).toEqual([]);
  });

  it('a credit with no marker is a payment when a debit of an own account mirrors it (same value, up to 3 days)', () => {
    const refundLooking = credit({ description: 'CREDITO', occurredOn: '2026-11-07' });
    const mirror = debit({ occurredOn: '2026-11-04' });

    expect(detect([refundLooking, mirror])).toEqual([refundLooking.id, mirror.id].toSorted());
  });

  it('the mirror tolerates R$ 0,01 of difference and no more', () => {
    const near = credit({ description: 'CREDITO', amountCents: 10001 });
    const far = credit({ description: 'CREDITO', amountCents: 10002, occurredOn: '2026-11-20' });
    const mirror = debit({ amountCents: -10000, occurredOn: '2026-11-20' });

    expect(detect([near, debit({ amountCents: -10000 })])).toHaveLength(2);
    expect(detect([far, mirror])).toEqual([]);
  });

  it('the mirror is no more than 3 days apart', () => {
    const inside = credit({ description: 'CREDITO', occurredOn: '2026-11-08' });
    const outside = credit({ description: 'CREDITO', occurredOn: '2026-11-09' });

    expect(detect([inside, debit()])).toHaveLength(2);
    expect(detect([outside, debit()])).toEqual([]);
  });

  it('a credit never mirrors a debit on another card', () => {
    const otherCard = item({ accountId: 'card-2', isCard: true, amountCents: -10000 });

    expect(detect([credit({ description: 'CREDITO' }), otherCard])).toEqual([]);
  });
});

describe('detectInvoicePayments: debit on the account', () => {
  it('a debit that mirrors a credit of the card marks both, whatever the value (partial or minimum payment)', () => {
    const partial = credit({ description: 'PAGAMENTO RECEBIDO', amountCents: 3500 });
    const paid = debit({ amountCents: -3500 });

    expect(detect([partial, paid])).toEqual([partial.id, paid.id].toSorted());
  });

  it('the credit of an old round is the partner of the debit of today (the banks do not send both sides together)', () => {
    const old = credit({ isNew: false, description: 'CREDITO', occurredOn: '2026-11-03' });
    const today = debit({ occurredOn: '2026-11-05' });

    expect(detect([old, today])).toEqual([old.id, today.id].toSorted());
  });

  it('and the debit of an old round is the partner of the credit that arrives now', () => {
    const old = debit({ isNew: false, occurredOn: '2026-11-04' });
    const arriving = credit({ description: 'CREDITO', occurredOn: '2026-11-05' });

    expect(detect([old, arriving])).toEqual([old.id, arriving.id].toSorted());
  });

  it('a debit that already was marked is not answered again, and still is the partner of a new credit', () => {
    const marked = debit({ isNew: false, nature: 'invoice_payment' });
    const arriving = credit({ description: 'CREDITO' });

    expect(detect([marked, arriving])).toEqual([arriving.id]);
  });

  it('a credit pairs with one debit only: the second one is an ordinary debit', () => {
    const payment = credit({ description: 'PAGAMENTO RECEBIDO' });
    const first = debit({ occurredOn: '2026-11-05' });
    const second = debit({ occurredOn: '2026-11-05' });

    const found = detect([payment, first, second]);

    expect(found).toHaveLength(2);
    expect(found).toContain(payment.id);
  });

  it('among two debits the nearest in date is the one that pays', () => {
    const payment = credit({ description: 'PAGAMENTO RECEBIDO', occurredOn: '2026-11-05' });
    const far = debit({ occurredOn: '2026-11-03' });
    const near = debit({ occurredOn: '2026-11-05' });

    expect(detect([payment, far, near])).toEqual([payment.id, near.id].toSorted());
  });

  it('a debit with no credit is a payment when it equals the total of a closed invoice within R$ 1,00', () => {
    const paid = debit({ amountCents: -128490, occurredOn: '2026-11-04' });
    const invoice = {
      accountId: 'card',
      closesOn: '2026-10-30',
      dueOn: '2026-11-06',
      totalCents: 128450,
    };

    expect(detect([paid], [invoice])).toEqual([paid.id]);
  });

  it('R$ 1,00 is the limit: one cent more is not the invoice', () => {
    const invoice = {
      accountId: 'card',
      closesOn: '2026-10-30',
      dueOn: '2026-11-06',
      totalCents: 128450,
    };

    expect(detect([debit({ amountCents: -128550 })], [invoice])).toHaveLength(1);
    expect(detect([debit({ amountCents: -128551 })], [invoice])).toEqual([]);
  });

  it('the window of the invoice goes from the closing to 5 days after the due date', () => {
    const invoice = {
      accountId: 'card',
      closesOn: '2026-10-30',
      dueOn: '2026-11-06',
      totalCents: 50000,
    };
    const on = (occurredOn: string) => debit({ amountCents: -50000, occurredOn });

    expect(detect([on('2026-10-30')], [invoice])).toHaveLength(1);
    expect(detect([on('2026-11-11')], [invoice])).toHaveLength(1);
    expect(detect([on('2026-10-29')], [invoice])).toEqual([]);
    expect(detect([on('2026-11-12')], [invoice])).toEqual([]);
  });

  it('a debit of the same value as an invoice that is not payable is an ordinary expense', () => {
    expect(detect([debit({ amountCents: -128490 })], [])).toEqual([]);
  });
});

describe('detectInvoicePayments: one debit per invoice', () => {
  // The invoice of October: closes on 05/11, due on 12/11, R$ 500,00.
  const invoice: PayableInvoice = {
    accountId: 'card',
    closesOn: '2026-11-05',
    dueOn: '2026-11-12',
    totalCents: 50000,
  };

  it('of three debits in the window that fit the total, only one pays: the nearest to the due date, the others are spending', () => {
    const rent = debit({
      description: 'Pix aluguel',
      amountCents: -50000,
      occurredOn: '2026-11-08',
    });
    const fee = debit({ description: 'Tarifa', amountCents: -49950, occurredOn: '2026-11-07' });
    const pix = debit({ description: 'Pix fatura', amountCents: -50000, occurredOn: '2026-11-09' });

    expect(detect([rent, fee, pix], [invoice])).toEqual([pix.id]);
  });

  it('the answer is the same whatever the order the debits come in', () => {
    const items = [
      debit({ id: 'a', amountCents: -50000, occurredOn: '2026-11-08' }),
      debit({ id: 'b', amountCents: -50000, occurredOn: '2026-11-09' }),
      debit({ id: 'c', amountCents: -49950, occurredOn: '2026-11-10' }),
    ];

    expect(detect(items, [invoice])).toEqual(['b']);
    expect(detect(items.toReversed(), [invoice])).toEqual(['b']);
  });

  it('the exact value wins over the one that only fits the R$ 1,00 of tolerance, even if the other is nearer the due date', () => {
    const nearButOff = debit({ amountCents: -49950, occurredOn: '2026-11-12' });
    const farButExact = debit({ amountCents: -50000, occurredOn: '2026-11-06' });

    expect(detect([nearButOff, farButExact], [invoice])).toEqual([farButExact.id]);
  });

  it('with no exact debit, the nearest one within the tolerance pays', () => {
    const off = debit({ amountCents: -49950, occurredOn: '2026-11-12' });
    const alsoOff = debit({ amountCents: -50040, occurredOn: '2026-11-07' });

    expect(detect([off, alsoOff], [invoice])).toEqual([off.id]);
  });

  it('an invoice that already has its debit (marked in an earlier round) is not paid again by a new debit of the same value', () => {
    const marked = debit({
      isNew: false,
      nature: 'invoice_payment',
      amountCents: -50000,
      occurredOn: '2026-11-09',
    });
    const rent = debit({ description: 'Aluguel', amountCents: -50000, occurredOn: '2026-11-10' });

    expect(detect([marked, rent], [invoice])).toEqual([]);
  });

  it('an invoice that a debit and a credit of the card already settled in this round is not paid again either', () => {
    const payment = credit({
      description: 'PAGAMENTO RECEBIDO',
      amountCents: 50000,
      occurredOn: '2026-11-09',
    });
    const mirror = debit({ amountCents: -50000, occurredOn: '2026-11-09' });
    const rent = debit({ description: 'Aluguel', amountCents: -50000, occurredOn: '2026-11-10' });

    expect(detect([payment, mirror, rent], [invoice])).toEqual([payment.id, mirror.id].toSorted());
  });

  it('a partial payment that mirrors a credit does not cover the invoice: the debit that equals the total still pays it', () => {
    const partial = credit({
      description: 'PAGAMENTO RECEBIDO',
      amountCents: 20000,
      occurredOn: '2026-11-09',
    });
    const partialDebit = debit({ amountCents: -20000, occurredOn: '2026-11-09' });
    const total = debit({ amountCents: -50000, occurredOn: '2026-11-10' });

    expect(detect([partial, partialDebit, total], [invoice])).toEqual(
      [partial.id, partialDebit.id, total.id].toSorted(),
    );
  });

  it('two invoices, two debits: each invoice takes its own debit and none is taken twice', () => {
    const second: PayableInvoice = {
      accountId: 'card-2',
      closesOn: '2026-11-05',
      dueOn: '2026-11-13',
      totalCents: 50000,
    };
    const first = debit({ amountCents: -50000, occurredOn: '2026-11-09' });
    const other = debit({ amountCents: -50000, occurredOn: '2026-11-12' });
    const third = debit({ amountCents: -50000, occurredOn: '2026-11-10' });

    expect(detect([first, other, third], [invoice, second])).toHaveLength(2);
  });

  it('an invoice of less than R$ 5,00 never takes a debit (total zero would match any small debit)', () => {
    const tiny: PayableInvoice = { ...invoice, totalCents: 0 };

    expect(detect([debit({ amountCents: -90, occurredOn: '2026-11-08' })], [tiny])).toEqual([]);
    expect(
      detect(
        [debit({ amountCents: -499, occurredOn: '2026-11-08' })],
        [{ ...tiny, totalCents: 499 }],
      ),
    ).toEqual([]);
    expect(
      detect(
        [debit({ amountCents: -500, occurredOn: '2026-11-08' })],
        [{ ...tiny, totalCents: 500 }],
      ),
    ).toHaveLength(1);
  });
});

describe('detectInvoicePayments: a credit that already has its debit', () => {
  it('is not offered again: a new debit of the same value is an ordinary expense', () => {
    const paidCredit = credit({
      isNew: false,
      nature: 'invoice_payment',
      description: 'PAGAMENTO RECEBIDO',
      occurredOn: '2026-11-06',
    });
    const paidDebit = debit({ isNew: false, nature: 'invoice_payment', occurredOn: '2026-11-06' });
    const rent = debit({ description: 'Aluguel', occurredOn: '2026-11-08' });

    expect(detect([paidCredit, paidDebit, rent])).toEqual([]);
  });

  it('even when the new debit is nearer in date than the old debit of the pair', () => {
    const paidCredit = credit({
      isNew: false,
      nature: 'invoice_payment',
      occurredOn: '2026-11-08',
    });
    const paidDebit = debit({ isNew: false, nature: 'invoice_payment', occurredOn: '2026-11-06' });
    const rent = debit({ description: 'Aluguel', occurredOn: '2026-11-08' });

    expect(detect([paidCredit, paidDebit, rent])).toEqual([]);
  });

  it('is offered while it has no debit: the mirror that arrives later still pairs with it', () => {
    const lonely = credit({
      isNew: false,
      nature: 'invoice_payment',
      description: 'PAGAMENTO RECEBIDO',
      occurredOn: '2026-11-06',
    });
    const arriving = debit({ occurredOn: '2026-11-07' });

    expect(detect([lonely, arriving])).toEqual([arriving.id]);
  });

  it('a new credit still takes the debit that was marked alone', () => {
    const lonelyDebit = debit({
      isNew: false,
      nature: 'invoice_payment',
      occurredOn: '2026-11-06',
    });
    const arriving = credit({ description: 'CREDITO', occurredOn: '2026-11-07' });

    expect(detect([lonelyDebit, arriving])).toEqual([arriving.id]);
  });
});

describe('detectInvoicePayments: what is never touched', () => {
  it('a nature Lucas chose (natureSetBy = user) is left alone', () => {
    const chosen = credit({ description: 'PAGAMENTO RECEBIDO', natureSetBy: 'user' });

    expect(detect([chosen])).toEqual([]);
  });

  it('what already pays something (an invoice, an occurrence, a bill) is left alone', () => {
    const linked = credit({ description: 'PAGAMENTO RECEBIDO', isLinked: true });

    expect(detect([linked])).toEqual([]);
  });

  it('a split transaction is left alone', () => {
    expect(detect([credit({ description: 'PAGAMENTO RECEBIDO', isSplit: true })])).toEqual([]);
  });

  it('what Lucas categorized by hand is left alone', () => {
    expect(detect([credit({ description: 'PAGAMENTO RECEBIDO', hasUserCategory: true })])).toEqual(
      [],
    );
  });

  it.each(['transfer', 'balance_adjustment', 'lent', 'reimbursed'] as const)(
    'a transaction of nature %s is left alone',
    (nature) => {
      expect(detect([credit({ description: 'PAGAMENTO RECEBIDO', nature })])).toEqual([]);
    },
  );

  it('an old transaction does not start a search of its own', () => {
    expect(detect([credit({ description: 'PAGAMENTO RECEBIDO', isNew: false })])).toEqual([]);
  });

  it('the answer does not depend on the order the items come in', () => {
    const items = [
      credit({ id: 'c1', description: 'CREDITO', occurredOn: '2026-11-05' }),
      debit({ id: 'd1', occurredOn: '2026-11-04' }),
      debit({ id: 'd2', occurredOn: '2026-11-06' }),
    ];

    expect(detect(items)).toEqual(detect(items.toReversed()));
  });
});
