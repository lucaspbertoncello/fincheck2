import { describe, expect, it } from 'vitest';

import { normalizeDescription } from '#/shared/text/normalize-description.util.ts';

describe('normalizeDescription', () => {
  it('uppercases, drops accents and collapses spaces', () => {
    expect(normalizeDescription('  padaria   São João ')).toBe('PADARIA SAO JOAO');
  });

  it('gives the same key to every month of an installment', () => {
    expect(normalizeDescription('Amazon  Marketplace 03/10')).toBe('AMAZON MARKETPLACE');
    expect(normalizeDescription('AMAZON MARKETPLACE 04/10')).toBe('AMAZON MARKETPLACE');
  });
});
