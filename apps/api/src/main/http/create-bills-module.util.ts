import { Hono } from 'hono';
import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import { BillPaymentCandidateFinder } from '#/modules/bills/application/bill-payment/bill-payment-candidate-finder.service.ts';
import { BillPaymentLinker } from '#/modules/bills/application/bill-payment/bill-payment-linker.service.ts';
import type { BillCategoryReader } from '#/modules/bills/application/bill-payment/bill-category-reader.interface.ts';
import type { BillTransactionReader } from '#/modules/bills/application/bill-payment/bill-transaction-reader.interface.ts';
import type { BillTransactionWriter } from '#/modules/bills/application/bill-payment/bill-transaction-writer.interface.ts';
import { CreateBillPaymentUseCase } from '#/modules/bills/application/bill-payment/create-bill-payment.usecase.ts';
import { DeleteBillPaymentUseCase } from '#/modules/bills/application/bill-payment/delete-bill-payment.usecase.ts';
import { DismissBillPaymentSuggestionUseCase } from '#/modules/bills/application/bill-payment/dismiss-payment-suggestion.usecase.ts';
import type { LinkedElsewhereReader } from '#/modules/bills/application/bill-payment/linked-elsewhere-reader.interface.ts';
import { ListBillPaymentCandidatesQuery } from '#/modules/bills/application/bill-payment/list-bill-payment-candidates.query.ts';
import { ListNewBillPaymentCandidatesQuery } from '#/modules/bills/application/bill-payment/list-new-bill-payment-candidates.query.ts';
import { UndoBillPaymentSuggestionDismissalUseCase } from '#/modules/bills/application/bill-payment/undo-bill-payment-suggestion-dismissal.usecase.ts';
import { BillDtoBuilder } from '#/modules/bills/application/bill/bill-dto-builder.service.ts';
import { CreateBillUseCase } from '#/modules/bills/application/bill/create-bill.usecase.ts';
import { DeleteBillUseCase } from '#/modules/bills/application/bill/delete-bill.usecase.ts';
import { GetBillQuery } from '#/modules/bills/application/bill/get-bill.query.ts';
import { ListBillCounterpartiesQuery } from '#/modules/bills/application/bill/list-bill-counterparties.query.ts';
import { ListBillsQuery } from '#/modules/bills/application/bill/list-bills.query.ts';
import { UpdateBillUseCase } from '#/modules/bills/application/bill/update-bill.usecase.ts';
import { CreateBillController } from '#/modules/bills/http/bill/create-bill.controller.ts';
import { DeleteBillController } from '#/modules/bills/http/bill/delete-bill.controller.ts';
import { GetBillController } from '#/modules/bills/http/bill/get-bill.controller.ts';
import { ListBillCounterpartiesController } from '#/modules/bills/http/bill/list-bill-counterparties.controller.ts';
import { ListBillsController } from '#/modules/bills/http/bill/list-bills.controller.ts';
import { createBillRoute } from '#/modules/bills/http/bill/bill.route.ts';
import { UpdateBillController } from '#/modules/bills/http/bill/update-bill.controller.ts';
import { CreateBillPaymentController } from '#/modules/bills/http/bill-payment/create-bill-payment.controller.ts';
import { DeleteBillPaymentController } from '#/modules/bills/http/bill-payment/delete-bill-payment.controller.ts';
import { DismissBillPaymentSuggestionController } from '#/modules/bills/http/bill-payment/dismiss-payment-suggestion.controller.ts';
import { ListBillPaymentCandidatesController } from '#/modules/bills/http/bill-payment/list-bill-payment-candidates.controller.ts';
import { ListNewBillPaymentCandidatesController } from '#/modules/bills/http/bill-payment/list-new-bill-payment-candidates.controller.ts';
import { createBillPaymentRoute } from '#/modules/bills/http/bill-payment/bill-payment.route.ts';
import { UndoBillPaymentSuggestionDismissalController } from '#/modules/bills/http/bill-payment/undo-bill-payment-suggestion-dismissal.controller.ts';
import { KyselyBillRepository } from '#/modules/bills/infra/bill/bill.repository.ts';
import type { Clock } from '#/shared/clock/clock.interface.ts';
import type { UnitOfWork } from '#/shared/unit-of-work/unit-of-work.interface.ts';

// Builds the `bills` module by hand: its routes. It asks three owners, through ports: `categories`
// (the category of a bill), `transactions` (what each transaction is worth, the ones to pick from,
// and the effects on them: the friend part `lent`, the money back `reimbursed`, the category) and,
// for the transactions that settle an invoice or an occurrence, `invoices` and `recurrences`.
export function createBillsModule(deps: {
  db: Kysely<Database>;
  unitOfWork: UnitOfWork<Kysely<Database>>;
  clock: Clock;
  categories: BillCategoryReader;
  transactionPorts: {
    billTransactions: BillTransactionReader;
    billEffects: BillTransactionWriter;
  };
  linkedElsewhere?: LinkedElsewhereReader | undefined;
}) {
  const { db, unitOfWork, clock, categories, transactionPorts, linkedElsewhere } = deps;

  const bills = new KyselyBillRepository(db);
  const builder = new BillDtoBuilder(transactionPorts.billTransactions, clock);
  const linker = new BillPaymentLinker(
    bills,
    transactionPorts.billTransactions,
    transactionPorts.billEffects,
    categories,
    linkedElsewhere,
    builder,
  );
  const finder = new BillPaymentCandidateFinder(
    bills,
    transactionPorts.billTransactions,
    linkedElsewhere,
    clock,
  );

  const billRoute = createBillRoute({
    listBills: new ListBillsController(new ListBillsQuery(bills, builder)),
    listBillCounterparties: new ListBillCounterpartiesController(
      new ListBillCounterpartiesQuery(bills, builder),
    ),
    getBill: new GetBillController(new GetBillQuery(bills, builder)),
    createBill: new CreateBillController(
      new CreateBillUseCase(
        bills,
        categories,
        transactionPorts.billTransactions,
        transactionPorts.billEffects,
        linker,
        builder,
        unitOfWork,
        clock,
      ),
    ),
    updateBill: new UpdateBillController(
      new UpdateBillUseCase(bills, categories, builder, unitOfWork, clock),
    ),
    deleteBill: new DeleteBillController(
      new DeleteBillUseCase(bills, linker, transactionPorts.billEffects, unitOfWork),
    ),
  });

  const billPaymentRoute = createBillPaymentRoute({
    listNewBillPaymentCandidates: new ListNewBillPaymentCandidatesController(
      new ListNewBillPaymentCandidatesQuery(finder),
    ),
    listBillPaymentCandidates: new ListBillPaymentCandidatesController(
      new ListBillPaymentCandidatesQuery(bills, finder),
    ),
    createBillPayment: new CreateBillPaymentController(
      new CreateBillPaymentUseCase(bills, linker, builder, unitOfWork, clock),
    ),
    deleteBillPayment: new DeleteBillPaymentController(
      new DeleteBillPaymentUseCase(bills, linker, unitOfWork, clock),
    ),
    dismissBillPaymentSuggestion: new DismissBillPaymentSuggestionController(
      new DismissBillPaymentSuggestionUseCase(
        bills,
        transactionPorts.billTransactions,
        builder,
        unitOfWork,
        clock,
      ),
    ),
    undoBillPaymentSuggestionDismissal: new UndoBillPaymentSuggestionDismissalController(
      new UndoBillPaymentSuggestionDismissalUseCase(
        bills,
        transactionPorts.billTransactions,
        builder,
        unitOfWork,
        clock,
      ),
    ),
  });

  // `/bills/payment-candidates` is a fixed path under `/bills/:id`: the payment route goes first.
  const routes = new Hono().route('/', billPaymentRoute).route('/', billRoute);

  return { routes };
}
