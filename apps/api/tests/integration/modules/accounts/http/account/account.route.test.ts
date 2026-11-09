import { accountDtoSchema } from '@fincheck/shared/accounts/account/account.schema.ts';
import { apiErrorSchema } from '@fincheck/shared/common/api-error/api-error.schema.ts';
import { listResponseSchema } from '@fincheck/shared/common/list/list.schema.ts';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { generateId } from '#/shared/id/generate-id.util.ts';
import { insertTestAccount } from '#tests/support/accounts/account/insert-test-account.util.ts';
import { createTestApp } from '#tests/support/app/create-test-app.util.ts';
import { createTestDatabase } from '#tests/support/database/create-test-database.util.ts';
import { createFixedClock } from '#tests/support/shared/clock/create-fixed-clock.util.ts';

const NOW = '2026-11-06T15:00:00.000Z';
const listSchema = listResponseSchema(accountDtoSchema);

describe('accounts routes', () => {
  let database: Awaited<ReturnType<typeof createTestDatabase>>;
  let app: ReturnType<typeof createTestApp>;

  beforeEach(async () => {
    database = await createTestDatabase();
    app = createTestApp(database.db, { clock: createFixedClock(NOW) });
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

  const create = async (body: unknown) => {
    const response = await send('POST', '/accounts', body);
    expect(response.status).toBe(201);

    return accountDtoSchema.parse(await response.json());
  };

  const expectError = async (response: Response, status: number, code: string) => {
    expect(response.status).toBe(status);
    expect(apiErrorSchema.parse(await response.json()).code).toBe(code);
  };

  describe('POST /accounts', () => {
    it('creates a manual checking account', async () => {
      const dto = await create({ type: 'checking', name: ' Nubank ', institutionCode: 'nubank' });

      expect(dto).toMatchObject({
        type: 'checking',
        source: 'manual',
        name: 'Nubank',
        institutionCode: 'nubank',
        institutionName: null,
        balanceCents: 0,
        balanceAt: null,
        connection: null,
        creditCard: null,
        archivedAt: null,
        createdAt: NOW,
      });
    });

    it('creates a wallet whatever the institution sent, and a savings with "other"', async () => {
      const wallet = await create({ type: 'wallet', name: 'Carteira' });
      const savings = await create({
        type: 'savings',
        name: 'Cofre',
        institutionCode: 'other',
        institutionName: 'Banrisul',
      });

      expect(wallet.institutionCode).toBe('wallet');
      expect(savings).toMatchObject({ institutionCode: 'other', institutionName: 'Banrisul' });
    });

    it('creates a manual card with no balance, keeping the card data', async () => {
      const card = await create({
        type: 'credit_card',
        name: 'Roxinho',
        institutionCode: 'nubank',
        creditCard: {
          brand: 'mastercard',
          last4: '4321',
          closingDay: 3,
          dueDay: 10,
          limitCents: 800000,
          themeId: 'nubank-ultravioleta',
        },
      });

      expect(card).toMatchObject({
        balanceCents: null,
        creditCard: {
          brand: 'mastercard',
          last4: '4321',
          closingDay: 3,
          dueDay: 10,
          limitCents: 800000,
          themeId: 'nubank-ultravioleta',
        },
      });
    });

    it('refuses crossed fields with 400 VALIDATION_FAILED and creates nothing', async () => {
      const wrong = [
        { type: 'credit_card', name: 'x', institutionCode: 'nubank' },
        {
          type: 'checking',
          name: 'x',
          institutionCode: 'nubank',
          creditCard: { brand: 'visa', closingDay: 1, dueDay: 2 },
        },
        {
          type: 'credit_card',
          name: 'x',
          institutionCode: 'nubank',
          initialBalanceCents: 100,
          creditCard: { brand: 'visa', closingDay: 1, dueDay: 2 },
        },
        { type: 'checking', name: 'x', institutionCode: 'wallet' },
        { type: 'checking', name: 'x', institutionCode: 'nubank', institutionName: 'Sicredi' },
        { type: 'checking', name: 'x', institutionCode: 'other' },
        { type: 'checking', name: '   ', institutionCode: 'nubank' },
        { type: 'checking', name: 'x' },
      ];

      for (const body of wrong) {
        await expectError(await send('POST', '/accounts', body), 400, 'VALIDATION_FAILED');
      }
      expect(await database.db.selectFrom('accounts').select('id').execute()).toEqual([]);
    });

    it('refuses a body that is not JSON with 400', async () => {
      const response = await app.request('/accounts', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: '{nope',
      });

      await expectError(response, 400, 'VALIDATION_FAILED');
    });

    it('records the initial balance as the first adjustment and shows it as the balance', async () => {
      const dto = await create({
        type: 'checking',
        name: 'Nubank',
        institutionCode: 'nubank',
        initialBalanceCents: 5000,
      });
      const wallet = await create({ type: 'wallet', name: 'Carteira', initialBalanceCents: -1500 });

      expect(dto.balanceCents).toBe(5000);
      expect(wallet.balanceCents).toBe(-1500);
      const rows = await database.db
        .selectFrom('transactions')
        .select(['account_id', 'nature', 'origin', 'description', 'amount_cents', 'occurred_on'])
        .orderBy('amount_cents', 'desc')
        .execute();
      expect(rows).toEqual([
        {
          account_id: dto.id,
          nature: 'balance_adjustment',
          origin: 'manual',
          description: 'Ajuste de saldo: Saldo inicial',
          amount_cents: 5000,
          occurred_on: '2026-11-06',
        },
        {
          account_id: wallet.id,
          nature: 'balance_adjustment',
          origin: 'manual',
          description: 'Ajuste de saldo: Saldo inicial',
          amount_cents: -1500,
          occurred_on: '2026-11-06',
        },
      ]);
    });

    it('records no adjustment when the initial balance is zero or absent', async () => {
      await create({ type: 'checking', name: 'A', institutionCode: 'nubank' });
      await create({ type: 'wallet', name: 'B', initialBalanceCents: 0 });

      expect(await database.db.selectFrom('transactions').select('id').execute()).toEqual([]);
    });
  });

  describe('GET /accounts', () => {
    it('lists by type and name, without the archived', async () => {
      await create({
        type: 'credit_card',
        name: 'Roxinho',
        institutionCode: 'nubank',
        creditCard: { brand: 'visa', closingDay: 1, dueDay: 8 },
      });
      await create({ type: 'wallet', name: 'Carteira' });
      await create({ type: 'checking', name: 'Zeta', institutionCode: 'inter' });
      await create({ type: 'checking', name: 'água', institutionCode: 'itau' });
      await insertTestAccount(database.db, {
        name: 'Arquivada',
        archived_at: '2026-10-01T00:00:00.000Z',
      });

      const response = await send('GET', '/accounts');

      expect(response.status).toBe(200);
      const { items } = listSchema.parse(await response.json());
      expect(items.map((item) => item.name)).toEqual(['água', 'Zeta', 'Carteira', 'Roxinho']);
    });

    it('includes the archived with includeArchived=true and rejects other values', async () => {
      await insertTestAccount(database.db, {
        name: 'Arquivada',
        archived_at: '2026-10-01T00:00:00.000Z',
      });

      const withArchived = listSchema.parse(
        await (await send('GET', '/accounts?includeArchived=true')).json(),
      );
      const without = listSchema.parse(
        await (await send('GET', '/accounts?includeArchived=false')).json(),
      );

      expect(withArchived.items).toHaveLength(1);
      expect(without.items).toEqual([]);
      await expectError(
        await send('GET', '/accounts?includeArchived=maybe'),
        400,
        'VALIDATION_FAILED',
      );
    });

    it('answers an empty list', async () => {
      const response = await send('GET', '/accounts');

      expect(await response.json()).toEqual({ items: [] });
    });

    it('shows the bank balance, the time and the card of a Pluggy account as recorded', async () => {
      const id = await insertTestAccount(database.db, {
        source: 'pluggy',
        institution_code: 'nubank',
        bank_balance_cents: 987654,
        bank_balance_at: '2026-11-06T14:48:00.000Z',
      });

      const dto = accountDtoSchema.parse(await (await send('GET', `/accounts/${id}`)).json());

      expect(dto).toMatchObject({
        source: 'pluggy',
        balanceCents: 987654,
        balanceAt: '2026-11-06T14:48:00.000Z',
        connection: null,
      });
    });
  });

  describe('GET /accounts/:id', () => {
    it('answers the account, archived or not', async () => {
      const id = await insertTestAccount(database.db, { archived_at: '2026-10-01T00:00:00.000Z' });

      const response = await send('GET', `/accounts/${id}`);

      expect(response.status).toBe(200);
      expect(accountDtoSchema.parse(await response.json()).archivedAt).toBe(
        '2026-10-01T00:00:00.000Z',
      );
    });

    it('answers 404 ACCOUNT_NOT_FOUND for an unknown id and 400 for something that is not an id', async () => {
      await expectError(await send('GET', `/accounts/${generateId()}`), 404, 'ACCOUNT_NOT_FOUND');
      await expectError(await send('GET', '/accounts/abc'), 400, 'VALIDATION_FAILED');
    });
  });

  describe('PATCH /accounts/:id', () => {
    it('renames and changes the bank of a manual account', async () => {
      const { id } = await create({ type: 'checking', name: 'Velho', institutionCode: 'nubank' });

      const response = await send('PATCH', `/accounts/${id}`, {
        name: 'Novo',
        institutionCode: 'other',
        institutionName: 'Sicredi',
      });

      expect(response.status).toBe(200);
      expect(accountDtoSchema.parse(await response.json())).toMatchObject({
        id,
        name: 'Novo',
        institutionCode: 'other',
        institutionName: 'Sicredi',
        type: 'checking',
        source: 'manual',
      });
    });

    it('changes the card in part and clears with null', async () => {
      const card = await create({
        type: 'credit_card',
        name: 'Roxinho',
        institutionCode: 'nubank',
        creditCard: {
          brand: 'visa',
          last4: '1111',
          closingDay: 3,
          dueDay: 10,
          limitCents: 5000,
          themeId: 'x',
        },
      });

      const response = await send('PATCH', `/accounts/${card.id}`, {
        creditCard: { closingDay: 20, last4: null, limitCents: null, themeId: null },
      });

      expect(accountDtoSchema.parse(await response.json()).creditCard).toEqual({
        brand: 'visa',
        last4: null,
        closingDay: 20,
        dueDay: 10,
        limitCents: null,
        themeId: null,
      });
    });

    it('refuses a body whose only field is an empty creditCard with 400 (P4-1)', async () => {
      const card = await create({
        type: 'credit_card',
        name: 'Roxinho',
        institutionCode: 'nubank',
        creditCard: { brand: 'visa', closingDay: 3, dueDay: 10 },
      });

      for (const body of [{ creditCard: {} }, {}]) {
        const response = await send('PATCH', `/accounts/${card.id}`, body);
        await expectError(response, 400, 'VALIDATION_FAILED');
      }
      const unchanged = await send('GET', `/accounts/${card.id}`);
      expect(accountDtoSchema.parse(await unchanged.json())).toEqual(card);
      // An empty card next to a real field is harmless.
      const renamed = await send('PATCH', `/accounts/${card.id}`, { name: 'Novo', creditCard: {} });
      expect(renamed.status).toBe(200);
    });

    it('lets a Pluggy account be renamed and have its card corrected, but locks its bank', async () => {
      const id = await insertTestAccount(database.db, {
        source: 'pluggy',
        type: 'credit_card',
        institution_code: 'nubank',
        bank_balance_cents: 100,
        bank_balance_at: NOW,
      });
      await database.db
        .insertInto('credit_cards')
        .values({
          account_id: id,
          brand: 'visa',
          last4: null,
          closing_day: 1,
          due_day: 8,
          limit_cents: null,
          theme_id: null,
        })
        .execute();

      const renamed = await send('PATCH', `/accounts/${id}`, {
        name: 'Roxinho',
        creditCard: { dueDay: 15 },
      });
      expect(accountDtoSchema.parse(await renamed.json())).toMatchObject({
        name: 'Roxinho',
        creditCard: { dueDay: 15 },
      });
      const rebanked = await send('PATCH', `/accounts/${id}`, {
        institutionCode: 'nubank',
        institutionName: null,
      });
      expect(accountDtoSchema.parse(await rebanked.json())).toMatchObject({
        institutionCode: 'nubank',
        institutionName: null,
      });
    });

    it('refuses card data on an account that is not a card with 422', async () => {
      const { id } = await create({ type: 'checking', name: 'x', institutionCode: 'nubank' });

      await expectError(
        await send('PATCH', `/accounts/${id}`, { creditCard: { dueDay: 5 } }),
        422,
        'ACCOUNT_NOT_A_CARD',
      );
    });

    it('refuses the bank of a wallet, an empty body and fields that do not change with 400', async () => {
      const { id } = await create({ type: 'wallet', name: 'Carteira' });

      await expectError(
        await send('PATCH', `/accounts/${id}`, { institutionCode: 'nubank' }),
        400,
        'VALIDATION_FAILED',
      );
      await expectError(await send('PATCH', `/accounts/${id}`, {}), 400, 'VALIDATION_FAILED');
      await expectError(
        await send('PATCH', `/accounts/${id}`, { type: 'savings' }),
        400,
        'VALIDATION_FAILED',
      );
      await expectError(
        await send('PATCH', `/accounts/${id}`, { name: '' }),
        400,
        'VALIDATION_FAILED',
      );
    });

    it('works on an archived account and answers 404 for an unknown id', async () => {
      const id = await insertTestAccount(database.db, {
        institution_code: 'nubank',
        archived_at: '2026-10-01T00:00:00.000Z',
      });

      const response = await send('PATCH', `/accounts/${id}`, { name: 'Corrigida' });

      expect(accountDtoSchema.parse(await response.json()).name).toBe('Corrigida');
      await expectError(
        await send('PATCH', `/accounts/${generateId()}`, { name: 'x' }),
        404,
        'ACCOUNT_NOT_FOUND',
      );
    });
  });

  describe('POST /accounts/:id/archive and /unarchive', () => {
    it('archives, shows the stamp, and the list hides it', async () => {
      const { id } = await create({ type: 'checking', name: 'x', institutionCode: 'nubank' });

      const response = await send('POST', `/accounts/${id}/archive`);

      expect(response.status).toBe(200);
      expect(accountDtoSchema.parse(await response.json()).archivedAt).toBe(NOW);
      expect(listSchema.parse(await (await send('GET', '/accounts')).json()).items).toEqual([]);
    });

    it('unarchives and the account comes back to the list', async () => {
      const id = await insertTestAccount(database.db, { archived_at: '2026-10-01T00:00:00.000Z' });

      const response = await send('POST', `/accounts/${id}/unarchive`);

      expect(accountDtoSchema.parse(await response.json()).archivedAt).toBe(null);
      expect(listSchema.parse(await (await send('GET', '/accounts')).json()).items).toHaveLength(1);
    });

    it('answers 409 for archiving twice and for unarchiving an active one, and 404 for unknown ids', async () => {
      const { id } = await create({ type: 'checking', name: 'x', institutionCode: 'nubank' });

      await expectError(
        await send('POST', `/accounts/${id}/unarchive`),
        409,
        'ACCOUNT_NOT_ARCHIVED',
      );
      await send('POST', `/accounts/${id}/archive`);
      await expectError(
        await send('POST', `/accounts/${id}/archive`),
        409,
        'ACCOUNT_ALREADY_ARCHIVED',
      );
      await expectError(
        await send('POST', `/accounts/${generateId()}/archive`),
        404,
        'ACCOUNT_NOT_FOUND',
      );
      await expectError(
        await send('POST', `/accounts/${generateId()}/unarchive`),
        404,
        'ACCOUNT_NOT_FOUND',
      );
    });
  });

  it('mounts the deletion routes now that the owners of what hangs on an account exist', async () => {
    const { id } = await create({ type: 'wallet', name: 'Carteira' });

    expect((await send('GET', `/accounts/${id}/deletion-impact`)).status).toBe(200);
    expect((await send('DELETE', `/accounts/${id}`)).status).toBe(204);
    await expectError(await send('GET', `/accounts/${id}`), 404, 'ACCOUNT_NOT_FOUND');
  });
});
