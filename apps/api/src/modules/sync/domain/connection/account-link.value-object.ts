// Account of the Pluggy ↔ account of Fincheck. Immutable: a change returns a new link. The id of the
// Pluggy never leaves `sync`. `accountId` null means the account is waiting for Lucas to pick which
// existing account it is (a reconnection with more than one candidate); until then it is not
// imported. `numberHint` is the end of the number the Pluggy sent, what tells an account of a new
// item from an old one. `cursorOn` is up to when the transactions already came.
export class AccountLink {
  readonly pluggyAccountId: string;
  readonly pluggyName: string;
  readonly pluggyType: 'checking' | 'savings' | 'credit_card';
  readonly accountId: string | null;
  readonly numberHint: string | null;
  readonly cursorOn: string | null;

  constructor(attr: AccountLink.Attributes) {
    this.pluggyAccountId = attr.pluggyAccountId;
    this.pluggyName = attr.pluggyName;
    this.pluggyType = attr.pluggyType;
    this.accountId = attr.accountId;
    this.numberHint = attr.numberHint;
    this.cursorOn = attr.cursorOn;
  }

  isPending(): boolean {
    return this.accountId === null;
  }

  withAccount(accountId: string): AccountLink {
    return new AccountLink({ ...this, accountId });
  }

  // The cursor only moves forward.
  withCursor(cursorOn: string): AccountLink {
    if (this.cursorOn !== null && this.cursorOn >= cursorOn) return this;

    return new AccountLink({ ...this, cursorOn });
  }
}

export namespace AccountLink {
  export type Attributes = {
    pluggyAccountId: string;
    pluggyName: string;
    pluggyType: 'checking' | 'savings' | 'credit_card';
    accountId: string | null;
    numberHint: string | null;
    cursorOn: string | null;
  };
}
