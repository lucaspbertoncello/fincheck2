import { newId } from '#mocks/state/mock-id.store.ts';
import type { MockState } from '#mocks/state/mock-state.type.ts';
import type { SeedIds } from '#mocks/state/seed/build-seed-ids.util.ts';
import { makeTransactionRecord } from '#mocks/state/seed/make-transaction-record.util.ts';
import { addDays } from '#mocks/support/dates/add-days.util.ts';
import { CURRENT_MONTH, TODAY } from '#mocks/support/dates/clock.constant.ts';
import { daysInMonth } from '#mocks/support/dates/days-in-month.util.ts';
import { toInstant } from '#mocks/support/dates/to-instant.util.ts';

function cur(back: number): string {
  const date = addDays(TODAY, -back);

  return date < `${CURRENT_MONTH}-01` ? `${CURRENT_MONTH}-01` : date;
}

function ahead(days: number): string {
  const date = addDays(TODAY, days);
  const last = `${CURRENT_MONTH}-${String(daysInMonth(CURRENT_MONTH)).padStart(2, '0')}`;

  return date > last ? last : date;
}

// Bills, debts with friends, category rules and the backup folder.
export function seedBillsAndRules(database: MockState.Database, ids: SeedIds): void {
  const { acc, cat, rule } = ids;
  const stamp = (date: string) => ({ createdAt: toInstant(date), updatedAt: toInstant(date) });

  // I owe Rafa for a show ticket; a Pix of R$ 150,00 already paid part of it.
  const rafaPix = makeTransactionRecord({
    accountId: acc.brConta,
    method: 'pix',
    description: 'PIX RAFAEL MOURA',
    amountCents: -15_000,
    occurredOn: cur(3),
    counterparty: 'RAFAEL MOURA',
    categoryId: cat.lazer,
    categorySource: 'bill',
  });
  database.transactions.push(rafaPix);
  database.bills.push({
    id: newId(),
    direction: 'payable',
    kind: 'friend',
    description: 'Ingresso do show',
    counterparty: 'Rafa',
    amountCents: 42_000,
    dueOn: ahead(8),
    categoryId: cat.lazer,
    origin: null,
    payments: [
      {
        id: newId(),
        amountCents: 15_000,
        paidOn: rafaPix.occurredOn,
        transactionId: rafaPix.id,
        description: null,
      },
    ],
    dismissedTransactionIds: [],
    ...stamp(cur(12)),
  });

  // Júlia owes half of a dinner I paid; she sent R$ 58,00 so far. The dinner is split in two.
  const dinner = makeTransactionRecord({
    accountId: acc.nuConta,
    method: 'debit',
    description: 'RESTAURANTE CANTINA NONNA',
    amountCents: -23_200,
    occurredOn: cur(6),
  });
  dinner.splits = [
    {
      id: newId(),
      position: 1,
      amountCents: -11_600,
      nature: 'expense',
      categoryId: cat.restaurantes,
      description: 'Minha parte',
    },
    {
      id: newId(),
      position: 2,
      amountCents: -11_600,
      nature: 'lent',
      categoryId: null,
      description: 'Metade da Júlia',
    },
  ];
  database.transactions.push(dinner);
  const juliaPix = makeTransactionRecord({
    accountId: acc.nuConta,
    method: 'pix',
    nature: 'reimbursed',
    natureSetBy: 'user',
    description: 'PIX JULIA TAVARES',
    amountCents: 5800,
    occurredOn: cur(2),
    counterparty: 'JULIA TAVARES',
  });
  database.transactions.push(juliaPix);
  database.bills.push({
    id: newId(),
    direction: 'receivable',
    kind: 'friend',
    description: 'Jantar na Nonna',
    counterparty: 'Júlia',
    amountCents: 11_600,
    dueOn: null,
    categoryId: null,
    origin: {
      transactionId: dinner.id,
      amountCents: 11_600,
      occurredOn: dinner.occurredOn,
      description: dinner.description,
    },
    payments: [
      {
        id: newId(),
        amountCents: 5800,
        paidOn: juliaPix.occurredOn,
        transactionId: juliaPix.id,
        description: null,
      },
    ],
    dismissedTransactionIds: [],
    ...stamp(cur(6)),
  });

  database.bills.push({
    id: newId(),
    direction: 'payable',
    kind: 'general',
    description: 'IPVA, cota 2',
    counterparty: null,
    amountCents: 38_000,
    dueOn: ahead(5),
    categoryId: cat.moradia,
    origin: null,
    payments: [],
    dismissedTransactionIds: [],
    ...stamp(cur(15)),
  });
  database.bills.push({
    id: newId(),
    direction: 'payable',
    kind: 'general',
    description: 'Conserto do notebook',
    counterparty: null,
    amountCents: 25_000,
    dueOn: null,
    categoryId: null,
    origin: null,
    payments: [],
    dismissedTransactionIds: [],
    ...stamp(cur(9)),
  });
  // Overdue by a day or two, and the Pix that probably paid it is already in the account.
  database.bills.push({
    id: newId(),
    direction: 'payable',
    kind: 'general',
    description: 'Mensalidade do curso',
    counterparty: 'Cursofit',
    amountCents: 18_000,
    dueOn: cur(3),
    categoryId: cat.educacao,
    origin: null,
    payments: [],
    dismissedTransactionIds: [],
    ...stamp(cur(14)),
  });
  database.bills.push({
    id: newId(),
    direction: 'receivable',
    kind: 'general',
    description: 'Revisão de texto (Marina)',
    counterparty: 'Marina',
    amountCents: 15_000,
    dueOn: ahead(10),
    categoryId: cat.freelance,
    origin: null,
    payments: [],
    dismissedTransactionIds: [],
    ...stamp(cur(7)),
  });
  const insurancePix = makeTransactionRecord({
    accountId: acc.nuConta,
    method: 'pix',
    description: 'PIX SEGURADORA ALFA',
    amountCents: -9000,
    occurredOn: cur(10),
    categoryId: cat.outros,
    categorySource: 'bill',
  });
  database.transactions.push(insurancePix);
  database.bills.push({
    id: newId(),
    direction: 'payable',
    kind: 'general',
    description: 'Seguro do celular',
    counterparty: null,
    amountCents: 9000,
    dueOn: cur(10),
    categoryId: cat.outros,
    origin: null,
    payments: [
      {
        id: newId(),
        amountCents: 9000,
        paidOn: insurancePix.occurredOn,
        transactionId: insurancePix.id,
        description: null,
      },
    ],
    dismissedTransactionIds: [],
    ...stamp(cur(20)),
  });

  const ruleStamp = toInstant(addDays(TODAY, -120));
  database.rules.push(
    {
      id: rule.ifood,
      descriptionContains: 'IFOOD',
      kind: 'expense',
      accountId: null,
      amountMinCents: null,
      amountMaxCents: null,
      categoryId: cat.delivery,
      tagIds: [ids.tag.delivery],
      enabled: true,
      createdAt: ruleStamp,
      updatedAt: ruleStamp,
    },
    {
      id: rule.posto,
      descriptionContains: 'POSTO',
      kind: 'expense',
      accountId: null,
      amountMinCents: null,
      amountMaxCents: null,
      categoryId: cat.transporte,
      tagIds: [],
      enabled: true,
      createdAt: toInstant(addDays(TODAY, -100)),
      updatedAt: ruleStamp,
    },
    {
      id: rule.farmacia,
      descriptionContains: 'FARMACIA',
      kind: null,
      accountId: null,
      amountMinCents: null,
      amountMaxCents: 3000,
      categoryId: cat.saude,
      tagIds: [],
      enabled: false,
      createdAt: toInstant(addDays(TODAY, -80)),
      updatedAt: ruleStamp,
    },
  );
  database.ruleSuggestionDecisions.push({
    pattern: 'PADARIA PAO QUENTE',
    categoryId: cat.restaurantes,
    status: 'dismissed',
  });

  const backupFiles = [1, 2, 3, 4, 5].map((back) => {
    const day = addDays(TODAY, -back);
    return {
      fileName: `fincheck-${day}-030000.db` as const,
      createdAt: `${day}T06:00:00.000Z`,
      sizeBytes: 2_400_000 + back * 18_000,
    };
  });
  database.backup = {
    folderPath: 'D:\\Backups\\Fincheck',
    files: backupFiles,
    running: false,
    lastError: null,
  };
}
