import type { Transaction as TransactionContract } from '@fincheck/shared/transactions/transaction/transaction.type.ts';
import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import type { InvoiceMonthResolver } from '#/modules/transactions/application/transaction/invoice-month-resolver.service.ts';
import type { TransactionAccountReader } from '#/modules/transactions/application/transaction/transaction-account-reader.interface.ts';
import type { TransactionDtoBuilder } from '#/modules/transactions/application/transaction/transaction-dto-builder.service.ts';
import type { TransactionReferenceResolver } from '#/modules/transactions/application/transaction/transaction-reference-resolver.service.ts';
import { Transaction } from '#/modules/transactions/domain/transaction/transaction.entity.ts';
import type { TransactionRepository } from '#/modules/transactions/domain/transaction/transaction-repository.interface.ts';
import type { Clock } from '#/shared/clock/clock.interface.ts';
import { BusinessDate } from '#/shared/date/business-date.value-object.ts';
import { Money } from '#/shared/money/money.value-object.ts';
import type { UnitOfWork } from '#/shared/unit-of-work/unit-of-work.interface.ts';

// "Nova transação" (RF-TRX-001): a manual expense or income. On a card the invoice month comes
// from `invoices`; the category and the tags are checked by `categories`. It applies no rule: a
// rule acts on the import and on the history.
export class CreateTransactionUseCase {
  private readonly transactions: TransactionRepository<Kysely<Database>>;
  private readonly accounts: TransactionAccountReader;
  private readonly references: TransactionReferenceResolver;
  private readonly invoiceMonths: InvoiceMonthResolver;
  private readonly builder: TransactionDtoBuilder;
  private readonly unitOfWork: UnitOfWork<Kysely<Database>>;
  private readonly clock: Clock;

  constructor(
    transactions: TransactionRepository<Kysely<Database>>,
    accounts: TransactionAccountReader,
    references: TransactionReferenceResolver,
    invoiceMonths: InvoiceMonthResolver,
    builder: TransactionDtoBuilder,
    unitOfWork: UnitOfWork<Kysely<Database>>,
    clock: Clock,
  ) {
    this.transactions = transactions;
    this.accounts = accounts;
    this.references = references;
    this.invoiceMonths = invoiceMonths;
    this.builder = builder;
    this.unitOfWork = unitOfWork;
    this.clock = clock;
  }

  async execute(input: CreateTransactionUseCase.Input): Promise<CreateTransactionUseCase.Output> {
    return this.unitOfWork.run(async (executor) => {
      const account = await this.accounts.requireAccount(input.accountId, executor);
      const occurredOn = BusinessDate.of(input.occurredOn);
      const category = await this.references.category(input.categoryId, executor);
      const tags = await this.references.tagsById(input.tagIds ?? [], executor);
      // A card with another method is refused by the entity before it asks for any invoice.
      const invoiceMonth =
        input.method === 'credit'
          ? await this.invoiceMonths.resolve(account, occurredOn, executor)
          : null;

      const transaction = Transaction.createManual(
        {
          type: input.type,
          account,
          method: input.method,
          description: input.description,
          amount: Money.fromCents(input.amountCents),
          occurredOn,
          invoiceMonth,
          category,
          tags,
        },
        this.clock.now(),
      );
      await this.transactions.save(transaction, executor);

      return this.builder.buildOne(transaction.id, executor);
    });
  }
}

export namespace CreateTransactionUseCase {
  export type Input = TransactionContract.CreateRequest;
  export type Output = TransactionContract.Dto;
}
