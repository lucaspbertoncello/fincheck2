import type { Transaction as TransactionContract } from '@fincheck/shared/transactions/transaction/transaction.type.ts';
import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import type { InvoiceMonthResolver } from '#/modules/transactions/application/transaction/invoice-month-resolver.service.ts';
import { requireTransaction } from '#/modules/transactions/application/transaction/require-transaction.util.ts';
import type { TransactionAccountReader } from '#/modules/transactions/application/transaction/transaction-account-reader.interface.ts';
import type { TransactionDtoBuilder } from '#/modules/transactions/application/transaction/transaction-dto-builder.service.ts';
import type { TransactionLinksReader } from '#/modules/transactions/application/transaction/transaction-links-reader.interface.ts';
import type { TransactionReferenceResolver } from '#/modules/transactions/application/transaction/transaction-reference-resolver.service.ts';
import { Transaction } from '#/modules/transactions/domain/transaction/transaction.entity.ts';
import type { TransactionRepository } from '#/modules/transactions/domain/transaction/transaction-repository.interface.ts';
import type { Clock } from '#/shared/clock/clock.interface.ts';
import { BusinessDate } from '#/shared/date/business-date.value-object.ts';
import { RequestValidationError } from '#/shared/errors/request-validation.error.ts';
import { Money } from '#/shared/money/money.value-object.ts';
import type { UnitOfWork } from '#/shared/unit-of-work/unit-of-work.interface.ts';

// The edit of a transaction (RF-TRX-003): description, amount, date, category, tags, note and the
// nature (Q14), with the other leg of a transfer. The rules are the entity's; this loads what they
// need (the account, the links, the category, the tags, the invoice) and saves. A transaction of
// the bank keeps its original untouched: `isEdited` is recomputed from the three fields.
export class UpdateTransactionUseCase {
  private readonly transactions: TransactionRepository<Kysely<Database>>;
  private readonly accounts: TransactionAccountReader;
  private readonly references: TransactionReferenceResolver;
  private readonly invoiceMonths: InvoiceMonthResolver;
  private readonly links: TransactionLinksReader | undefined;
  private readonly builder: TransactionDtoBuilder;
  private readonly unitOfWork: UnitOfWork<Kysely<Database>>;
  private readonly clock: Clock;

  constructor(
    transactions: TransactionRepository<Kysely<Database>>,
    accounts: TransactionAccountReader,
    references: TransactionReferenceResolver,
    invoiceMonths: InvoiceMonthResolver,
    links: TransactionLinksReader | undefined,
    builder: TransactionDtoBuilder,
    unitOfWork: UnitOfWork<Kysely<Database>>,
    clock: Clock,
  ) {
    this.transactions = transactions;
    this.accounts = accounts;
    this.references = references;
    this.invoiceMonths = invoiceMonths;
    this.links = links;
    this.builder = builder;
    this.unitOfWork = unitOfWork;
    this.clock = clock;
  }

  async execute(input: UpdateTransactionUseCase.Input): Promise<UpdateTransactionUseCase.Output> {
    return this.unitOfWork.run(async (executor) => {
      const now = this.clock.now();
      const transaction = await requireTransaction(this.transactions, input.id, executor);

      if (
        input.transferCounterpartId !== undefined &&
        input.transferCounterpartId !== null &&
        input.nature !== 'transfer'
      ) {
        throw new RequestValidationError([
          {
            path: 'transferCounterpartId',
            message: 'A outra perna só vale junto com nature "transfer".',
          },
        ]);
      }

      if (input.nature !== undefined) {
        await this.changeNature(
          transaction,
          input.nature,
          input.transferCounterpartId,
          now,
          executor,
        );
      } else if (input.transferCounterpartId === null) {
        await this.unlinkTransfer(transaction, now, executor);
      }

      await this.edit(transaction, input, now, executor);

      if (input.categoryId !== undefined) {
        transaction.assignCategory(await this.references.category(input.categoryId, executor), now);
      }
      if (input.tagIds !== undefined) {
        transaction.replaceTags(await this.references.tagsById(input.tagIds, executor), now);
      }

      await this.transactions.save(transaction, executor);

      return this.builder.buildOne(transaction.id, executor);
    });
  }

  private async changeNature(
    transaction: Transaction,
    nature: 'expense' | 'income' | 'transfer',
    counterpartId: string | null | undefined,
    now: string,
    executor: Kysely<Database>,
  ): Promise<void> {
    const account = await this.accounts.requireAccount(transaction.accountId, executor);
    transaction.changeNature(
      nature,
      {
        hasActiveInvoiceLink: await this.hasInvoiceLink(transaction.id, executor),
        hasActiveOccurrenceLink: await this.hasOccurrenceLink(transaction.id, executor),
        isCardAccount: account.isCard,
      },
      now,
    );

    if (nature !== 'transfer' || counterpartId === null) {
      await this.unlinkTransfer(transaction, now, executor);
    }
    if (
      nature === 'transfer' &&
      counterpartId &&
      transaction.transferCounterpartId !== counterpartId
    ) {
      const other = await requireTransaction(this.transactions, counterpartId, executor);
      // Each leg lets go of the one it was tied to before.
      await this.unlinkTransfer(transaction, now, executor);
      await this.unlinkTransfer(other, now, executor);
      Transaction.linkTransfer(
        transaction,
        other,
        {
          secondHasInvoiceLink: await this.hasInvoiceLink(other.id, executor),
          secondHasOccurrenceLink: await this.hasOccurrenceLink(other.id, executor),
          secondIsCardAccount: (await this.accounts.requireAccount(other.accountId, executor))
            .isCard,
        },
        now,
      );
      await this.transactions.save(other, executor);
    }
  }

  // Cuts the link with the other leg, on both sides.
  private async unlinkTransfer(
    transaction: Transaction,
    now: string,
    executor: Kysely<Database>,
  ): Promise<void> {
    const otherId = transaction.transferCounterpartId;
    if (otherId === null) return;

    transaction.unlinkTransfer(now);
    const other = await this.transactions.findById(otherId, executor);
    if (other?.transferCounterpartId === transaction.id) {
      other.unlinkTransfer(now);
      await this.transactions.save(other, executor);
    }
  }

  private async edit(
    transaction: Transaction,
    input: UpdateTransactionUseCase.Input,
    now: string,
    executor: Kysely<Database>,
  ): Promise<void> {
    if (
      input.description === undefined &&
      input.amountCents === undefined &&
      input.occurredOn === undefined &&
      input.editNote === undefined
    ) {
      return;
    }

    const occurredOn =
      input.occurredOn === undefined ? undefined : BusinessDate.of(input.occurredOn);
    // A new date on a card purchase moves its invoice, except for a parcel: it stays in the
    // invoice of its plan (N6).
    const movesInvoice =
      occurredOn !== undefined &&
      !occurredOn.equals(transaction.occurredOn) &&
      transaction.invoiceMonth !== null &&
      transaction.installment === null;
    const invoiceMonth = movesInvoice
      ? await this.invoiceMonths.resolve(
          await this.accounts.requireAccount(transaction.accountId, executor),
          occurredOn,
          executor,
        )
      : undefined;

    transaction.edit(
      {
        ...(input.description === undefined ? {} : { description: input.description }),
        ...(input.amountCents === undefined ? {} : { amount: Money.fromCents(input.amountCents) }),
        ...(occurredOn === undefined ? {} : { occurredOn }),
        ...(invoiceMonth === undefined ? {} : { invoiceMonth }),
        ...(input.editNote === undefined ? {} : { editNote: input.editNote }),
      },
      now,
    );

    // The other leg of a transfer follows the new amount, with the opposite sign.
    if (input.amountCents !== undefined && transaction.transferCounterpartId !== null) {
      const other = await this.transactions.findById(transaction.transferCounterpartId, executor);
      if (other?.transferCounterpartId === transaction.id) {
        other.mirrorTransferAmount(transaction.amount, now);
        await this.transactions.save(other, executor);
      }
    }
  }

  private async hasInvoiceLink(
    transactionId: string,
    executor: Kysely<Database>,
  ): Promise<boolean> {
    if (!this.links) return false;
    const links = await this.links.linksOf([transactionId], executor);

    return Boolean(links.get(transactionId)?.invoicePayment);
  }

  private async hasOccurrenceLink(
    transactionId: string,
    executor: Kysely<Database>,
  ): Promise<boolean> {
    if (!this.links) return false;
    const links = await this.links.linksOf([transactionId], executor);

    return Boolean(links.get(transactionId)?.occurrence);
  }
}

export namespace UpdateTransactionUseCase {
  export type Input = { id: string } & TransactionContract.UpdateRequest;
  export type Output = TransactionContract.Dto;
}
