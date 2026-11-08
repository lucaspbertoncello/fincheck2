import { normalizeText } from '@fincheck/shared/common/text/normalize-text.util.ts';
import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import type { SubscriptionChargeReader } from '#/modules/recurrences/application/subscription/subscription-charge-reader.interface.ts';
import type { OccurrenceRepository } from '#/modules/recurrences/domain/occurrence/occurrence-repository.interface.ts';
import type { RecurrenceRepository } from '#/modules/recurrences/domain/recurrence/recurrence-repository.interface.ts';
import { findSubscriptionSuggestions } from '#/modules/recurrences/domain/subscription/find-subscription-suggestions.util.ts';
import type { SubscriptionSuggestionCandidate } from '#/modules/recurrences/domain/subscription/find-subscription-suggestions.util.ts';
import type { Clock } from '#/shared/clock/clock.interface.ts';
import { BusinessDate } from '#/shared/date/business-date.value-object.ts';
import { Month } from '#/shared/date/month.value-object.ts';

// How far back the purchases are read: enough months for a run of charges to show, and no more
// (the run of "monthsSeen" is counted inside this window).
const MONTHS_LOOKED_BACK = 12;

// Gathers what the suggestion rule needs (the purchases on the cards, the dismissals, the
// transactions that already pay a live recurrence and what each recurrence answers for) and asks
// the rule, which is pure. Used to list the suggestions and to find the one Lucas accepts or
// dismisses, so both see the same list.
export class SubscriptionSuggestionFinder {
  private readonly db: Kysely<Database>;
  private readonly recurrences: RecurrenceRepository<Kysely<Database>>;
  private readonly occurrences: OccurrenceRepository<Kysely<Database>>;
  private readonly charges: SubscriptionChargeReader;
  private readonly clock: Clock;

  constructor(
    db: Kysely<Database>,
    recurrences: RecurrenceRepository<Kysely<Database>>,
    occurrences: OccurrenceRepository<Kysely<Database>>,
    charges: SubscriptionChargeReader,
    clock: Clock,
  ) {
    this.db = db;
    this.recurrences = recurrences;
    this.occurrences = occurrences;
    this.charges = charges;
    this.clock = clock;
  }

  async find(executor: Kysely<Database> = this.db): Promise<SubscriptionSuggestionCandidate[]> {
    const today = this.clock.today();
    let from = Month.containing(today);
    for (let step = 0; step < MONTHS_LOOKED_BACK; step++) from = from.previous();

    const [purchases, dismissals, recurrences] = await Promise.all([
      this.charges.listCardPurchases({ from: from.firstDay().value, to: today.value }, executor),
      executor
        .selectFrom('subscription_suggestion_dismissals')
        .select(['pattern', 'account_id'])
        .execute(),
      this.recurrences.findMany({ includeArchived: false }, executor),
    ]);
    const linked = await this.occurrences.findLiveLinkedTransactionIds(
      purchases.map((purchase) => purchase.transactionId),
      executor,
    );

    return findSubscriptionSuggestions({
      purchases: purchases.map((purchase) => ({
        transactionId: purchase.transactionId,
        accountId: purchase.accountId,
        description: purchase.description,
        amountCents: purchase.amountCents,
        occurredOn: BusinessDate.of(purchase.occurredOn),
      })),
      today,
      dismissedKeys: new Set(dismissals.map((row) => `${row.pattern}|${row.account_id}`)),
      linkedTransactionIds: linked,
      coverage: recurrences.flatMap((recurrence) =>
        recurrence.kind === 'expense' && recurrence.accountId !== null
          ? [
              {
                accountId: recurrence.accountId,
                pattern: recurrence.matchText ?? normalizeText(recurrence.name),
              },
            ]
          : [],
      ),
    });
  }
}
