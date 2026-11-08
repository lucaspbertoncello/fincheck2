import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { collectFieldErrors } from '#/shared/utils/forms/collect-field-errors.util.ts';

const schema = z.object({ name: z.string().min(1), amountCents: z.number().positive() });

function failure(input: unknown) {
  const parsed = schema.safeParse(input);
  if (parsed.success) throw new Error('expected a failure');
  return parsed.error;
}

describe('collectFieldErrors', () => {
  it('keeps one message per schema key, with the fallback for the unlisted', () => {
    const error = failure({ name: '', amountCents: -1 });

    expect(collectFieldErrors(error, { name: 'Escreva o nome.' })).toEqual({
      name: 'Escreva o nome.',
      amountCents: 'Confira este campo',
    });
  });

  it('uses the given fallback', () => {
    const error = failure({ name: 'a', amountCents: 0 });

    expect(collectFieldErrors(error, {}, { fallback: 'Revise' })).toEqual({
      amountCents: 'Revise',
    });
  });

  it('maps schema keys to form fields', () => {
    const error = failure({ name: 'a', amountCents: 0 });

    expect(
      collectFieldErrors(
        error,
        { total: 'Valor maior que zero.' },
        { fieldOf: { amountCents: 'total', name: 'name' } },
      ),
    ).toEqual({ total: 'Valor maior que zero.' });
  });

  it('drops issues whose key has no field', () => {
    const error = failure({ name: '', amountCents: 1 });

    expect(collectFieldErrors(error, {}, { fieldOf: { amountCents: 'total' } })).toEqual({});
  });
});
