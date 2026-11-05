import type { Account } from '@fincheck/shared/accounts/account/account.type.ts';
import type { CreditCard } from '@fincheck/shared/accounts/credit-card/credit-card.type.ts';
import type { Institution } from '@fincheck/shared/accounts/institution/institution.type.ts';
import type { BackupFile } from '@fincheck/shared/backup/backup-file/backup-file.type.ts';
import type { BackupStatus } from '@fincheck/shared/backup/backup-status/backup-status.type.ts';
import type { BillPayment } from '@fincheck/shared/bills/bill-payment/bill-payment.type.ts';
import type { Bill } from '@fincheck/shared/bills/bill/bill.type.ts';
import type { Category } from '@fincheck/shared/categories/category/category.type.ts';
import type { InvoicePayment } from '@fincheck/shared/invoices/invoice-payment/invoice-payment.type.ts';
import type { Occurrence } from '@fincheck/shared/recurrences/occurrence/occurrence.type.ts';
import type { Recurrence } from '@fincheck/shared/recurrences/recurrence/recurrence.type.ts';
import type { Connection } from '@fincheck/shared/sync/connection/connection.type.ts';
import type { Run } from '@fincheck/shared/sync/run/run.type.ts';
import type { InstallmentPlan } from '@fincheck/shared/transactions/installment-plan/installment-plan.type.ts';
import type { Transaction } from '@fincheck/shared/transactions/transaction/transaction.type.ts';

// What the mock server keeps in memory. The Dtos of the contract are built from these records on
// every read, so a mutation shows up everywhere (lists, invoices, the Livre, the agenda).
export namespace MockState {
  export interface AccountRecord {
    id: string;
    type: Account.Type;
    source: Account.Source;
    name: string;
    institutionCode: Institution.Code;
    institutionName: string | null;
    // What the bank said (Pluggy accounts). Manual accounts add up their transactions instead.
    bankBalanceCents: number | null;
    balanceAt: string | null;
    connectionId: string | null;
    creditCard: CreditCard.Dto | null;
    archivedAt: string | null;
    createdAt: string;
  }

  // The Dto minus what is derived on every read.
  export type TransactionRecord = Omit<
    Transaction.Dto,
    'competenceOn' | 'isEdited' | 'links' | 'isInReview' | 'categorySuggestion'
  >;

  export interface InstallmentPlanRecord {
    id: string;
    accountId: string;
    origin: InstallmentPlan.Dto['origin'];
    description: string;
    purchaseOn: string;
    totalCents: number;
    installmentCount: number;
    firstInvoiceMonth: string;
    categoryId: string | null;
  }

  // An invoice row, born on the first write (correction, payment, dismissal).
  export interface InvoiceRecord {
    accountId: string;
    month: string;
    closesOn: string;
    dueOn: string;
    bankTotalCents: number | null;
    totalOverrideCents: number | null;
    overrideNote: string | null;
    payments: InvoicePayment.Dto[];
    dismissedTransactionIds: string[];
  }

  export type RecurrenceRecord = Recurrence.Dto;

  export interface OccurrenceRecord {
    id: string;
    recurrenceId: string;
    month: string;
    expectedOn: string | null;
    windowStartOn: string;
    windowEndOn: string;
    expectedAmountCents: number;
    settledAt: string | null;
    skippedAt: string | null;
    decision: Occurrence.Decision | null;
    payments: Occurrence.Payment[];
  }

  export interface BillRecord {
    id: string;
    direction: Bill.Direction;
    kind: Bill.Kind;
    description: string;
    counterparty: string | null;
    amountCents: number;
    dueOn: string | null;
    categoryId: string | null;
    origin: Bill.Origin | null;
    payments: BillPayment.Dto[];
    dismissedTransactionIds: string[];
    createdAt: string;
    updatedAt: string;
  }

  export interface CategoryRecord {
    id: string;
    kind: Category.Kind;
    name: string;
    icon: Category.Icon;
    isDefault: boolean;
    archivedAt: string | null;
  }

  export interface TagRecord {
    id: string;
    name: string;
    archivedAt: string | null;
  }

  export interface RuleRecord {
    id: string;
    descriptionContains: string | null;
    counterpartyContains: string | null;
    kind: Category.Kind | null;
    accountId: string | null;
    amountMinCents: number | null;
    amountMaxCents: number | null;
    categoryId: string | null;
    tagIds: string[];
    enabled: boolean;
    createdAt: string;
    updatedAt: string;
  }

  export interface RuleSuggestionDecisionRecord {
    pattern: string;
    categoryId: string;
    status: 'accepted' | 'dismissed';
  }

  export interface ConnectionRecord {
    id: string;
    pluggyItemId: string;
    institutionCode: Institution.Code;
    institutionName: string;
    status: Connection.Status;
    errorCode: Connection.ErrorCode | null;
    lastBankUpdateAt: string | null;
    lastSuccessAt: string | null;
    history: Connection.History;
    accountIds: string[];
    createdAt: string;
    // How many times the list was read since a first connection started: advances the progress.
    readsSinceStart: number;
  }

  export interface RunRecord {
    connectionId: string;
    run: Run.Dto;
  }

  export interface BackupRecord {
    folderPath: string | null;
    files: BackupFile.Dto[];
    running: boolean;
    lastError: BackupStatus.LastError | null;
  }

  export interface ProfileRecord {
    name: string;
    initials: string;
    updatedAt: string;
  }

  export interface Database {
    accounts: AccountRecord[];
    transactions: TransactionRecord[];
    installmentPlans: InstallmentPlanRecord[];
    invoices: InvoiceRecord[];
    recurrences: RecurrenceRecord[];
    occurrences: OccurrenceRecord[];
    bills: BillRecord[];
    categories: CategoryRecord[];
    tags: TagRecord[];
    rules: RuleRecord[];
    ruleSuggestionDecisions: RuleSuggestionDecisionRecord[];
    // Keys of the subscription suggestions Lucas answered "Agora não" to.
    subscriptionDismissals: string[];
    connections: ConnectionRecord[];
    runs: RunRecord[];
    syncSettings: { clientId: string; updatedAt: string } | null;
    backup: BackupRecord;
    profile: ProfileRecord;
  }
}
