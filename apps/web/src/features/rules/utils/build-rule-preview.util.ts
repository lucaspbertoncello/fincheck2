import type { Rule } from '@fincheck/shared/categories/rule/rule.type.ts';
import type { RulePreviewData } from '@fincheck/ui';

import { formatShortDate } from '#/shared/utils/date/format-short-date.util.ts';

type PreviewSource = Pick<Rule.Preview, 'matchCount' | 'willChangeCount' | 'examples'>;

/**
 * The "Bate com 14 transações do histórico" box. The examples come from the transactions the rule
 * would change, so "e mais N" counts those, not the ones the person set by hand.
 */
export function buildRulePreview(source: PreviewSource): RulePreviewData {
  const noun = source.matchCount === 1 ? 'transação' : 'transações';

  return {
    title: `Bate com ${source.matchCount} ${noun} do histórico`,
    matches: source.examples.map((example) => ({
      id: example.transactionId,
      description: example.description,
      dateLabel: formatShortDate(example.occurredOn),
      cents: Math.abs(example.amountCents),
      tone: example.amountCents < 0 ? ('expense' as const) : ('income' as const),
    })),
    moreCount: Math.max(0, source.willChangeCount - source.examples.length),
  };
}
