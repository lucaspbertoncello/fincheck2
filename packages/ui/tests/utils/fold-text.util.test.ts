import { describe, expect, it } from 'vitest';

import { foldText } from '#/utils/fold-text.util.ts';

describe('foldText', () => {
  it('drops case and accents and squeezes the spaces', () => {
    expect(foldText('  Promoção   de  VERÃO ')).toBe('promocao de verao');
  });

  it('turns blank text into an empty string', () => {
    expect(foldText('   ')).toBe('');
  });
});
