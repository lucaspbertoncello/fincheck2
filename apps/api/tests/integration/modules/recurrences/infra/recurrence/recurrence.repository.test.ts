import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { DateRule } from '#/modules/recurrences/domain/recurrence/date-rule.value-object.ts';
import { Recurrence } from '#/modules/recurrences/domain/recurrence/recurrence.entity.ts';
import { KyselyRecurrenceRepository } from '#/modules/recurrences/infra/recurrence/recurrence.repository.ts';
import { Month } from '#/shared/date/month.value-object.ts';
import { Money } from '#/shared/money/money.value-object.ts';
import { insertTestAccount } from '#tests/support/accounts/account/insert-test-account.util.ts';
import { insertTestCategory } from '#tests/support/categories/category/insert-test-category.util.ts';
import { createTestDatabase } from '#tests/support/database/create-test-database.util.ts';

const NOW = '2026-10-22T15:00:00.000Z';
const LATER = '2026-10-23T15:00:00.000Z';

describe('KyselyRecurrenceRepository', () => {
  let database: Awaited<ReturnType<typeof createTestDatabase>>;
  let repository: KyselyRecurrenceRepository;

  beforeEach(async () => {
    database = await createTestDatabase();
    repository = new KyselyRecurrenceRepository(database.db);
  });

  afterEach(async () => {
    await database.destroy();
  });

  const build = (overrides: Partial<Recurrence.CreateInput> = {}) =>
    Recurrence.create(
      {
        kind: 'expense',
        name: 'Academia',
        expectedAmount: Money.fromCents(10990),
        dateRule: DateRule.create({ type: 'fixed_day', day: 10 }),
        startsMonth: Month.of('2026-10'),
        ...overrides,
      },
      NOW,
    );

  it('writes and reads every field of a recurrence as it was', async () => {
    const accountId = await insertTestAccount(database.db);
    const categoryId = await insertTestCategory(database.db, {
      kind: 'income',
      name: 'Renda teste',
    });
    const recurrence = build({
      kind: 'income',
      name: 'Maxxy',
      expectedAmount: Money.fromCents(420000),
      amountMode: 'last_received',
      counterparty: 'Pix de G. Prado, conta PJ',
      matchText: 'G Prado',
      employmentRegime: 'pj',
      accountId,
      method: 'pix',
      categoryId,
      dateRule: DateRule.create({ type: 'around_day', day: 25, toleranceDays: 2 }),
      maxPayments: 2,
    });

    await repository.save(recurrence);
    const read = await repository.findById(recurrence.id);

    expect(read).toMatchObject({
      id: recurrence.id,
      kind: 'income',
      name: 'Maxxy',
      amountMode: 'last_received',
      counterparty: 'Pix de G. Prado, conta PJ',
      matchText: 'G PRADO',
      employmentRegime: 'pj',
      accountId,
      method: 'pix',
      categoryId,
      isSubscription: false,
      serviceSlug: null,
      maxPayments: 2,
      pausedAt: null,
      archivedAt: null,
      createdAt: NOW,
      updatedAt: NOW,
    });
    expect(read?.expectedAmount.cents).toBe(420000);
    expect(read?.startsMonth.value).toBe('2026-10');
    expect(read?.dateRule.toDto()).toEqual({
      type: 'around_day',
      day: 25,
      businessDayNumber: null,
      toleranceDays: 2,
      nonBusinessDayShift: null,
    });
  });

  it('keeps the shift of a fixed day and the subscription mark with its service', async () => {
    const recurrence = build({
      isSubscription: true,
      serviceSlug: 'spotify',
      dateRule: DateRule.create({ type: 'fixed_day', day: 10, nonBusinessDayShift: 'after' }),
    });

    await repository.save(recurrence);
    const read = await repository.findById(recurrence.id);

    expect(read).toMatchObject({ isSubscription: true, serviceSlug: 'spotify' });
    expect(read?.dateRule.nonBusinessDayShift).toBe('after');
  });

  it('reads a service that is not on the list any more (Star+ left it) as "Outro", not as an error', async () => {
    const recurrence = build({ isSubscription: true, serviceSlug: 'netflix' });
    await repository.save(recurrence);
    await database.db
      .updateTable('recurrences')
      .set({ service_slug: 'starplus' })
      .where('id', '=', recurrence.id)
      .execute();

    const read = await repository.findById(recurrence.id);

    expect(read).toMatchObject({ isSubscription: true, serviceSlug: null });
  });

  it('updates what changes and never the id, the kind or the creation', async () => {
    const recurrence = build();
    await repository.save(recurrence);

    recurrence.edit({ name: 'Academia Smart', expectedAmount: Money.fromCents(12990) }, LATER);
    recurrence.pause(LATER);
    await repository.save(recurrence);
    const read = await repository.findById(recurrence.id);

    expect(read).toMatchObject({
      name: 'Academia Smart',
      pausedAt: LATER,
      createdAt: NOW,
      updatedAt: LATER,
      kind: 'expense',
    });
    expect(read?.expectedAmount.cents).toBe(12990);
    expect(await database.db.selectFrom('recurrences').selectAll().execute()).toHaveLength(1);
  });

  it('answers null for an id that does not exist, and finds many by id', async () => {
    const first = build({ name: 'A' });
    const second = build({ name: 'B' });
    await repository.save(first);
    await repository.save(second);

    expect(await repository.findById('nope')).toBeNull();
    expect(
      (await repository.findByIds([first.id, second.id, 'nope']))
        .map((item) => item.name)
        .toSorted(),
    ).toEqual(['A', 'B']);
    expect(await repository.findByIds([])).toEqual([]);
  });

  it('lists everything, without the deleted ones unless asked, the marked subscriptions, and the active ones', async () => {
    const plain = build({ name: 'Comum' });
    const subscription = build({ name: 'Assinatura', isSubscription: true });
    const paused = build({ name: 'Pausada' });
    paused.pause(LATER);
    const deleted = build({ name: 'Excluída', isSubscription: true });
    deleted.archive(LATER);
    for (const recurrence of [plain, subscription, paused, deleted])
      await repository.save(recurrence);

    const names = async (filter: Parameters<typeof repository.findMany>[0]) =>
      (await repository.findMany(filter)).map((item) => item.name).toSorted();

    expect(await names({ includeArchived: false })).toEqual(['Assinatura', 'Comum', 'Pausada']);
    expect(await names({ includeArchived: true })).toEqual([
      'Assinatura',
      'Comum',
      'Excluída',
      'Pausada',
    ]);
    expect(await names({ includeArchived: true, subscriptionsOnly: true })).toEqual([
      'Assinatura',
      'Excluída',
    ]);
    expect((await repository.findActive()).map((item) => item.name).toSorted()).toEqual([
      'Assinatura',
      'Comum',
    ]);
  });

  it('refuses a rule the table cannot hold (the checks of the table are the second guard)', async () => {
    const recurrence = build();
    await repository.save(recurrence);

    await expect(
      database.db
        .updateTable('recurrences')
        .set({ date_rule: 'fixed_day', day: null })
        .where('id', '=', recurrence.id)
        .execute(),
    ).rejects.toThrow();
  });
});
