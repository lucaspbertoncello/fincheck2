import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import type { InvoiceMonthResolver } from '#/modules/transactions/application/transaction/invoice-month-resolver.service.ts';
import { InstallmentPlan } from '#/modules/transactions/domain/installment-plan/installment-plan.entity.ts';
import type { InstallmentPlanRepository } from '#/modules/transactions/domain/installment-plan/installment-plan-repository.interface.ts';
import { Transaction } from '#/modules/transactions/domain/transaction/transaction.entity.ts';
import type { TransactionRepository } from '#/modules/transactions/domain/transaction/transaction-repository.interface.ts';
import { BusinessDate } from '#/shared/date/business-date.value-object.ts';
import type { Month } from '#/shared/date/month.value-object.ts';
import { Money } from '#/shared/money/money.value-object.ts';
import { normalizeDescription } from '#/shared/text/normalize-description.util.ts';
import { stripInstallmentSuffix } from '#/shared/text/strip-installment-suffix.util.ts';

// How far apart (R$ 0,05) the value of a parcel may be from the one of its plan (BR-INV-005).
const PARCEL_TOLERANCE_CENTS = 5;

// Where the parcels of installment purchases that the bank sent go, for one card in one round
// (BR-INV-003, BR-INV-005): the plan of the bank each one belongs to (found by card + purchase date
// + count + value, the description only breaks a tie; created when there is none) or the plan Lucas
// entered by hand for the same purchase (same card, count and number, value within R$ 0,05), whose
// parcel by hand it replaces. The parcels the bank has not sent yet are generated, for the
// projection of the next invoices, and the one that arrives later takes the place of the generated
// one. It remembers what it loaded because the parcels of one batch decide each other (the second
// parcel of a purchase finds the plan the first one created).
export class BankInstallmentSession {
  private readonly plans: InstallmentPlanRepository<Kysely<Database>>;
  private readonly transactions: TransactionRepository<Kysely<Database>>;
  private readonly invoiceMonths: InvoiceMonthResolver;
  private readonly account: Transaction.AccountRef;
  private readonly executor: Kysely<Database>;
  private readonly known: InstallmentPlan[];
  private readonly parcels = new Map<string, Transaction[]>();
  private readonly touched = new Set<string>();
  // The parcels (plan and number) this batch already placed: another purchase that looks the same
  // (same card, day, total, value and number) is a purchase of its own and never takes the same place.
  private readonly claimed = new Set<string>();

  private constructor(
    plans: InstallmentPlanRepository<Kysely<Database>>,
    transactions: TransactionRepository<Kysely<Database>>,
    invoiceMonths: InvoiceMonthResolver,
    account: Transaction.AccountRef,
    known: InstallmentPlan[],
    executor: Kysely<Database>,
  ) {
    this.plans = plans;
    this.transactions = transactions;
    this.invoiceMonths = invoiceMonths;
    this.account = account;
    this.known = known;
    this.executor = executor;
  }

  static async open(
    deps: {
      plans: InstallmentPlanRepository<Kysely<Database>>;
      transactions: TransactionRepository<Kysely<Database>>;
      invoiceMonths: InvoiceMonthResolver;
    },
    account: Transaction.AccountRef,
    executor: Kysely<Database>,
  ): Promise<BankInstallmentSession> {
    const known = await deps.plans.list({ accountId: account.id }, executor);

    return new BankInstallmentSession(
      deps.plans,
      deps.transactions,
      deps.invoiceMonths,
      account,
      known,
      executor,
    );
  }

  async place(
    item: BankInstallmentSession.Item,
    now: string,
  ): Promise<BankInstallmentSession.Placement> {
    const { number, total } = item.installment;
    const amountCents = Math.abs(item.amountCents);
    const occurredOn = BusinessDate.of(item.occurredOn);
    const purchaseOn = item.installment.purchaseOn
      ? BusinessDate.of(item.installment.purchaseOn)
      : occurredOn.addMonths(-(number - 1));

    const byHand = await this.findPlanByHand(number, total, amountCents);
    if (byHand) return this.placeIn(byHand.plan, number, byHand.parcel);

    const found = await this.findBankPlan(number, purchaseOn, total, amountCents, item.description);
    if (found) return this.placeIn(found.plan, number, found.parcel);

    return this.placeIn(await this.createBankPlan(item, purchaseOn, now), number, null);
  }

  // The parcels of the plans of the bank the round touched that the bank has not sent yet: from the
  // one after the last present to the last of the plan. Idempotent: a second call finds them.
  async fillFuture(now: string): Promise<void> {
    for (const planId of this.touched) {
      const plan = this.known.find((candidate) => candidate.id === planId);
      if (plan?.origin !== 'bank') continue;
      this.parcels.delete(planId);
      const present = await this.parcelsOf(plan);
      const last = Math.max(0, ...present.map((parcel) => parcel.installment?.number ?? 0));
      const amounts = plan.amounts();

      for (let number = last + 1; number <= plan.installmentCount; number++) {
        const amount = amounts[number - 1];
        if (!amount) continue;
        await this.transactions.save(
          Transaction.createInstallmentParcel(
            {
              planId: plan.id,
              number,
              accountId: plan.accountId,
              description: plan.description,
              amount,
              purchaseOn: plan.purchaseOn,
              invoiceMonth: plan.invoiceMonthOf(number),
              category: null,
              tags: [],
            },
            now,
          ),
          this.executor,
        );
      }
    }
  }

  private placeIn(
    plan: InstallmentPlan,
    number: number,
    existing: Transaction | null,
  ): BankInstallmentSession.Placement {
    this.touched.add(plan.id);
    this.claimed.add(this.placeOf(plan, number));

    return {
      planId: plan.id,
      number,
      invoiceMonth: plan.invoiceMonthOf(number),
      replaces: existing?.id ?? null,
      inherited: existing
        ? {
            categoryId: existing.categoryId,
            categorySource: existing.categorySource,
            categoryRuleId: existing.categoryRuleId,
            tagIds: [...existing.tagIds],
          }
        : null,
    };
  }

  // The plan Lucas entered by hand for the same purchase: same card, same count, and a parcel by
  // hand with that number and a value within R$ 0,05.
  private async findPlanByHand(
    number: number,
    count: number,
    amountCents: number,
  ): Promise<{ plan: InstallmentPlan; parcel: Transaction } | null> {
    for (const plan of this.known) {
      if (plan.origin !== 'manual' || plan.installmentCount !== count) continue;
      if (this.claimed.has(this.placeOf(plan, number))) continue;
      const parcel = (await this.parcelsOf(plan)).find(
        (candidate) =>
          candidate.installment?.number === number &&
          candidate.origin === 'manual' &&
          Math.abs(Math.abs(candidate.amount.cents) - amountCents) <= PARCEL_TOLERANCE_CENTS,
      );
      if (parcel) return { plan, parcel };
    }

    return null;
  }

  // The plan of the bank this parcel belongs to, with the parcel that holds its place when there is
  // one that is not the bank's (a generated one, which the bank's takes the place of). A plan whose
  // place is already a parcel of the bank, or was taken in this batch, is another purchase that looks
  // the same: it is passed over, and a plan of its own is made.
  private async findBankPlan(
    number: number,
    purchaseOn: BusinessDate,
    count: number,
    amountCents: number,
    description: string,
  ): Promise<{ plan: InstallmentPlan; parcel: Transaction | null } | null> {
    const wanted = normalizeDescription(description);
    const found = this.known.filter(
      (plan) =>
        plan.origin === 'bank' &&
        plan.installmentCount === count &&
        plan.purchaseOn.equals(purchaseOn) &&
        plan
          .amounts()
          .some((amount) => Math.abs(amount.cents - amountCents) <= PARCEL_TOLERANCE_CENTS),
    );

    const preferred = found.toSorted(
      (a, b) =>
        Number(normalizeDescription(b.description) === wanted) -
        Number(normalizeDescription(a.description) === wanted),
    );

    for (const plan of preferred) {
      if (this.claimed.has(this.placeOf(plan, number))) continue;
      const parcel =
        (await this.parcelsOf(plan)).find(
          (candidate) => candidate.installment?.number === number,
        ) ?? null;

      if (parcel?.origin !== 'bank') return { plan, parcel };
    }

    return null;
  }

  private placeOf(plan: InstallmentPlan, number: number): string {
    return `${plan.id}:${String(number)}`;
  }

  private async createBankPlan(
    item: BankInstallmentSession.Item,
    purchaseOn: BusinessDate,
    now: string,
  ): Promise<InstallmentPlan> {
    const { total, totalCents } = item.installment;
    const amountCents = Math.abs(item.amountCents);
    const month = await this.invoiceMonths.resolve(this.account, purchaseOn, this.executor);
    if (month === null) throw new RangeError('An installment is always on a card');

    const plan = InstallmentPlan.createFromBank(
      {
        accountId: this.account.id,
        description: stripInstallmentSuffix(item.description).trim() || item.description,
        purchaseOn,
        total: Money.fromCents(Math.max(totalCents ?? amountCents * total, total)),
        installmentCount: total,
        firstInvoiceMonth: month,
      },
      now,
    );
    await this.plans.insert(plan, this.executor);
    this.known.push(plan);

    return plan;
  }

  private async parcelsOf(plan: InstallmentPlan): Promise<Transaction[]> {
    const cached = this.parcels.get(plan.id);
    if (cached) return cached;
    const loaded = await this.transactions.findByInstallmentPlanIds([plan.id], this.executor);
    this.parcels.set(plan.id, loaded);

    return loaded;
  }
}

export namespace BankInstallmentSession {
  export type Item = {
    description: string;
    // With sign (a purchase is negative).
    amountCents: number;
    occurredOn: string;
    installment: {
      number: number;
      total: number;
      totalCents: number | null;
      purchaseOn: string | null;
    };
  };

  // What a new parcel inherits from the one it replaces: what Lucas chose on it.
  export type Inherited = {
    categoryId: string | null;
    categorySource: Transaction['categorySource'];
    categoryRuleId: string | null;
    tagIds: string[];
  };

  export type Placement = {
    planId: string;
    number: number;
    invoiceMonth: Month;
    // A parcel the bank did not send (a generated one, or the one by hand) the new one replaces.
    replaces: string | null;
    inherited: Inherited | null;
  };
}
