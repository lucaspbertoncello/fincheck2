import type { BankDataProvider } from '#/modules/sync/application/provider/bank-data-provider.interface.ts';

// An item of the Pluggy in the language of the port: a Nubank connection read and fine, updated 2
// hours before the clock of the tests (09/11/2026 12:00 in São Paulo).
export function buildTestItem(
  overrides: Partial<BankDataProvider.Item> = {},
): BankDataProvider.Item {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    institutionName: 'Nubank',
    institutionCode: 'nubank',
    state: 'ok',
    errorCode: null,
    lastUpdatedAt: '2026-11-09T13:00:00.000Z',
    ...overrides,
  };
}

// A checking account of the Pluggy with the final 4321 and R$ 1.000,00.
export function buildTestBankAccount(
  overrides: Partial<BankDataProvider.Account> = {},
): BankDataProvider.Account {
  return {
    id: 'pluggy-account-checking',
    name: 'Conta Corrente',
    type: 'checking',
    institution: null,
    balanceCents: 100000,
    numberHint: '4321',
    card: null,
    ...overrides,
  };
}

// A credit card of the Pluggy: Visa, final 1234, closes on the 5th, due on the 12th, limit R$ 5.000,00.
export function buildTestBankCard(
  overrides: Partial<BankDataProvider.Account> = {},
): BankDataProvider.Account {
  return {
    id: 'pluggy-account-card',
    name: 'Cartão Platinum',
    type: 'credit_card',
    institution: null,
    balanceCents: 25000,
    numberHint: '1234',
    card: { brand: 'visa', closingDay: 5, dueDay: 12, limitCents: 500000 },
    ...overrides,
  };
}

let sequence = 0;

// A transaction of the Pluggy: a Pix debit of R$ 52,80 on 05/11/2026, posted. A new id each time.
export function buildTestBankTransaction(
  overrides: Partial<BankDataProvider.Transaction> = {},
): BankDataProvider.Transaction {
  sequence += 1;

  return {
    id: `pluggy-transaction-${String(sequence)}`,
    providerRef: null,
    description: 'Pix enviado',
    amountCents: -5280,
    occurredOn: '2026-11-05',
    counterparty: null,
    status: 'posted',
    method: 'pix',
    installment: null,
    ...overrides,
  };
}
