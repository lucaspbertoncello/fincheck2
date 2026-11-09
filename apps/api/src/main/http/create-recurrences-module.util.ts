import { Hono } from 'hono';
import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import { ListRecurrenceCandidatesQuery } from '#/modules/recurrences/application/matching/list-recurrence-candidates.query.ts';
import { DecideOccurrenceDifferenceUseCase } from '#/modules/recurrences/application/occurrence/decide-occurrence-difference.usecase.ts';
import { AutoMatchOccurrencesUseCase } from '#/modules/recurrences/application/matching/auto-match-occurrences.usecase.ts';
import { EnsureOccurrencesUseCase } from '#/modules/recurrences/application/occurrence/ensure-occurrences.usecase.ts';
import { GetOccurrenceExpectationsQuery } from '#/modules/recurrences/application/occurrence/get-occurrence-expectations.query.ts';
import { ListOccurrenceCandidatesQuery } from '#/modules/recurrences/application/occurrence/list-occurrence-candidates.query.ts';
import { ListOccurrencesQuery } from '#/modules/recurrences/application/occurrence/list-occurrences.query.ts';
import { MonthOccurrenceLoader } from '#/modules/recurrences/application/occurrence/month-occurrence-loader.service.ts';
import { OccurrenceDtoBuilder } from '#/modules/recurrences/application/occurrence/occurrence-dto-builder.service.ts';
import { OccurrenceOpener } from '#/modules/recurrences/application/occurrence/occurrence-opener.service.ts';
import { SettleOccurrenceUseCase } from '#/modules/recurrences/application/occurrence/settle-occurrence.usecase.ts';
import { SkipOccurrenceUseCase } from '#/modules/recurrences/application/occurrence/skip-occurrence.usecase.ts';
import { UnsettleOccurrenceUseCase } from '#/modules/recurrences/application/occurrence/unsettle-occurrence.usecase.ts';
import { UnskipOccurrenceUseCase } from '#/modules/recurrences/application/occurrence/unskip-occurrence.usecase.ts';
import { UpdateOccurrenceUseCase } from '#/modules/recurrences/application/occurrence/update-occurrence.usecase.ts';
import type { LinkedElsewhereReader } from '#/modules/recurrences/application/occurrence-payment/linked-elsewhere-reader.interface.ts';
import type { ApplyRecurrenceCategory } from '#/modules/recurrences/application/occurrence-payment/apply-recurrence-category.interface.ts';
import { FindOccurrenceLinkedTransactionsQuery } from '#/modules/recurrences/application/occurrence-payment/find-occurrence-linked-transactions.query.ts';
import { GetTransactionOccurrenceLinksQuery } from '#/modules/recurrences/application/occurrence-payment/get-transaction-occurrence-links.query.ts';
import { LinkOccurrencePaymentUseCase } from '#/modules/recurrences/application/occurrence-payment/link-occurrence-payment.usecase.ts';
import { OccurrencePaymentLinker } from '#/modules/recurrences/application/occurrence-payment/occurrence-payment-linker.service.ts';
import type { OccurrenceTransactionReader } from '#/modules/recurrences/application/occurrence-payment/occurrence-transaction-reader.interface.ts';
import { UnlinkOccurrencePaymentUseCase } from '#/modules/recurrences/application/occurrence-payment/unlink-occurrence-payment.usecase.ts';
import { CreateRecurrenceUseCase } from '#/modules/recurrences/application/recurrence/create-recurrence.usecase.ts';
import { DeleteRecurrenceUseCase } from '#/modules/recurrences/application/recurrence/delete-recurrence.usecase.ts';
import { GetRecurrenceSummaryQuery } from '#/modules/recurrences/application/recurrence/get-recurrence-summary.query.ts';
import { GetRecurrenceQuery } from '#/modules/recurrences/application/recurrence/get-recurrence.query.ts';
import { ListRecurrencesQuery } from '#/modules/recurrences/application/recurrence/list-recurrences.query.ts';
import { PauseRecurrenceUseCase } from '#/modules/recurrences/application/recurrence/pause-recurrence.usecase.ts';
import { ListIncomeSourcesQuery } from '#/modules/recurrences/application/recurrence/list-income-sources.query.ts';
import { PreviewRecurrenceQuery } from '#/modules/recurrences/application/recurrence/preview-recurrence.query.ts';
import { RecurrenceActivator } from '#/modules/recurrences/application/recurrence/recurrence-activator.service.ts';
import { RecurrenceAmountUpdater } from '#/modules/recurrences/application/recurrence/recurrence-amount-updater.service.ts';
import { ResumeRecurrenceUseCase } from '#/modules/recurrences/application/recurrence/resume-recurrence.usecase.ts';
import { UpdateRecurrenceUseCase } from '#/modules/recurrences/application/recurrence/update-recurrence.usecase.ts';
import type { RecurrenceAccountReader } from '#/modules/recurrences/application/recurrence/recurrence-account-reader.interface.ts';
import type { RecurrenceCategoryReader } from '#/modules/recurrences/application/recurrence/recurrence-category-reader.interface.ts';
import { AcceptSubscriptionSuggestionUseCase } from '#/modules/recurrences/application/subscription/accept-subscription-suggestion.usecase.ts';
import { DismissSubscriptionSuggestionUseCase } from '#/modules/recurrences/application/subscription/dismiss-subscription-suggestion.usecase.ts';
import { ListSubscriptionsQuery } from '#/modules/recurrences/application/subscription/list-subscriptions.query.ts';
import type { SubscriptionChargeReader } from '#/modules/recurrences/application/subscription/subscription-charge-reader.interface.ts';
import { SubscriptionSuggestionFinder } from '#/modules/recurrences/application/subscription/subscription-suggestion-finder.service.ts';
import { DecideOccurrenceDifferenceController } from '#/modules/recurrences/http/occurrence/decide-occurrence-difference.controller.ts';
import { ListOccurrenceCandidatesController } from '#/modules/recurrences/http/occurrence/list-occurrence-candidates.controller.ts';
import { ListOccurrencesController } from '#/modules/recurrences/http/occurrence/list-occurrences.controller.ts';
import { createOccurrenceRoute } from '#/modules/recurrences/http/occurrence/occurrence.route.ts';
import { SettleOccurrenceController } from '#/modules/recurrences/http/occurrence/settle-occurrence.controller.ts';
import { SkipOccurrenceController } from '#/modules/recurrences/http/occurrence/skip-occurrence.controller.ts';
import { UnsettleOccurrenceController } from '#/modules/recurrences/http/occurrence/unsettle-occurrence.controller.ts';
import { UnskipOccurrenceController } from '#/modules/recurrences/http/occurrence/unskip-occurrence.controller.ts';
import { UpdateOccurrenceController } from '#/modules/recurrences/http/occurrence/update-occurrence.controller.ts';
import { LinkOccurrencePaymentController } from '#/modules/recurrences/http/occurrence-payment/link-occurrence-payment.controller.ts';
import { createOccurrencePaymentRoute } from '#/modules/recurrences/http/occurrence-payment/occurrence-payment.route.ts';
import { UnlinkOccurrencePaymentController } from '#/modules/recurrences/http/occurrence-payment/unlink-occurrence-payment.controller.ts';
import { CreateRecurrenceController } from '#/modules/recurrences/http/recurrence/create-recurrence.controller.ts';
import { DeleteRecurrenceController } from '#/modules/recurrences/http/recurrence/delete-recurrence.controller.ts';
import { GetRecurrenceSummaryController } from '#/modules/recurrences/http/recurrence/get-recurrence-summary.controller.ts';
import { GetRecurrenceController } from '#/modules/recurrences/http/recurrence/get-recurrence.controller.ts';
import { ListRecurrencesController } from '#/modules/recurrences/http/recurrence/list-recurrences.controller.ts';
import { PauseRecurrenceController } from '#/modules/recurrences/http/recurrence/pause-recurrence.controller.ts';
import { PreviewRecurrenceController } from '#/modules/recurrences/http/recurrence/preview-recurrence.controller.ts';
import { createRecurrenceRoute } from '#/modules/recurrences/http/recurrence/recurrence.route.ts';
import { ResumeRecurrenceController } from '#/modules/recurrences/http/recurrence/resume-recurrence.controller.ts';
import { UpdateRecurrenceController } from '#/modules/recurrences/http/recurrence/update-recurrence.controller.ts';
import { AcceptSubscriptionSuggestionController } from '#/modules/recurrences/http/subscription/accept-subscription-suggestion.controller.ts';
import { DismissSubscriptionSuggestionController } from '#/modules/recurrences/http/subscription/dismiss-subscription-suggestion.controller.ts';
import { ListSubscriptionsController } from '#/modules/recurrences/http/subscription/list-subscriptions.controller.ts';
import { createSubscriptionRoute } from '#/modules/recurrences/http/subscription/subscription.route.ts';
import { KyselyOccurrenceRepository } from '#/modules/recurrences/infra/occurrence/occurrence.repository.ts';
import { KyselyRecurrenceRepository } from '#/modules/recurrences/infra/recurrence/recurrence.repository.ts';
import { BusinessCalendar } from '#/shared/calendar/business-calendar.service.ts';
import type { Clock } from '#/shared/clock/clock.interface.ts';
import type { UnitOfWork } from '#/shared/unit-of-work/unit-of-work.interface.ts';

// Builds the `recurrences` module by hand: its routes, the use case that creates the occurrences
// that are missing (the controllers, the API on start and the daily task call it) and the readers
// the other contexts ask it for. It asks three owners back, through ports: `accounts` (the account
// a recurrence falls in), `categories` (the category it gives) and `transactions` (what each
// transaction that settles an occurrence is worth, the ones to pick from, the use case that puts
// the category on it and the debits of the subscriptions).
export function createRecurrencesModule(deps: {
  db: Kysely<Database>;
  unitOfWork: UnitOfWork<Kysely<Database>>;
  clock: Clock;
  accounts: RecurrenceAccountReader;
  categories: RecurrenceCategoryReader;
  transactionPorts: {
    occurrenceTransactions: OccurrenceTransactionReader;
    applyCategory: ApplyRecurrenceCategory;
    subscriptionCharges: SubscriptionChargeReader;
  };
  // The bills hold transactions too: one tied to a bill is not offered to an occurrence.
  linkedElsewhere?: LinkedElsewhereReader | undefined;
}) {
  const { db, unitOfWork, clock, accounts, categories, transactionPorts, linkedElsewhere } = deps;
  const calendar = new BusinessCalendar();

  const recurrences = new KyselyRecurrenceRepository(db);
  const occurrences = new KyselyOccurrenceRepository(db);
  const opener = new OccurrenceOpener(calendar);
  const ensure = new EnsureOccurrencesUseCase(recurrences, occurrences, opener, unitOfWork, clock);
  const builder = new OccurrenceDtoBuilder(
    recurrences,
    transactionPorts.occurrenceTransactions,
    clock,
  );
  const loader = new MonthOccurrenceLoader(occurrences, builder);
  const amountUpdater = new RecurrenceAmountUpdater(recurrences, occurrences);
  const linker = new OccurrencePaymentLinker(
    occurrences,
    categories,
    transactionPorts.applyCategory,
    amountUpdater,
    builder,
    clock,
  );
  const activator = new RecurrenceActivator(
    recurrences,
    occurrences,
    ensure,
    opener,
    linker,
    clock,
  );
  const suggestionFinder = new SubscriptionSuggestionFinder(
    db,
    recurrences,
    occurrences,
    transactionPorts.subscriptionCharges,
    clock,
  );

  const recurrenceRoute = createRecurrenceRoute({
    listRecurrences: new ListRecurrencesController(
      ensure,
      new ListRecurrencesQuery(recurrences, loader),
    ),
    getRecurrenceSummary: new GetRecurrenceSummaryController(
      ensure,
      new GetRecurrenceSummaryQuery(loader),
    ),
    previewRecurrence: new PreviewRecurrenceController(new PreviewRecurrenceQuery(calendar, clock)),
    createRecurrence: new CreateRecurrenceController(
      new CreateRecurrenceUseCase(
        accounts,
        categories,
        transactionPorts.occurrenceTransactions,
        occurrences,
        activator,
        builder,
        opener,
        unitOfWork,
        clock,
        linkedElsewhere,
      ),
    ),
    getRecurrence: new GetRecurrenceController(
      new GetRecurrenceQuery(recurrences, occurrences, builder, clock),
    ),
    updateRecurrence: new UpdateRecurrenceController(
      new UpdateRecurrenceUseCase(
        recurrences,
        occurrences,
        accounts,
        categories,
        opener,
        ensure,
        unitOfWork,
        clock,
      ),
    ),
    pauseRecurrence: new PauseRecurrenceController(
      new PauseRecurrenceUseCase(recurrences, occurrences, unitOfWork, clock),
    ),
    resumeRecurrence: new ResumeRecurrenceController(
      new ResumeRecurrenceUseCase(recurrences, ensure, unitOfWork, clock),
    ),
    deleteRecurrence: new DeleteRecurrenceController(
      new DeleteRecurrenceUseCase(recurrences, occurrences, unitOfWork, clock),
    ),
  });

  const occurrenceRoute = createOccurrenceRoute({
    listOccurrences: new ListOccurrencesController(
      ensure,
      new ListOccurrencesQuery(occurrences, loader, builder, clock),
    ),
    listOccurrenceCandidates: new ListOccurrenceCandidatesController(
      new ListOccurrenceCandidatesQuery(
        occurrences,
        transactionPorts.occurrenceTransactions,
        builder,
        linkedElsewhere,
      ),
    ),
    updateOccurrence: new UpdateOccurrenceController(
      new UpdateOccurrenceUseCase(occurrences, builder, unitOfWork, clock),
    ),
    settleOccurrence: new SettleOccurrenceController(
      new SettleOccurrenceUseCase(occurrences, builder, unitOfWork, clock),
    ),
    unsettleOccurrence: new UnsettleOccurrenceController(
      new UnsettleOccurrenceUseCase(occurrences, builder, unitOfWork, clock),
    ),
    skipOccurrence: new SkipOccurrenceController(
      new SkipOccurrenceUseCase(occurrences, builder, unitOfWork, clock),
    ),
    unskipOccurrence: new UnskipOccurrenceController(
      new UnskipOccurrenceUseCase(occurrences, builder, unitOfWork, clock),
    ),
    decideOccurrenceDifference: new DecideOccurrenceDifferenceController(
      new DecideOccurrenceDifferenceUseCase(occurrences, amountUpdater, builder, unitOfWork, clock),
    ),
  });

  const occurrencePaymentRoute = createOccurrencePaymentRoute({
    linkOccurrencePayment: new LinkOccurrencePaymentController(
      new LinkOccurrencePaymentUseCase(
        occurrences,
        recurrences,
        transactionPorts.occurrenceTransactions,
        linker,
        builder,
        unitOfWork,
        linkedElsewhere,
      ),
    ),
    unlinkOccurrencePayment: new UnlinkOccurrencePaymentController(
      new UnlinkOccurrencePaymentUseCase(occurrences, unitOfWork, clock),
    ),
  });

  const subscriptionRoute = createSubscriptionRoute({
    listSubscriptions: new ListSubscriptionsController(
      ensure,
      new ListSubscriptionsQuery(
        recurrences,
        occurrences,
        transactionPorts.occurrenceTransactions,
        transactionPorts.subscriptionCharges,
        builder,
        suggestionFinder,
        clock,
      ),
    ),
    acceptSubscriptionSuggestion: new AcceptSubscriptionSuggestionController(
      new AcceptSubscriptionSuggestionUseCase(
        suggestionFinder,
        categories,
        transactionPorts.occurrenceTransactions,
        occurrences,
        activator,
        builder,
        unitOfWork,
        clock,
      ),
    ),
    dismissSubscriptionSuggestion: new DismissSubscriptionSuggestionController(
      new DismissSubscriptionSuggestionUseCase(suggestionFinder, unitOfWork, clock),
    ),
  });

  const routes = new Hono()
    .route('/', recurrenceRoute)
    .route('/', occurrenceRoute)
    .route('/', occurrencePaymentRoute)
    .route('/', subscriptionRoute);

  return {
    routes,
    // Creates the occurrences that are missing: also called when the API starts and every day.
    ensureOccurrences: ensure,
    // The readers `transactions` declares and `recurrences` fulfils.
    transactionReaders: {
      occurrenceLinks: new GetTransactionOccurrenceLinksQuery(db),
      recurrenceCandidates: new ListRecurrenceCandidatesQuery(
        db,
        occurrences,
        builder,
        linkedElsewhere,
      ),
    },
    // The readers `invoices` declares and `recurrences` fulfils.
    invoiceReaders: {
      expectations: new GetOccurrenceExpectationsQuery(db, occurrences, builder),
      linkedTransactions: new FindOccurrenceLinkedTransactionsQuery(occurrences),
    },
    // What `sync` asks of `recurrences`: the automatic match of the new transactions of a round with
    // the occurrences they settle (`linkedBy = auto`), after making the occurrences ready.
    syncPorts: {
      autoMatch: new AutoMatchOccurrencesUseCase(
        ensure,
        occurrences,
        recurrences,
        transactionPorts.occurrenceTransactions,
        builder,
        linker,
      ),
    },
    // The reader `profile` declares and `recurrences` fulfils.
    profileReaders: {
      incomeSources: new ListIncomeSourcesQuery(recurrences, calendar, clock),
    },
  };
}
