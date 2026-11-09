import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';

// What `sync` asks of `transactions`: to create the new transactions of the bank, to apply the
// bank's version to the ones it already has and to mark the ones it stopped sending, to set the
// nature the detectors found and the category the rules gave, and to read what it needs to tell one
// transaction from another. The owner is `transactions`, which `main` wires here. The writes receive
// the executor of the unit of work of the round.
export interface SyncTransactions {
  importNew(
    input: SyncTransactions.ImportInput,
    executor: Kysely<Database>,
  ): Promise<SyncTransactions.ImportOutput>;
  applyBankVersions(
    input: { updates: SyncTransactions.VersionUpdate[] },
    executor: Kysely<Database>,
  ): Promise<{ updatedCount: number }>;
  markRemovedByBank(
    input: { transactionIds: string[] },
    executor: Kysely<Database>,
  ): Promise<{ removedCount: number }>;
  applyDetectedNatures(
    input: {
      payments: string[];
      transfers: { firstId: string; secondId: string }[];
    },
    executor: Kysely<Database>,
  ): Promise<{ payments: string[]; transfers: string[] }>;
  applyRules(
    input: { items: SyncTransactions.RuleItem[] },
    executor: Kysely<Database>,
  ): Promise<{ changedCount: number }>;
  // The transactions of the account that came from the bank, from a day on, with the original.
  listBank(
    input: { accountId: string; fromOn: string },
    executor?: Kysely<Database>,
  ): Promise<SyncTransactions.BankRow[]>;
  // The ones the detectors look at, between two days.
  listDetectionPool(
    input: { from: string; to: string },
    executor?: Kysely<Database>,
  ): Promise<SyncTransactions.PoolRow[]>;
  countBank(accountIds: string[], executor?: Kysely<Database>): Promise<number>;
}

export namespace SyncTransactions {
  export type ImportItem = {
    key: string;
    description: string;
    amountCents: number;
    occurredOn: string;
    counterparty: string | null;
    status: 'pending' | 'posted';
    method: 'credit' | 'debit' | 'pix' | 'boleto' | 'transfer' | 'other';
    installment: {
      number: number;
      total: number;
      totalCents: number | null;
      purchaseOn: string | null;
    } | null;
  };

  export type ImportInput = { accountId: string; items: ImportItem[] };

  export type Created = {
    key: string;
    transactionId: string;
    accountId: string;
    nature: 'expense' | 'income';
    amountCents: number;
    occurredOn: string;
    description: string;
    counterparty: string | null;
    categoryId: string | null;
  };

  export type ImportOutput = { created: Created[] };

  export type VersionUpdate = {
    transactionId: string;
    description: string;
    amountCents: number;
    occurredOn: string;
    counterparty: string | null;
    status: 'pending' | 'posted';
  };

  export type RuleItem = {
    transactionId: string;
    ruleId: string | null;
    category: {
      id: string;
      kind: 'expense' | 'income';
      isArchived: boolean;
      isTransfer?: boolean;
    } | null;
    tagIds: string[];
  };

  export type BankRow = {
    transactionId: string;
    bankDescription: string;
    bankAmountCents: number;
    bankOccurredOn: string;
    isRemovedByBank: boolean;
  };

  export type PoolRow = {
    transactionId: string;
    accountId: string;
    isCard: boolean;
    amountCents: number;
    occurredOn: string;
    description: string;
    nature:
      | 'expense'
      | 'income'
      | 'transfer'
      | 'invoice_payment'
      | 'balance_adjustment'
      | 'lent'
      | 'reimbursed';
    natureSetBy: 'system' | 'user';
    hasUserCategory: boolean;
    isSplit: boolean;
    isLinked: boolean;
    transferCounterpartId: string | null;
  };
}
