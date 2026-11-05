import { categoryDtoSchema } from '@fincheck/shared/categories/category/category.schema.ts';
import {
  createRuleResultSchema,
  rulePreviewSchema,
  ruleDtoSchema,
} from '@fincheck/shared/categories/rule/rule.schema.ts';
import { ruleSuggestionDtoSchema } from '@fincheck/shared/categories/rule-suggestion/rule-suggestion.schema.ts';
import { tagDtoSchema } from '@fincheck/shared/categories/tag/tag.schema.ts';
import { listResponseSchema } from '@fincheck/shared/common/list/list.schema.ts';
import { describe, expect, it } from 'vitest';

import { callApi } from '#tests/support/mocks/call-api.util.ts';
import { resetDatabaseBeforeEach } from '#tests/support/mocks/reset-database-before-each.util.ts';

resetDatabaseBeforeEach();

async function categories(query = '') {
  return listResponseSchema(categoryDtoSchema).parse(
    (await callApi('GET', `/categories${query}`)).json,
  ).items;
}

describe('categories routes', () => {
  it('lists active, archived and all with counts', async () => {
    const active = await categories();
    expect(active.some((category) => category.archivedAt !== null)).toBe(false);
    expect((await categories('?status=archived')).map((category) => category.name)).toEqual([
      'Viagem de 2025',
    ]);
    expect((await categories('?status=all')).length).toBe(active.length + 1);
    expect((await categories('?kind=income')).every((category) => category.kind === 'income')).toBe(
      true,
    );
    const transport = active.find((category) => category.name === 'Transporte');
    expect(transport?.transactionCount).toBeGreaterThan(0);
    expect(transport?.lastUsedOn).not.toBeNull();
  });

  it('creates, renames, archives and unarchives, refusing a repeated name', async () => {
    const created = categoryDtoSchema.parse(
      (await callApi('POST', '/categories', { kind: 'expense', name: 'Presentes', icon: 'gift' }))
        .json,
    );
    expect(created).toMatchObject({ isDefault: false, transactionCount: 0, lastUsedOn: null });
    expect(
      (await callApi('POST', '/categories', { kind: 'expense', name: 'presentes', icon: 'gift' }))
        .status,
    ).toBe(409);
    expect(
      categoryDtoSchema.parse(
        (await callApi('PATCH', `/categories/${created.id}`, { name: 'Presentes e festas' })).json,
      ).name,
    ).toBe('Presentes e festas');
    expect((await callApi('PATCH', `/categories/${created.id}`, { kind: 'income' })).status).toBe(
      400,
    );
    expect(
      categoryDtoSchema.parse((await callApi('POST', `/categories/${created.id}/archive`)).json)
        .archivedAt,
    ).not.toBeNull();
    expect((await callApi('POST', `/categories/${created.id}/archive`)).status).toBe(409);
    expect(
      categoryDtoSchema.parse((await callApi('POST', `/categories/${created.id}/unarchive`)).json)
        .archivedAt,
    ).toBeNull();
  });

  it('manages tags', async () => {
    const tags = listResponseSchema(tagDtoSchema);
    expect(tags.parse((await callApi('GET', '/tags')).json).items.map((tag) => tag.name)).toEqual([
      'delivery',
      'trabalho',
      'viagem',
    ]);
    expect(
      tags.parse((await callApi('GET', '/tags?includeArchived=true')).json).items,
    ).toHaveLength(4);
    const created = tagDtoSchema.parse((await callApi('POST', '/tags', { name: 'Reforma' })).json);
    expect((await callApi('POST', '/tags', { name: 'reforma' })).status).toBe(409);
    expect(
      tagDtoSchema.parse((await callApi('PATCH', `/tags/${created.id}`, { name: 'Obra' })).json)
        .name,
    ).toBe('Obra');
    expect(
      tagDtoSchema.parse((await callApi('POST', `/tags/${created.id}/archive`)).json).archivedAt,
    ).not.toBeNull();
    expect(
      tagDtoSchema.parse((await callApi('POST', `/tags/${created.id}/unarchive`)).json).archivedAt,
    ).toBeNull();
  });
});

describe('rules routes', () => {
  it('lists the rules with how many times each was applied', async () => {
    const rules = listResponseSchema(ruleDtoSchema).parse(
      (await callApi('GET', '/rules')).json,
    ).items;
    expect(rules.map((rule) => rule.descriptionContains)).toEqual(['IFOOD', 'POSTO', 'FARMACIA']);
    expect(rules[0]?.appliedCount).toBeGreaterThanOrEqual(2);
    expect(rules[2]?.enabled).toBe(false);
  });

  it('suggests the Uber rule and accepts it applying to the history, then undoes it', async () => {
    const suggestions = listResponseSchema(ruleSuggestionDtoSchema).parse(
      (await callApi('GET', '/rule-suggestions')).json,
    ).items;
    const uber = suggestions.find((item) => item.pattern === 'UBER *TRIP');
    expect(uber?.recategorizedCount).toBeGreaterThanOrEqual(3);
    expect(uber?.willChangeCount).toBeLessThan(uber?.matchCount ?? 0);
    expect(suggestions.some((item) => item.pattern === 'PADARIA PAO QUENTE')).toBe(false);

    const accepted = await callApi('POST', '/rule-suggestions/accept', {
      pattern: uber?.pattern,
      categoryId: uber?.categoryId,
      applyToHistory: true,
    });
    expect(accepted.status).toBe(201);
    const result = createRuleResultSchema.parse(accepted.json);
    expect(result.applied?.changedCount).toBe(uber?.willChangeCount);
    expect(
      listResponseSchema(ruleSuggestionDtoSchema)
        .parse((await callApi('GET', '/rule-suggestions')).json)
        .items.some((item) => item.pattern === 'UBER *TRIP'),
    ).toBe(false);
    expect(
      (await callApi('POST', '/transactions/bulk/restore', { items: result.applied?.previous }))
        .status,
    ).toBe(result.applied?.previous.length ? 200 : 400);
  });

  it('previews, creates, edits, reapplies, refuses a duplicate and deletes', async () => {
    const [category] = await categories('?kind=expense');
    const preview = rulePreviewSchema.parse(
      (
        await callApi('POST', '/rules/preview', {
          descriptionContains: ' mercado ',
          categoryId: category?.id,
        })
      ).json,
    );
    expect(preview.matchCount).toBeGreaterThan(0);
    expect(preview.examples.length).toBeLessThanOrEqual(3);

    const created = await callApi('POST', '/rules', {
      descriptionContains: 'cinemark',
      categoryId: category?.id,
    });
    expect(created.status).toBe(201);
    const { rule } = createRuleResultSchema.parse(created.json);
    expect(rule.descriptionContains).toBe('CINEMARK');
    expect(
      (
        await callApi('POST', '/rules', {
          descriptionContains: 'CINEMARK',
          categoryId: category?.id,
        })
      ).status,
    ).toBe(409);
    expect((await callApi('POST', '/rules', { descriptionContains: 'CINEMARK2' })).status).toBe(
      422,
    );

    expect(
      ruleDtoSchema.parse((await callApi('PATCH', `/rules/${rule.id}`, { enabled: false })).json)
        .enabled,
    ).toBe(false);
    expect((await callApi('POST', `/rules/${rule.id}/apply`)).status).toBe(422);
    await callApi('PATCH', `/rules/${rule.id}`, { enabled: true });
    expect((await callApi('POST', `/rules/${rule.id}/apply`)).status).toBe(200);
    expect((await callApi('DELETE', `/rules/${rule.id}`)).status).toBe(204);
    expect((await callApi('DELETE', `/rules/${rule.id}`)).status).toBe(404);
  });

  it('matches by the sender, needs both texts when there are two and refuses a duplicate', async () => {
    const [category] = await categories('?kind=expense');
    const count = async (body: object) =>
      rulePreviewSchema.parse((await callApi('POST', '/rules/preview', body)).json).matchCount;

    const bySender = await count({ counterpartyContains: 'jose' });
    const byDescription = await count({ descriptionContains: 'pix' });
    const both = await count({ descriptionContains: 'pix', counterpartyContains: 'jose' });
    expect(bySender).toBeGreaterThan(0);
    expect(both).toBeGreaterThan(0);
    expect(both).toBeLessThanOrEqual(Math.min(bySender, byDescription));
    expect(await count({ descriptionContains: 'zzzz', counterpartyContains: 'jose' })).toBe(0);
    expect((await callApi('POST', '/rules/preview', { kind: 'expense' })).status).toBe(400);

    const created = await callApi('POST', '/rules', {
      counterpartyContains: ' jose ',
      categoryId: category?.id,
    });
    expect(created.status).toBe(201);
    const { rule } = createRuleResultSchema.parse(created.json);
    expect(rule).toMatchObject({ descriptionContains: null, counterpartyContains: 'JOSE' });
    expect(
      (await callApi('POST', '/rules', { counterpartyContains: 'JOSE', categoryId: category?.id }))
        .status,
    ).toBe(409);
    expect(
      (
        await callApi('POST', '/rules', {
          descriptionContains: 'pix',
          counterpartyContains: 'JOSE',
          categoryId: category?.id,
        })
      ).status,
    ).toBe(201);
    expect(
      (await callApi('PATCH', `/rules/${rule.id}`, { counterpartyContains: null })).status,
    ).toBe(400);
  });

  it('dismisses a suggestion for good', async () => {
    const read = async () =>
      listResponseSchema(ruleSuggestionDtoSchema).parse(
        (await callApi('GET', '/rule-suggestions')).json,
      ).items;
    const before = await read();
    const [first] = before;
    expect(
      (
        await callApi('POST', '/rule-suggestions/dismiss', {
          pattern: first?.pattern,
          categoryId: first?.categoryId,
        })
      ).status,
    ).toBe(204);
    const after = await read();
    expect(after).toHaveLength(before.length - 1);
    expect(
      after.some(
        (item) => item.pattern === first?.pattern && item.categoryId === first?.categoryId,
      ),
    ).toBe(false);
  });
});
