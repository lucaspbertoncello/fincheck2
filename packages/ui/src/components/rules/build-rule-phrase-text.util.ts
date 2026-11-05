import type { RulePhraseSegment } from '#/components/rules/rule-phrase.type.ts';

/**
 * The sentence as plain text for a `title`, or `undefined` when it has an amount in it (the title
 * would leak what the eye hides).
 */
export function buildRulePhraseText(phrase: readonly RulePhraseSegment[]): string | undefined {
  if (phrase.some((segment) => typeof segment === 'object' && 'moneyCents' in segment)) {
    return undefined;
  }

  return phrase
    .map((segment) =>
      typeof segment === 'string' ? segment : 'strong' in segment ? segment.strong : '',
    )
    .join('');
}
