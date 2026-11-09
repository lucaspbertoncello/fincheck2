import type { Transaction as TransactionContract } from '@fincheck/shared/transactions/transaction/transaction.type.ts';
import type { TransactionBulk } from '@fincheck/shared/transactions/transaction-bulk/transaction-bulk.type.ts';
import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import type { TransactionAccountReader } from '#/modules/transactions/application/transaction/transaction-account-reader.interface.ts';
import type { TransactionLinksReader } from '#/modules/transactions/application/transaction/transaction-links-reader.interface.ts';
import type { TransactionReferenceResolver } from '#/modules/transactions/application/transaction/transaction-reference-resolver.service.ts';
import { RequestValidationError } from '#/shared/errors/request-validation.error.ts';
import type { CategoryRuleReader } from '#/modules/transactions/application/transaction/category-rule-reader.interface.ts';
import type { Transaction } from '#/modules/transactions/domain/transaction/transaction.entity.ts';
import type { TransactionRepository } from '#/modules/transactions/domain/transaction/transaction-repository.interface.ts';
import type { Clock } from '#/shared/clock/clock.interface.ts';
import type { UnitOfWork } from '#/shared/unit-of-work/unit-of-work.interface.ts';

// "Desfazer" of a bulk action, of a rule applied to the history and of a recategorization: writes
// back, over the whole state, what the action had returned in `previous`. A rule deleted meanwhile
// leaves no id, and a transaction that no longer exists is skipped and not counted.
export class RestoreBulkTransactionsUseCase {
  private readonly transactions: TransactionRepository<Kysely<Database>>;
  private readonly rules: CategoryRuleReader;
  private readonly references: TransactionReferenceResolver;
  private readonly accounts: TransactionAccountReader;
  private readonly links: TransactionLinksReader | undefined;
  private readonly unitOfWork: UnitOfWork<Kysely<Database>>;
  private readonly clock: Clock;

  constructor(
    transactions: TransactionRepository<Kysely<Database>>,
    rules: CategoryRuleReader,
    references: TransactionReferenceResolver,
    accounts: TransactionAccountReader,
    links: TransactionLinksReader | undefined,
    unitOfWork: UnitOfWork<Kysely<Database>>,
    clock: Clock,
  ) {
    this.transactions = transactions;
    this.rules = rules;
    this.references = references;
    this.accounts = accounts;
    this.links = links;
    this.unitOfWork = unitOfWork;
    this.clock = clock;
  }

  async execute(
    input: RestoreBulkTransactionsUseCase.Input,
  ): Promise<RestoreBulkTransactionsUseCase.Output> {
    return this.unitOfWork.run(async (executor) => {
      const now = this.clock.now();
      const found = new Map(
        (
          await this.transactions.findByIds(
            input.items.map((item) => item.transactionId),
            executor,
          )
        ).map((transaction) => [transaction.id, transaction]),
      );
      const categories = await this.references.categoriesById(
        [
          ...new Set(
            input.items.flatMap((item) => (item.categoryId === null ? [] : [item.categoryId])),
          ),
        ],
        executor,
      );
      const cardByAccount = await this.readCards(found, executor);
      // A link made after the action locks the nature of a card credit: read them once.
      const links = this.links
        ? await this.links.linksOf([...found.keys()], executor)
        : new Map<string, TransactionContract.LinksDto>();
      await this.assertReferences(input.items, found, categories, cardByAccount, executor);
      const aliveRules = await this.rules.existingRuleIds(
        [...new Set(input.items.flatMap((item) => item.categoryRuleId ?? []))],
        executor,
      );

      let restoredCount = 0;
      for (const item of input.items) {
        const transaction = found.get(item.transactionId);
        if (!transaction) continue;

        // What the action made a transfer (by the category that is a transfer) goes back by the
        // sign, and a card turns a positive value into an expense; a credit on a card follows the
        // kind of the saved category: the account tells which one is a card.
        const isCardAccount = cardByAccount.get(transaction.accountId) === true;
        const restored = transaction.restoreState(
          item,
          {
            ruleStillExists: item.categoryRuleId !== null && aliveRules.has(item.categoryRuleId),
            isCardAccount,
            savedCategoryKind:
              item.categoryId === null ? null : (categories.get(item.categoryId)?.kind ?? null),
            hasActiveOccurrenceLink: Boolean(links.get(transaction.id)?.occurrence),
            hasActiveBillLink: links.get(transaction.id)?.bill?.role === 'payment',
          },
          now,
        );
        await this.transactions.save(transaction, executor);
        if (restored) restoredCount += 1;
      }

      return { restoredCount };
    });
  }

  // Which accounts of the transactions are a card, one read per account.
  private async readCards(
    found: Map<string, Transaction>,
    executor: Kysely<Database>,
  ): Promise<Map<string, boolean>> {
    const cardByAccount = new Map<string, boolean>();
    for (const transaction of found.values()) {
      if (cardByAccount.has(transaction.accountId)) continue;
      const account = await this.accounts.requireAccount(transaction.accountId, executor);
      cardByAccount.set(transaction.accountId, account.isCard);
    }

    return cardByAccount;
  }

  // The body is the state a previous action returned, but nothing proves it: a category or a tag
  // that does not exist is the 404 of its owner, a category without origin or of the wrong kind is
  // a 400. A transaction whose nature changed since (it no longer takes a category) is not an
  // error: its category is dropped on restore.
  private async assertReferences(
    items: RestoreBulkTransactionsUseCase.Input['items'],
    found: Map<string, Transaction>,
    categories: Map<string, Transaction.CategoryRef>,
    cardByAccount: Map<string, boolean>,
    executor: Kysely<Database>,
  ): Promise<void> {
    const tags = new Map(
      (
        await this.references.tagsById([...new Set(items.flatMap((item) => item.tagIds))], executor)
      ).map((tag) => [tag.id, tag]),
    );

    items.forEach((item, index) => {
      // The tags of a state belong to the category of that state or, for a split transaction, to
      // a category of its parts.
      const transaction = found.get(item.transactionId);
      const categoryIds = transaction?.isSplit()
        ? transaction.taggableCategoryIds()
        : item.categoryId === null
          ? []
          : [item.categoryId];
      if (item.tagIds.some((tagId) => !categoryIds.includes(tags.get(tagId)?.categoryId ?? ''))) {
        throw new RequestValidationError([
          {
            path: `items.${String(index)}.tagIds`,
            message: 'The tags must belong to the category of the state.',
          },
        ]);
      }
      if (item.categoryId === null) return;
      if (item.categorySource === null) {
        throw new RequestValidationError([
          {
            path: `items.${String(index)}.categorySource`,
            message: 'A category needs its origin.',
          },
        ]);
      }
      const category = categories.get(item.categoryId);
      if (
        transaction &&
        category &&
        transaction.hasCountedNature() &&
        !transaction.isSplit() &&
        category.kind !== transaction.nature &&
        // A credit on a card (positive on a card account) takes either kind: its nature follows.
        !(cardByAccount.get(transaction.accountId) === true && !transaction.amount.isNegative())
      ) {
        throw new RequestValidationError([
          {
            path: `items.${String(index)}.categoryId`,
            message: 'The category is of the other kind.',
          },
        ]);
      }
    });
  }
}

export namespace RestoreBulkTransactionsUseCase {
  export type Input = TransactionBulk.RestoreRequest;
  export type Output = TransactionBulk.RestoreResult;
}
