import { apiErrorSchema } from '@fincheck/shared/common/api-error/api-error.schema.ts';
import { listResponseSchema } from '@fincheck/shared/common/list/list.schema.ts';
import {
  createRuleResultSchema,
  ruleDtoSchema,
} from '@fincheck/shared/categories/rule/rule.schema.ts';
import { ruleSuggestionDtoSchema } from '@fincheck/shared/categories/rule-suggestion/rule-suggestion.schema.ts';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { generateId } from '#/shared/id/generate-id.util.ts';
import { createTestApp } from '#tests/support/app/create-test-app.util.ts';
import { createRuleTestWorld } from '#tests/support/categories/rule/create-rule-test-world.util.ts';
import { createTestDatabase } from '#tests/support/database/create-test-database.util.ts';
import { createFixedClock } from '#tests/support/shared/clock/create-fixed-clock.util.ts';

const NOW = '2026-11-06T15:00:00.000Z';
const listSchema = listResponseSchema(ruleSuggestionDtoSchema);

describe('rule suggestions routes', () => {
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

  const suggestions = async (query = '') => {
    const response = await send('GET', `/rule-suggestions${query}`);
    expect(response.status).toBe(200);

    return listSchema.parse(await response.json()).items;
  };

  // Lucas moved `count` transactions called `description` to `categoryId`, by hand.
  const movedByHand = async (description: string, categoryId: string, count: number) => {
    const ids: string[] = [];
    for (let index = 0; index < count; index++) {
      ids.push(
        await world.addTransaction(description, {
          category_id: categoryId,
          category_source: 'user',
          occurred_on: `2026-10-0${String(index + 1)}`,
        }),
      );
    }

    return ids;
  };

  describe('GET /rule-suggestions', () => {
    it('is empty with nothing categorized by hand', async () => {
      expect(await suggestions()).toEqual([]);
    });

    it('suggests a rule after three transactions with the same description put in the same category', async () => {
      await movedByHand('Uber *Trip', world.transport, 3);

      const [suggestion] = await suggestions();

      expect(suggestion).toMatchObject({
        pattern: 'UBER *TRIP',
        categoryId: world.transport,
        kind: 'expense',
        recategorizedCount: 3,
      });
    });

    it('does not suggest from two, nor from three spread over two categories', async () => {
      await movedByHand('Padaria', world.transport, 2);
      await movedByHand('Uber *Trip', world.transport, 2);
      await movedByHand('Uber *Trip', world.delivery, 2);

      expect(await suggestions()).toEqual([]);
    });

    it('groups the description with no difference for case, accent or installment number', async () => {
      await world.addTransaction('Loja Pão 1/3', {
        category_id: world.delivery,
        category_source: 'user',
      });
      await world.addTransaction('LOJA PAO 2/3', {
        category_id: world.delivery,
        category_source: 'user',
      });
      await world.addTransaction('loja pão', {
        category_id: world.delivery,
        category_source: 'user',
      });

      const [suggestion] = await suggestions();

      expect(suggestion).toMatchObject({ pattern: 'LOJA PAO', recategorizedCount: 3 });
    });

    it('counts only what Lucas put and that is not ignored, and only an active category', async () => {
      await movedByHand('Uber *Trip', world.transport, 2);
      await world.addTransaction('Uber *Trip', {
        category_id: world.transport,
        category_source: 'user',
        ignored_at: NOW,
      });
      await world.addTransaction('Uber *Trip', {
        category_id: world.transport,
        category_source: 'rule',
      });
      expect(await suggestions()).toEqual([]);

      await world.addTransaction('Uber *Trip', {
        category_id: world.transport,
        category_source: 'user',
      });
      expect(await suggestions()).toHaveLength(1);

      await database.db
        .updateTable('categories')
        .set({ archived_at: NOW })
        .where('id', '=', world.transport)
        .execute();
      expect(await suggestions()).toEqual([]);
    });

    it('says how many the rule matches and how many it would change, with examples (N12)', async () => {
      await movedByHand('Uber *Trip', world.transport, 3);
      await world.addTransaction('Uber *Trip', { occurred_on: '2026-10-20' });
      await world.addTransaction('Uber *Trip', { occurred_on: '2026-10-21' });
      await world.addTransaction('Uber *Trip', {
        occurred_on: '2026-10-22',
        category_id: world.delivery,
        category_source: 'rule',
      });
      await world.addTransaction('Padaria');

      const [suggestion] = await suggestions();

      // The three put by hand match the rule and do not change.
      expect(suggestion).toMatchObject({ matchCount: 6, willChangeCount: 3 });
      expect(suggestion?.examples.map((example) => example.occurredOn)).toEqual([
        '2026-10-22',
        '2026-10-21',
        '2026-10-20',
      ]);
      expect(suggestion?.examples[0]).toMatchObject({
        fromCategoryId: world.delivery,
        toCategoryId: world.transport,
      });
    });

    it('is covered by a rule that is on for the same category, and not by one that is off or for another', async () => {
      await movedByHand('Uber *Trip', world.transport, 3);
      const other = await send('POST', '/rules', {
        descriptionContains: 'uber',
        categoryId: world.delivery,
      });
      expect(other.status).toBe(201);
      expect(await suggestions()).toHaveLength(1);

      const covering = createRuleResultSchema.parse(
        await (
          await send('POST', '/rules', { descriptionContains: 'trip', categoryId: world.transport })
        ).json(),
      );
      expect(await suggestions()).toEqual([]);

      await send('PATCH', `/rules/${covering.rule.id}`, { enabled: false });
      expect(await suggestions()).toHaveLength(1);
    });

    it('orders by the most repeated, then by pattern, and filters by transaction', async () => {
      const zeta = await movedByHand('Zeta', world.transport, 3);
      await movedByHand('Alfa', world.transport, 3);
      await movedByHand('Meio', world.delivery, 5);

      expect((await suggestions()).map((item) => item.pattern)).toEqual(['MEIO', 'ALFA', 'ZETA']);
      expect(
        (await suggestions(`?transactionIds=${zeta[0] ?? ''},${generateId()}`)).map(
          (item) => item.pattern,
        ),
      ).toEqual(['ZETA']);
    });

    it('refuses an item that is not an id, even with nothing categorized yet', async () => {
      await expectError(
        await send('GET', '/rule-suggestions?transactionIds=abc'),
        400,
        'VALIDATION_FAILED',
      );
    });

    it('refuses an empty list of ids and more than 500', async () => {
      await expectError(
        await send('GET', '/rule-suggestions?transactionIds='),
        400,
        'VALIDATION_FAILED',
      );
      const many = Array.from({ length: 501 }, () => generateId()).join(',');
      await expectError(
        await send('GET', `/rule-suggestions?transactionIds=${many}`),
        400,
        'VALIDATION_FAILED',
      );
    });
  });

  describe('POST /rule-suggestions/dismiss', () => {
    it('hides the suggestion for good, but not the same pattern for another category', async () => {
      await movedByHand('Uber *Trip', world.transport, 3);
      await movedByHand('Uber *Trip', world.delivery, 3);

      const response = await send('POST', '/rule-suggestions/dismiss', {
        pattern: 'uber *trip',
        categoryId: world.transport,
      });

      expect(response.status).toBe(204);
      expect((await suggestions()).map((item) => item.categoryId)).toEqual([world.delivery]);
    });

    it('answers 204 again for the same answer and records it once', async () => {
      const body = { pattern: 'UBER *TRIP', categoryId: world.transport };

      expect((await send('POST', '/rule-suggestions/dismiss', body)).status).toBe(204);
      expect((await send('POST', '/rule-suggestions/dismiss', body)).status).toBe(204);

      const rows = await database.db.selectFrom('rule_suggestions').selectAll().execute();
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({
        pattern: 'UBER *TRIP',
        category_id: world.transport,
        status: 'dismissed',
        decided_at: NOW,
      });
    });

    it('answers 404 for a category that does not exist and 400 for a bad body', async () => {
      await expectError(
        await send('POST', '/rule-suggestions/dismiss', { pattern: 'X', categoryId: generateId() }),
        404,
        'CATEGORY_NOT_FOUND',
      );
      await expectError(
        await send('POST', '/rule-suggestions/dismiss', {
          pattern: '',
          categoryId: world.transport,
        }),
        400,
        'VALIDATION_FAILED',
      );
      await expectError(
        await send('POST', '/rule-suggestions/dismiss', {}),
        400,
        'VALIDATION_FAILED',
      );
    });
  });

  describe('POST /rule-suggestions/accept', () => {
    it('creates the rule "description contains the pattern" and the suggestion does not come back', async () => {
      await movedByHand('Uber *Trip', world.transport, 3);

      const response = await send('POST', '/rule-suggestions/accept', {
        pattern: 'UBER *TRIP',
        categoryId: world.transport,
        tagIds: [world.tripTag],
        applyToHistory: false,
      });

      expect(response.status).toBe(201);
      const { rule, applied } = createRuleResultSchema.parse(await response.json());
      expect(applied).toBeNull();
      expect(rule).toMatchObject({
        descriptionContains: 'UBER *TRIP',
        counterpartyContains: null,
        kind: null,
        accountId: null,
        amountMinCents: null,
        amountMaxCents: null,
        categoryId: world.transport,
        tagIds: [world.tripTag],
        enabled: true,
      });
      expect(await suggestions()).toEqual([]);
      const decided = await database.db.selectFrom('rule_suggestions').select('status').execute();
      expect(decided).toEqual([{ status: 'accepted' }]);
    });

    it('applies to the history when asked: the number is the one the suggestion announced', async () => {
      const byHand = await movedByHand('Uber *Trip', world.transport, 3);
      const fresh = await world.addTransaction('Uber *Trip', { occurred_on: '2026-10-20' });
      const [suggestion] = await suggestions();

      const response = await send('POST', '/rule-suggestions/accept', {
        pattern: suggestion?.pattern,
        categoryId: world.transport,
        applyToHistory: true,
      });

      const { rule, applied } = createRuleResultSchema.parse(await response.json());
      expect(applied?.changedCount).toBe(suggestion?.willChangeCount);
      expect(applied?.changedCount).toBe(1);
      expect(await world.categoryOf(fresh)).toMatchObject({
        category_id: world.transport,
        category_source: 'rule',
        category_rule_id: rule.id,
      });
      for (const id of byHand) {
        expect((await world.categoryOf(id)).category_source).toBe('user');
      }
    });

    it('records nothing when the rule is refused, and the rule is not created', async () => {
      await send('POST', '/rules', {
        descriptionContains: 'UBER *TRIP',
        categoryId: world.delivery,
      });

      await expectError(
        await send('POST', '/rule-suggestions/accept', {
          pattern: 'uber *trip',
          categoryId: world.transport,
          applyToHistory: false,
        }),
        409,
        'RULE_DUPLICATE',
      );

      expect(await database.db.selectFrom('rule_suggestions').selectAll().execute()).toEqual([]);
      const rules = listResponseSchema(ruleDtoSchema).parse(
        await (await send('GET', '/rules')).json(),
      );
      expect(rules.items).toHaveLength(1);
    });

    it('answers the errors of the rule', async () => {
      await database.db
        .updateTable('categories')
        .set({ archived_at: NOW })
        .where('id', '=', world.delivery)
        .execute();
      await database.db
        .updateTable('tags')
        .set({ archived_at: NOW })
        .where('id', '=', world.workTag)
        .execute();
      const accept = (overrides: Record<string, unknown>) =>
        send('POST', '/rule-suggestions/accept', {
          pattern: 'UBER',
          categoryId: world.transport,
          applyToHistory: false,
          ...overrides,
        });

      await expectError(
        await accept({ categoryId: world.delivery }),
        422,
        'RULE_CATEGORY_ARCHIVED',
      );
      await expectError(await accept({ tagIds: [world.workTag] }), 422, 'RULE_TAG_ARCHIVED');
      await expectError(
        await accept({ tagIds: [world.deliveryTag] }),
        422,
        'RULE_TAG_CATEGORY_MISMATCH',
      );
      await expectError(await accept({ categoryId: generateId() }), 404, 'CATEGORY_NOT_FOUND');
      await expectError(await accept({ tagIds: [generateId()] }), 404, 'TAG_NOT_FOUND');
      expect(await database.db.selectFrom('rule_suggestions').selectAll().execute()).toEqual([]);
    });

    it('refuses what the schema refuses, and a pattern that is too short once normalized', async () => {
      for (const body of [
        {},
        { pattern: 'UBER', categoryId: world.transport },
        { pattern: '', categoryId: world.transport, applyToHistory: false },
        { pattern: 'UBER', categoryId: 'nope', applyToHistory: false },
        { pattern: 'x', categoryId: world.transport, applyToHistory: false },
        { pattern: '12/34', categoryId: world.transport, applyToHistory: false },
      ]) {
        await expectError(
          await send('POST', '/rule-suggestions/accept', body),
          400,
          'VALIDATION_FAILED',
        );
      }
    });
  });

  it('answers 401 on every route without the local token', async () => {
    for (const [method, path] of [
      ['GET', '/rule-suggestions'],
      ['POST', '/rule-suggestions/accept'],
      ['POST', '/rule-suggestions/dismiss'],
    ] as const) {
      const response = await app.request(path, {
        method,
        headers: { 'x-fincheck-token': 'wrong' },
      });

      await expectError(response, 401, 'LOCAL_TOKEN_INVALID');
    }
  });
});
