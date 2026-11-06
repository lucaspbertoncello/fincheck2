import type { Transaction as TransactionContract } from '@fincheck/shared/transactions/transaction/transaction.type.ts';
import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import type { CategorySuggestionReader } from '#/modules/transactions/application/transaction/category-suggestion-reader.interface.ts';
import type { TransactionLinksReader } from '#/modules/transactions/application/transaction/transaction-links-reader.interface.ts';
import type { InstallmentPlan } from '#/modules/transactions/domain/installment-plan/installment-plan.entity.ts';
import type { InstallmentPlanRepository } from '#/modules/transactions/domain/installment-plan/installment-plan-repository.interface.ts';
import type { Transaction } from '#/modules/transactions/domain/transaction/transaction.entity.ts';
import { TransactionNotFoundError } from '#/modules/transactions/domain/transaction/transaction-not-found.error.ts';
import type { TransactionRepository } from '#/modules/transactions/domain/transaction/transaction-repository.interface.ts';
import { normalizeDescription } from '#/shared/text/normalize-description.util.ts';

const NO_LINKS: TransactionContract.LinksDto = {
  occurrence: null,
  bill: null,
  invoicePayment: null,
};

// Builds the `Transaction.Dto` of the contract from the aggregate. The derived fields (edited, in
// review, competence) come from the entity, the plan gives the competence date and the count of
// the installment, and the links and the suggestion come from the owners through their ports (no
// link and no suggestion while they are not wired). Every route that answers a transaction goes
// through here, so the list, the detail and the change answer the same thing.
export class TransactionDtoBuilder {
  private readonly transactions: TransactionRepository<Kysely<Database>>;
  private readonly plans: InstallmentPlanRepository<Kysely<Database>>;
  private readonly links: TransactionLinksReader | undefined;
  private readonly suggestions: CategorySuggestionReader | undefined;

  constructor(
    transactions: TransactionRepository<Kysely<Database>>,
    plans: InstallmentPlanRepository<Kysely<Database>>,
    links: TransactionLinksReader | undefined,
    suggestions: CategorySuggestionReader | undefined,
  ) {
    this.transactions = transactions;
    this.plans = plans;
    this.links = links;
    this.suggestions = suggestions;
  }

  // The one transaction, or `TRANSACTION_NOT_FOUND`.
  async buildOne(id: string, executor?: Kysely<Database>): Promise<TransactionContract.Dto> {
    const [built] = await this.buildDetailed([id], executor);
    if (!built) throw new TransactionNotFoundError();

    return built.dto;
  }

  // The ones that exist, in the order of `ids`.
  async buildByIds(ids: string[], executor?: Kysely<Database>): Promise<TransactionContract.Dto[]> {
    return (await this.buildDetailed(ids, executor)).map((built) => built.dto);
  }

  // The same, with the suggestions of category (up to three) of the ones in review.
  async buildDetailed(
    ids: string[],
    executor?: Kysely<Database>,
  ): Promise<TransactionDtoBuilder.Built[]> {
    const found = await this.transactions.findByIds(ids, executor);
    const byId = new Map(found.map((transaction) => [transaction.id, transaction]));
    const ordered = ids.flatMap((id) => byId.get(id) ?? []);
    if (ordered.length === 0) return [];

    const planIds = [
      ...new Set(ordered.flatMap((transaction) => transaction.installment?.planId ?? [])),
    ];
    const [plans, links, suggestions] = await Promise.all([
      this.plans.findByIds(planIds, executor),
      this.links?.linksOf(
        ordered.map((transaction) => transaction.id),
        executor,
      ),
      this.suggestionsOf(ordered, executor),
    ]);
    const planById = new Map(plans.map((plan) => [plan.id, plan]));

    return ordered.map((transaction) => {
      const plan = transaction.installment
        ? planById.get(transaction.installment.planId)
        : undefined;
      const own = suggestions.get(transaction.id) ?? [];

      return {
        dto: TransactionDtoBuilder.toDto(transaction, {
          plan: plan ?? null,
          links: links?.get(transaction.id) ?? NO_LINKS,
          categorySuggestion: own[0]?.categoryId ?? null,
        }),
        suggestions: own,
      };
    });
  }

  private async suggestionsOf(
    transactions: Transaction[],
    executor: Kysely<Database> | undefined,
  ): Promise<Map<string, CategorySuggestionReader.Suggestion[]>> {
    const inReview = transactions.filter((transaction) => transaction.isInReview());
    if (!this.suggestions || inReview.length === 0) return new Map();

    return this.suggestions.suggestionsFor(
      inReview.map((transaction) => ({
        transactionId: transaction.id,
        description: normalizeDescription(transaction.description),
        amountCents: transaction.amount.cents,
      })),
      executor,
    );
  }

  private static toDto(
    transaction: Transaction,
    context: {
      plan: InstallmentPlan | null;
      links: TransactionContract.LinksDto;
      categorySuggestion: string | null;
    },
  ): TransactionContract.Dto {
    return {
      id: transaction.id,
      accountId: transaction.accountId,
      origin: transaction.origin,
      nature: transaction.nature,
      natureSetBy: transaction.natureSetBy,
      method: transaction.method,
      description: transaction.description,
      amountCents: transaction.amount.cents,
      occurredOn: transaction.occurredOn.value,
      competenceOn: transaction.competenceOn(context.plan?.purchaseOn ?? null).value,
      invoiceMonth: transaction.invoiceMonth?.value ?? null,
      categoryId: transaction.categoryId,
      categorySource: transaction.categorySource,
      categoryRuleId: transaction.categoryRuleId,
      tagIds: transaction.tagIds,
      splits: transaction.splits.map((part) => ({
        id: part.id,
        position: part.position,
        amountCents: part.amount.cents,
        nature: part.nature,
        categoryId: part.categoryId,
        description: part.description,
      })),
      isEdited: transaction.isEdited(),
      bank: transaction.bank
        ? {
            description: transaction.bank.description,
            amountCents: transaction.bank.amount.cents,
            occurredOn: transaction.bank.occurredOn.value,
            counterparty: transaction.bank.counterparty,
            status: transaction.bank.status,
          }
        : null,
      bankChange: transaction.bankChange,
      removedByBankAt: transaction.removedByBankAt,
      ignoredAt: transaction.ignoredAt,
      editNote: transaction.editNote,
      installment:
        transaction.installment && context.plan
          ? {
              planId: transaction.installment.planId,
              number: transaction.installment.number,
              count: context.plan.installmentCount,
            }
          : null,
      transferCounterpartId: transaction.transferCounterpartId,
      links: context.links,
      isInReview: transaction.isInReview(),
      categorySuggestion: transaction.isInReview() ? context.categorySuggestion : null,
      createdAt: transaction.createdAt,
      updatedAt: transaction.updatedAt,
    };
  }
}

export namespace TransactionDtoBuilder {
  export type Built = {
    dto: TransactionContract.Dto;
    suggestions: CategorySuggestionReader.Suggestion[];
  };
}
