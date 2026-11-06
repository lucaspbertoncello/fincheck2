import { describe, expect, it } from 'vitest';

import { accountsSearchSchema } from '#/shared/schemas/accounts/accounts-search.schema.ts';

describe('accountsSearchSchema', () => {
  it('reads the state of the screen from the URL params', () => {
    expect(
      accountsSearchSchema.parse({
        new: 'account',
        future: 'card-1',
        correct: 'card-1:2026-10',
        edit: 'card-2',
      }),
    ).toMatchObject({
      new: 'account',
      future: 'card-1',
      correct: 'card-1:2026-10',
      edit: 'card-2',
    });
  });

  it('reads a value it does not know as absent instead of failing', () => {
    expect(accountsSearchSchema.parse({ new: 'wallet', adjust: 42 })).toEqual({});
  });
});
