import { describe, expect, it } from 'vitest';

import type { CategoryRule } from '#/modules/categories/domain/rule/category-rule.entity.ts';
import { matchesRuleCondition } from '#/modules/categories/domain/rule/matches-rule-condition.util.ts';

const NO_CONDITION: CategoryRule.Condition = {
  descriptionContains: null,
  counterpartyContains: null,
  kind: null,
  accountId: null,
  amountMinCents: null,
  amountMaxCents: null,
};

const PIX: CategoryRule.Candidate = {
  description: 'Pix enviado',
  bankDescription: 'PIX ENVIADO 123',
  counterparty: 'Treetools Soluções Ltda',
  nature: 'income',
  accountId: 'account-1',
  amountCents: 450000,
};

const IFOOD: CategoryRule.Candidate = {
  description: 'iFood *Restaurante',
  bankDescription: 'IFOOD *RESTAURANTE',
  counterparty: null,
  nature: 'expense',
  accountId: 'account-1',
  amountCents: -5280,
};

const matches = (condition: Partial<CategoryRule.Condition>, candidate: CategoryRule.Candidate) =>
  matchesRuleCondition({ ...NO_CONDITION, ...condition }, candidate);

describe('matchesRuleCondition', () => {
  describe('description', () => {
    it('finds the pattern in the description in use, with no difference for case, accent or spaces', () => {
      expect(matches({ descriptionContains: 'IFOOD' }, IFOOD)).toBe(true);
      expect(
        matches(
          { descriptionContains: 'RESTAURANTE' },
          { ...IFOOD, description: 'Restaurante  Pão' },
        ),
      ).toBe(true);
      expect(
        matches({ descriptionContains: 'PAO' }, { ...IFOOD, description: 'Padaria Pão' }),
      ).toBe(true);
    });

    it('finds the pattern in the description of the bank when Lucas changed his own', () => {
      const edited = { ...IFOOD, description: 'Almoço de sexta' };

      expect(matches({ descriptionContains: 'IFOOD' }, edited)).toBe(true);
      expect(matches({ descriptionContains: 'ALMOCO' }, edited)).toBe(true);
    });

    it('does not match a description that lacks the pattern, nor a missing bank description', () => {
      expect(matches({ descriptionContains: 'UBER' }, IFOOD)).toBe(false);
      expect(matches({ descriptionContains: 'UBER' }, { ...IFOOD, bankDescription: null })).toBe(
        false,
      );
      expect(
        matches(
          { descriptionContains: 'IFOOD' },
          { ...IFOOD, description: 'x', bankDescription: null },
        ),
      ).toBe(false);
    });
  });

  describe('counterparty', () => {
    it('finds the sender inside the name the bank sent (the bank cuts names)', () => {
      expect(matches({ counterpartyContains: 'TREETOOLS' }, PIX)).toBe(true);
      expect(matches({ counterpartyContains: 'SOLUCOES' }, PIX)).toBe(true);
      expect(matches({ counterpartyContains: 'RAFAEL' }, PIX)).toBe(false);
    });

    it('never matches a transaction with no sender', () => {
      expect(matches({ counterpartyContains: 'TREETOOLS' }, { ...PIX, counterparty: null })).toBe(
        false,
      );
    });

    it('needs both texts to hold when the rule has both', () => {
      const both = { descriptionContains: 'PIX', counterpartyContains: 'TREETOOLS' };

      expect(matches(both, PIX)).toBe(true);
      expect(matches({ ...both, descriptionContains: 'TED' }, PIX)).toBe(false);
      expect(matches({ ...both, counterpartyContains: 'RAFAEL' }, PIX)).toBe(false);
    });

    it('does not look for the sender in the description', () => {
      expect(matches({ counterpartyContains: 'PADARIA' }, { ...PIX, description: 'Padaria' })).toBe(
        false,
      );
    });
  });

  describe('optional conditions', () => {
    it('keeps only the kind of the rule', () => {
      expect(matches({ descriptionContains: 'IFOOD', kind: 'expense' }, IFOOD)).toBe(true);
      expect(matches({ descriptionContains: 'IFOOD', kind: 'income' }, IFOOD)).toBe(false);
    });

    it('keeps only the account of the rule', () => {
      expect(matches({ descriptionContains: 'IFOOD', accountId: 'account-1' }, IFOOD)).toBe(true);
      expect(matches({ descriptionContains: 'IFOOD', accountId: 'account-2' }, IFOOD)).toBe(false);
    });

    it('compares the absolute value, the limits included', () => {
      const range = { descriptionContains: 'IFOOD', amountMinCents: 5000, amountMaxCents: 6000 };

      expect(matches(range, IFOOD)).toBe(true);
      expect(matches(range, { ...IFOOD, amountCents: -5000 })).toBe(true);
      expect(matches(range, { ...IFOOD, amountCents: -6000 })).toBe(true);
      expect(matches(range, { ...IFOOD, amountCents: -4999 })).toBe(false);
      expect(matches(range, { ...IFOOD, amountCents: -6001 })).toBe(false);
      // An income of the same size is compared the same way.
      expect(matches(range, { ...IFOOD, nature: 'income', amountCents: 5500 })).toBe(true);
    });

    it('takes a minimum alone and a maximum alone', () => {
      expect(matches({ descriptionContains: 'IFOOD', amountMinCents: 6000 }, IFOOD)).toBe(false);
      expect(matches({ descriptionContains: 'IFOOD', amountMaxCents: 6000 }, IFOOD)).toBe(true);
      expect(matches({ descriptionContains: 'IFOOD', amountMaxCents: 5000 }, IFOOD)).toBe(false);
    });
  });
});
