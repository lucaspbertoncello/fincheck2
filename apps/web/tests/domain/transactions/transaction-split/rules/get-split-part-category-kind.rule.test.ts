import { describe, expect, it } from 'vitest';

import { getSplitPartCategoryKind } from '#/domain/transactions/transaction-split/rules/get-split-part-category-kind.rule.ts';

describe('getSplitPartCategoryKind', () => {
  it('is the kind of the nature, so a refund on a card (an expense) has parts of expense', () => {
    expect(getSplitPartCategoryKind('expense')).toBe('expense');
    expect(getSplitPartCategoryKind('income')).toBe('income');
  });

  it('is null for a nature that takes no category', () => {
    expect(getSplitPartCategoryKind('transfer')).toBeNull();
    expect(getSplitPartCategoryKind('invoice_payment')).toBeNull();
  });
});
