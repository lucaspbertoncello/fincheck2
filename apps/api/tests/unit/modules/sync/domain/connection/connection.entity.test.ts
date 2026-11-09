import { describe, expect, it } from 'vitest';

import { AccountLink } from '#/modules/sync/domain/connection/account-link.value-object.ts';
import { Connection } from '#/modules/sync/domain/connection/connection.entity.ts';

const NOW = '2026-11-09T15:00:00.000Z';

const register = (overrides: Partial<Connection.RegisterInput> = {}) =>
  Connection.register(
    {
      pluggyItemId: '11111111-1111-4111-8111-111111111111',
      institutionCode: 'nubank',
      institutionName: 'Nubank',
      lastBankUpdateAt: null,
      ...overrides,
    },
    NOW,
  );

const link = (overrides: Partial<AccountLink.Attributes> = {}) =>
  new AccountLink({
    pluggyAccountId: 'pa1',
    pluggyName: 'Conta Corrente',
    pluggyType: 'checking',
    accountId: 'a1',
    numberHint: '4321',
    cursorOn: null,
    ...overrides,
  });

describe('Connection: born', () => {
  it('is active, with no error, no success yet and the history of the first round to come', () => {
    expect(register()).toMatchObject({
      status: 'active',
      errorCode: null,
      lastSuccessAt: null,
      historyStatus: 'running',
      historyFromOn: null,
      accountLinks: [],
    });
  });
});

describe('Connection.isStale (selo "dado de ontem")', () => {
  const connection = (lastBankUpdateAt: string | null) => register({ lastBankUpdateAt });

  it('is never stale without a date of update', () => {
    expect(connection(null).isStale(NOW)).toBe(false);
  });

  it('is not stale at 36 hours and is at one second more', () => {
    expect(connection('2026-11-08T03:00:00.000Z').isStale(NOW)).toBe(false);
    expect(connection('2026-11-08T02:59:59.000Z').isStale(NOW)).toBe(true);
  });

  it('does not depend on the state: an active, an error and a disconnected one are stale the same', () => {
    const old = connection('2026-11-01T00:00:00.000Z');
    expect(old.isStale(NOW)).toBe(true);

    old.recordFailure({ code: 'LOGIN_ERROR', declaredByProvider: true }, NOW);
    expect(old.isStale(NOW)).toBe(true);

    old.disconnect(NOW);
    expect(old.isStale(NOW)).toBe(true);
  });
});

describe('Connection.recordSuccess', () => {
  it('goes active, clears the error and records the success, the update of the bank and the history', () => {
    const connection = register();
    connection.recordFailure({ code: 'LOGIN_ERROR', declaredByProvider: true }, NOW);

    connection.recordSuccess(
      { lastBankUpdateAt: '2026-11-09T13:00:00.000Z', oldestTransactionOn: '2025-11-10' },
      NOW,
    );

    expect(connection).toMatchObject({
      status: 'active',
      errorCode: null,
      lastBankUpdateAt: '2026-11-09T13:00:00.000Z',
      lastSuccessAt: NOW,
      historyStatus: 'done',
      historyFromOn: '2025-11-10',
    });
  });

  it('keeps the last update the bank had when the Pluggy sends none', () => {
    const connection = register({ lastBankUpdateAt: '2026-11-08T10:00:00.000Z' });

    connection.recordSuccess({ lastBankUpdateAt: null, oldestTransactionOn: null }, NOW);

    expect(connection.lastBankUpdateAt).toBe('2026-11-08T10:00:00.000Z');
  });

  it('the history only goes back: a later day does not replace an earlier one', () => {
    const connection = register();
    connection.recordSuccess({ lastBankUpdateAt: null, oldestTransactionOn: '2026-01-10' }, NOW);
    connection.recordSuccess({ lastBankUpdateAt: null, oldestTransactionOn: '2026-05-01' }, NOW);
    connection.recordSuccess({ lastBankUpdateAt: null, oldestTransactionOn: '2025-12-01' }, NOW);

    expect(connection.historyFromOn).toBe('2025-12-01');
  });
});

describe('Connection.recordFailure', () => {
  it('an error the Pluggy declared moves the connection to error with the code', () => {
    const connection = register();

    connection.recordFailure({ code: 'CONSENT_REVOKED', declaredByProvider: true }, NOW);

    expect(connection).toMatchObject({ status: 'error', errorCode: 'CONSENT_REVOKED' });
  });

  it('a failure, declared or not, never advances the date of the last update of the bank', () => {
    const connection = register({ lastBankUpdateAt: '2026-11-06T10:00:00.000Z' });

    connection.recordFailure({ code: 'LOGIN_ERROR', declaredByProvider: true }, NOW);
    expect(connection.lastBankUpdateAt).toBe('2026-11-06T10:00:00.000Z');

    connection.recordFailure({ code: 'PROVIDER_ERROR', declaredByProvider: false }, NOW);
    expect(connection.lastBankUpdateAt).toBe('2026-11-06T10:00:00.000Z');
    expect(connection.lastSuccessAt).toBeNull();
  });

  it('not being able to reach the Pluggy does not move a connection that was working', () => {
    const connection = register();
    connection.recordSuccess({ lastBankUpdateAt: null, oldestTransactionOn: null }, NOW);

    connection.recordFailure({ code: 'PROVIDER_ERROR', declaredByProvider: false }, NOW);

    expect(connection).toMatchObject({ status: 'active', errorCode: null, historyStatus: 'done' });
  });

  it('but a connection already in error keeps the new code', () => {
    const connection = register();
    connection.recordFailure({ code: 'LOGIN_ERROR', declaredByProvider: true }, NOW);

    connection.recordFailure({ code: 'PROVIDER_ERROR', declaredByProvider: false }, NOW);

    expect(connection).toMatchObject({ status: 'error', errorCode: 'PROVIDER_ERROR' });
  });

  it('a history that was running goes back to waiting', () => {
    const connection = register();

    connection.recordFailure({ code: 'PROVIDER_ERROR', declaredByProvider: false }, NOW);

    expect(connection.historyStatus).toBe('pending');
  });
});

describe('Connection: disconnect and reactivate', () => {
  it('disconnecting clears the error and keeps the links', () => {
    const connection = register();
    connection.putLink(link());
    connection.recordFailure({ code: 'LOGIN_ERROR', declaredByProvider: true }, NOW);

    connection.disconnect(NOW);

    expect(connection).toMatchObject({ status: 'disconnected', errorCode: null });
    expect(connection.accountLinks).toHaveLength(1);
    expect(connection.isDisconnected()).toBe(true);
  });

  it('reactivating brings it back active and reads the history again', () => {
    const connection = register();
    connection.recordSuccess({ lastBankUpdateAt: null, oldestTransactionOn: null }, NOW);
    connection.disconnect(NOW);

    connection.reactivate({ lastBankUpdateAt: '2026-11-09T14:00:00.000Z' }, NOW);

    expect(connection).toMatchObject({
      status: 'active',
      errorCode: null,
      historyStatus: 'running',
      lastBankUpdateAt: '2026-11-09T14:00:00.000Z',
    });
  });
});

describe('Connection: the links to the accounts', () => {
  it('puts a link, replaces the one of the same Pluggy account and finds it', () => {
    const connection = register();

    connection.putLink(link());
    connection.putLink(link({ pluggyName: 'Conta Nova' }));
    connection.putLink(link({ pluggyAccountId: 'pa2', accountId: 'a2' }));

    expect(connection.accountLinks).toHaveLength(2);
    expect(connection.linkOf('pa1')?.pluggyName).toBe('Conta Nova');
    expect(connection.linkOf('missing')).toBeUndefined();
  });

  it('drops the link of an account of Fincheck', () => {
    const connection = register();
    connection.putLink(link());
    connection.putLink(link({ pluggyAccountId: 'pa2', accountId: 'a2' }));

    connection.unlinkAccount('a1');

    expect(connection.accountLinks.map((kept) => kept.accountId)).toEqual(['a2']);
  });
});

describe('AccountLink', () => {
  it('waits for Lucas when it has no account', () => {
    expect(link({ accountId: null }).isPending()).toBe(true);
    expect(link().isPending()).toBe(false);
  });

  it('takes an account without changing the rest', () => {
    const taken = link({ accountId: null }).withAccount('a9');

    expect(taken).toMatchObject({ accountId: 'a9', pluggyAccountId: 'pa1', numberHint: '4321' });
  });

  it('the cursor only moves forward', () => {
    const moved = link().withCursor('2026-11-09');

    expect(moved.cursorOn).toBe('2026-11-09');
    expect(moved.withCursor('2026-11-01').cursorOn).toBe('2026-11-09');
  });
});
