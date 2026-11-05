import { describe, expect, it } from 'vitest';

import { EMPTY_FORM_VALUES } from '#/features/recurrences/recurrence-list/recurrence-form/constants/empty-form-values.constant.ts';
import { buildCreateBody } from '#/features/recurrences/recurrence-list/recurrence-form/utils/build-create-body.util.ts';
import { buildFormValues } from '#/features/recurrences/recurrence-list/recurrence-form/utils/build-form-values.util.ts';
import { buildUpdateBody } from '#/features/recurrences/recurrence-list/recurrence-form/utils/build-update-body.util.ts';
import { resolveRecurrenceMethod } from '#/features/recurrences/recurrence-list/recurrence-form/utils/resolve-recurrence-method.util.ts';
import { createTestRecurrence } from '#tests/support/recurrences/recurrence/create-test-recurrence.util.ts';

const ACCOUNTS = [
  { id: '0194f3a0-0000-7000-8000-0000000000c1', type: 'credit_card' as const },
  { id: '0194f3a0-0000-7000-8000-0000000000b1', type: 'checking' as const },
];

describe('resolveRecurrenceMethod', () => {
  it('makes a recurrence on a credit card a credit one', () => {
    expect(resolveRecurrenceMethod('0194f3a0-0000-7000-8000-0000000000c1', ACCOUNTS)).toBe(
      'credit',
    );
  });

  it('leaves the method alone on any other account or none', () => {
    expect(
      resolveRecurrenceMethod('0194f3a0-0000-7000-8000-0000000000b1', ACCOUNTS),
    ).toBeUndefined();
    expect(resolveRecurrenceMethod(null, ACCOUNTS)).toBeUndefined();
  });
});

describe('the method in the bodies', () => {
  it('sends credit when a new recurrence falls on the card', () => {
    const result = buildCreateBody(
      {
        ...EMPTY_FORM_VALUES,
        name: 'Streaming',
        amountCents: 3_990,
        accountId: '0194f3a0-0000-7000-8000-0000000000c1',
      },
      'credit',
    );

    expect(result.status === 'ok' && result.body.method).toBe('credit');
  });

  it('sends no method when it does not', () => {
    const result = buildCreateBody({ ...EMPTY_FORM_VALUES, name: 'Aluguel', amountCents: 9_000 });

    expect(result.status === 'ok' && 'method' in result.body && result.body.method).toBeFalsy();
  });

  it('moves the method with the account when editing', () => {
    const onBank = createTestRecurrence({
      accountId: '0194f3a0-0000-7000-8000-0000000000b1',
      method: 'pix',
    });
    const toCard = buildUpdateBody(
      { ...buildFormValues(onBank), accountId: '0194f3a0-0000-7000-8000-0000000000c1' },
      onBank,
      'credit',
    );
    expect(toCard.status === 'ok' && toCard.body).toMatchObject({
      accountId: '0194f3a0-0000-7000-8000-0000000000c1',
      method: 'credit',
    });

    const onCard = createTestRecurrence({
      accountId: '0194f3a0-0000-7000-8000-0000000000c1',
      method: 'credit',
    });
    const toBank = buildUpdateBody(
      { ...buildFormValues(onCard), accountId: '0194f3a0-0000-7000-8000-0000000000b1' },
      onCard,
    );
    expect(toBank.status === 'ok' && toBank.body).toMatchObject({
      accountId: '0194f3a0-0000-7000-8000-0000000000b1',
      method: null,
    });
  });
});
