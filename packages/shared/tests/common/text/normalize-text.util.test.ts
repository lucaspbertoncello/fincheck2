import { describe, expect, it } from 'vitest';

import { normalizeText } from '#/common/text/normalize-text.util.ts';

describe('normalizeText', () => {
  it('upper-cases and removes accents', () => {
    expect(normalizeText('Pão de Açúcar')).toBe('PAO DE ACUCAR');
  });

  it('collapses spaces and trims', () => {
    expect(normalizeText('  uber   *trip  ')).toBe('UBER *TRIP');
  });

  it('is idempotent', () => {
    const once = normalizeText('Padaria São João');
    expect(normalizeText(once)).toBe(once);
  });
});
