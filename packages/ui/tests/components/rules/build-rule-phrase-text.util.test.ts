import { describe, expect, it } from 'vitest';

import { buildRulePhraseText } from '#/components/rules/build-rule-phrase-text.util.ts';

describe('buildRulePhraseText', () => {
  it('writes the sentence as plain text', () => {
    expect(buildRulePhraseText(['Vai para ', { strong: 'Delivery' }, '.'])).toBe(
      'Vai para Delivery.',
    );
  });

  it('gives no text when an amount is in it', () => {
    expect(buildRulePhraseText(['A partir de ', { moneyCents: 5000 }])).toBeUndefined();
  });
});
