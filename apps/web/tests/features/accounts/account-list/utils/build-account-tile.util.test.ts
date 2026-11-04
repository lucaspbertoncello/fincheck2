import type { Account } from '@fincheck/shared/accounts/account/account.type.ts';
import { describe, expect, it } from 'vitest';

import { buildAccountTile } from '#/features/accounts/account-list/utils/build-account-tile.util.ts';

const now = new Date('2026-10-30T12:00:00.000Z');

function account(overrides: Partial<Account.Dto>): Account.Dto {
  return {
    id: 'a1',
    type: 'checking',
    source: 'pluggy',
    name: 'Nubank',
    institutionCode: 'nubank',
    institutionName: null,
    balanceCents: 341_258,
    balanceAt: '2026-10-30T11:48:00.000Z',
    connection: {
      connectionId: 'c1',
      status: 'active',
      errorCode: null,
      lastBankUpdateAt: '2026-10-30T11:48:00.000Z',
    },
    creditCard: null,
    archivedAt: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function tile(overrides: Partial<Account.Dto>) {
  return buildAccountTile({
    account: account(overrides),
    connection: undefined,
    history: undefined,
    now,
  });
}

describe('buildAccountTile', () => {
  it('says "atualizado pelo banco" for a bank account and offers no balance action', () => {
    const result = tile({});

    expect(result.badge).toBe('Open Finance');
    expect(result.sync).toEqual({ tone: 'ok', label: 'Atualizado pelo banco há 12 min' });
    expect(result.actionLabel).toBeUndefined();
  });

  it('reports a connection error with its reason', () => {
    const result = tile({
      connection: {
        connectionId: 'c1',
        status: 'error',
        errorCode: 'LOGIN_ERROR',
        lastBankUpdateAt: null,
      },
    });

    expect(result.sync).toEqual({
      tone: 'failed',
      label: 'Conexão com erro',
      reason: 'login com erro',
    });
  });

  it('gives the wallet "Atualizar saldo" and a manual account "Ajustar saldo"', () => {
    const wallet = tile({
      type: 'wallet',
      source: 'manual',
      connection: null,
      institutionCode: 'wallet',
    });
    const manual = tile({ source: 'manual', connection: null });

    expect(wallet.theme).toBe('wallet');
    expect(wallet.sync.tone).toBe('manual');
    expect(wallet.actionLabel).toBe('Atualizar saldo');
    expect(manual.actionLabel).toBe('Ajustar saldo');
  });

  it('offers "Desarquivar" instead of "Arquivar" for an archived account, and no balance action', () => {
    const result = tile({
      source: 'manual',
      connection: null,
      archivedAt: '2026-02-01T00:00:00.000Z',
    });

    expect(result.menuItems.map((item) => item.key)).toEqual(['edit', 'unarchive', 'delete']);
    expect(result.actionLabel).toBeUndefined();
  });
});
