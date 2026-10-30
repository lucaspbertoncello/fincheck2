import { newId } from '#mocks/state/mock-id.store.ts';
import type { MockState } from '#mocks/state/mock-state.type.ts';
import type { SeedIds } from '#mocks/state/seed/build-seed-ids.util.ts';
import { addDays } from '#mocks/support/dates/add-days.util.ts';
import { TODAY } from '#mocks/support/dates/clock.constant.ts';
import { dayOf } from '#mocks/support/dates/day-of.util.ts';
import { hoursAgo } from '#mocks/support/dates/hours-ago.util.ts';
import { toInstant } from '#mocks/support/dates/to-instant.util.ts';

// A day between 1 and 27 (a closing day that exists in every month).
function wrapClosingDay(day: number): number {
  return ((((day - 1) % 27) + 27) % 27) + 1;
}

// Due day `gap` days after the closing day, wrapping inside 1 to 28.
function dueDayAfter(closingDay: number, gap: number): number {
  return ((closingDay - 1 + gap) % 28) + 1;
}

// Accounts, cards and bank connections. The card days follow today, so there is always an open
// Nubank invoice (it closes in 8 days) and a closed Bradesco one (it closed 4 days ago).
export function seedAccounts(database: MockState.Database, ids: SeedIds): void {
  const createdAt = toInstant(addDays(TODAY, -200));
  const nubankClosing = wrapClosingDay(dayOf(TODAY) + 8);
  const bradescoClosing = wrapClosingDay(dayOf(TODAY) - 4);

  database.accounts.push(
    {
      id: ids.acc.nuConta,
      type: 'checking',
      source: 'pluggy',
      name: 'Nubank',
      institutionCode: 'nubank',
      institutionName: null,
      bankBalanceCents: 348_615,
      balanceAt: hoursAgo(0.7),
      connectionId: ids.conn.nu,
      creditCard: null,
      archivedAt: null,
      createdAt,
    },
    {
      id: ids.acc.brConta,
      type: 'checking',
      source: 'pluggy',
      name: 'Bradesco',
      institutionCode: 'bradesco',
      institutionName: null,
      bankBalanceCents: 162_240,
      balanceAt: hoursAgo(41),
      connectionId: ids.conn.br,
      creditCard: null,
      archivedAt: null,
      createdAt,
    },
    {
      id: ids.acc.carteira,
      type: 'wallet',
      source: 'manual',
      name: 'Carteira',
      institutionCode: 'wallet',
      institutionName: null,
      bankBalanceCents: null,
      balanceAt: null,
      connectionId: null,
      creditCard: null,
      archivedAt: null,
      createdAt,
    },
    {
      id: ids.acc.nuCartao,
      type: 'credit_card',
      source: 'pluggy',
      name: 'Roxinho',
      institutionCode: 'nubank',
      institutionName: null,
      bankBalanceCents: 0,
      balanceAt: hoursAgo(0.7),
      connectionId: ids.conn.nu,
      creditCard: {
        brand: 'mastercard',
        last4: '4821',
        closingDay: nubankClosing,
        dueDay: dueDayAfter(nubankClosing, 7),
        limitCents: 1_200_000,
        themeId: 'nubank',
      },
      archivedAt: null,
      createdAt,
    },
    {
      id: ids.acc.brCartao,
      type: 'credit_card',
      source: 'pluggy',
      name: 'Bradesco Black',
      institutionCode: 'bradesco',
      institutionName: null,
      bankBalanceCents: 0,
      balanceAt: hoursAgo(41),
      connectionId: ids.conn.br,
      creditCard: {
        brand: 'visa',
        last4: '7733',
        closingDay: bradescoClosing,
        dueDay: dueDayAfter(bradescoClosing, 8),
        limitCents: 900_000,
        themeId: 'bradesco',
      },
      archivedAt: null,
      createdAt,
    },
    {
      id: ids.acc.poupancaAntiga,
      type: 'savings',
      source: 'manual',
      name: 'Poupança Caixa',
      institutionCode: 'caixa',
      institutionName: null,
      bankBalanceCents: null,
      balanceAt: null,
      connectionId: null,
      creditCard: null,
      archivedAt: toInstant(addDays(TODAY, -60)),
      createdAt,
    },
  );

  const history = { status: 'done', fromOn: addDays(TODAY, -365), transactionCount: 1204 } as const;

  database.connections.push(
    {
      id: ids.conn.nu,
      pluggyItemId: '6b1f3c2e-8a54-4d1b-9c7e-2f5a0d3b8e11',
      institutionCode: 'nubank',
      institutionName: 'Nubank',
      status: 'active',
      errorCode: null,
      lastBankUpdateAt: hoursAgo(0.7),
      lastSuccessAt: hoursAgo(0.7),
      history,
      accountIds: [ids.acc.nuConta, ids.acc.nuCartao],
      createdAt: toInstant(addDays(TODAY, -200)),
      readsSinceStart: 0,
    },
    {
      id: ids.conn.br,
      pluggyItemId: '9d4e7a10-3b62-4f08-a1c5-7e2b6d9f4c22',
      institutionCode: 'bradesco',
      institutionName: 'Bradesco',
      status: 'active',
      errorCode: null,
      lastBankUpdateAt: hoursAgo(41),
      lastSuccessAt: hoursAgo(41),
      history: { ...history, transactionCount: 987 },
      accountIds: [ids.acc.brConta, ids.acc.brCartao],
      createdAt: toInstant(addDays(TODAY, -200)),
      readsSinceStart: 0,
    },
  );

  for (const [connectionId, lastHours] of [
    [ids.conn.nu, 0.7],
    [ids.conn.br, 41],
  ] as const) {
    for (let step = 0; step < 4; step += 1) {
      const startedAt = hoursAgo(lastHours + step);
      database.runs.push({
        connectionId,
        run: {
          id: newId(),
          trigger: 'schedule',
          status: 'success',
          startedAt,
          finishedAt: startedAt,
          errorCode: null,
          createdCount: step === 0 ? 2 : 0,
          updatedCount: 0,
          removedCount: 0,
        },
      });
    }
  }

  database.syncSettings = {
    clientId: 'cliente-demonstracao',
    updatedAt: toInstant(addDays(TODAY, -200)),
  };
}
