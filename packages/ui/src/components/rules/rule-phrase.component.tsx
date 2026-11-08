import { Fragment } from 'react';

import { Money } from '#/components/money/index.ts';
import type { RulePhraseSegment } from '#/components/rules/rule-phrase.type.ts';

/** The sentence of a rule: text with the tokens in weight 500 and amounts through Money. */
export function RulePhrase({ segments }: { segments: readonly RulePhraseSegment[] }) {
  return (
    <>
      {segments.map((segment, index) => (
        <Fragment key={index}>
          {typeof segment === 'string' ? (
            segment
          ) : 'strong' in segment ? (
            <strong className="font-emphasis">{segment.strong}</strong>
          ) : (
            <Money
              cents={segment.moneyCents}
              sign="none"
              weight="emphasis"
              currency="inline"
              tone={segment.tone}
            />
          )}
        </Fragment>
      ))}
    </>
  );
}
