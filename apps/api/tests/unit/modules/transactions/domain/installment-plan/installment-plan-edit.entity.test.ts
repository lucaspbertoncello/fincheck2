import { describe, expect, it } from 'vitest';

import { InstallmentPlan } from '#/modules/transactions/domain/installment-plan/installment-plan.entity.ts';
import { Transaction as TransactionEntity } from '#/modules/transactions/domain/transaction/transaction.entity.ts';
import type { Transaction } from '#/modules/transactions/domain/transaction/transaction.entity.ts';
import { BusinessDate } from '#/shared/date/business-date.value-object.ts';
import { Month } from '#/shared/date/month.value-object.ts';
import { RequestValidationError } from '#/shared/errors/request-validation.error.ts';
import { Money } from '#/shared/money/money.value-object.ts';

const NOW = '2026-11-06T12:00:00.000Z';
const LATER = '2026-11-07T12:00:00.000Z';
const CARD: Transaction.AccountRef = { id: 'card-1', isCard: true, isArchived: false };
const FOOD: Transaction.CategoryRef = { id: 'food', kind: 'expense', isArchived: false };
const MARKET: Transaction.CategoryRef = { id: 'market', kind: 'expense', isArchived: false };
const CATEGORIES: Record<string, Transaction.CategoryRef> = { food: FOOD, market: MARKET };
const TAG_FOOD: Transaction.TagRef = { id: 'tag-food', categoryId: 'food', isArchived: false };
const TAG_MARKET: Transaction.TagRef = {
  id: 'tag-market',
  categoryId: 'market',
  isArchived: false,
};

function plan(overrides: Partial<InstallmentPlan.CreateManualInput> = {}) {
  return InstallmentPlan.createManual(
    {
      account: CARD,
      description: 'Cadeira ergonômica',
      total: Money.fromCents(129900),
      installmentCount: 12,
      firstInvoiceMonth: Month.of('2026-12'),
      purchaseOn: BusinessDate.of('2026-11-05'),
      category: null,
      tags: [],
      ...overrides,
    },
    NOW,
  );
}

// The parcels of `base` as they are stored, and the change applied to them.
function edit(
  base: InstallmentPlan,
  change: InstallmentPlan.Change,
  options: {
    parcels?: Transaction[];
    tags?: readonly Transaction.TagRef[];
    paid?: string[];
    linked?: string[];
  } = {},
) {
  const parcels = options.parcels ?? base.buildParcels({ category: null, tags: [] }, NOW);
  const next = base.withChanges(change, LATER);
  const result = next.reconcileParcels(
    {
      previous: base,
      valuesSent: change.total !== undefined || change.installmentCount !== undefined,
      parcels,
      category:
        change.category === undefined
          ? (CATEGORIES[base.categoryId ?? ''] ?? null)
          : change.category,
      ...(change.tags === undefined ? {} : { tags: change.tags }),
      knownTags: new Map((options.tags ?? []).map((tag) => [tag.id, tag])),
      paidInvoiceMonths: new Set(options.paid ?? []),
      linkedParcelIds: new Set(options.linked ?? []),
    },
    LATER,
  );

  return { next, parcels, ...result };
}

const cents = (parcels: Transaction[]) =>
  [...parcels]
    .sort((a, b) => (a.installment?.number ?? 0) - (b.installment?.number ?? 0))
    .map((parcel) => Math.abs(parcel.amount.cents));
const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);

describe('InstallmentPlan.withChanges', () => {
  it('gives the plan itself back when nothing differs', () => {
    const base = plan();

    expect(base.withChanges({}, LATER)).toBe(base);
    expect(
      base.withChanges(
        {
          description: base.description,
          total: base.total,
          installmentCount: 12,
          firstInvoiceMonth: Month.of('2026-12'),
        },
        LATER,
      ),
    ).toBe(base);
  });

  it('changes the fields it was given and keeps the identity of the plan', () => {
    const base = plan();

    const next = base.withChanges(
      {
        description: 'Cadeira nova',
        total: Money.fromCents(100000),
        installmentCount: 10,
        firstInvoiceMonth: Month.of('2027-01'),
        category: FOOD,
      },
      LATER,
    );

    expect(next).toMatchObject({
      id: base.id,
      accountId: 'card-1',
      origin: 'manual',
      description: 'Cadeira nova',
      installmentCount: 10,
      categoryId: 'food',
      createdAt: NOW,
      updatedAt: LATER,
    });
    expect(next.total.cents).toBe(100000);
    expect(next.firstInvoiceMonth.value).toBe('2027-01');
    expect(next.purchaseOn.value).toBe('2026-11-05');
  });

  it('takes the category off with null and keeps it when it is left out', () => {
    const base = plan({ category: FOOD });

    expect(base.withChanges({ category: null }, LATER).categoryId).toBeNull();
    expect(base.withChanges({ description: 'x' }, LATER).categoryId).toBe('food');
  });

  it('only edits a plan entered by hand', () => {
    const fromBank = new InstallmentPlan({
      accountId: 'card-1',
      origin: 'bank',
      description: 'x',
      purchaseOn: BusinessDate.of('2026-10-31'),
      total: Money.fromCents(1000),
      installmentCount: 2,
      firstInvoiceMonth: Month.of('2026-11'),
      categoryId: null,
      createdAt: NOW,
    });

    expect(() => fromBank.withChanges({ description: 'y' }, LATER)).toThrow(
      expect.objectContaining({ code: 'INSTALLMENT_PLAN_NOT_MANUAL' }),
    );
    expect(() => fromBank.assertEditable()).toThrow(
      expect.objectContaining({ code: 'INSTALLMENT_PLAN_NOT_MANUAL' }),
    );
  });

  it('wants 2 to 48 parcels and at least one cent each, on the final state', () => {
    const base = plan({ total: Money.fromCents(100), installmentCount: 10 });

    expect(() => base.withChanges({ installmentCount: 1 }, LATER)).toThrow(RangeError);
    expect(() => base.withChanges({ installmentCount: 49 }, LATER)).toThrow(RangeError);
    expect(() => base.withChanges({ total: Money.fromCents(0) }, LATER)).toThrow(RangeError);
    // The total alone and the count alone can each break one cent per parcel.
    expect(() => base.withChanges({ total: Money.fromCents(9) }, LATER)).toThrow(
      RequestValidationError,
    );
    expect(() =>
      base.withChanges({ installmentCount: 48, total: Money.fromCents(47) }, LATER),
    ).toThrow(RequestValidationError);
    expect(() => base.withChanges({ installmentCount: 48 }, LATER)).not.toThrow();
    expect(() => base.withChanges({ total: Money.fromCents(10) }, LATER)).not.toThrow();
    // Raising the count past what the total can pay is refused even when the total is not sent.
    const small = plan({ total: Money.fromCents(12), installmentCount: 12 });
    expect(() => small.withChanges({ installmentCount: 13 }, LATER)).toThrow(
      expect.objectContaining({ code: 'VALIDATION_FAILED' }),
    );
  });

  it('keeps the first and the last invoice inside the supported years', () => {
    const base = plan();

    expect(() => base.withChanges({ firstInvoiceMonth: Month.of('1999-12') }, LATER)).toThrow(
      expect.objectContaining({ code: 'VALIDATION_FAILED' }),
    );
    expect(() => base.withChanges({ firstInvoiceMonth: Month.of('2101-01') }, LATER)).toThrow(
      expect.objectContaining({ code: 'VALIDATION_FAILED' }),
    );
    // 2100-11 + 12 parcels ends in 2101-10.
    expect(() => base.withChanges({ firstInvoiceMonth: Month.of('2100-11') }, LATER)).toThrow(
      expect.objectContaining({ code: 'VALIDATION_FAILED' }),
    );
    expect(() => base.withChanges({ firstInvoiceMonth: Month.of('2099-01') }, LATER)).not.toThrow();
  });

  it('takes a new category only if it is an active expense one that is not a transfer', () => {
    const base = plan();

    expect(() => base.withChanges({ category: { ...FOOD, isArchived: true } }, LATER)).toThrow(
      expect.objectContaining({ code: 'TRANSACTION_CATEGORY_ARCHIVED' }),
    );
    expect(() => base.withChanges({ category: { ...FOOD, kind: 'income' } }, LATER)).toThrow(
      expect.objectContaining({ code: 'TRANSACTION_CATEGORY_KIND_MISMATCH' }),
    );
    expect(() => base.withChanges({ category: { ...FOOD, isTransfer: true } }, LATER)).toThrow(
      expect.objectContaining({ code: 'TRANSACTION_CATEGORY_NOT_ALLOWED' }),
    );
  });

  it('does not refuse the category the plan already has because it was archived since', () => {
    const base = plan({ category: FOOD });

    expect(() =>
      base.withChanges({ category: { ...FOOD, isArchived: true }, description: 'x' }, LATER),
    ).not.toThrow();
  });

  it('takes tags of the category the plan ends up with, and none without a category', () => {
    const base = plan({ category: FOOD });

    expect(() => base.withChanges({ tags: [TAG_FOOD] }, LATER)).not.toThrow();
    expect(() => base.withChanges({ tags: [TAG_MARKET] }, LATER)).toThrow(
      expect.objectContaining({ code: 'TRANSACTION_TAG_CATEGORY_MISMATCH' }),
    );
    // The tags follow the NEW category.
    expect(() => base.withChanges({ category: MARKET, tags: [TAG_MARKET] }, LATER)).not.toThrow();
    expect(() => base.withChanges({ category: MARKET, tags: [TAG_FOOD] }, LATER)).toThrow(
      expect.objectContaining({ code: 'TRANSACTION_TAG_CATEGORY_MISMATCH' }),
    );
    expect(() => base.withChanges({ category: null, tags: [TAG_FOOD] }, LATER)).toThrow(
      expect.objectContaining({ code: 'TRANSACTION_TAG_NEEDS_CATEGORY' }),
    );
    expect(() => plan().withChanges({ tags: [TAG_FOOD] }, LATER)).toThrow(
      expect.objectContaining({ code: 'TRANSACTION_TAG_NEEDS_CATEGORY' }),
    );
    expect(() => base.withChanges({ category: null, tags: [] }, LATER)).not.toThrow();
  });
});

describe('InstallmentPlan.reconcileParcels: the parcels add up to the new total', () => {
  it('changes the total: every parcel takes the new share, the leftover on the first', () => {
    const { next, parcels, saved, removed } = edit(plan(), { total: Money.fromCents(100001) });

    expect(removed).toEqual([]);
    expect(saved).toHaveLength(12);
    expect(cents(parcels)).toEqual([8338, ...Array<number>(11).fill(8333)]);
    expect(sum(cents(parcels))).toBe(next.total.cents);
    for (const parcel of parcels) expect(parcel.amount.cents).toBeLessThan(0);
  });

  it('keeps the identity of the parcels it updates', () => {
    const base = plan();
    const parcels = base.buildParcels({ category: null, tags: [] }, NOW);
    const ids = parcels.map((parcel) => parcel.id);

    const result = edit(base, { total: Money.fromCents(60000) }, { parcels });

    expect(result.saved.map((parcel) => parcel.id)).toEqual(ids);
    expect(result.saved.every((parcel) => parcel.updatedAt === LATER)).toBe(true);
    expect(result.saved.map((parcel) => parcel.createdAt)).toEqual(
      parcels.map((parcel) => parcel.createdAt),
    );
  });

  it('R$ 1.299,00 in 12 is 12 x 108,25; down to 11 and up to 13 the sum is still the total', () => {
    const base = plan();
    expect(cents(base.buildParcels({ category: null, tags: [] }, NOW))).toEqual(
      Array<number>(12).fill(10825),
    );

    const down = edit(base, { installmentCount: 11 });
    // 129900 / 11 = 11809 and 1 cent left over: the first one takes it.
    expect(cents(down.parcels.filter((parcel) => !down.removed.includes(parcel)))).toEqual([
      11810,
      ...Array<number>(10).fill(11809),
    ]);
    expect(down.removed.map((parcel) => parcel.installment?.number)).toEqual([12]);

    const up = edit(base, { installmentCount: 13 });
    expect(
      cents([...up.parcels, ...up.saved.filter((parcel) => !up.parcels.includes(parcel))]),
    ).toEqual([9996, ...Array<number>(12).fill(9992)]);
    expect(up.saved).toHaveLength(13);
  });

  it('adds up to the total for any change of total and count', () => {
    for (const count of [2, 3, 7, 12, 13, 24, 48]) {
      for (const total of [count, count + 1, 99, 100, 129900, 100000001]) {
        if (total < count) continue;
        const base = plan();
        const parcels = base.buildParcels({ category: null, tags: [] }, NOW);

        const { next, saved, removed } = edit(
          base,
          { total: Money.fromCents(total), installmentCount: count },
          { parcels },
        );

        const survivors = [
          ...parcels.filter((parcel) => !removed.includes(parcel)),
          ...saved,
        ].filter((parcel, index, all) => all.indexOf(parcel) === index);
        expect(survivors).toHaveLength(count);
        expect(sum(cents(survivors))).toBe(total);
        expect(next.total.cents).toBe(total);
        expect(new Set(survivors.map((parcel) => parcel.installment?.number)).size).toBe(count);
      }
    }
  });

  it('touches only the parcels whose value moves', () => {
    const base = plan({ total: Money.fromCents(30000), installmentCount: 3 });

    // 30000 -> 30001: the first parcel takes the cent, the other two keep R$ 100,00.
    const result = edit(base, { total: Money.fromCents(30001) });

    expect(result.saved.map((parcel) => parcel.installment?.number)).toEqual([1]);
    expect(cents(result.parcels)).toEqual([10001, 10000, 10000]);
    const same = edit(base, {});
    expect(same.saved).toEqual([]);
    expect(same.removed).toEqual([]);
  });

  it('does not touch the value of a parcel when only the description changes', () => {
    const base = plan();
    const parcels = base.buildParcels({ category: null, tags: [] }, NOW);
    // Lucas edited the parcel 3 by hand: the plan does not rewrite it unless the money changed.
    parcels[2]?.edit({ amount: Money.fromCents(20000) }, NOW);

    const { saved } = edit(base, { description: 'Cadeira nova' }, { parcels });

    expect(saved).toHaveLength(12);
    expect(parcels[2]?.amount.cents).toBe(-20000);
    expect(parcels.every((parcel) => parcel.description === 'Cadeira nova')).toBe(true);
  });
});

describe('InstallmentPlan.reconcileParcels: the invoice of each parcel', () => {
  it('moves every parcel to the invoice of the first plus its number, and its date with it', () => {
    const base = plan({
      purchaseOn: BusinessDate.of('2026-10-31'),
      installmentCount: 4,
      total: Money.fromCents(40000),
    });
    const parcels = base.buildParcels({ category: null, tags: [] }, NOW);

    const { saved } = edit(base, { firstInvoiceMonth: Month.of('2027-01') }, { parcels });

    expect(saved).toHaveLength(4);
    expect(parcels.map((parcel) => parcel.invoiceMonth?.value)).toEqual([
      '2027-01',
      '2027-02',
      '2027-03',
      '2027-04',
    ]);
    // The purchase is on the 31st: the day is held at the end of the shorter months.
    expect(parcels.map((parcel) => parcel.occurredOn.value)).toEqual([
      '2027-01-31',
      '2027-02-28',
      '2027-03-31',
      '2027-04-30',
    ]);
    // Only the invoice moved: the value is the same, so a month move is not a change of value.
    expect(cents(parcels)).toEqual([10000, 10000, 10000, 10000]);
    for (const parcel of parcels) {
      expect(parcel.competenceOn(base.purchaseOn).value.slice(0, 7)).toBe(
        parcel.invoiceMonth?.value,
      );
    }
  });

  it('puts a new parcel on the invoice of its number', () => {
    const base = plan({ total: Money.fromCents(30000), installmentCount: 3 });

    const { saved, parcels } = edit(base, { installmentCount: 5 });
    const created = saved.filter((parcel) => !parcels.includes(parcel));

    expect(created.map((parcel) => parcel.installment?.number)).toEqual([4, 5]);
    expect(created.map((parcel) => parcel.invoiceMonth?.value)).toEqual(['2027-03', '2027-04']);
    expect(created.map((parcel) => parcel.occurredOn.value)).toEqual(['2027-03-05', '2027-04-05']);
    expect(created.every((parcel) => parcel.installment?.planId === base.id)).toBe(true);
  });
});

describe('InstallmentPlan.reconcileParcels: description, category and tags', () => {
  it('writes the description of the plan on every parcel when it changed', () => {
    const { parcels } = edit(plan(), { description: 'Poltrona' });

    expect(new Set(parcels.map((parcel) => parcel.description))).toEqual(new Set(['Poltrona']));
  });

  it('takes the new category and drops the old tags, or takes the tags that came with it', () => {
    const base = plan({ category: FOOD, tags: [TAG_FOOD] });
    const original = base.buildParcels({ category: FOOD, tags: [TAG_FOOD] }, NOW);
    const withoutTags = edit(base, { category: MARKET }, { parcels: original });

    expect(withoutTags.parcels.every((parcel) => parcel.categoryId === 'market')).toBe(true);
    expect(withoutTags.parcels.every((parcel) => parcel.tagIds.length === 0)).toBe(true);

    const again = base.buildParcels({ category: FOOD, tags: [TAG_FOOD] }, NOW);
    const withTags = edit(base, { category: MARKET, tags: [TAG_MARKET] }, { parcels: again });

    expect(withTags.parcels.every((parcel) => parcel.categoryId === 'market')).toBe(true);
    expect(withTags.parcels.every((parcel) => parcel.tagIds.join() === 'tag-market')).toBe(true);
  });

  it('takes the category off, with the tags', () => {
    const base = plan({ category: FOOD, tags: [TAG_FOOD] });
    const parcels = base.buildParcels({ category: FOOD, tags: [TAG_FOOD] }, NOW);

    edit(base, { category: null }, { parcels });

    expect(
      parcels.every((parcel) => parcel.categoryId === null && parcel.tagIds.length === 0),
    ).toBe(true);
  });

  it('replaces the tags only where they differ, and leaves the others untouched', () => {
    const other: Transaction.TagRef = { id: 'tag-other', categoryId: 'food', isArchived: false };
    const base = plan({ category: FOOD, tags: [TAG_FOOD] });
    const parcels = base.buildParcels({ category: FOOD, tags: [TAG_FOOD] }, NOW);
    parcels[1]?.replaceTags([TAG_FOOD, other], NOW);

    const { saved } = edit(base, { tags: [TAG_FOOD] }, { parcels });

    // Only the parcel 2 differed from [TAG_FOOD].
    expect(saved.map((parcel) => parcel.installment?.number)).toEqual([2]);
    expect(parcels.every((parcel) => parcel.tagIds.join() === 'tag-food')).toBe(true);
  });

  it('gives a new parcel the category and the tags the parcels already have', () => {
    const other: Transaction.TagRef = { id: 'tag-other', categoryId: 'food', isArchived: false };
    const base = plan({ category: FOOD, total: Money.fromCents(30000), installmentCount: 3 });
    const parcels = base.buildParcels({ category: FOOD, tags: [TAG_FOOD, other] }, NOW);

    const { saved } = edit(base, { installmentCount: 4 }, { parcels, tags: [TAG_FOOD, other] });
    const created = saved.filter((parcel) => !parcels.includes(parcel));

    expect(created).toHaveLength(1);
    expect(created[0]).toMatchObject({ categoryId: 'food', categorySource: 'user' });
    expect([...(created[0]?.tagIds ?? [])].sort()).toEqual(['tag-food', 'tag-other']);
  });

  it('gives a new parcel no tag when the category changed with it, and the tags sent when sent', () => {
    const base = plan({ category: FOOD, total: Money.fromCents(30000), installmentCount: 3 });
    const parcels = base.buildParcels({ category: FOOD, tags: [TAG_FOOD] }, NOW);

    const moved = edit(base, { installmentCount: 4, category: MARKET }, { parcels });
    expect(moved.saved.filter((parcel) => !parcels.includes(parcel))[0]).toMatchObject({
      categoryId: 'market',
      tagIds: [],
    });

    const again = base.buildParcels({ category: FOOD, tags: [TAG_FOOD] }, NOW);
    const sent = edit(
      base,
      { installmentCount: 4, category: MARKET, tags: [TAG_MARKET] },
      { parcels: again },
    );
    expect(sent.saved.filter((parcel) => !again.includes(parcel))[0]?.tagIds).toEqual([
      'tag-market',
    ]);
  });
});

describe('InstallmentPlan.reconcileParcels: what protects the money', () => {
  const plan3 = (category: Transaction.CategoryRef | null = null) =>
    plan({ total: Money.fromCents(30000), installmentCount: 3, category });
  const SPLIT_PARTS = [
    { amount: Money.fromCents(4000), category: null, description: null },
    { amount: Money.fromCents(6000), category: null, description: null },
  ];

  // Every call reads fresh parcels: the reconciliation changes the ones it is given.
  const run = (
    change: InstallmentPlan.Change,
    options: {
      paid?: string[];
      linked?: (parcels: Transaction[]) => string[];
      prepare?: (parcels: Transaction[]) => void;
      category?: Transaction.CategoryRef | null;
    } = {},
  ) => {
    const base = plan3(options.category ?? null);
    const parcels = base.buildParcels({ category: options.category ?? null, tags: [] }, NOW);
    options.prepare?.(parcels);

    return edit(base, change, {
      parcels,
      paid: options.paid ?? [],
      linked: options.linked?.(parcels) ?? [],
    });
  };
  const toThrowCode = (code: string): unknown => expect.objectContaining({ code });

  it('refuses a change of value on an invoice with a payment, and lets the description go', () => {
    expect(() => run({ total: Money.fromCents(60000) }, { paid: ['2027-01'] })).toThrow(
      toThrowCode('INSTALLMENT_INVOICE_PAID'),
    );
    expect(() =>
      run({ description: 'Poltrona' }, { paid: ['2026-12', '2027-01', '2027-02'] }),
    ).not.toThrow();
  });

  it('refuses a parcel that leaves or enters a paid invoice', () => {
    // The count falls: parcel 3 (2027-02) is removed.
    expect(() => run({ installmentCount: 2 }, { paid: ['2027-02'] })).toThrow(
      toThrowCode('INSTALLMENT_INVOICE_PAID'),
    );
    // The count rises: the new parcel 4 lands on 2027-03.
    expect(() => run({ installmentCount: 4 }, { paid: ['2027-03'] })).toThrow(
      toThrowCode('INSTALLMENT_INVOICE_PAID'),
    );
    // The first month moves to 2027-02: the parcels go 2026-12 -> 2027-02, 2027-01 -> 2027-03 and
    // 2027-02 -> 2027-04, so a paid month that is left or entered refuses it.
    const move = { firstInvoiceMonth: Month.of('2027-02') };
    expect(() => run(move, { paid: ['2027-04'] })).toThrow(toThrowCode('INSTALLMENT_INVOICE_PAID'));
    expect(() => run(move, { paid: ['2026-12'] })).toThrow(toThrowCode('INSTALLMENT_INVOICE_PAID'));
    expect(() => run(move, { paid: ['2026-11'] })).not.toThrow();
  });

  it('does not count a parcel whose value does not change', () => {
    // 30000 -> 30001: the first parcel takes the cent and the others keep R$ 100,00.
    const cent = { total: Money.fromCents(30001) };

    expect(() => run(cent, { paid: ['2027-01', '2027-02'] })).not.toThrow();
    expect(() => run(cent, { paid: ['2026-12'] })).toThrow(toThrowCode('INSTALLMENT_INVOICE_PAID'));
  });

  it('lets a parcel that does not enter the accounts change on a paid invoice', () => {
    const result = run(
      { total: Money.fromCents(60000) },
      { paid: ['2027-01'], prepare: (parcels) => parcels[1]?.ignore(NOW) },
    );

    // The ignored parcel is still updated, and stays ignored.
    expect(result.parcels[1]?.amount.cents).toBe(-20000);
    expect(result.parcels[1]?.ignoredAt).not.toBeNull();
  });

  it('refuses to change the value of a split parcel, and to remove it', () => {
    const split = (index: number) => (parcels: Transaction[]) =>
      parcels[index]?.splitInto(SPLIT_PARTS, NOW);

    expect(() => run({ total: Money.fromCents(60000) }, { prepare: split(1) })).toThrow(
      toThrowCode('INSTALLMENT_PARCEL_SPLIT'),
    );
    // The count falls and the last parcel is the split one.
    expect(() => run({ installmentCount: 2 }, { prepare: split(2) })).toThrow(
      toThrowCode('INSTALLMENT_PARCEL_SPLIT'),
    );
    // What does not change the value goes: the description and the invoice.
    expect(() => run({ description: 'Poltrona' }, { prepare: split(1) })).not.toThrow();
    expect(() =>
      run({ firstInvoiceMonth: Month.of('2027-05') }, { prepare: split(1) }),
    ).not.toThrow();
    // A total that leaves the split parcel's value as it is does not refuse.
    expect(() => run({ total: Money.fromCents(30001) }, { prepare: split(1) })).not.toThrow();
  });

  it('refuses another category or other tags on a split parcel, and lets the category go off', () => {
    const prepare = (parcels: Transaction[]) =>
      parcels[0]?.splitInto(
        [
          { amount: Money.fromCents(4000), category: FOOD, description: null },
          { amount: Money.fromCents(6000), category: FOOD, description: null },
        ],
        NOW,
      );

    expect(() => run({ category: MARKET }, { category: FOOD, prepare })).toThrow(
      toThrowCode('INSTALLMENT_PARCEL_SPLIT'),
    );
    expect(() => run({ tags: [TAG_FOOD] }, { category: FOOD, prepare })).toThrow(
      toThrowCode('INSTALLMENT_PARCEL_SPLIT'),
    );
    expect(() => run({ category: null }, { category: FOOD, prepare })).not.toThrow();
  });

  it('refuses to change the value of a parcel tied to a bill or an occurrence, or to remove it', () => {
    const linked = (index: number) => (parcels: Transaction[]) => [parcels[index]?.id ?? ''];

    expect(() => run({ total: Money.fromCents(60000) }, { linked: linked(1) })).toThrow(
      toThrowCode('INSTALLMENT_PARCEL_LINKED'),
    );
    // The count falls and the last parcel is the linked one.
    expect(() => run({ installmentCount: 2 }, { linked: linked(2) })).toThrow(
      toThrowCode('INSTALLMENT_PARCEL_LINKED'),
    );
    // The other edits go through, and so does a cent that stays in the first parcel.
    expect(() => run({ description: 'Poltrona' }, { linked: linked(1) })).not.toThrow();
    expect(() =>
      run({ firstInvoiceMonth: Month.of('2027-05') }, { linked: linked(1) }),
    ).not.toThrow();
    expect(() => run({ total: Money.fromCents(30001) }, { linked: linked(1) })).not.toThrow();
  });
});

describe('InstallmentPlan.reconcileParcels: the parcel the bank sent', () => {
  const plan3 = () => plan({ total: Money.fromCents(30000), installmentCount: 3 });
  // The parcel `index + 1` replaced by one of the bank, charged R$ 100,00 on its invoice.
  const withBankParcel = (base: InstallmentPlan, index: number) => {
    const parcels = base.buildParcels({ category: null, tags: [] }, NOW);
    const original = parcels[index];
    if (!original?.installment || !original.invoiceMonth) throw new Error('No parcel');
    parcels[index] = TransactionEntity.createFromBank(
      {
        account: CARD,
        method: 'credit',
        bank: {
          description: 'DELL 02/03',
          amount: Money.fromCents(-10000),
          occurredOn: original.occurredOn,
          counterparty: null,
          status: 'posted',
        },
        invoiceMonth: original.invoiceMonth,
        installment: original.installment,
      },
      NOW,
    );

    return parcels;
  };
  const toThrowFromBank = (number: number): unknown =>
    expect.objectContaining({ code: 'INSTALLMENT_PARCEL_FROM_BANK', details: { number } });

  it('refuses a total that changes its share, a count that changes it or removes it, and a first invoice that moves it', () => {
    const base = plan3();

    expect(() =>
      edit(base, { total: Money.fromCents(60000) }, { parcels: withBankParcel(base, 1) }),
    ).toThrow(toThrowFromBank(2));
    expect(() => edit(base, { installmentCount: 2 }, { parcels: withBankParcel(base, 1) })).toThrow(
      toThrowFromBank(2),
    );
    // 2 x R$ 100,00: the share of the parcel 2 stays, but the parcel 3 is the one of the bank.
    expect(() =>
      edit(
        base,
        { installmentCount: 2, total: Money.fromCents(20000) },
        { parcels: withBankParcel(base, 2) },
      ),
    ).toThrow(toThrowFromBank(3));
    expect(() =>
      edit(base, { firstInvoiceMonth: Month.of('2027-05') }, { parcels: withBankParcel(base, 1) }),
    ).toThrow(toThrowFromBank(2));
  });

  it('lets the description, the category and the tags go to it, and keeps its value, date and invoice', () => {
    const base = plan3();
    const parcels = withBankParcel(base, 1);
    const bank = parcels[1];
    const before = [bank?.amount.cents, bank?.occurredOn.value, bank?.invoiceMonth?.value];

    edit(base, { description: 'Poltrona', category: FOOD, tags: [TAG_FOOD] }, { parcels });

    expect([bank?.amount.cents, bank?.occurredOn.value, bank?.invoiceMonth?.value]).toEqual(before);
    expect(bank).toMatchObject({ description: 'Poltrona', categoryId: 'food', origin: 'bank' });
    expect(bank?.tagIds).toEqual(['tag-food']);
  });

  it('leaves it as it is when the same total and count are sent again, and realigns the others', () => {
    const base = plan3();
    const parcels = withBankParcel(base, 1);
    parcels[0]?.edit({ amount: Money.fromCents(5000) }, NOW);

    const { saved } = edit(
      base,
      { total: Money.fromCents(30000), installmentCount: 3 },
      { parcels },
    );

    expect(cents(parcels)).toEqual([10000, 10000, 10000]);
    expect(saved.map((parcel) => parcel.installment?.number)).toEqual([1]);
  });
});

describe('InstallmentPlan.reconcileParcels: the total sent again repairs a parcel edited by hand', () => {
  const plan3 = () => plan({ total: Money.fromCents(30000), installmentCount: 3 });

  it('rewrites only the parcels that diverge from the allocation', () => {
    const base = plan3();
    const parcels = base.buildParcels({ category: null, tags: [] }, NOW);
    parcels[0]?.edit({ amount: Money.fromCents(5000) }, NOW);
    parcels[2]?.edit({ amount: Money.fromCents(12000) }, NOW);

    const { saved } = edit(base, { total: Money.fromCents(30000) }, { parcels });

    expect(saved.map((parcel) => parcel.installment?.number)).toEqual([1, 3]);
    expect(cents(parcels)).toEqual([10000, 10000, 10000]);
    expect(sum(cents(parcels))).toBe(30000);
  });

  it('does the same with the count sent equal', () => {
    const base = plan3();
    const parcels = base.buildParcels({ category: null, tags: [] }, NOW);
    parcels[1]?.edit({ amount: Money.fromCents(1) }, NOW);

    edit(base, { installmentCount: 3 }, { parcels });

    expect(cents(parcels)).toEqual([10000, 10000, 10000]);
  });

  it('does not touch the value when only the description, the category or the first invoice come', () => {
    const base = plan3();
    const parcels = base.buildParcels({ category: null, tags: [] }, NOW);
    parcels[0]?.edit({ amount: Money.fromCents(5000) }, NOW);

    edit(
      base,
      { description: 'Poltrona', firstInvoiceMonth: Month.of('2027-02'), category: FOOD },
      { parcels },
    );

    expect(cents(parcels)).toEqual([5000, 10000, 10000]);
  });

  it('respects the protections: a paid invoice, a split and a link refuse the repair', () => {
    const base = plan3();
    const edited = () => {
      const parcels = base.buildParcels({ category: null, tags: [] }, NOW);
      parcels[1]?.edit({ amount: Money.fromCents(5000) }, NOW);

      return parcels;
    };
    const sent = { total: Money.fromCents(30000) };

    expect(() => edit(base, sent, { parcels: edited(), paid: ['2027-01'] })).toThrow(
      expect.objectContaining({ code: 'INSTALLMENT_INVOICE_PAID' }),
    );
    const linked = edited();
    expect(() => edit(base, sent, { parcels: linked, linked: [linked[1]?.id ?? ''] })).toThrow(
      expect.objectContaining({ code: 'INSTALLMENT_PARCEL_LINKED' }),
    );
    const split = edited();
    split[1]?.splitInto(
      [
        { amount: Money.fromCents(2000), category: null, description: null },
        { amount: Money.fromCents(3000), category: null, description: null },
      ],
      NOW,
    );
    expect(() => edit(base, sent, { parcels: split })).toThrow(
      expect.objectContaining({ code: 'INSTALLMENT_PARCEL_SPLIT' }),
    );
  });
});

describe('InstallmentPlan.assertCardActive', () => {
  it('refuses the plan of an archived card, as the creation does', () => {
    expect(() => plan().assertCardActive(CARD)).not.toThrow();
    expect(() => plan().assertCardActive({ ...CARD, isArchived: true })).toThrow(
      expect.objectContaining({ code: 'TRANSACTION_ACCOUNT_ARCHIVED' }),
    );
  });
});
