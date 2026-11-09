import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import { BankInstallmentSession } from '#/modules/transactions/application/bank-import/bank-installment-session.service.ts';
import type { InvoiceMonthResolver } from '#/modules/transactions/application/transaction/invoice-month-resolver.service.ts';
import type { TransactionAccountReader } from '#/modules/transactions/application/transaction/transaction-account-reader.interface.ts';
import type { InstallmentPlanRepository } from '#/modules/transactions/domain/installment-plan/installment-plan-repository.interface.ts';
import { Transaction } from '#/modules/transactions/domain/transaction/transaction.entity.ts';
import type { TransactionRepository } from '#/modules/transactions/domain/transaction/transaction-repository.interface.ts';
import type { Clock } from '#/shared/clock/clock.interface.ts';
import { BusinessDate } from '#/shared/date/business-date.value-object.ts';
import type { Month } from '#/shared/date/month.value-object.ts';
import { Money } from '#/shared/money/money.value-object.ts';

// The transactions of an account that the bank sent and Fincheck does not have yet (the sync,
// BR-TRX-004). Each one is born with the bank's version in use, the nature by its sign (the system's
// to change) and, on a card, the invoice its date falls in. An installment goes to the plan it
// belongs to (see `BankInstallmentSession`); the parcels the bank has not sent yet are generated.
// Nothing here applies rules or detects natures: the round does, in its own order. Runs inside the
// unit of work of the round, with its executor.
export class ImportBankTransactionsUseCase {
  private readonly transactions: TransactionRepository<Kysely<Database>>;
  private readonly plans: InstallmentPlanRepository<Kysely<Database>>;
  private readonly accounts: TransactionAccountReader;
  private readonly invoiceMonths: InvoiceMonthResolver;
  private readonly clock: Clock;

  constructor(
    transactions: TransactionRepository<Kysely<Database>>,
    plans: InstallmentPlanRepository<Kysely<Database>>,
    accounts: TransactionAccountReader,
    invoiceMonths: InvoiceMonthResolver,
    clock: Clock,
  ) {
    this.transactions = transactions;
    this.plans = plans;
    this.accounts = accounts;
    this.invoiceMonths = invoiceMonths;
    this.clock = clock;
  }

  async execute(
    input: ImportBankTransactionsUseCase.Input,
    executor: Kysely<Database>,
  ): Promise<ImportBankTransactionsUseCase.Output> {
    const now = this.clock.now();
    const account = await this.accounts.requireAccount(input.accountId, executor);
    const session = account.isCard
      ? await BankInstallmentSession.open(
          {
            plans: this.plans,
            transactions: this.transactions,
            invoiceMonths: this.invoiceMonths,
          },
          account,
          executor,
        )
      : null;
    const ordered = input.items.toSorted(
      (a, b) => a.occurredOn.localeCompare(b.occurredOn) || a.key.localeCompare(b.key),
    );
    const created: ImportBankTransactionsUseCase.Created[] = [];

    for (const item of ordered) {
      const occurredOn = BusinessDate.of(item.occurredOn);
      let invoiceMonth: Month | null = null;
      let installment: Transaction.Installment | null = null;
      let placement: BankInstallmentSession.Placement | null = null;

      if (account.isCard && session && item.installment) {
        placement = await session.place(
          {
            description: item.description,
            amountCents: item.amountCents,
            occurredOn: item.occurredOn,
            installment: item.installment,
          },
          now,
        );
        installment = { planId: placement.planId, number: placement.number };
        invoiceMonth = placement.invoiceMonth;
        if (placement.replaces !== null)
          await this.transactions.delete(placement.replaces, executor);
      } else if (account.isCard) {
        invoiceMonth = await this.invoiceMonths.resolve(account, occurredOn, executor);
      }

      const transaction = Transaction.createFromBank(
        {
          account,
          // On a card the method is always `credit`; elsewhere `credit` has no meaning.
          method: account.isCard ? 'credit' : item.method === 'credit' ? 'other' : item.method,
          bank: {
            description: item.description,
            amount: Money.fromCents(item.amountCents),
            occurredOn,
            counterparty: item.counterparty,
            status: item.status,
          },
          invoiceMonth,
          installment,
        },
        now,
      );
      if (placement?.inherited) transaction.inheritChoices(placement.inherited, now);
      await this.transactions.save(transaction, executor);
      created.push({
        key: item.key,
        transactionId: transaction.id,
        accountId: account.id,
        nature: transaction.nature as 'expense' | 'income',
        amountCents: item.amountCents,
        occurredOn: item.occurredOn,
        description: item.description,
        counterparty: item.counterparty,
        categoryId: transaction.categoryId,
      });
    }
    await session?.fillFuture(now);

    return { created };
  }
}

export namespace ImportBankTransactionsUseCase {
  export type Item = {
    // The id the caller uses for the item (the one of the provider); it comes back untouched.
    key: string;
    description: string;
    // With the sign of Lucas, never zero.
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

  export type Input = { accountId: string; items: Item[] };

  export type Created = {
    key: string;
    transactionId: string;
    accountId: string;
    // Born `expense` or `income`; the detectors may change it afterwards.
    nature: 'expense' | 'income';
    amountCents: number;
    occurredOn: string;
    description: string;
    counterparty: string | null;
    // Only when it took the place of a parcel Lucas had categorized.
    categoryId: string | null;
  };

  export type Output = { created: Created[] };
}
