import { newId } from '#mocks/state/mock-id.store.ts';
import type { MockState } from '#mocks/state/mock-state.type.ts';
import type { SeedIds } from '#mocks/state/seed/build-seed-ids.util.ts';
import { makeTransactionRecord } from '#mocks/state/seed/make-transaction-record.util.ts';
import { openMonthFor } from '#mocks/invoices/invoice/open-month-for.util.ts';
import { addDays } from '#mocks/support/dates/add-days.util.ts';
import { addMonths } from '#mocks/support/dates/add-months.util.ts';
import { TODAY } from '#mocks/support/dates/mock-clock.store.ts';

type Purchase = [back: number, description: string, cents: number, category: string | null];

// What the open Nubank invoice carries on top of the small base seed, so the invoice page has a
// real month to show: 30+ lines, a refund, installments (two end on this invoice) and the next
// invoice already committed. Runs last, so the ids of everything before it stay the same. Made up.
export function seedInvoiceShowcase(database: MockState.Database, ids: SeedIds): void {
  const { acc, cat } = ids;
  const card = database.accounts.find((account) => account.id === acc.nuCartao)?.creditCard;
  if (!card) throw new Error('Seed: Nubank card missing');
  const openMonth = openMonthFor(card, TODAY);

  const onInvoice = (
    input: Omit<Parameters<typeof makeTransactionRecord>[0], 'accountId' | 'method'>,
  ) => {
    const record = makeTransactionRecord({
      ...input,
      accountId: acc.nuCartao,
      method: 'credit',
      invoiceMonth: input.invoiceMonth ?? openMonth,
    });
    database.transactions.push(record);

    return record;
  };

  const purchases: Purchase[] = [
    [0, 'PADARIA PAO QUENTE', -1850, cat.restaurantes],
    [1, 'SUPERMERCADO NOVA ERA', -14_290, cat.mercado],
    [2, 'POSTO BR RODOVIA', -21_000, cat.transporte],
    [2, 'IFOOD *SUSHI HOUSE', -8990, cat.delivery],
    [3, 'CINEPLEX SHOPPING', -4800, cat.lazer],
    [5, 'HORTIFRUTI DO ZE', -9870, cat.mercado],
    [6, 'LIVRARIA SARAIVA', -7490, cat.educacao],
    [7, 'LOJA ONLINE VAREJAO', -15_990, cat.compras],
    [7, 'IFOOD *PASTELARIA', -6490, cat.delivery],
    [11, 'ATACADO PREMIO', -22_760, cat.mercado],
    [13, 'LOJA DE ROUPAS MODA', -18_900, cat.compras],
    [14, 'SPOTIFY', -2190, cat.assinaturas],
    [16, 'ACADEMIA FORMA', -11_900, cat.saude],
    [17, 'SHOW INGRESSOS ONLINE', -24_000, cat.lazer],
    // The refund of a purchase: the bank sends it as a credit on the card (an expense, positive).
    [5, 'ESTORNO LOJA ONLINE VAREJAO', 5990, cat.compras],
    [12, 'ESTORNO LOJA DE ROUPAS MODA', 4500, cat.compras],
  ];
  for (const [back, description, amountCents, categoryId] of purchases) {
    onInvoice({
      description,
      amountCents,
      occurredOn: addDays(TODAY, -back),
      categoryId,
      categorySource: 'rule',
      nature: 'expense',
    });
  }

  // Installment plans seen from this invoice on: the earlier parcels are not in the history. The
  // fridge and the course end here; the chair ends on the next invoice.
  const plans: Array<{
    description: string;
    parcelCents: number;
    count: number;
    firstNumber: number;
    categoryId: string;
    purchaseBack: number;
  }> = [
    {
      description: 'Geladeira Frost Free',
      parcelCents: 28_990,
      count: 10,
      firstNumber: 10,
      categoryId: cat.moradia,
      purchaseBack: 290,
    },
    {
      description: 'Curso de inglês',
      parcelCents: 19_900,
      count: 6,
      firstNumber: 6,
      categoryId: cat.educacao,
      purchaseBack: 170,
    },
    {
      description: 'Cadeira de escritório',
      parcelCents: 21_990,
      count: 5,
      firstNumber: 4,
      categoryId: cat.compras,
      purchaseBack: 100,
    },
  ];
  for (const plan of plans) {
    const record: MockState.InstallmentPlanRecord = {
      id: newId(),
      accountId: acc.nuCartao,
      origin: 'bank',
      description: plan.description,
      purchaseOn: addDays(TODAY, -plan.purchaseBack),
      totalCents: plan.parcelCents * plan.count,
      installmentCount: plan.count,
      firstInvoiceMonth: addMonths(openMonth, 1 - plan.firstNumber),
      categoryId: plan.categoryId,
    };
    database.installmentPlans.push(record);
    for (let number = plan.firstNumber; number <= plan.count; number += 1) {
      onInvoice({
        origin: 'bank',
        description: plan.description,
        amountCents: -plan.parcelCents,
        occurredOn: record.purchaseOn,
        invoiceMonth: addMonths(openMonth, number - plan.firstNumber),
        categoryId: plan.categoryId,
        categorySource: 'rule',
        installment: { planId: record.id, number, count: plan.count },
      });
    }
  }
}
