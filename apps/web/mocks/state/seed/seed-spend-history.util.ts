import type { MockState } from '#mocks/state/mock-state.type.ts';
import type { SeedIds } from '#mocks/state/seed/build-seed-ids.util.ts';
import { makeTransactionRecord } from '#mocks/state/seed/make-transaction-record.util.ts';
import { addMonths } from '#mocks/support/dates/add-months.util.ts';
import { CURRENT_MONTH } from '#mocks/support/dates/mock-clock.store.ts';
import { dateInMonth } from '#mocks/support/dates/date-in-month.util.ts';
import { daysInMonth } from '#mocks/support/dates/days-in-month.util.ts';
import { hashUnit } from '#mocks/support/numbers/hash-unit.util.ts';

type CategoryKey = keyof SeedIds['cat'];

// [store, category, cheapest, dearest, method], amounts in cents.
const STORES: ReadonlyArray<readonly [string, CategoryKey, number, number, 'pix' | 'debit']> = [
  ['MERCADINHO SAO JOSE', 'mercado', 2800, 21_000, 'pix'],
  ['SUPERMERCADO BOA COMPRA', 'mercado', 9000, 32_000, 'debit'],
  ['PADARIA PAO QUENTE', 'restaurantes', 900, 3200, 'debit'],
  ['LANCHES DO ZE', 'restaurantes', 2200, 6800, 'pix'],
  ['RESTAURANTE SABOR CASEIRO', 'restaurantes', 3800, 9500, 'debit'],
  ['APP TRANSPORTE', 'transporte', 1100, 4600, 'debit'],
  ['POSTO RODOVIA', 'combustivel', 8000, 21_000, 'debit'],
  ['FARMACIA SAUDE', 'saude', 1500, 14_000, 'debit'],
  ['CINEMA CENTRAL', 'lazer', 3200, 9000, 'pix'],
  ['LIVRARIA PAGINA UM', 'educacao', 3500, 12_000, 'pix'],
  ['LOJA CASA E COR', 'compras', 4500, 26_000, 'debit'],
];

// Monthly fixed costs: [day, description, category, amount].
const FIXED_COSTS: ReadonlyArray<readonly [number, string, CategoryKey, number]> = [
  [5, 'PIX ALUGUEL IMOBILIARIA', 'moradia', 145_000],
  [21, 'CONDOMINIO RES ALVORADA', 'moradia', 62_000],
];

// A year of plausible spending on the Nubank account, so the spend heatmap has a past to show. The
// last two months already exist in `seedTransactions`; this fills the ten before them. Everything
// comes from `hashUnit`, so it is the same on every run. Names and amounts are made up.
export function seedSpendHistory(database: MockState.Database, ids: SeedIds): void {
  const { acc, cat } = ids;

  for (let back = 11; back >= 2; back -= 1) {
    const month = addMonths(CURRENT_MONTH, -back);
    const monthNumber = Number(month.slice(5, 7));
    // December and July spend more; March and August less.
    const season =
      monthNumber === 12 ? 1.35 : monthNumber === 7 ? 1.15 : monthNumber % 5 === 3 ? 0.85 : 1;

    for (const [day, description, category, amountCents] of FIXED_COSTS) {
      database.transactions.push(
        makeTransactionRecord({
          accountId: acc.nuConta,
          method: 'pix',
          // The reference month keeps the descriptions apart, so no rule is suggested.
          description: `${description} REF ${month.slice(5, 7)}/${month.slice(2, 4)}`,
          amountCents: -amountCents,
          occurredOn: dateInMonth(month, day),
          categoryId: cat[category],
        }),
      );
    }

    for (let day = 1; day <= daysInMonth(month); day += 1) {
      const occurredOn = dateInMonth(month, day);
      const weekday = new Date(`${occurredOn}T12:00:00Z`).getUTCDay();
      const weekend = weekday === 0 || weekday === 6;
      const seed = back * 1000 + day;
      if (hashUnit(seed) > (weekend ? 0.72 : 0.58)) continue;

      const count = hashUnit(seed + 7) > 0.82 ? 2 : 1;
      for (let index = 0; index < count; index += 1) {
        const store = STORES[Math.floor(hashUnit(seed * 3 + index) * STORES.length)];
        if (!store) continue;
        const [name, category, low, high, method] = store;
        const raw = (low + hashUnit(seed * 5 + index) * (high - low)) * season;
        const stamp = `${String(day).padStart(2, '0')}/${String(monthNumber).padStart(2, '0')}`;

        database.transactions.push(
          makeTransactionRecord({
            accountId: acc.nuConta,
            method,
            // The date in the text keeps the descriptions apart, so no rule is suggested.
            description: `${name} ${stamp}`,
            amountCents: -Math.round(raw / 10) * 10,
            occurredOn,
            categoryId: cat[category],
          }),
        );
      }
    }
  }
}
