import { describe, expect, it } from 'vitest';

import { DateRule } from '#/modules/recurrences/domain/recurrence/date-rule.value-object.ts';
import { Recurrence } from '#/modules/recurrences/domain/recurrence/recurrence.entity.ts';
import { RecurrenceAlreadyPausedError } from '#/modules/recurrences/domain/recurrence/recurrence-already-paused.error.ts';
import { RecurrenceArchivedError } from '#/modules/recurrences/domain/recurrence/recurrence-archived.error.ts';
import { RecurrenceCategoryKindMismatchError } from '#/modules/recurrences/domain/recurrence/recurrence-category-kind-mismatch.error.ts';
import { RecurrenceNotPausedError } from '#/modules/recurrences/domain/recurrence/recurrence-not-paused.error.ts';
import { RecurrenceRegimeOnlyForIncomeError } from '#/modules/recurrences/domain/recurrence/recurrence-regime-only-for-income.error.ts';
import { Month } from '#/shared/date/month.value-object.ts';
import { RequestValidationError } from '#/shared/errors/request-validation.error.ts';
import { Money } from '#/shared/money/money.value-object.ts';

const NOW = '2026-10-22T15:00:00.000Z';
const LATER = '2026-10-23T15:00:00.000Z';

function build(overrides: Partial<Recurrence.CreateInput> = {}): Recurrence {
  return Recurrence.create(
    {
      kind: 'expense',
      name: 'Academia',
      expectedAmount: Money.fromCents(10990),
      dateRule: DateRule.create({ type: 'fixed_day', day: 10 }),
      startsMonth: Month.of('2026-10'),
      ...overrides,
    },
    NOW,
  );
}

describe('Recurrence.create', () => {
  it('takes null as "as many as come" and only a missing value as one payment', () => {
    expect(build({ maxPayments: null }).maxPayments).toBeNull();
    expect(build({ maxPayments: 4 }).maxPayments).toBe(4);
    expect(build({ maxPayments: undefined }).maxPayments).toBe(1);
  });

  it('starts active with the defaults: fixed amount, one payment, nothing set', () => {
    const recurrence = build();

    expect(recurrence).toMatchObject({
      kind: 'expense',
      amountMode: 'fixed',
      maxPayments: 1,
      isSubscription: false,
      serviceSlug: null,
      matchText: null,
      employmentRegime: null,
      pausedAt: null,
      archivedAt: null,
      createdAt: NOW,
      updatedAt: NOW,
    });
    expect(recurrence.isActive()).toBe(true);
  });

  it('writes the match text normalized: capitals, no accent, single spaces', () => {
    expect(build({ matchText: '  Pix de  G.  Prado ' }).matchText).toBe('PIX DE G. PRADO');
    expect(build({ matchText: 'Salário' }).matchText).toBe('SALARIO');
  });

  it('reads an empty match text as none', () => {
    expect(build({ matchText: '   ' }).matchText).toBeNull();
  });

  it('refuses an amount that is not positive', () => {
    expect(() => build({ expectedAmount: Money.zero() })).toThrow(RangeError);
  });

  it('keeps the employment regime only on an income (BR-PRF-002)', () => {
    expect(build({ kind: 'income', employmentRegime: 'pj' }).employmentRegime).toBe('pj');
    expect(() => build({ kind: 'expense', employmentRegime: 'clt' })).toThrow(
      RecurrenceRegimeOnlyForIncomeError,
    );
  });

  it('marks a subscription only on an expense, with or without a service', () => {
    expect(build({ isSubscription: true, serviceSlug: 'netflix' })).toMatchObject({
      isSubscription: true,
      serviceSlug: 'netflix',
    });
    expect(build({ isSubscription: true }).serviceSlug).toBeNull();
    expect(() => build({ kind: 'income', isSubscription: true })).toThrow(RequestValidationError);
  });

  it('refuses a service without the subscription mark', () => {
    expect(() => build({ serviceSlug: 'netflix' })).toThrow(RequestValidationError);
  });
});

describe('Recurrence.edit', () => {
  it('changes the fields sent and leaves the others', () => {
    const recurrence = build({ counterparty: 'Smart Fit' });

    recurrence.edit({ name: 'Academia Smart', maxPayments: 2 }, LATER);

    expect(recurrence).toMatchObject({
      name: 'Academia Smart',
      maxPayments: 2,
      counterparty: 'Smart Fit',
      updatedAt: LATER,
    });
  });

  it('turns "as many as come" on with null and back to a number, and leaves it when not sent', () => {
    const recurrence = build({ maxPayments: 2 });

    recurrence.edit({ maxPayments: null }, LATER);
    expect(recurrence.maxPayments).toBeNull();

    recurrence.edit({ name: 'Outro nome' }, LATER);
    expect(recurrence.maxPayments).toBeNull();

    recurrence.edit({ maxPayments: 3 }, LATER);
    expect(recurrence.maxPayments).toBe(3);
  });

  it('clears a field that may be empty when it is null', () => {
    const recurrence = build({ counterparty: 'Smart Fit', matchText: 'smart', categoryId: 'c1' });

    recurrence.edit({ counterparty: null, matchText: null, categoryId: null }, LATER);

    expect(recurrence).toMatchObject({ counterparty: null, matchText: null, categoryId: null });
  });

  it('says which of the fields the occurrences copy really moved', () => {
    const recurrence = build();

    expect(
      recurrence.edit(
        {
          expectedAmount: Money.fromCents(10990),
          dateRule: DateRule.create({ type: 'fixed_day', day: 10 }),
          startsMonth: Month.of('2026-10'),
        },
        LATER,
      ),
    ).toEqual({ amount: false, dateRule: false, startsMonth: false, startsLater: false });

    expect(
      recurrence.edit(
        {
          expectedAmount: Money.fromCents(11990),
          dateRule: DateRule.create({ type: 'fixed_day', day: 12 }),
          startsMonth: Month.of('2026-12'),
        },
        LATER,
      ),
    ).toEqual({ amount: true, dateRule: true, startsMonth: true, startsLater: true });
  });

  it('tells moving the first month earlier from moving it later', () => {
    const recurrence = build();

    expect(recurrence.edit({ startsMonth: Month.of('2026-08') }, LATER)).toMatchObject({
      startsMonth: true,
      startsLater: false,
    });
  });

  it('refuses a regime on an expense, but accepts clearing it', () => {
    const recurrence = build();

    expect(() => recurrence.edit({ employmentRegime: 'clt' }, LATER)).toThrow(
      RecurrenceRegimeOnlyForIncomeError,
    );
    expect(() => recurrence.edit({ employmentRegime: null }, LATER)).not.toThrow();
  });

  it('turning the subscription mark off drops the service', () => {
    const recurrence = build({ isSubscription: true, serviceSlug: 'spotify' });

    recurrence.edit({ isSubscription: false }, LATER);

    expect(recurrence).toMatchObject({ isSubscription: false, serviceSlug: null });
  });

  it('refuses the mark off with a service in the same edit, and a service with no mark', () => {
    const marked = build({ isSubscription: true, serviceSlug: 'spotify' });
    const plain = build();

    expect(() => marked.edit({ isSubscription: false, serviceSlug: 'spotify' }, LATER)).toThrow(
      RequestValidationError,
    );
    expect(() => plain.edit({ serviceSlug: 'spotify' }, LATER)).toThrow(RequestValidationError);
  });

  it('turning the mark on an income is refused', () => {
    expect(() => build({ kind: 'income' }).edit({ isSubscription: true }, LATER)).toThrow(
      RequestValidationError,
    );
  });

  it('takes no change once archived', () => {
    const recurrence = build();
    recurrence.archive(NOW);

    expect(() => recurrence.edit({ name: 'Outro' }, LATER)).toThrow(RecurrenceArchivedError);
  });
});

describe('Recurrence pause, resume and archive', () => {
  it('pauses and resumes, and a paused one generates nothing', () => {
    const recurrence = build();

    recurrence.pause(LATER);
    expect(recurrence.pausedAt).toBe(LATER);
    expect(recurrence.isActive()).toBe(false);

    recurrence.resume(LATER);
    expect(recurrence.pausedAt).toBeNull();
    expect(recurrence.isActive()).toBe(true);
  });

  it('refuses to pause twice and to resume what is not paused', () => {
    const recurrence = build();

    expect(() => recurrence.resume(LATER)).toThrow(RecurrenceNotPausedError);
    recurrence.pause(LATER);
    expect(() => recurrence.pause(LATER)).toThrow(RecurrenceAlreadyPausedError);
  });

  it('refuses to pause or resume an archived one', () => {
    const recurrence = build();
    recurrence.archive(NOW);

    expect(() => recurrence.pause(LATER)).toThrow(RecurrenceArchivedError);
    expect(() => recurrence.resume(LATER)).toThrow(RecurrenceArchivedError);
  });

  it('archives once and answers whether it changed', () => {
    const recurrence = build();

    expect(recurrence.archive(NOW)).toBe(true);
    expect(recurrence.archive(LATER)).toBe(false);
    expect(recurrence.archivedAt).toBe(NOW);
    expect(recurrence.isActive()).toBe(false);
  });
});

describe('Recurrence category and amount', () => {
  it('accepts a category of the same kind and refuses the other kind', () => {
    const expense = build();

    expect(() => expense.assertCategoryFits({ kind: 'expense' })).not.toThrow();
    expect(() => expense.assertCategoryFits({ kind: 'income' })).toThrow(
      RecurrenceCategoryKindMismatchError,
    );
  });

  it('adopts a new amount and refuses one that is not positive', () => {
    const recurrence = build();

    recurrence.adoptAmount(Money.fromCents(11990), LATER);
    expect(recurrence.expectedAmount.cents).toBe(11990);
    expect(() => recurrence.adoptAmount(Money.zero(), LATER)).toThrow(RangeError);
  });
});
