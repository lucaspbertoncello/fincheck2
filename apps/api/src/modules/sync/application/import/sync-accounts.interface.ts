import type { Institution } from '@fincheck/shared/accounts/institution/institution.type.ts';
import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';

// What `sync` asks of `accounts`: to create, refresh and hand back to manual the accounts of the
// bank, and to read the candidates of a reconnection. The owner is `accounts`, which `main` wires
// here. The writes receive the executor of the unit of work of the caller.
export interface SyncAccounts {
  create(
    input: SyncAccounts.CreateInput,
    executor: Kysely<Database>,
  ): Promise<{ accountId: string }>;
  // `isImported` is false when the account is archived: the sync ignores it (BR-ACC-008).
  refresh(
    input: SyncAccounts.RefreshInput,
    executor: Kysely<Database>,
  ): Promise<{ isImported: boolean; isCard: boolean }>;
  // Null when the account was already manual.
  convertToManual(
    accountId: string,
    executor: Kysely<Database>,
  ): Promise<{ isCard: boolean; lastBankBalanceCents: number | null } | null>;
  // The accounts of the same bank and type that are not archived.
  findCandidates(
    input: { institutionCode: Institution.Code; type: 'checking' | 'savings' | 'credit_card' },
    executor?: Kysely<Database>,
  ): Promise<SyncAccounts.Candidate[]>;
  summaries(
    accountIds: string[],
    executor?: Kysely<Database>,
  ): Promise<Map<string, SyncAccounts.Summary>>;
}

export namespace SyncAccounts {
  export type CreateInput = {
    type: 'checking' | 'savings' | 'credit_card';
    name: string;
    institutionCode: Institution.Code;
    institutionName: string | null;
    balanceCents: number | null;
    card: {
      brand: 'visa' | 'mastercard' | 'elo' | 'amex' | 'hipercard' | 'other';
      last4: string | null;
      closingDay: number;
      dueDay: number;
      limitCents: number | null;
    } | null;
  };

  export type RefreshInput = {
    accountId: string;
    balanceCents: number | null;
    card: { last4: string | null; limitCents: number | null } | null;
  };

  export type Candidate = {
    accountId: string;
    name: string;
    type: 'checking' | 'savings' | 'wallet' | 'credit_card';
    source: 'pluggy' | 'manual';
    institutionName: string | null;
    last4: string | null;
  };

  export type Summary = {
    accountId: string;
    name: string;
    type: 'checking' | 'savings' | 'wallet' | 'credit_card';
    source: 'pluggy' | 'manual';
  };
}
