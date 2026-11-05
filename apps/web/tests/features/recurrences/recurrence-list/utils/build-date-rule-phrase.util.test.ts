import { describe, expect, it } from 'vitest';

import { buildDateRulePhrase } from '#/features/recurrences/recurrence-list/utils/build-date-rule-phrase.util.ts';

describe('buildDateRulePhrase', () => {
  it('writes each rule once, with the places of its numbers', () => {
    expect(buildDateRulePhrase('fixed_day')).toEqual([
      { kind: 'text', text: 'Todo dia' },
      { kind: 'field', field: 'day' },
    ]);
    expect(buildDateRulePhrase('business_day').map((part) => part.kind)).toEqual([
      'text',
      'field',
      'text',
    ]);
    expect(buildDateRulePhrase('any_day')[0]).toEqual({
      kind: 'text',
      text: 'Em qualquer dia do mês, geralmente no dia',
    });
  });

  it('uses the singular for one day of margin', () => {
    const last = (tolerance: number) => buildDateRulePhrase('around_day', tolerance).at(-1);

    expect(last(1)).toEqual({ kind: 'text', text: 'dia antes ou depois' });
    expect(last(3)).toEqual({ kind: 'text', text: 'dias antes ou depois' });
  });

  it('adds the weekend and holiday shift only to "Todo dia"', () => {
    expect(buildDateRulePhrase('fixed_day', null, 'after').at(-1)).toEqual({
      kind: 'text',
      text: ', ou o dia útil seguinte',
    });
    expect(buildDateRulePhrase('fixed_day', null, 'before').at(-1)).toEqual({
      kind: 'text',
      text: ', ou o dia útil anterior',
    });
    expect(buildDateRulePhrase('fixed_day', null, 'none')).toEqual(
      buildDateRulePhrase('fixed_day'),
    );
    expect(buildDateRulePhrase('business_day', null, 'after')).toEqual(
      buildDateRulePhrase('business_day'),
    );
  });
});
