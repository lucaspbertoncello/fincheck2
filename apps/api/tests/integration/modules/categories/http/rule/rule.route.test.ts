import {
  applyRuleResultSchema,
  createRuleResultSchema,
  ruleDtoSchema,
  rulePreviewSchema,
} from '@fincheck/shared/categories/rule/rule.schema.ts';
import { apiErrorSchema } from '@fincheck/shared/common/api-error/api-error.schema.ts';
import { listResponseSchema } from '@fincheck/shared/common/list/list.schema.ts';
import { restoreBulkResultSchema } from '@fincheck/shared/transactions/transaction-bulk/transaction-bulk.schema.ts';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { generateId } from '#/shared/id/generate-id.util.ts';
import { createTestApp } from '#tests/support/app/create-test-app.util.ts';
import { insertTestCategory } from '#tests/support/categories/category/insert-test-category.util.ts';
import { createRuleTestWorld } from '#tests/support/categories/rule/create-rule-test-world.util.ts';
import { createTestDatabase } from '#tests/support/database/create-test-database.util.ts';
import { createFixedClock } from '#tests/support/shared/clock/create-fixed-clock.util.ts';

const NOW = '2026-11-06T15:00:00.000Z';
const listSchema = listResponseSchema(ruleDtoSchema);

describe('rules routes', () => {
  let database: Awaited<ReturnType<typeof createTestDatabase>>;
  let app: ReturnType<typeof createTestApp>;
  let world: Awaited<ReturnType<typeof createRuleTestWorld>>;

  beforeEach(async () => {
    database = await createTestDatabase();
    app = createTestApp(database.db, { clock: createFixedClock(NOW) });
    world = await createRuleTestWorld(database.db);
  });

  afterEach(async () => {
    await database.destroy();
  });

  const send = (method: string, path: string, body?: unknown) =>
    app.request(path, {
      method,
      ...(body === undefined
        ? {}
        : { headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }),
    });

  const expectError = async (response: Response, status: number, code: string) => {
    expect(response.status).toBe(status);
    expect(apiErrorSchema.parse(await response.json()).code).toBe(code);
  };

  const listRules = async () => {
    const response = await send('GET', '/rules');
    expect(response.status).toBe(200);

    return listSchema.parse(await response.json()).items;
  };

  const createRule = async (body: Record<string, unknown>) => {
    const response = await send('POST', '/rules', body);
    expect(response.status).toBe(201);

    return createRuleResultSchema.parse(await response.json());
  };

  const preview = async (body: Record<string, unknown>) => {
    const response = await send('POST', '/rules/preview', body);
    expect(response.status).toBe(200);

    return rulePreviewSchema.parse(await response.json());
  };

  const apply = async (ruleId: string) => {
    const response = await send('POST', `/rules/${ruleId}/apply`);
    expect(response.status).toBe(200);

    return applyRuleResultSchema.parse(await response.json());
  };

  describe('GET /rules', () => {
    it('is empty at first', async () => {
      expect(await listRules()).toEqual([]);
    });

    it('lists the rules, on or off, the oldest first, with the tags and how many they categorized', async () => {
      const first = (await createRule({ descriptionContains: 'uber', categoryId: world.transport }))
        .rule;
      const second = (
        await createRule({
          descriptionContains: 'ifood',
          categoryId: world.delivery,
          tagIds: [world.tripTag, world.workTag],
        })
      ).rule;
      await send('PATCH', `/rules/${first.id}`, { enabled: false });
      await world.addTransaction('iFood', {
        category_id: world.delivery,
        category_source: 'rule',
        category_rule_id: second.id,
      });

      const rules = await listRules();

      expect(rules.map((rule) => rule.id)).toEqual([first.id, second.id]);
      expect(rules[0]).toMatchObject({
        descriptionContains: 'UBER',
        enabled: false,
        appliedCount: 0,
      });
      expect(rules[1]?.tagIds.sort()).toEqual([world.tripTag, world.workTag].sort());
      expect(rules[1]?.appliedCount).toBe(1);
    });
  });

  describe('POST /rules/preview', () => {
    beforeEach(async () => {
      await world.addTransaction('Uber *Trip 1', {
        occurred_on: '2026-10-01',
        amount_cents: -2000,
      });
      await world.addTransaction('UBER *TRIP 2', {
        occurred_on: '2026-10-05',
        amount_cents: -3000,
      });
      await world.addTransaction('Uber *Trip 3', {
        occurred_on: '2026-10-09',
        amount_cents: -4000,
      });
      await world.addTransaction('Uber *Trip 4', {
        occurred_on: '2026-10-12',
        amount_cents: -5000,
      });
      await world.addTransaction('Padaria', { occurred_on: '2026-10-13' });
    });

    it('counts what the rule matches and what it would change, with three examples, newest first', async () => {
      const result = await preview({
        descriptionContains: 'uber',
        categoryId: world.transport,
      });

      expect(result.matchCount).toBe(4);
      expect(result.willChangeCount).toBe(4);
      expect(result.examples.map((example) => example.occurredOn)).toEqual([
        '2026-10-12',
        '2026-10-09',
        '2026-10-05',
      ]);
      expect(result.examples[0]).toMatchObject({
        description: 'Uber *Trip 4',
        amountCents: -5000,
        fromCategoryId: null,
        toCategoryId: world.transport,
      });
    });

    it('writes nothing', async () => {
      await preview({
        descriptionContains: 'uber',
        categoryId: world.transport,
        tagIds: [world.tripTag],
      });

      const changed = await database.db
        .selectFrom('transactions')
        .select('id')
        .where((eb) => eb.or([eb('category_id', 'is not', null)]))
        .execute();
      expect(changed).toEqual([]);
      expect(await database.db.selectFrom('transaction_tags').select('tag_id').execute()).toEqual(
        [],
      );
      expect(await database.db.selectFrom('category_rules').select('id').execute()).toEqual([]);
    });

    it('with no category and no tag, the changes equal the matches', async () => {
      const result = await preview({ descriptionContains: 'uber' });

      expect(result).toMatchObject({ matchCount: 4, willChangeCount: 4 });
    });

    it('does not change what Lucas, a recurrence or a bill categorized, but still counts it as a match', async () => {
      await world.addTransaction('Uber *Trip user', {
        category_id: world.delivery,
        category_source: 'user',
      });
      await world.addTransaction('Uber *Trip recurrence', {
        category_id: world.delivery,
        category_source: 'recurrence',
      });
      await world.addTransaction('Uber *Trip bill', {
        category_id: world.delivery,
        category_source: 'bill',
      });

      const result = await preview({ descriptionContains: 'uber', categoryId: world.transport });

      expect(result).toMatchObject({ matchCount: 7, willChangeCount: 4 });
    });

    it('leaves the ignored, the split and the other kind out of the matches', async () => {
      await world.addTransaction('Uber ignorado', { ignored_at: NOW });
      const split = await world.addTransaction('Uber dividido');
      await database.db
        .insertInto('transaction_splits')
        .values({
          id: generateId(),
          transaction_id: split,
          position: 1,
          amount_cents: -1250,
          nature: 'expense',
          category_id: null,
          description: null,
        })
        .execute();
      await world.addTransaction('Uber reembolso', { nature: 'income', amount_cents: 1000 });
      await world.addTransaction('Uber transferência', { nature: 'transfer' });

      const result = await preview({ descriptionContains: 'uber', categoryId: world.transport });

      expect(result.matchCount).toBe(4);
    });

    it('matches the sender the bank sent, and needs both texts when it has both', async () => {
      await world.addTransaction('Pix recebido', {
        nature: 'income',
        amount_cents: 450000,
        bank_description: 'PIX RECEBIDO',
        bank_counterparty: 'Treetools Soluções Ltda',
      });
      await world.addTransaction('Pix recebido', {
        nature: 'income',
        amount_cents: 1000,
        bank_description: 'PIX RECEBIDO',
        bank_counterparty: 'Rafael',
      });
      await world.addTransaction('Pix recebido', { nature: 'income', amount_cents: 1000 });

      const bySender = await preview({ counterpartyContains: 'treetools' });
      const both = await preview({ descriptionContains: 'pix', counterpartyContains: 'treetools' });
      const wrongBoth = await preview({
        descriptionContains: 'ted',
        counterpartyContains: 'treetools',
      });

      expect(bySender.matchCount).toBe(1);
      expect(both.matchCount).toBe(1);
      expect(wrongBoth.matchCount).toBe(0);
    });

    it('keeps to the kind, the account and the range of value', async () => {
      await world.addTransaction('Uber outra conta', { account_id: world.otherAccountId });

      expect(
        (await preview({ descriptionContains: 'uber', accountId: world.otherAccountId }))
          .matchCount,
      ).toBe(1);
      expect(
        (await preview({ descriptionContains: 'uber', amountMinCents: 3000, amountMaxCents: 4000 }))
          .matchCount,
      ).toBe(2);
      expect((await preview({ descriptionContains: 'uber', kind: 'income' })).matchCount).toBe(0);
    });

    it('refuses what the schema refuses', async () => {
      for (const body of [
        {},
        { categoryId: world.transport },
        { descriptionContains: 'u' },
        { descriptionContains: 'uber', amountMinCents: 500, amountMaxCents: 100 },
        { descriptionContains: 'uber', amountMinCents: -1 },
        { descriptionContains: 'uber', tagIds: Array.from({ length: 11 }, () => generateId()) },
        { descriptionContains: 'uber', kind: 'transfer' },
      ]) {
        await expectError(await send('POST', '/rules/preview', body), 400, 'VALIDATION_FAILED');
      }
    });

    it('answers the errors of the contract', async () => {
      await expectError(
        await send('POST', '/rules/preview', {
          descriptionContains: 'uber',
          kind: 'income',
          categoryId: world.transport,
        }),
        422,
        'RULE_CATEGORY_KIND_MISMATCH',
      );
      await expectError(
        await send('POST', '/rules/preview', {
          descriptionContains: 'uber',
          categoryId: generateId(),
        }),
        404,
        'CATEGORY_NOT_FOUND',
      );
      await expectError(
        await send('POST', '/rules/preview', {
          descriptionContains: 'uber',
          tagIds: [generateId()],
        }),
        404,
        'TAG_NOT_FOUND',
      );
      await expectError(
        await send('POST', '/rules/preview', {
          descriptionContains: 'uber',
          accountId: generateId(),
        }),
        404,
        'ACCOUNT_NOT_FOUND',
      );
    });

    it('accepts an archived category (only a rule that is saved cannot point to one)', async () => {
      await database.db
        .updateTable('categories')
        .set({ archived_at: NOW })
        .where('id', '=', world.transport)
        .execute();

      const result = await preview({ descriptionContains: 'uber', categoryId: world.transport });

      expect(result.matchCount).toBe(4);
    });
  });

  describe('POST /rules', () => {
    it('creates a rule that is on, with the texts normalized', async () => {
      const { rule, applied } = await createRule({
        descriptionContains: ' ifood  *Pão ',
        counterpartyContains: 'Rafael Silva',
        kind: 'expense',
        accountId: world.accountId,
        amountMinCents: 100,
        amountMaxCents: 9900,
        categoryId: world.delivery,
        tagIds: [world.tripTag],
      });

      expect(applied).toBeNull();
      expect(rule).toMatchObject({
        descriptionContains: 'IFOOD *PAO',
        counterpartyContains: 'RAFAEL SILVA',
        kind: 'expense',
        accountId: world.accountId,
        amountMinCents: 100,
        amountMaxCents: 9900,
        categoryId: world.delivery,
        tagIds: [world.tripTag],
        enabled: true,
        appliedCount: 0,
        createdAt: NOW,
        updatedAt: NOW,
      });
      expect(await listRules()).toHaveLength(1);
    });

    it('takes a rule that only adds tags, and one that only looks at the sender', async () => {
      const tags = await createRule({ descriptionContains: 'uber', tagIds: [world.tripTag] });
      const sender = await createRule({
        counterpartyContains: 'treetools',
        categoryId: world.salary,
      });

      expect(tags.rule).toMatchObject({ categoryId: null, tagIds: [world.tripTag] });
      expect(sender.rule).toMatchObject({
        descriptionContains: null,
        counterpartyContains: 'TREETOOLS',
      });
    });

    it('does not touch the history unless asked', async () => {
      const tx = await world.addTransaction('Uber *Trip');

      await createRule({ descriptionContains: 'uber', categoryId: world.transport });

      expect((await world.categoryOf(tx)).category_id).toBeNull();
    });

    describe('with applyToHistory', () => {
      it('recategorizes in the same stroke, adds the tags and gives the way back', async () => {
        const fresh = await world.addTransaction('Uber *Trip 1');
        const withTag = await world.addTransaction('Uber *Trip 2');
        await database.db
          .insertInto('transaction_tags')
          .values({ transaction_id: withTag, tag_id: world.workTag })
          .execute();
        const byHand = await world.addTransaction('Uber *Trip 3', {
          category_id: world.delivery,
          category_source: 'user',
        });
        await world.addTransaction('Padaria');

        const { rule, applied } = await createRule({
          descriptionContains: 'uber',
          categoryId: world.transport,
          tagIds: [world.tripTag],
          applyToHistory: true,
        });

        expect(applied?.changedCount).toBe(2);
        expect(applied?.previous.map((item) => item.transactionId).sort()).toEqual(
          [fresh, withTag].sort(),
        );
        expect(await world.categoryOf(fresh)).toEqual({
          category_id: world.transport,
          category_source: 'rule',
          category_rule_id: rule.id,
        });
        expect(await world.tagsOf(fresh)).toEqual([world.tripTag]);
        expect(await world.tagsOf(withTag)).toEqual([world.tripTag, world.workTag].sort());
        // What Lucas put by hand stays, tags included.
        expect(await world.categoryOf(byHand)).toMatchObject({
          category_id: world.delivery,
          category_source: 'user',
        });
        expect(await world.tagsOf(byHand)).toEqual([]);
        expect((await listRules())[0]?.appliedCount).toBe(2);
      });

      it('gives exactly what "Desfazer" needs to bring the history back', async () => {
        const first = await world.addTransaction('Uber *Trip 1');
        const second = await world.addTransaction('Uber *Trip 2', {
          category_id: world.delivery,
          category_source: 'rule',
        });
        await database.db
          .insertInto('transaction_tags')
          .values({ transaction_id: second, tag_id: world.workTag })
          .execute();
        const { applied } = await createRule({
          descriptionContains: 'uber',
          categoryId: world.transport,
          tagIds: [world.tripTag],
          applyToHistory: true,
        });
        expect(applied?.changedCount).toBe(2);

        const response = await send('POST', '/transactions/bulk/restore', {
          items: applied?.previous,
        });

        expect(restoreBulkResultSchema.parse(await response.json())).toEqual({ restoredCount: 2 });
        expect(await world.categoryOf(first)).toEqual({
          category_id: null,
          category_source: null,
          category_rule_id: null,
        });
        expect(await world.tagsOf(first)).toEqual([]);
        expect(await world.categoryOf(second)).toMatchObject({
          category_id: world.delivery,
          category_source: 'rule',
          category_rule_id: null,
        });
        expect(await world.tagsOf(second)).toEqual([world.workTag]);
      });

      it('applies with changedCount 0 when there is nothing to change', async () => {
        const { applied } = await createRule({
          descriptionContains: 'uber',
          categoryId: world.transport,
          applyToHistory: true,
        });

        expect(applied).toEqual({ changedCount: 0, previous: [] });
      });

      it('leaves the rule and the history untouched when the rule is refused', async () => {
        await createRule({ descriptionContains: 'uber', categoryId: world.delivery });
        const tx = await world.addTransaction('Uber *Trip');

        await expectError(
          await send('POST', '/rules', {
            descriptionContains: 'UBER',
            categoryId: world.transport,
            applyToHistory: true,
          }),
          409,
          'RULE_DUPLICATE',
        );

        expect((await world.categoryOf(tx)).category_id).toBeNull();
        expect(await listRules()).toHaveLength(1);
      });

      it('keeps what an older rule categorized (the oldest rule wins)', async () => {
        const older = (
          await createRule({ descriptionContains: 'uber', categoryId: world.delivery })
        ).rule;
        const mine = await world.addTransaction('Uber *Trip 1');
        const theirs = await world.addTransaction('Uber *Trip 2', {
          category_id: world.delivery,
          category_source: 'rule',
          category_rule_id: older.id,
        });

        const second = await createRule({
          descriptionContains: 'uber *trip',
          categoryId: world.transport,
          applyToHistory: true,
        });
        expect(second.applied?.changedCount).toBe(1);
        expect((await world.categoryOf(mine)).category_id).toBe(world.transport);
        expect(await world.categoryOf(theirs)).toMatchObject({
          category_id: world.delivery,
          category_rule_id: older.id,
        });
      });
    });

    it('answers the errors of the contract', async () => {
      const base = { descriptionContains: 'uber', categoryId: world.transport };
      await createRule(base);
      await database.db
        .updateTable('tags')
        .set({ archived_at: NOW })
        .where('id', '=', world.workTag)
        .execute();
      const archivedCategory = world.delivery;
      await database.db
        .updateTable('categories')
        .set({ archived_at: NOW })
        .where('id', '=', archivedCategory)
        .execute();

      await expectError(
        await send('POST', '/rules', { descriptionContains: 'ifood' }),
        422,
        'RULE_ACTION_REQUIRED',
      );
      await expectError(
        await send('POST', '/rules', { ...base, descriptionContains: 'Uber' }),
        409,
        'RULE_DUPLICATE',
      );
      await expectError(
        await send('POST', '/rules', {
          descriptionContains: 'x2',
          categoryId: world.transport,
          kind: 'income',
        }),
        422,
        'RULE_CATEGORY_KIND_MISMATCH',
      );
      await expectError(
        await send('POST', '/rules', {
          descriptionContains: 'ifood',
          categoryId: archivedCategory,
        }),
        422,
        'RULE_CATEGORY_ARCHIVED',
      );
      await expectError(
        await send('POST', '/rules', { descriptionContains: 'ifood', tagIds: [world.workTag] }),
        422,
        'RULE_TAG_ARCHIVED',
      );
      await expectError(
        await send('POST', '/rules', { descriptionContains: 'ifood', categoryId: generateId() }),
        404,
        'CATEGORY_NOT_FOUND',
      );
      await expectError(
        await send('POST', '/rules', { descriptionContains: 'ifood', tagIds: [generateId()] }),
        404,
        'TAG_NOT_FOUND',
      );
      await expectError(
        await send('POST', '/rules', {
          ...base,
          descriptionContains: 'ifood',
          accountId: generateId(),
        }),
        404,
        'ACCOUNT_NOT_FOUND',
      );
      expect(await listRules()).toHaveLength(1);
    });

    it('counts a rule that is off as a duplicate, and the same text with another account as new', async () => {
      const first = await createRule({ descriptionContains: 'uber', categoryId: world.transport });
      await send('PATCH', `/rules/${first.rule.id}`, { enabled: false });

      await expectError(
        await send('POST', '/rules', { descriptionContains: 'uber', categoryId: world.delivery }),
        409,
        'RULE_DUPLICATE',
      );
      const other = await createRule({
        descriptionContains: 'uber',
        accountId: world.accountId,
        categoryId: world.transport,
      });
      expect(other.rule.accountId).toBe(world.accountId);
    });

    it('refuses what the schema refuses', async () => {
      for (const body of [
        {},
        { categoryId: world.transport },
        { descriptionContains: 'uber', categoryId: 'not-a-uuid' },
        { descriptionContains: 'uber', categoryId: world.transport, applyToHistory: 'yes' },
        { descriptionContains: 'x'.repeat(101), categoryId: world.transport },
        { counterpartyContains: 'x'.repeat(81), categoryId: world.transport },
      ]) {
        await expectError(await send('POST', '/rules', body), 400, 'VALIDATION_FAILED');
      }
    });
  });

  describe('PATCH /rules/:id', () => {
    const makeRule = async () =>
      (
        await createRule({
          descriptionContains: 'uber',
          counterpartyContains: 'loja',
          categoryId: world.transport,
          tagIds: [world.tripTag],
        })
      ).rule;

    const patch = (id: string, body: unknown) => send('PATCH', `/rules/${id}`, body);

    it('switches the rule off and on', async () => {
      const rule = await makeRule();

      const off = ruleDtoSchema.parse(await (await patch(rule.id, { enabled: false })).json());
      const on = ruleDtoSchema.parse(await (await patch(rule.id, { enabled: true })).json());

      expect(off.enabled).toBe(false);
      expect(on.enabled).toBe(true);
    });

    it('changes the texts, the category and the tags, and clears with null', async () => {
      const rule = await makeRule();

      const dto = ruleDtoSchema.parse(
        await (
          await patch(rule.id, {
            descriptionContains: 'ifood',
            counterpartyContains: null,
            categoryId: world.delivery,
            tagIds: [world.workTag],
            amountMinCents: 500,
          })
        ).json(),
      );

      expect(dto).toMatchObject({
        descriptionContains: 'IFOOD',
        counterpartyContains: null,
        categoryId: world.delivery,
        tagIds: [world.workTag],
        amountMinCents: 500,
      });
      expect(dto.createdAt).toBe(NOW);
    });

    it('takes the category away when there are tags left', async () => {
      const rule = await makeRule();

      const dto = ruleDtoSchema.parse(await (await patch(rule.id, { categoryId: null })).json());

      expect(dto).toMatchObject({ categoryId: null, tagIds: [world.tripTag] });
    });

    it('does not touch the transactions', async () => {
      const rule = await makeRule();
      const tx = await world.addTransaction('Uber *Trip');

      await patch(rule.id, { categoryId: world.delivery });

      expect((await world.categoryOf(tx)).category_id).toBeNull();
    });

    it('answers the errors of the contract', async () => {
      const rule = await makeRule();
      const other = (await createRule({ descriptionContains: 'ifood', categoryId: world.delivery }))
        .rule;
      await database.db
        .updateTable('tags')
        .set({ archived_at: NOW })
        .where('id', '=', world.workTag)
        .execute();
      const archivedId = await insertTestCategory(database.db, {
        kind: 'expense',
        name: 'Arquivada teste',
        archived_at: NOW,
      });

      await expectError(await patch(generateId(), { enabled: false }), 404, 'RULE_NOT_FOUND');
      await expectError(
        await patch(rule.id, { categoryId: null, tagIds: [] }),
        422,
        'RULE_ACTION_REQUIRED',
      );
      await expectError(
        await patch(rule.id, { descriptionContains: 'ifood', counterpartyContains: null }),
        409,
        'RULE_DUPLICATE',
      );
      await expectError(
        await patch(rule.id, { kind: 'income' }),
        422,
        'RULE_CATEGORY_KIND_MISMATCH',
      );
      await expectError(
        await patch(rule.id, { categoryId: archivedId }),
        422,
        'RULE_CATEGORY_ARCHIVED',
      );
      await expectError(
        await patch(rule.id, { tagIds: [world.workTag] }),
        422,
        'RULE_TAG_ARCHIVED',
      );
      await expectError(
        await patch(rule.id, { categoryId: generateId() }),
        404,
        'CATEGORY_NOT_FOUND',
      );
      await expectError(await patch(rule.id, { tagIds: [generateId()] }), 404, 'TAG_NOT_FOUND');
      await expectError(
        await patch(rule.id, { accountId: generateId() }),
        404,
        'ACCOUNT_NOT_FOUND',
      );
      // The other rule did not change.
      expect((await listRules()).find((item) => item.id === other.id)?.descriptionContains).toBe(
        'IFOOD',
      );
    });

    it('refuses to clear the last text condition, an inverted range, an empty body and an unknown key', async () => {
      const rule = await makeRule();
      const onlyText = (
        await createRule({ descriptionContains: 'solo', categoryId: world.delivery })
      ).rule;

      for (const [id, body] of [
        [rule.id, { descriptionContains: null, counterpartyContains: null }],
        [onlyText.id, { descriptionContains: null }],
        [rule.id, { amountMinCents: 500, amountMaxCents: 100 }],
        [rule.id, {}],
        [rule.id, { color: 'red' }],
        ['not-a-uuid', { enabled: true }],
      ] as const) {
        await expectError(await patch(id, body), 400, 'VALIDATION_FAILED');
      }
    });

    it('checks an amount limit against the saved one', async () => {
      const rule = (
        await createRule({
          descriptionContains: 'uber',
          categoryId: world.transport,
          amountMinCents: 500,
        })
      ).rule;

      await expectError(await patch(rule.id, { amountMaxCents: 100 }), 400, 'VALIDATION_FAILED');
    });

    it('keeps working on a rule whose category was archived later (N10)', async () => {
      const rule = await makeRule();
      await database.db
        .updateTable('categories')
        .set({ archived_at: NOW })
        .where('id', '=', world.transport)
        .execute();

      const dto = ruleDtoSchema.parse(await (await patch(rule.id, { enabled: false })).json());

      expect(dto).toMatchObject({ enabled: false, categoryId: world.transport });
    });
  });

  describe('DELETE /rules/:id', () => {
    it('deletes the rule and its tags; the transactions keep the category and lose the link', async () => {
      const { rule } = await createRule({
        descriptionContains: 'uber',
        categoryId: world.transport,
        tagIds: [world.tripTag],
      });
      const tx = await world.addTransaction('Uber *Trip', {
        category_id: world.transport,
        category_source: 'rule',
        category_rule_id: rule.id,
      });

      const response = await send('DELETE', `/rules/${rule.id}`);

      expect(response.status).toBe(204);
      expect(await response.text()).toBe('');
      expect(await listRules()).toEqual([]);
      expect(
        await database.db.selectFrom('category_rule_tags').select('rule_id').execute(),
      ).toEqual([]);
      expect(await world.categoryOf(tx)).toEqual({
        category_id: world.transport,
        category_source: 'rule',
        category_rule_id: null,
      });
    });

    it('answers 404 and 400', async () => {
      await expectError(await send('DELETE', `/rules/${generateId()}`), 404, 'RULE_NOT_FOUND');
      await expectError(await send('DELETE', '/rules/nope'), 400, 'VALIDATION_FAILED');
    });
  });

  describe('POST /rules/:id/apply', () => {
    it('recategorizes the history, tells how many and gives the way back', async () => {
      const first = await world.addTransaction('Uber *Trip 1');
      const second = await world.addTransaction('Uber *Trip 2');
      const { rule } = await createRule({
        descriptionContains: 'uber',
        categoryId: world.transport,
        tagIds: [world.tripTag],
      });

      const result = await apply(rule.id);

      expect(result.changedCount).toBe(2);
      expect(await world.categoryOf(first)).toMatchObject({
        category_id: world.transport,
        category_source: 'rule',
        category_rule_id: rule.id,
      });
      expect(await world.tagsOf(second)).toEqual([world.tripTag]);

      const undo = await send('POST', '/transactions/bulk/restore', { items: result.previous });
      expect(restoreBulkResultSchema.parse(await undo.json()).restoredCount).toBe(2);
      expect((await world.categoryOf(first)).category_id).toBeNull();
      expect(await world.tagsOf(second)).toEqual([]);
    });

    it('applies the same as the preview announced', async () => {
      await world.addTransaction('Uber *Trip 1');
      await world.addTransaction('Uber *Trip 2', {
        category_id: world.delivery,
        category_source: 'user',
      });
      await world.addTransaction('Uber *Trip 3', {
        category_id: world.transport,
        category_source: 'rule',
      });
      await world.addTransaction('Uber *Trip 4', {
        category_id: world.delivery,
        category_source: 'rule',
      });
      const body = { descriptionContains: 'uber', categoryId: world.transport };
      const announced = await preview(body);
      const { rule } = await createRule(body);

      const result = await apply(rule.id);

      expect(announced).toMatchObject({ matchCount: 4, willChangeCount: 2 });
      expect(result.changedCount).toBe(announced.willChangeCount);
    });

    it('is a no-op the second time: changedCount 0 and no previous', async () => {
      await world.addTransaction('Uber *Trip 1');
      const { rule } = await createRule({
        descriptionContains: 'uber',
        categoryId: world.transport,
      });
      await apply(rule.id);

      expect(await apply(rule.id)).toEqual({ changedCount: 0, previous: [] });
    });

    it('lets the oldest rule win and the younger one lose', async () => {
      const older = (await createRule({ descriptionContains: 'uber', categoryId: world.delivery }))
        .rule;
      const younger = (
        await createRule({ descriptionContains: 'trip', categoryId: world.transport })
      ).rule;
      const tx = await world.addTransaction('Uber *Trip');

      // The younger goes first and takes it; the older then takes it over.
      expect((await apply(younger.id)).changedCount).toBe(1);
      expect(await world.categoryOf(tx)).toMatchObject({
        category_id: world.transport,
        category_rule_id: younger.id,
      });
      expect((await apply(older.id)).changedCount).toBe(1);
      expect(await world.categoryOf(tx)).toMatchObject({
        category_id: world.delivery,
        category_rule_id: older.id,
      });
      // The younger now finds it owned by an older rule and leaves it.
      expect((await apply(younger.id)).changedCount).toBe(0);
      expect((await world.categoryOf(tx)).category_id).toBe(world.delivery);
    });

    it('answers the errors of the contract', async () => {
      const { rule } = await createRule({
        descriptionContains: 'uber',
        categoryId: world.transport,
      });

      await expectError(await send('POST', `/rules/${generateId()}/apply`), 404, 'RULE_NOT_FOUND');
      await expectError(await send('POST', '/rules/nope/apply'), 400, 'VALIDATION_FAILED');

      await database.db
        .updateTable('categories')
        .set({ archived_at: NOW })
        .where('id', '=', world.transport)
        .execute();
      await expectError(
        await send('POST', `/rules/${rule.id}/apply`),
        422,
        'RULE_CATEGORY_ARCHIVED',
      );

      await send('PATCH', `/rules/${rule.id}`, { enabled: false });
      await expectError(await send('POST', `/rules/${rule.id}/apply`), 422, 'RULE_DISABLED');
    });
  });

  describe('what was put by hand is never touched, and the preview agrees with the apply', () => {
    const SOURCES = ['user', 'recurrence', 'bill'] as const;

    const seed = async () => {
      const handmade: string[] = [];
      for (const source of SOURCES) {
        handmade.push(
          await world.addTransaction('Uber *Trip ' + source, {
            category_id: world.delivery,
            category_source: source,
          }),
        );
      }
      const free = await world.addTransaction('Uber *Trip free');
      const byRule = await world.addTransaction('Uber *Trip rule', {
        category_id: world.delivery,
        category_source: 'rule',
      });
      const tagged = await world.addTransaction('Uber *Trip tagged');
      await database.db
        .insertInto('transaction_tags')
        .values({ transaction_id: tagged, tag_id: world.tripTag })
        .execute();

      return { handmade, free, byRule, tagged };
    };

    it('a rule with only tags leaves category and tags of what was put by hand', async () => {
      const { handmade, free } = await seed();
      const body = { descriptionContains: 'uber', tagIds: [world.tripTag] };

      const announced = await preview(body);
      const { rule } = await createRule(body);
      const result = await apply(rule.id);

      expect(announced.matchCount).toBe(6);
      expect(announced.willChangeCount).toBe(2);
      expect(result.changedCount).toBe(2);
      for (const id of handmade) expect(await world.tagsOf(id)).toEqual([]);
      expect(await world.tagsOf(free)).toEqual([world.tripTag]);
    });

    it('the preview, the apply and the way back count the same, whatever the rule', async () => {
      const { handmade, free, byRule } = await seed();
      const definitions = [
        { categoryId: world.transport },
        { categoryId: world.transport, tagIds: [world.workTag] },
        { categoryId: world.delivery, tagIds: [world.tripTag] },
        { tagIds: [world.tripTag] },
        { tagIds: [world.tripTag, world.workTag] },
      ];

      for (const [index, definition] of definitions.entries()) {
        const body = {
          descriptionContains: 'uber *trip',
          ...definition,
        };
        // A different text each time, so no rule is a duplicate of another.
        const unique = { ...body, amountMinCents: index };
        const announced = await preview(unique);
        const { rule } = await createRule(unique);
        const result = await apply(rule.id);

        expect(result.changedCount).toBe(announced.willChangeCount);
        expect(result.previous).toHaveLength(announced.willChangeCount);
        for (const id of handmade) {
          expect(await world.categoryOf(id)).toMatchObject({
            category_id: world.delivery,
            category_rule_id: null,
          });
          expect(await world.tagsOf(id)).toEqual([]);
        }
        expect(free).toBeDefined();
        expect(byRule).toBeDefined();
      }
    });
  });

  it('adds no tag that was archived after the rule was made', async () => {
    const { rule } = await createRule({
      descriptionContains: 'uber',
      categoryId: world.transport,
      tagIds: [world.tripTag, world.workTag],
    });
    const tx = await world.addTransaction('Uber *Trip');
    await database.db
      .updateTable('tags')
      .set({ archived_at: NOW })
      .where('id', '=', world.workTag)
      .execute();

    const result = await apply(rule.id);

    expect(result.changedCount).toBe(1);
    expect(await world.tagsOf(tx)).toEqual([world.tripTag]);
  });

  it('does nothing when a rule with only tags has only archived tags', async () => {
    const { rule } = await createRule({ descriptionContains: 'uber', tagIds: [world.workTag] });
    const tx = await world.addTransaction('Uber *Trip');
    await database.db
      .updateTable('tags')
      .set({ archived_at: NOW })
      .where('id', '=', world.workTag)
      .execute();

    expect(await apply(rule.id)).toEqual({ changedCount: 0, previous: [] });
    expect(await world.tagsOf(tx)).toEqual([]);
  });

  it('answers 401 on every route without the local token', async () => {
    const id = generateId();
    for (const [method, path] of [
      ['GET', '/rules'],
      ['POST', '/rules/preview'],
      ['POST', '/rules'],
      ['PATCH', `/rules/${id}`],
      ['POST', `/rules/${id}/apply`],
      ['DELETE', `/rules/${id}`],
    ] as const) {
      const response = await app.request(path, {
        method,
        headers: { 'x-fincheck-token': 'wrong' },
      });

      await expectError(response, 401, 'LOCAL_TOKEN_INVALID');
    }
  });
});
