import { CONNECTION_STALE_AFTER_HOURS } from '@fincheck/shared/sync/connection/connection.constant.ts';
import type { Connection as ConnectionContract } from '@fincheck/shared/sync/connection/connection.type.ts';
import type { Institution } from '@fincheck/shared/accounts/institution/institution.type.ts';

import type { AccountLink } from '#/modules/sync/domain/connection/account-link.value-object.ts';
import { generateId } from '#/shared/id/generate-id.util.ts';

const MS_PER_HOUR = 3_600_000;

// A bank connected in the Meu Pluggy (one item of the Pluggy): the root of the sync. It keeps the
// state Lucas sees (`active`, `error`, `disconnected`), when the Pluggy last updated the bank, the
// error already translated (never the message of the Pluggy, BR-SYN-004), how far the history of the
// first connection came (BR-SYN-005) and the links to its accounts (few: one to five). The links to
// the transactions are many and live in their own store.
export class Connection {
  readonly id: string;
  readonly pluggyItemId: string;
  institutionCode: Institution.Code;
  institutionName: string;
  status: ConnectionContract.Status;
  errorCode: ConnectionContract.ErrorCode | null;
  lastBankUpdateAt: string | null;
  lastSuccessAt: string | null;
  historyStatus: ConnectionContract.HistoryStatus;
  historyFromOn: string | null;
  accountLinks: AccountLink[];
  readonly createdAt: string;
  updatedAt: string;

  constructor(attr: Connection.Attributes) {
    this.id = attr.id ?? generateId();
    this.pluggyItemId = attr.pluggyItemId;
    this.institutionCode = attr.institutionCode;
    this.institutionName = attr.institutionName;
    this.status = attr.status;
    this.errorCode = attr.errorCode;
    this.lastBankUpdateAt = attr.lastBankUpdateAt;
    this.lastSuccessAt = attr.lastSuccessAt;
    this.historyStatus = attr.historyStatus;
    this.historyFromOn = attr.historyFromOn;
    this.accountLinks = attr.accountLinks;
    this.createdAt = attr.createdAt;
    this.updatedAt = attr.updatedAt ?? attr.createdAt;
  }

  // The first registration of an item: active, and the history of the first round still to come.
  static register(input: Connection.RegisterInput, now: string): Connection {
    return new Connection({
      pluggyItemId: input.pluggyItemId,
      institutionCode: input.institutionCode,
      institutionName: input.institutionName,
      status: 'active',
      errorCode: null,
      lastBankUpdateAt: input.lastBankUpdateAt,
      lastSuccessAt: null,
      historyStatus: 'running',
      historyFromOn: null,
      accountLinks: [],
      createdAt: now,
    });
  }

  isDisconnected(): boolean {
    return this.status === 'disconnected';
  }

  // The selo "dado do Bradesco de ontem": the last update of the bank is older than 36 hours.
  // Worked out when read, never stored, and independent of the state (BR-SYN-004).
  isStale(now: string): boolean {
    if (this.lastBankUpdateAt === null) return false;

    return (
      Date.parse(now) - Date.parse(this.lastBankUpdateAt) >
      CONNECTION_STALE_AFTER_HOURS * MS_PER_HOUR
    );
  }

  linkOf(pluggyAccountId: string): AccountLink | undefined {
    return this.accountLinks.find((link) => link.pluggyAccountId === pluggyAccountId);
  }

  // Adds the link or replaces the one of the same Pluggy account.
  putLink(link: AccountLink): void {
    this.accountLinks = [
      ...this.accountLinks.filter((kept) => kept.pluggyAccountId !== link.pluggyAccountId),
      link,
    ];
  }

  // The account of Fincheck leaves this connection's links (it was adopted by an account of the
  // Pluggy of another item, or of this one with another id).
  unlinkAccount(accountId: string): void {
    this.accountLinks = this.accountLinks.filter((link) => link.accountId !== accountId);
  }

  // Lucas disconnected it: no round runs on it any more. Accounts, transactions and the links stay
  // (they match the accounts and the transactions again if he reconnects, without duplicating).
  disconnect(now: string): void {
    this.status = 'disconnected';
    this.errorCode = null;
    this.updatedAt = now;
  }

  // The same item registered again after being disconnected: the connection comes back, and the
  // history of this round is read again (the accounts return to the bank in the round).
  reactivate(input: { lastBankUpdateAt: string | null }, now: string): void {
    this.status = 'active';
    this.errorCode = null;
    this.historyStatus = 'running';
    if (input.lastBankUpdateAt !== null) this.lastBankUpdateAt = input.lastBankUpdateAt;
    this.updatedAt = now;
  }

  // A round that ended well: active again, no error, the update of the bank as the Pluggy said it,
  // and the history of the first connection done. `oldestTransactionOn` is the oldest day brought.
  recordSuccess(
    input: { lastBankUpdateAt: string | null; oldestTransactionOn: string | null },
    now: string,
  ): void {
    this.status = 'active';
    this.errorCode = null;
    this.lastBankUpdateAt = input.lastBankUpdateAt ?? this.lastBankUpdateAt;
    this.lastSuccessAt = now;
    this.historyStatus = 'done';
    if (
      input.oldestTransactionOn !== null &&
      (this.historyFromOn === null || input.oldestTransactionOn < this.historyFromOn)
    ) {
      this.historyFromOn = input.oldestTransactionOn;
    }
    this.updatedAt = now;
  }

  // A round that failed. When the Pluggy itself said so (consent revoked, login error, no news for
  // days) the connection goes to `error` with the code. When Fincheck only could not reach the
  // Pluggy (network, 5xx) the state does not change, unless it was already in error: then it keeps
  // the new code. A history that was running goes back to waiting. A failure never moves
  // `lastBankUpdateAt`: it says when the bank data that Fincheck imported was updated, and a round
  // that imported nothing must not make an old data look fresh.
  recordFailure(
    input: { code: ConnectionContract.ErrorCode; declaredByProvider: boolean },
    now: string,
  ): void {
    if (input.declaredByProvider) {
      this.status = 'error';
      this.errorCode = input.code;
    } else if (this.status === 'error') {
      this.errorCode = input.code;
    }
    if (this.historyStatus === 'running') this.historyStatus = 'pending';
    this.updatedAt = now;
  }
}

export namespace Connection {
  export type Attributes = {
    id?: string;
    pluggyItemId: string;
    institutionCode: Institution.Code;
    institutionName: string;
    status: ConnectionContract.Status;
    errorCode: ConnectionContract.ErrorCode | null;
    lastBankUpdateAt: string | null;
    lastSuccessAt: string | null;
    historyStatus: ConnectionContract.HistoryStatus;
    historyFromOn: string | null;
    accountLinks: AccountLink[];
    createdAt: string;
    updatedAt?: string;
  };

  export type RegisterInput = {
    pluggyItemId: string;
    institutionCode: Institution.Code;
    institutionName: string;
    lastBankUpdateAt: string | null;
  };
}
