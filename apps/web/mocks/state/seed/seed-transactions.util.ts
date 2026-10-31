import { computeInvoice } from '#mocks/invoices/invoice/compute-invoice.util.ts';
import { ensureInvoiceRow } from '#mocks/invoices/invoice/ensure-invoice-row.util.ts';
import { invoiceMonthFor } from '#mocks/invoices/invoice/invoice-month-for.util.ts';
import { openMonthFor } from '#mocks/invoices/invoice/open-month-for.util.ts';
import { newId } from '#mocks/state/mock-id.store.ts';
import type { MockState } from '#mocks/state/mock-state.type.ts';
import type { SeedIds } from '#mocks/state/seed/build-seed-ids.util.ts';
import { makeTransactionRecord } from '#mocks/state/seed/make-transaction-record.util.ts';
import { addDays } from '#mocks/support/dates/add-days.util.ts';
import { addMonths } from '#mocks/support/dates/add-months.util.ts';
import { CURRENT_MONTH, NOW_ISO, TODAY } from '#mocks/support/dates/mock-clock.store.ts';
import { dateInMonth } from '#mocks/support/dates/date-in-month.util.ts';
import { dayOf } from '#mocks/support/dates/day-of.util.ts';
import { toInstant } from '#mocks/support/dates/to-instant.util.ts';

// A day this month, `back` days before today, never before the 1st (so the month always has a past).
function cur(back: number): string {
  const date = addDays(TODAY, -back);

  return date < `${CURRENT_MONTH}-01` ? `${CURRENT_MONTH}-01` : date;
}

// Transactions, installment plans and the paid invoices of the past. Names and amounts are made up.
export function seedTransactions(database: MockState.Database, ids: SeedIds): void {
  const { acc, cat, rule } = ids;
  const previous = addMonths(CURRENT_MONTH, -1);
  const prevDay = (day: number) => dateInMonth(previous, day);
  const nuCard = database.accounts.find((a) => a.id === acc.nuCartao)?.creditCard;
  const brCard = database.accounts.find((a) => a.id === acc.brCartao)?.creditCard;
  if (!nuCard || !brCard) throw new Error('Seed: cards missing');

  const push = (input: Parameters<typeof makeTransactionRecord>[0]) => {
    const record = makeTransactionRecord(input);
    database.transactions.push(record);

    return record;
  };
  const onCard = (
    cardId: string,
    closingDay: number,
    input: Omit<
      Parameters<typeof makeTransactionRecord>[0],
      'accountId' | 'method' | 'invoiceMonth'
    >,
  ) =>
    push({
      ...input,
      accountId: cardId,
      method: 'credit',
      invoiceMonth: invoiceMonthFor(closingDay, input.occurredOn),
    });

  // Nubank checking.
  push({
    accountId: acc.nuConta,
    method: 'pix',
    description: 'PIX MERCADINHO SAO JOSE',
    amountCents: -5420,
    occurredOn: cur(1),
    categoryId: cat.mercado,
  });
  push({
    accountId: acc.nuConta,
    method: 'debit',
    description: 'PADARIA PAO QUENTE',
    amountCents: -1890,
    occurredOn: cur(2),
    categoryId: cat.restaurantes,
  });
  push({
    accountId: acc.nuConta,
    method: 'pix',
    description: 'PIX FEIRA DO BAIRRO',
    amountCents: -3750,
    occurredOn: cur(4),
    categoryId: cat.mercado,
  });
  push({
    accountId: acc.nuConta,
    method: 'debit',
    description: 'FARMACIA VIDA SAUDE',
    amountCents: -6790,
    occurredOn: cur(7),
    categoryId: cat.saude,
  });
  push({
    accountId: acc.nuConta,
    method: 'pix',
    description: 'PIX LANCHONETE ZE',
    amountCents: -3200,
    occurredOn: cur(9),
    counterparty: 'JOSE LANCHES ME',
  });
  push({
    accountId: acc.nuConta,
    method: 'debit',
    description: 'COBRANCA TARIFA DUPLICADA',
    amountCents: -990,
    occurredOn: cur(11),
  }).ignoredAt = toInstant(cur(10));
  // The bank changed this amount after Lucas edited it.
  const edited = push({
    accountId: acc.nuConta,
    method: 'debit',
    description: 'SUPERMERCADO ATACADO NORTE',
    amountCents: -4680,
    occurredOn: cur(3),
    categoryId: cat.mercado,
  });
  edited.amountCents = -5280;
  edited.editNote = 'Contei a sacola de volta';
  edited.bankChange = {
    detectedAt: NOW_ISO,
    changes: [{ field: 'amountCents', before: -5280, after: -4680 }],
  };

  // Transfer between own accounts: both legs, outside the account.
  const out = push({
    accountId: acc.nuConta,
    method: 'transfer',
    nature: 'transfer',
    description: 'TRANSFERENCIA ENVIADA BRADESCO',
    amountCents: -50_000,
    occurredOn: cur(10),
  });
  const incoming = push({
    accountId: acc.brConta,
    method: 'transfer',
    nature: 'transfer',
    description: 'TRANSFERENCIA RECEBIDA NUBANK',
    amountCents: 50_000,
    occurredOn: cur(10),
  });
  out.transferCounterpartId = incoming.id;
  incoming.transferCounterpartId = out.id;

  // Bradesco checking.
  push({
    accountId: acc.brConta,
    method: 'debit',
    description: 'COMPRA DEBITO ELETROPECAS',
    amountCents: -8990,
    occurredOn: cur(1),
  });
  push({
    accountId: acc.brConta,
    method: 'pix',
    description: 'PIX JOSE C SILVA',
    amountCents: -6500,
    occurredOn: cur(3),
    counterparty: 'JOSE C SILVA',
  });
  push({
    accountId: acc.brConta,
    method: 'debit',
    description: 'POSTO BR RODOVIA',
    amountCents: -17_000,
    occurredOn: cur(5),
    categoryId: cat.transporte,
    categorySource: 'rule',
    categoryRuleId: rule.posto,
  });
  push({
    accountId: acc.brConta,
    method: 'boleto',
    description: 'CONDOMINIO RES ALVORADA',
    amountCents: -62_000,
    occurredOn: cur(8),
    categoryId: cat.moradia,
  });
  // Looks like the payment of the "Mensalidade do curso" bill, not tied yet.
  push({
    accountId: acc.brConta,
    method: 'pix',
    description: 'PIX CURSOFIT',
    amountCents: -18_000,
    occurredOn: cur(2),
    categoryId: cat.educacao,
    counterparty: 'CURSOFIT EDUCACAO',
  });

  // Wallet (manual).
  push({
    accountId: acc.carteira,
    origin: 'manual',
    method: 'cash',
    nature: 'balance_adjustment',
    natureSetBy: 'user',
    description: 'Ajuste de saldo',
    amountCents: 20_000,
    occurredOn: addDays(TODAY, -20),
  });
  push({
    accountId: acc.carteira,
    origin: 'manual',
    method: 'cash',
    description: 'Feira',
    amountCents: -3500,
    occurredOn: cur(5),
    categoryId: cat.mercado,
  });
  push({
    accountId: acc.carteira,
    origin: 'manual',
    method: 'cash',
    description: 'Café',
    amountCents: -1200,
    occurredOn: cur(2),
    categoryId: cat.restaurantes,
  });

  // Nubank card.
  const nu = (input: Omit<Parameters<typeof onCard>[2], never>) =>
    onCard(acc.nuCartao, nuCard.closingDay, input);
  nu({
    description: 'IFOOD *RESTAURANTE',
    amountCents: -4890,
    occurredOn: cur(2),
    categoryId: cat.delivery,
    categorySource: 'rule',
    categoryRuleId: rule.ifood,
  });
  nu({
    description: 'IFOOD *HAMBURGUERIA',
    amountCents: -5290,
    occurredOn: cur(8),
    categoryId: cat.delivery,
    categorySource: 'rule',
    categoryRuleId: rule.ifood,
  });
  nu({
    description: 'UBER *TRIP',
    amountCents: -2190,
    occurredOn: cur(3),
    categoryId: cat.transporte,
  });
  nu({
    description: 'UBER *TRIP',
    amountCents: -1850,
    occurredOn: cur(14),
    categoryId: cat.transporte,
  });
  nu({
    description: 'UBER *TRIP',
    amountCents: -2490,
    occurredOn: cur(15),
    categoryId: cat.transporte,
  });
  nu({ description: 'UBER *TRIP', amountCents: -1990, occurredOn: cur(1) });
  nu({
    description: 'MERCADO BOM PRECO',
    amountCents: -18_732,
    occurredOn: cur(6),
    categoryId: cat.mercado,
  });
  nu({
    description: 'AMAZON MARKETPLACE',
    amountCents: -7490,
    occurredOn: cur(13),
    categoryId: cat.compras,
  });
  for (const [back, description, amount, category] of [
    [28, 'IFOOD *PIZZARIA', -6190, cat.delivery],
    [31, 'MERCADO BOM PRECO', -21_450, cat.mercado],
    [36, 'UBER *TRIP', -2790, cat.transporte],
    [41, 'AMAZON MARKETPLACE', -9990, cat.compras],
  ] as const) {
    nu({
      description,
      amountCents: amount,
      occurredOn: addDays(TODAY, -back),
      categoryId: category,
    });
  }

  // Bradesco card.
  const br = (input: Parameters<typeof onCard>[2]) =>
    onCard(acc.brCartao, brCard.closingDay, input);
  br({
    description: 'RESTAURANTE SABOR DA CASA',
    amountCents: -8950,
    occurredOn: cur(5),
    categoryId: cat.restaurantes,
  });
  br({
    description: 'LIVRARIA CULTURA',
    amountCents: -12_900,
    occurredOn: cur(7),
    categoryId: cat.educacao,
  });
  br({
    description: 'MAGAZINE LUIZA',
    amountCents: -24_990,
    occurredOn: cur(10),
    categoryId: cat.compras,
  });
  br({ description: 'CINEMARK', amountCents: -5400, occurredOn: cur(1), categoryId: cat.lazer });
  for (const [back, description, amount, category] of [
    [30, 'RESTAURANTE SABOR DA CASA', -10_350, cat.restaurantes],
    [34, 'MAGAZINE LUIZA', -15_990, cat.compras],
    [39, 'POSTO BR RODOVIA', -16_000, cat.transporte],
  ] as const) {
    br({
      description,
      amountCents: amount,
      occurredOn: addDays(TODAY, -back),
      categoryId: category,
    });
  }

  // Last month, for the comparisons: a few days with spending in each big category.
  const lastMonth: [number, string, number, string, 'nuConta' | 'brConta'][] = [
    [3, 'PIX MERCADINHO SAO JOSE', -6120, cat.mercado, 'nuConta'],
    [6, 'PADARIA PAO QUENTE', -2240, cat.restaurantes, 'nuConta'],
    [9, 'FARMACIA VIDA SAUDE', -9830, cat.saude, 'nuConta'],
    [12, 'PIX FEIRA DO BAIRRO', -4200, cat.mercado, 'nuConta'],
    [14, 'POSTO BR RODOVIA', -15_500, cat.transporte, 'brConta'],
    [18, 'PIX MERCADINHO SAO JOSE', -7310, cat.mercado, 'nuConta'],
    [21, 'CONDOMINIO RES ALVORADA', -62_000, cat.moradia, 'brConta'],
    [24, 'PIX LANCHONETE ZE', -4100, cat.restaurantes, 'nuConta'],
    [27, 'PIX CLINICA SAO LUCAS', -22_000, cat.saude, 'brConta'],
  ];
  for (const [day, description, amount, category, account] of lastMonth) {
    push({
      accountId: acc[account],
      method: 'debit',
      description,
      amountCents: amount,
      occurredOn: prevDay(day),
      categoryId: category,
    });
  }
  for (const [day, description, amount, category] of [
    [4, 'IFOOD *PIZZARIA', -5890, cat.delivery],
    [8, 'UBER *TRIP', -2090, cat.transporte],
    [11, 'UBER *TRIP', -1790, cat.transporte],
    [16, 'MERCADO BOM PRECO', -19_870, cat.mercado],
    [22, 'IFOOD *RESTAURANTE', -4390, cat.delivery],
  ] as const) {
    nu({ description, amountCents: amount, occurredOn: prevDay(day), categoryId: category });
  }
  for (const [day, description, amount, category] of [
    [5, 'RESTAURANTE SABOR DA CASA', -11_200, cat.restaurantes],
    [13, 'CINEMARK', -6200, cat.lazer],
    [19, 'MAGAZINE LUIZA', -18_900, cat.compras],
  ] as const) {
    br({ description, amountCents: amount, occurredOn: prevDay(day), categoryId: category });
  }

  // Installment plans: the bank's notebook 3 of 10 on Nubank, Lucas's sneakers 2 of 4 on Bradesco.
  const nuOpen = openMonthFor(nuCard, TODAY);
  const brOpen = openMonthFor(brCard, TODAY);
  const makePlan = (
    plan: Omit<MockState.InstallmentPlanRecord, 'id'>,
    cardId: string,
    amount: number,
    origin: 'bank' | 'manual',
  ) => {
    const record: MockState.InstallmentPlanRecord = { id: newId(), ...plan };
    database.installmentPlans.push(record);
    for (let number = 1; number <= plan.installmentCount; number += 1) {
      const month = addMonths(plan.firstInvoiceMonth, number - 1);
      push({
        accountId: cardId,
        origin,
        method: 'credit',
        description: plan.description,
        amountCents: -amount,
        occurredOn:
          origin === 'bank' ? plan.purchaseOn : dateInMonth(month, dayOf(plan.purchaseOn)),
        invoiceMonth: month,
        categoryId: plan.categoryId,
        installment: { planId: record.id, number, count: plan.installmentCount },
      });
    }
  };
  const nuFirst = addMonths(nuOpen, -2);
  makePlan(
    {
      accountId: acc.nuCartao,
      origin: 'bank',
      description: 'Notebook Aero 14',
      purchaseOn: dateInMonth(nuFirst, Math.max(1, nuCard.closingDay - 4)),
      totalCents: 349_000,
      installmentCount: 10,
      firstInvoiceMonth: nuFirst,
      categoryId: cat.compras,
    },
    acc.nuCartao,
    34_900,
    'bank',
  );
  const brFirst = addMonths(brOpen, -1);
  makePlan(
    {
      accountId: acc.brCartao,
      origin: 'manual',
      description: 'Tênis de corrida',
      purchaseOn: dateInMonth(brFirst, Math.max(1, brCard.closingDay - 6)),
      totalCents: 59_960,
      installmentCount: 4,
      firstInvoiceMonth: brFirst,
      categoryId: cat.compras,
    },
    acc.brCartao,
    14_990,
    'manual',
  );

  // Pay the past invoices. The last closed Bradesco one is the "pagamento encontrado" case: the
  // debit left the account but is not tied to the invoice yet.
  for (const [cardId, card, paysAccount, openMonth] of [
    [acc.nuCartao, nuCard, acc.nuConta, nuOpen],
    [acc.brCartao, brCard, acc.brConta, brOpen],
  ] as const) {
    for (let back = 3; back >= 1; back -= 1) {
      const month = addMonths(openMonth, -back);
      const invoice = computeInvoice(database, cardId, month).dto;
      if (invoice.computedTotalCents <= 0) continue;
      const row = ensureInvoiceRow(database, cardId, month);
      const isFoundCase = cardId === acc.brCartao && back === 1;
      const paidOn = isFoundCase ? addDays(TODAY, -1) : addDays(row.dueOn, -1);
      const payment = push({
        accountId: paysAccount,
        method: 'transfer',
        nature: 'invoice_payment',
        natureSetBy: isFoundCase ? 'system' : 'user',
        description: isFoundCase
          ? 'PAGAMENTO FATURA CARTAO BRADESCO'
          : `PAGAMENTO FATURA ${card.brand.toUpperCase()}`,
        amountCents: -invoice.computedTotalCents,
        occurredOn: paidOn > TODAY ? TODAY : paidOn,
      });
      if (isFoundCase) {
        row.bankTotalCents = invoice.computedTotalCents;
      } else {
        row.payments.push({
          id: newId(),
          amountCents: invoice.computedTotalCents,
          paidOn: payment.occurredOn,
          transactionId: payment.id,
        });
      }
    }
  }
}
