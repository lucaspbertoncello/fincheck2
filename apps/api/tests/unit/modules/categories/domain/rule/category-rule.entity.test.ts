import { describe, expect, it } from 'vitest';

import { CategoryRule } from '#/modules/categories/domain/rule/category-rule.entity.ts';
import { RuleActionRequiredError } from '#/modules/categories/domain/rule/rule-action-required.error.ts';
import { RuleCategoryArchivedError } from '#/modules/categories/domain/rule/rule-category-archived.error.ts';
import { RuleCategoryKindMismatchError } from '#/modules/categories/domain/rule/rule-category-kind-mismatch.error.ts';
import { RuleDisabledError } from '#/modules/categories/domain/rule/rule-disabled.error.ts';
import { RuleTagArchivedError } from '#/modules/categories/domain/rule/rule-tag-archived.error.ts';
import { RequestValidationError } from '#/shared/errors/request-validation.error.ts';

const NOW = '2026-11-06T12:00:00.000Z';
const LATER = '2026-11-07T09:00:00.000Z';
const DELIVERY = { id: 'delivery', kind: 'expense', isArchived: false } as const;
const SALARY = { id: 'salary', kind: 'income', isArchived: false } as const;
const ARCHIVED = { id: 'old', kind: 'expense', isArchived: true } as const;
const TAG = { id: 'tag-1', isArchived: false };
const OTHER_TAG = { id: 'tag-2', isArchived: false };

function input(overrides: Partial<CategoryRule.CreateInput> = {}): CategoryRule.CreateInput {
  return {
    descriptionContains: 'IFOOD',
    counterpartyContains: null,
    kind: null,
    accountId: null,
    amountMinCents: null,
    amountMaxCents: null,
    category: DELIVERY,
    tags: [],
    ...overrides,
  };
}

describe('CategoryRule', () => {
  describe('create', () => {
    it('is born on, with the category and the tags of the request', () => {
      const rule = CategoryRule.create(input({ tags: [TAG, TAG, OTHER_TAG] }), NOW);

      expect(rule).toMatchObject({
        descriptionContains: 'IFOOD',
        categoryId: 'delivery',
        tagIds: ['tag-1', 'tag-2'],
        enabled: true,
        createdAt: NOW,
        updatedAt: NOW,
      });
      expect(rule.id).toMatch(/^[0-9a-f-]{36}$/);
    });

    it('takes a rule that only adds tags', () => {
      const rule = CategoryRule.create(input({ category: null, tags: [TAG] }), NOW);

      expect(rule.categoryId).toBeNull();
      expect(rule.tagIds).toEqual(['tag-1']);
    });

    it('needs a category or a tag', () => {
      expect(() => CategoryRule.create(input({ category: null, tags: [] }), NOW)).toThrow(
        RuleActionRequiredError,
      );
    });

    it('needs one of the two text conditions', () => {
      expect(() =>
        CategoryRule.create(input({ descriptionContains: null, counterpartyContains: null }), NOW),
      ).toThrow(RequestValidationError);
      expect(
        CategoryRule.create(
          input({ descriptionContains: null, counterpartyContains: 'TREETOOLS', category: SALARY }),
          NOW,
        ).counterpartyContains,
      ).toBe('TREETOOLS');
    });

    it('refuses a maximum below the minimum', () => {
      expect(() =>
        CategoryRule.create(input({ amountMinCents: 5000, amountMaxCents: 4999 }), NOW),
      ).toThrow(RequestValidationError);
      expect(
        CategoryRule.create(input({ amountMinCents: 5000, amountMaxCents: 5000 }), NOW),
      ).toBeDefined();
    });

    it('refuses a kind that differs from the kind of the category, with the condition or not', () => {
      expect(() => CategoryRule.create(input({ kind: 'income' }), NOW)).toThrow(
        RuleCategoryKindMismatchError,
      );
      expect(CategoryRule.create(input({ kind: 'expense' }), NOW)).toBeDefined();
      expect(CategoryRule.create(input({ kind: null }), NOW)).toBeDefined();
    });

    it('accepts a category that is a transfer with a rule of either kind', () => {
      const rotation = {
        id: 'rotation',
        kind: 'expense',
        isArchived: false,
        isTransfer: true,
      } as const;

      expect(CategoryRule.create(input({ kind: 'income', category: rotation }), NOW)).toBeDefined();
      expect(
        CategoryRule.create(input({ kind: 'expense', category: rotation }), NOW),
      ).toBeDefined();
    });

    it('refuses an archived category and an archived tag', () => {
      expect(() => CategoryRule.create(input({ category: ARCHIVED }), NOW)).toThrow(
        RuleCategoryArchivedError,
      );
      expect(() =>
        CategoryRule.create(input({ tags: [{ id: 'old-tag', isArchived: true }] }), NOW),
      ).toThrow(RuleTagArchivedError);
    });
  });

  describe('edit', () => {
    const base = () => CategoryRule.create(input({ tags: [TAG] }), NOW);

    it('keeps what was not sent and clears what came as null', () => {
      const rule = CategoryRule.create(
        input({ counterpartyContains: 'LOJA', kind: 'expense', amountMinCents: 100 }),
        NOW,
      );

      rule.edit(
        { counterpartyContains: null, kind: null, enabled: false },
        { category: DELIVERY, newTags: [] },
        LATER,
      );

      expect(rule).toMatchObject({
        descriptionContains: 'IFOOD',
        counterpartyContains: null,
        kind: null,
        amountMinCents: 100,
        enabled: false,
        updatedAt: LATER,
        createdAt: NOW,
      });
    });

    it('replaces the set of tags and takes the category away', () => {
      const rule = base();

      rule.edit({ tagIds: ['tag-2'] }, { category: null, newTags: [OTHER_TAG] }, LATER);

      expect(rule).toMatchObject({ categoryId: null, tagIds: ['tag-2'] });
    });

    it('cannot end up without a category and without tags', () => {
      const rule = CategoryRule.create(input(), NOW);

      expect(() => rule.edit({}, { category: null, newTags: [] }, LATER)).toThrow(
        RuleActionRequiredError,
      );
      expect(() => rule.edit({ tagIds: [] }, { category: null, newTags: [] }, LATER)).toThrow(
        RuleActionRequiredError,
      );
    });

    it('cannot lose both text conditions, one by one either', () => {
      const rule = CategoryRule.create(input(), NOW);

      expect(() =>
        rule.edit({ descriptionContains: null }, { category: DELIVERY, newTags: [] }, LATER),
      ).toThrow(RequestValidationError);
    });

    it('checks the range against the saved value when only one limit comes', () => {
      const rule = CategoryRule.create(input({ amountMinCents: 5000 }), NOW);

      expect(() =>
        rule.edit({ amountMaxCents: 100 }, { category: DELIVERY, newTags: [] }, LATER),
      ).toThrow(RequestValidationError);
    });

    it('checks the new kind against the category it keeps', () => {
      const rule = CategoryRule.create(input(), NOW);

      expect(() =>
        rule.edit({ kind: 'income' }, { category: DELIVERY, newTags: [] }, LATER),
      ).toThrow(RuleCategoryKindMismatchError);
    });

    it('refuses a new archived category, but keeps one that was archived after the rule', () => {
      const rule = CategoryRule.create(input(), NOW);
      const archivedLater = { ...DELIVERY, isArchived: true };

      expect(() => rule.edit({}, { category: ARCHIVED, newTags: [] }, LATER)).toThrow(
        RuleCategoryArchivedError,
      );
      // N10: the rule stays on; switching it off is not a new choice of category.
      rule.edit({ enabled: false }, { category: archivedLater, newTags: [] }, LATER);
      expect(rule).toMatchObject({ categoryId: 'delivery', enabled: false });
    });

    it('refuses a new archived tag', () => {
      const rule = base();

      expect(() =>
        rule.edit(
          { tagIds: ['tag-1', 'old-tag'] },
          { category: DELIVERY, newTags: [{ id: 'old-tag', isArchived: true }] },
          LATER,
        ),
      ).toThrow(RuleTagArchivedError);
    });
  });

  describe('hasSameConditionAs', () => {
    it('compares the six fields of the condition and ignores the action and the switch', () => {
      const rule = CategoryRule.create(input({ amountMinCents: 100 }), NOW);
      rule.enabled = false;

      expect(rule.hasSameConditionAs({ ...rule.condition() })).toBe(true);
      expect(rule.hasSameConditionAs({ ...rule.condition(), amountMinCents: 101 })).toBe(false);
      expect(rule.hasSameConditionAs({ ...rule.condition(), accountId: 'account-1' })).toBe(false);
      expect(rule.hasSameConditionAs({ ...rule.condition(), counterpartyContains: 'X' })).toBe(
        false,
      );
    });
  });

  describe('matches', () => {
    it('matches with its own condition', () => {
      const rule = CategoryRule.create(input({ kind: 'expense' }), NOW);
      const candidate = {
        description: 'iFood',
        bankDescription: null,
        counterparty: null,
        nature: 'expense' as const,
        accountId: 'a',
        amountCents: -100,
      };

      expect(rule.matches(candidate)).toBe(true);
      expect(rule.matches({ ...candidate, nature: 'income' })).toBe(false);
    });
  });

  describe('assertAppliable', () => {
    it('refuses a rule that is off and a category that is archived', () => {
      const rule = CategoryRule.create(input(), NOW);

      expect(() => rule.assertAppliable(DELIVERY)).not.toThrow();
      expect(() => rule.assertAppliable(null)).not.toThrow();
      expect(() => rule.assertAppliable({ ...DELIVERY, isArchived: true })).toThrow(
        RuleCategoryArchivedError,
      );
      rule.enabled = false;
      expect(() => rule.assertAppliable(DELIVERY)).toThrow(RuleDisabledError);
    });
  });
});
