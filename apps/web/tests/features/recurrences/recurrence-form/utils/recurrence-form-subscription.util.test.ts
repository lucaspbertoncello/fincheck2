import { describe, expect, it } from 'vitest';

import { EMPTY_FORM_VALUES } from '#/features/recurrences/recurrence-form/constants/empty-form-values.constant.ts';
import { buildCreateBody } from '#/features/recurrences/recurrence-form/utils/build-create-body.util.ts';
import { buildFormValues } from '#/features/recurrences/recurrence-form/utils/build-form-values.util.ts';
import { buildUpdateBody } from '#/features/recurrences/recurrence-form/utils/build-update-body.util.ts';
import { recognizeSubscriptionFields } from '#/features/recurrences/recurrence-form/utils/recognize-subscription-fields.util.ts';
import { createTestRecurrence } from '#tests/support/recurrences/recurrence/create-test-recurrence.util.ts';

const filled = { ...EMPTY_FORM_VALUES, name: 'Netflix', amountCents: 5_590, day: '21' };
const UNTOUCHED = { isSubscription: false, serviceSlug: false };
const TOUCHED = { isSubscription: true, serviceSlug: true };

describe('subscription in the create body', () => {
  it('sends the service slug of a subscription', () => {
    const result = buildCreateBody({ ...filled, isSubscription: true, serviceSlug: 'netflix' });

    expect(result.status === 'ok' && result.body).toMatchObject({
      isSubscription: true,
      serviceSlug: 'netflix',
    });
  });

  it('sends null for "Outro"', () => {
    const result = buildCreateBody({ ...filled, isSubscription: true, serviceSlug: 'other' });

    expect(result.status === 'ok' && result.body).toMatchObject({
      isSubscription: true,
      serviceSlug: null,
    });
  });

  it('sends no service when the switch is off', () => {
    const result = buildCreateBody({ ...filled, serviceSlug: 'netflix' });

    expect(result.status === 'ok' && result.body.isSubscription).toBe(false);
    expect(result.status === 'ok' && result.body.serviceSlug).toBeUndefined();
  });

  it('never makes an income a subscription', () => {
    const result = buildCreateBody({
      ...filled,
      kind: 'income',
      isSubscription: true,
      serviceSlug: 'netflix',
    });

    expect(result.status === 'ok' && result.body.isSubscription).toBe(false);
    expect(result.status === 'ok' && result.body.serviceSlug).toBeUndefined();
  });
});

describe('subscription in the form values and the update body', () => {
  it('loads the flag and the service, and "Outro" for a null service', () => {
    const netflix = createTestRecurrence({ isSubscription: true, serviceSlug: 'netflix' });
    const other = createTestRecurrence({ isSubscription: true, serviceSlug: null });

    expect(buildFormValues(netflix)).toMatchObject({
      isSubscription: true,
      serviceSlug: 'netflix',
    });
    expect(buildFormValues(other)).toMatchObject({ isSubscription: true, serviceSlug: 'other' });
    expect(buildFormValues(createTestRecurrence())).toMatchObject({ isSubscription: false });
  });

  it('says "unchanged" for a saved subscription left alone', () => {
    const saved = createTestRecurrence({ isSubscription: true, serviceSlug: 'spotify' });

    expect(buildUpdateBody(buildFormValues(saved), saved)).toEqual({ status: 'unchanged' });
  });

  it('sends the flag and the service when it is turned on', () => {
    const saved = createTestRecurrence();
    const result = buildUpdateBody(
      { ...buildFormValues(saved), isSubscription: true, serviceSlug: 'claude' },
      saved,
    );

    expect(result.status === 'ok' && result.body).toMatchObject({
      isSubscription: true,
      serviceSlug: 'claude',
    });
  });

  it('sends only the service when it changes under a flag that stayed on', () => {
    const saved = createTestRecurrence({ isSubscription: true, serviceSlug: 'spotify' });
    const result = buildUpdateBody({ ...buildFormValues(saved), serviceSlug: 'other' }, saved);

    expect(result).toEqual({
      status: 'ok',
      body: { serviceSlug: null, applyFrom: 'next_month' },
    });
  });

  it('turning the flag off sends false and clears the service', () => {
    const saved = createTestRecurrence({ isSubscription: true, serviceSlug: 'spotify' });
    const result = buildUpdateBody({ ...buildFormValues(saved), isSubscription: false }, saved);

    expect(result).toEqual({
      status: 'ok',
      body: { isSubscription: false, serviceSlug: null, applyFrom: 'next_month' },
    });
  });
});

describe('recognizeSubscriptionFields', () => {
  it('turns the switch on and fills the service when the name is a known one', () => {
    expect(recognizeSubscriptionFields(filled, UNTOUCHED)).toEqual({
      isSubscription: true,
      serviceSlug: 'netflix',
    });
  });

  it('reads the text of the extract too', () => {
    const values = { ...filled, name: 'Música', matchText: 'SPOTIFY AB' };

    expect(recognizeSubscriptionFields(values, UNTOUCHED)).toEqual({
      isSubscription: true,
      serviceSlug: 'spotify',
    });
  });

  it('goes back to off and "Outro" when the name stops matching', () => {
    const values = {
      ...filled,
      name: 'Netfli',
      isSubscription: true,
      serviceSlug: 'netflix' as const,
    };

    expect(recognizeSubscriptionFields(values, UNTOUCHED)).toEqual({
      isSubscription: false,
      serviceSlug: 'other',
    });
  });

  it('changes nothing when the name matches nothing and nothing was set', () => {
    expect(recognizeSubscriptionFields({ ...filled, name: 'Academia' }, UNTOUCHED)).toBeNull();
  });

  it('respects a switch and a service touched by hand', () => {
    const values = { ...filled, isSubscription: false, serviceSlug: 'other' as const };

    expect(recognizeSubscriptionFields(values, TOUCHED)).toBeNull();
  });

  it('still fills the service when only the switch was touched', () => {
    const values = { ...filled, isSubscription: true };

    expect(
      recognizeSubscriptionFields(values, { isSubscription: true, serviceSlug: false }),
    ).toEqual({ isSubscription: true, serviceSlug: 'netflix' });
  });

  it('does nothing for an income', () => {
    expect(recognizeSubscriptionFields({ ...filled, kind: 'income' }, UNTOUCHED)).toBeNull();
  });
});
