import type { Category } from '@fincheck/shared/categories/category/category.type.ts';
import type { Rule } from '@fincheck/shared/categories/rule/rule.type.ts';
import type { Tag } from '@fincheck/shared/categories/tag/tag.type.ts';
import { describe, expect, it } from 'vitest';

import { buildCategoryGroups } from '#/features/rules/rule-form/utils/build-category-groups.util.ts';
import { buildPreviewBody } from '#/features/rules/rule-form/utils/build-preview-body.util.ts';
import { buildRuleUpdateBody } from '#/features/rules/rule-form/utils/build-rule-update-body.util.ts';
import { validateRuleForm } from '#/features/rules/rule-form/utils/validate-rule-form.util.ts';
import { buildRecreateBody } from '#/features/rules/rule-list/utils/build-recreate-body.util.ts';
import { buildRulePhrase } from '#/features/rules/rule-list/utils/build-rule-phrase.util.ts';
import { toRuleRow } from '#/features/rules/rule-list/utils/to-rule-row.util.ts';
import { buildHistoryChanges } from '#/features/rules/utils/build-history-changes.util.ts';
import { buildHistoryLabel } from '#/features/rules/utils/build-history-label.util.ts';
import { buildRulePreview } from '#/features/rules/utils/build-rule-preview.util.ts';
import { describeRuleError } from '#/features/rules/utils/describe-rule-error.util.ts';
import { ApiError } from '#/shared/api/api.error.ts';

const DELIVERY: Category.Dto = {
  id: 'cat-delivery',
  kind: 'expense',
  name: 'Delivery',
  icon: 'deliv',
  isDefault: true,
  archivedAt: null,
  transactionCount: 0,
  ruleCount: 1,
  lastUsedOn: null,
};
const SALARY: Category.Dto = { ...DELIVERY, id: 'cat-salary', kind: 'income', name: 'Salário' };
const OLD: Category.Dto = {
  ...DELIVERY,
  id: 'cat-old',
  name: 'Viagem',
  archivedAt: '2026-07-01T00:00:00.000Z',
};
const TAG_DELIVERY: Tag.Dto = { id: 't1', name: 'delivery', archivedAt: null, transactionCount: 0 };
const TAG_WORK: Tag.Dto = { id: 't2', name: 'trabalho', archivedAt: null, transactionCount: 0 };

function rule(overrides: Partial<Rule.Dto> = {}): Rule.Dto {
  return {
    id: 'r1',
    descriptionContains: 'IFOOD',
    kind: null,
    accountId: null,
    amountMinCents: null,
    amountMaxCents: null,
    categoryId: 'cat-delivery',
    tagIds: ['t1'],
    enabled: true,
    appliedCount: 38,
    createdAt: '2026-07-02T15:00:00.000Z',
    updatedAt: '2026-07-02T15:00:00.000Z',
    ...overrides,
  };
}

function plain(segments: ReturnType<typeof buildRulePhrase>): string {
  return segments
    .map((part) =>
      typeof part === 'string' ? part : 'strong' in part ? part.strong : `<${part.moneyCents}>`,
    )
    .join('');
}

describe('buildRulePhrase', () => {
  const categories = [DELIVERY, SALARY];
  const tags = [TAG_DELIVERY, TAG_WORK];

  it('writes category and tag the way the screen shows them', () => {
    expect(plain(buildRulePhrase(rule(), categories, tags))).toBe(
      'Sempre que a descrição contém IFOOD, vai para Delivery com a tag delivery.',
    );
  });

  it('lists several tags with "e"', () => {
    const phrase = buildRulePhrase(rule({ tagIds: ['t1', 't2'] }), categories, tags);

    expect(plain(phrase)).toBe(
      'Sempre que a descrição contém IFOOD, vai para Delivery com as tags delivery e trabalho.',
    );
  });

  it('adds only the tags when there is no category', () => {
    expect(plain(buildRulePhrase(rule({ categoryId: null }), categories, tags))).toBe(
      'Sempre que a descrição contém IFOOD, adiciona a tag delivery.',
    );
  });

  it('says the type and the amount range, with the amounts left to Money', () => {
    const phrase = buildRulePhrase(
      rule({ kind: 'income', amountMinCents: 1000, amountMaxCents: 5000, tagIds: [] }),
      categories,
      tags,
    );

    expect(plain(phrase)).toBe(
      'Sempre que a descrição contém IFOOD, em receitas, de <1000> a <5000>, vai para Delivery.',
    );
    expect(phrase.some((part) => typeof part === 'object' && 'moneyCents' in part)).toBe(true);
  });

  it('handles only a minimum, only a maximum and a specific account', () => {
    expect(
      plain(buildRulePhrase(rule({ amountMinCents: 100, tagIds: [] }), categories, tags)),
    ).toContain(', a partir de <100>');
    expect(
      plain(buildRulePhrase(rule({ amountMaxCents: 3000, tagIds: [] }), categories, tags)),
    ).toContain(', até <3000>');
    expect(
      plain(buildRulePhrase(rule({ accountId: 'a1', tagIds: [] }), categories, tags)),
    ).toContain(', numa conta específica');
  });
});

describe('toRuleRow', () => {
  it('takes the icon of the category and lets the switch override the state', () => {
    const row = toRuleRow(rule(), [DELIVERY], [TAG_DELIVERY], false);

    expect(row).toMatchObject({ id: 'r1', icon: 'delivery', appliedCount: 38, active: false });
  });

  it('falls back to the tag icon for a rule without category', () => {
    expect(toRuleRow(rule({ categoryId: null }), [DELIVERY], [TAG_DELIVERY]).icon).toBe('tag');
  });
});

describe('buildRulePreview', () => {
  it('builds the title, the examples as positive amounts and how many more', () => {
    const preview = buildRulePreview({
      matchCount: 14,
      willChangeCount: 14,
      examples: [
        {
          transactionId: 'x1',
          description: 'UBER *TRIP',
          occurredOn: '2026-10-18',
          amountCents: -3140,
          fromCategoryId: null,
          toCategoryId: 'cat-delivery',
        },
      ],
    });

    expect(preview.title).toBe('Bate com 14 transações do histórico');
    expect(preview.matches).toEqual([
      { id: 'x1', description: 'UBER *TRIP', dateLabel: '18/10', cents: 3140 },
    ]);
    expect(preview.moreCount).toBe(13);
  });

  it('uses the singular', () => {
    expect(buildRulePreview({ matchCount: 1, willChangeCount: 1, examples: [] }).title).toBe(
      'Bate com 1 transação do histórico',
    );
  });
});

describe('buildHistoryChanges and buildHistoryLabel', () => {
  const nameOf = (id: string | null) => (id === 'cat-delivery' ? 'Delivery' : 'Sem categoria');

  it('describes what the history change does, with the examples', () => {
    const changes = buildHistoryChanges({
      willChangeCount: 2,
      categoryName: 'Delivery',
      nameOf,
      examples: [
        {
          transactionId: 'x1',
          description: 'IFOOD *PIZZARIA',
          occurredOn: '2026-10-18',
          amountCents: -3140,
          fromCategoryId: null,
          toCategoryId: 'cat-delivery',
        },
      ],
    }).map((change) => change.text);

    expect(changes).toEqual([
      '2 transações vão para Delivery.',
      'IFOOD *PIZZARIA: Sem categoria para Delivery',
      'Edições feitas à mão não mudam.',
    ]);
  });

  it('says the tags when the rule has no category', () => {
    const [first] = buildHistoryChanges({
      willChangeCount: 1,
      categoryName: null,
      nameOf,
      examples: [],
    });

    expect(first?.text).toBe('1 transação vai ganhar as tags da regra.');
  });

  it('writes the checkbox label in the singular and the plural', () => {
    expect(buildHistoryLabel(1)).toBe('Aplicar também nessa transação');
    expect(buildHistoryLabel(14)).toBe('Aplicar também nessas 14 transações');
  });
});

describe('validateRuleForm', () => {
  it('normalizes the text and accepts a category', () => {
    const result = validateRuleForm({
      description: ' ubér  trip ',
      categoryId: '0194f3a0-0000-7000-8000-000000000001',
      tagIds: [],
    });

    expect(result).toMatchObject({ ok: true, body: { descriptionContains: 'UBER TRIP' } });
  });

  it('asks for a text of 2 letters or more and for an action', () => {
    expect(validateRuleForm({ description: 'u', categoryId: null, tagIds: [] })).toEqual({
      ok: false,
      errors: {
        description: 'Escreva um trecho da descrição, com pelo menos 2 letras.',
        action: 'Escolha uma categoria ou ao menos uma tag.',
      },
    });
  });

  it('accepts tags alone', () => {
    expect(
      validateRuleForm({
        description: 'ifood',
        categoryId: null,
        tagIds: ['0194f3a0-0000-7000-8000-000000000021'],
      }).ok,
    ).toBe(true);
  });
});

describe('buildPreviewBody', () => {
  it('waits for 2 characters after normalizing', () => {
    expect(buildPreviewBody({ description: ' a ', categoryId: null, tagIds: [] }, null)).toBeNull();
  });

  it('sends the text with the category and tags', () => {
    expect(
      buildPreviewBody({ description: 'ifood', categoryId: 'c1', tagIds: ['t1'] }, null),
    ).toEqual({ descriptionContains: 'ifood', categoryId: 'c1', tagIds: ['t1'] });
  });

  it('carries the conditions the modal does not show when editing', () => {
    const body = buildPreviewBody(
      { description: 'farmacia', categoryId: null, tagIds: [] },
      rule({ kind: 'expense', accountId: 'a1', amountMaxCents: 3000 }),
    );

    expect(body).toEqual({
      descriptionContains: 'farmacia',
      kind: 'expense',
      accountId: 'a1',
      amountMaxCents: 3000,
    });
  });
});

describe('buildRuleUpdateBody', () => {
  it('sends nothing when nothing changed, in whatever order the tags are', () => {
    const body = buildRuleUpdateBody(rule({ tagIds: ['t1', 't2'] }), {
      description: 'ifood',
      categoryId: 'cat-delivery',
      tagIds: ['t2', 't1'],
    });

    expect(body).toEqual({});
  });

  it('sends only the fields that changed, and null to take the category off', () => {
    const body = buildRuleUpdateBody(rule(), {
      description: 'ifood *loja',
      categoryId: null,
      tagIds: ['t1', 't2'],
    });

    expect(body).toEqual({
      descriptionContains: 'IFOOD *LOJA',
      categoryId: null,
      tagIds: ['t1', 't2'],
    });
  });
});

describe('buildCategoryGroups', () => {
  const all = [DELIVERY, SALARY, OLD];

  it('groups the active categories by type', () => {
    expect(buildCategoryGroups(all, { kind: null, selectedId: null }).map((g) => g.label)).toEqual([
      'Despesas',
      'Receitas',
    ]);
  });

  it('offers only the type of the rule when it has one', () => {
    const groups = buildCategoryGroups(all, { kind: 'income', selectedId: null });

    expect(groups.map((group) => group.label)).toEqual(['Receitas']);
  });

  it('keeps an archived category the rule already points to, in its own group', () => {
    const groups = buildCategoryGroups(all, { kind: null, selectedId: 'cat-old' });

    expect(groups.at(-1)).toMatchObject({ label: 'Arquivada', options: [{ id: 'cat-old' }] });
  });
});

describe('buildRecreateBody', () => {
  it('copies the conditions and actions and leaves out what is empty', () => {
    expect(buildRecreateBody(rule({ kind: 'expense', amountMaxCents: 3000, tagIds: [] }))).toEqual({
      descriptionContains: 'IFOOD',
      kind: 'expense',
      amountMaxCents: 3000,
      categoryId: 'cat-delivery',
    });
  });
});

describe('describeRuleError', () => {
  it('turns the contract codes into sentences', () => {
    expect(describeRuleError(new ApiError(409, 'RULE_DUPLICATE', 'x'))).toBe(
      'Já existe uma regra com essa condição.',
    );
    expect(describeRuleError(new ApiError(422, 'RULE_CATEGORY_ARCHIVED', 'x'))).toBe(
      'Essa categoria está arquivada. Escolha outra.',
    );
  });

  it('falls back to a generic sentence for anything else', () => {
    expect(describeRuleError(new ApiError(500, 'INTERNAL_ERROR', 'x'))).toBe(
      'Não deu para salvar a regra agora. Tente de novo.',
    );
    expect(describeRuleError(new Error('boom'))).toBe(
      'Não deu para salvar a regra agora. Tente de novo.',
    );
  });
});
