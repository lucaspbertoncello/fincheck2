import type { Institution } from '@fincheck/shared/accounts/institution/institution.type.ts';

// The port to where the bank data comes from (today the Pluggy, adapter in `infra/pluggy/`). It
// says what Fincheck needs, in the language of Fincheck: no type of the provider crosses it, the
// amounts are integer cents with the sign of Lucas (negative leaves the account, on a card a
// purchase is negative and a payment or refund positive), and the dates are already business dates
// (`YYYY-MM-DD`, America/Sao_Paulo). Every method throws `BankProviderError` when it fails.
export interface BankDataProvider {
  // Authenticates with the keys; throws `credentials_invalid` when they are refused.
  verifyCredentials(credentials: BankDataProvider.Credentials): Promise<void>;
  // The token the widget of the provider needs (valid for 30 minutes).
  createConnectToken(
    credentials: BankDataProvider.Credentials,
  ): Promise<BankDataProvider.ConnectToken>;
  getItem(
    credentials: BankDataProvider.Credentials,
    itemId: string,
  ): Promise<BankDataProvider.Item>;
  listAccounts(
    credentials: BankDataProvider.Credentials,
    itemId: string,
  ): Promise<BankDataProvider.Account[]>;
  // The transactions of the account from `fromOn` (inclusive) to today, every page.
  listTransactions(
    credentials: BankDataProvider.Credentials,
    accountId: string,
    fromOn: string,
  ): Promise<BankDataProvider.Transaction[]>;
  // The invoices the bank closed for a card account (an open invoice does not come).
  listInvoices(
    credentials: BankDataProvider.Credentials,
    accountId: string,
  ): Promise<BankDataProvider.Invoice[]>;
}

export namespace BankDataProvider {
  export type Credentials = { clientId: string; clientSecret: string };

  export type ConnectToken = { connectToken: string; expiresAt: string };

  export type Item = {
    id: string;
    institutionName: string;
    institutionCode: Institution.Code;
    // `error` is translated by the adapter: the four codes of the contract, minus `STALE_DATA`,
    // which the core works out from `lastUpdatedAt`.
    state: 'ok' | 'updating' | 'error';
    errorCode: 'CONSENT_REVOKED' | 'LOGIN_ERROR' | 'PROVIDER_ERROR' | null;
    // When the provider last updated the bank (UTC instant); null when it never did.
    lastUpdatedAt: string | null;
  };

  export type Account = {
    id: string;
    name: string;
    type: 'checking' | 'savings' | 'credit_card';
    // The bank of the account when the connection does not say it (an aggregator such as the
    // MeuPluggy); null otherwise, and the institution of the connection holds.
    institution: { name: string; code: Institution.Code } | null;
    // What the bank informs: the balance, or on a card the amount used (positive). Null when absent.
    balanceCents: number | null;
    // The last 4 digits of the number of the account or card, when the bank sends them.
    numberHint: string | null;
    // Only on a card: what the bank says of it (a day or a limit it does not send is null).
    card: {
      brand: 'visa' | 'mastercard' | 'elo' | 'amex' | 'hipercard' | 'other';
      closingDay: number | null;
      dueDay: number | null;
      limitCents: number | null;
    } | null;
  };

  export type Transaction = {
    id: string;
    // The id the bank itself gives (Open Finance `providerId`); survives the provider recreating
    // the transaction with another `id`.
    providerRef: string | null;
    description: string;
    // With sign (see above). Never zero.
    amountCents: number;
    occurredOn: string;
    // Who sent (credit) or received (debit), as the bank says.
    counterparty: string | null;
    status: 'pending' | 'posted';
    method: 'credit' | 'debit' | 'pix' | 'boleto' | 'transfer' | 'other';
    // Only a card purchase in installments.
    installment: {
      number: number;
      total: number;
      // The total of the purchase, when the provider sends it (the direct connectors do).
      totalCents: number | null;
      // The day of the purchase, when the provider sends it.
      purchaseOn: string | null;
    } | null;
  };

  export type Invoice = { id: string; dueOn: string; totalCents: number };
}
