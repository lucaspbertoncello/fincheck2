import type { Account as AccountContract } from '@fincheck/shared/accounts/account/account.type.ts';
import type { CreditCard as CreditCardContract } from '@fincheck/shared/accounts/credit-card/credit-card.type.ts';
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
  // Only the sync changes it: a bank account becomes manual when disconnected and back when it returns.
  source: AccountContract.Source;
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

  // An account made from what the bank sent (the sync, `source = pluggy`): the name is the one of the
  // bank, cut to the limit of the contract, and the card has the data the bank gave.
  static createFromBank(input: Account.BankInput, now: string): Account {
    if ((input.type === 'credit_card') !== (input.card !== null)) {
      throw new RangeError('Card data goes with a credit card, and only with it');
    }

    return new Account({
      type: input.type,
      source: 'pluggy',
      name: input.name.trim().slice(0, 60) || 'Conta',
      institutionCode: input.institutionCode,
      institutionName: input.institutionCode === 'other' ? input.institutionName : null,
      bankBalance: input.balance,
      bankBalanceAt: input.balance === null ? null : now,
      creditCard: input.card ? new CreditCard({ ...input.card, themeId: null }) : null,
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

  // What the bank informed in the last round (on a card, the amount used, positive). Null when the
  // bank did not send a balance: the last one stays.
  recordBankBalance(balance: Money | null, now: string): void {
    if (!this.isPluggy()) throw new RangeError('Only a bank account records a bank balance');
    if (balance === null) return;

    this.bankBalance = balance;
    this.bankBalanceAt = now;
    this.updatedAt = now;
  }

  // The account comes back to the bank (reconnected). The wallet never has one.
  switchToBank(now: string): void {
    if (this.type === 'wallet') throw new RangeError('A wallet is always manual');
    if (this.isPluggy()) return;

    this.source = 'pluggy';
    this.updatedAt = now;
  }

  // The connection was removed: the account stays and from now on is kept by hand (Q8). The bank
  // balance leaves with the origin (the database accepts it only on a bank account).
  switchToManual(now: string): void {
    if (!this.isPluggy()) return;

    this.source = 'manual';
    this.bankBalance = null;
    this.bankBalanceAt = null;
    this.updatedAt = now;
  }

  // The bank only fills what the card has not: the last 4 digits and the limit. What Lucas set is
  // never overwritten (accounts.md, hypotheses).
  fillCardFromBank(data: { last4: string | null; limit: Money | null }, now: string): void {
    const card = this.creditCard;
    if (!card) return;
    const last4 = card.last4 ?? data.last4;
    const limit = card.limit ?? data.limit;
    if (last4 === card.last4 && limit === card.limit) return;

    this.creditCard = card.change({ last4, limitCents: limit?.cents ?? null });
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
  export type BankInput = {
    type: 'checking' | 'savings' | 'credit_card';
    name: string;
    institutionCode: Institution.Code;
    institutionName: string | null;
    balance: Money | null;
    card: {
      brand: CreditCardContract.Brand;
      last4: string | null;
      closingDay: number;
      dueDay: number;
      limit: Money | null;
    } | null;
  };

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
