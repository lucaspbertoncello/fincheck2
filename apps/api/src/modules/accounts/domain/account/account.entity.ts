import type { Account as AccountContract } from '@fincheck/shared/accounts/account/account.type.ts';
import type { Institution } from '@fincheck/shared/accounts/institution/institution.type.ts';

import { AccountAlreadyArchivedError } from '#/modules/accounts/domain/account/account-already-archived.error.ts';
import { AccountArchivedError } from '#/modules/accounts/domain/account/account-archived.error.ts';
import { AccountBalanceNotAdjustableError } from '#/modules/accounts/domain/account/account-balance-not-adjustable.error.ts';
import { AccountHistoryNotAvailableError } from '#/modules/accounts/domain/account/account-history-not-available.error.ts';
import { AccountNotACardError } from '#/modules/accounts/domain/account/account-not-a-card.error.ts';
import { AccountNotArchivedError } from '#/modules/accounts/domain/account/account-not-archived.error.ts';
import { AccountSourceLockedError } from '#/modules/accounts/domain/account/account-source-locked.error.ts';
import { CreditCard } from '#/modules/accounts/domain/credit-card/credit-card.value-object.ts';
import { RequestValidationError } from '#/shared/errors/request-validation.error.ts';
import { generateId } from '#/shared/id/generate-id.util.ts';
import type { Money } from '#/shared/money/money.value-object.ts';

// Where the money is: checking, savings, wallet or credit card. The root of the aggregate (the card
// data is its 1:1 extension). A Pluggy account keeps the bank balance as a recorded fact; a manual
// one (and the wallet) has its balance added up from the transactions, which `accounts` never reads:
// the use case asks the owner through a port.
export class Account {
  readonly id: string;
  readonly type: AccountContract.Type;
  readonly source: AccountContract.Source;
  name: string;
  institutionCode: Institution.Code;
  institutionName: string | null;
  // What the bank informed (on a card, the amount used). Only a Pluggy account has it.
  bankBalance: Money | null;
  bankBalanceAt: string | null;
  creditCard: CreditCard | null;
  archivedAt: string | null;
  readonly createdAt: string;
  updatedAt: string;

  constructor(attr: Account.Attributes) {
    this.id = attr.id ?? generateId();
    this.type = attr.type;
    this.source = attr.source;
    this.name = attr.name;
    this.institutionCode = attr.institutionCode;
    this.institutionName = attr.institutionName;
    this.bankBalance = attr.bankBalance;
    this.bankBalanceAt = attr.bankBalanceAt;
    this.creditCard = attr.creditCard;
    this.archivedAt = attr.archivedAt;
    this.createdAt = attr.createdAt;
    this.updatedAt = attr.updatedAt ?? attr.createdAt;
  }

  // A manual account, wallet or manual card. The request already passed its schema; here the wallet
  // forces its institution and the institution name only exists for `other`.
  static createManual(request: AccountContract.CreateRequest, now: string): Account {
    const isWallet = request.type === 'wallet';
    const isCard = request.type === 'credit_card';
    if (isCard !== (request.creditCard !== undefined)) {
      throw new RangeError('Card data goes with a credit card, and only with it');
    }
    if (!isWallet && request.institutionCode === undefined) {
      throw new RangeError('A bank account needs its institution');
    }
    const institutionCode = isWallet ? 'wallet' : (request.institutionCode ?? 'other');

    return new Account({
      type: request.type,
      source: 'manual',
      name: request.name,
      institutionCode,
      institutionName: institutionCode === 'other' ? (request.institutionName ?? null) : null,
      bankBalance: null,
      bankBalanceAt: null,
      creditCard: request.creditCard ? CreditCard.fromRequest(request.creditCard) : null,
      archivedAt: null,
      createdAt: now,
    });
  }

  isCard(): boolean {
    return this.type === 'credit_card';
  }

  isPluggy(): boolean {
    return this.source === 'pluggy';
  }

  isArchived(): boolean {
    return this.archivedAt !== null;
  }

  // The balance is added up from transactions (manual account and wallet), as opposed to the one
  // the bank informs. A manual card has no balance: its number is the invoice.
  hasCalculatedBalance(): boolean {
    return !this.isPluggy() && !this.isCard();
  }

  // Edit by name, bank and card data. `type` and `source` never change. Works on an archived account.
  edit(patch: AccountContract.UpdateRequest, now: string): void {
    if (
      this.isPluggy() &&
      (patch.institutionCode !== undefined || patch.institutionName !== undefined)
    ) {
      throw new AccountSourceLockedError();
    }
    if (patch.institutionCode !== undefined && this.type === 'wallet') {
      throw new RequestValidationError([
        { path: 'institutionCode', message: 'A carteira não muda de banco.' },
      ]);
    }
    if (patch.institutionCode === 'wallet') {
      throw new RequestValidationError([
        { path: 'institutionCode', message: 'Só a carteira usa o banco "wallet".' },
      ]);
    }
    if (patch.creditCard !== undefined && !this.creditCard) {
      throw new AccountNotACardError();
    }

    const institutionCode = patch.institutionCode ?? this.institutionCode;
    let institutionName: string | null = null;
    if (institutionCode === 'other') {
      institutionName =
        patch.institutionName === undefined ? this.institutionName : patch.institutionName;
      if (institutionName === null) {
        throw new RequestValidationError([
          { path: 'institutionName', message: 'Informe o nome do banco.' },
        ]);
      }
    } else if (typeof patch.institutionName === 'string') {
      throw new RequestValidationError([
        { path: 'institutionName', message: 'Só o banco "other" tem nome.' },
      ]);
    }

    this.name = patch.name ?? this.name;
    this.institutionCode = institutionCode;
    this.institutionName = institutionName;
    if (patch.creditCard && this.creditCard) {
      this.creditCard = this.creditCard.change(patch.creditCard);
    }
    this.updatedAt = now;
  }

  archive(now: string): void {
    if (this.isArchived()) throw new AccountAlreadyArchivedError();
    this.archivedAt = now;
    this.updatedAt = now;
  }

  unarchive(now: string): void {
    if (!this.isArchived()) throw new AccountNotArchivedError();
    this.archivedAt = null;
    this.updatedAt = now;
  }

  // Only the balance of a manual account or wallet is adjusted (BR-ACC-006), and not while archived.
  assertBalanceAdjustable(): void {
    if (this.isPluggy() || this.isCard()) throw new AccountBalanceNotAdjustableError();
    if (this.isArchived()) throw new AccountArchivedError();
  }

  // The balance curve is for accounts with a balance: not a card (it uses the invoice) and not a
  // Pluggy account the bank has not informed yet.
  assertHasBalanceHistory(): void {
    if (this.isCard() || (this.isPluggy() && this.bankBalance === null)) {
      throw new AccountHistoryNotAvailableError();
    }
  }
}

export namespace Account {
  export type Attributes = {
    id?: string;
    type: AccountContract.Type;
    source: AccountContract.Source;
    name: string;
    institutionCode: Institution.Code;
    institutionName: string | null;
    bankBalance: Money | null;
    bankBalanceAt: string | null;
    creditCard: CreditCard | null;
    archivedAt: string | null;
    createdAt: string;
    updatedAt?: string;
  };
}
