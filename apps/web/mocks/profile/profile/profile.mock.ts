import { deriveInitials } from '@fincheck/shared/profile/profile/derive-initials.util.ts';
import {
  profileDtoSchema,
  updateProfileRequestSchema,
} from '@fincheck/shared/profile/profile/profile.schema.ts';
import type { Profile } from '@fincheck/shared/profile/profile/profile.type.ts';
import { http } from 'msw';

import { computeOccurrenceWindow } from '#mocks/recurrences/occurrence/compute-occurrence-window.util.ts';
import { db } from '#mocks/state/mock-database.store.ts';
import type { MockState } from '#mocks/state/mock-state.type.ts';
import { addMonths } from '#mocks/support/dates/add-months.util.ts';
import { CURRENT_MONTH, NOW_ISO, TODAY } from '#mocks/support/dates/mock-clock.store.ts';
import { handleRoute } from '#mocks/support/http/handle-route.util.ts';

// The next day the money is expected: this month's day when it has not passed, otherwise next
// month's. A rule without a fixed day has none.
function nextExpectedOn(rule: MockState.RecurrenceRecord['dateRule']): string | null {
  for (const month of [CURRENT_MONTH, addMonths(CURRENT_MONTH, 1)]) {
    const { expectedOn } = computeOccurrenceWindow(rule, month);
    if (expectedOn === null) return null;
    if (expectedOn >= TODAY) return expectedOn;
  }

  return null;
}

// Every income source is an income recurrence (BR-PRF-002): the profile reads them, it keeps no
// copy. Paused and archived ones are not income any more.
function buildProfile(): Profile.Dto {
  const sources = db.recurrences
    .filter((item) => item.kind === 'income' && !item.pausedAt && !item.archivedAt)
    .map((item): Profile.IncomeSource => ({
      recurrenceId: item.id,
      name: item.name,
      counterparty: item.counterparty,
      employmentRegime: item.employmentRegime,
      expectedAmountCents: item.expectedAmountCents,
      amountMode: item.amountMode,
      dateRule: item.dateRule,
      accountId: item.accountId,
      nextExpectedOn: nextExpectedOn(item.dateRule),
    }))
    .sort((a, b) => b.expectedAmountCents - a.expectedAmountCents || a.name.localeCompare(b.name));

  return {
    name: db.profile.name,
    initials: db.profile.initials,
    avatarId: db.profile.avatarId,
    income: {
      monthlyExpectedCents: sources.reduce((sum, item) => sum + item.expectedAmountCents, 0),
      sources,
    },
    updatedAt: db.profile.updatedAt,
  };
}

export const profileMock = [
  http.get(
    '/api/profile',
    handleRoute({ response: profileDtoSchema }, () => buildProfile()),
  ),

  http.put(
    '/api/profile',
    handleRoute({ body: updateProfileRequestSchema, response: profileDtoSchema }, ({ body }) => {
      db.profile = {
        name: body.name,
        initials: (body.initials ?? deriveInitials(body.name)).toLocaleUpperCase('pt-BR'),
        // Left out keeps the current avatar; null goes back to the initials.
        avatarId: body.avatarId === undefined ? db.profile.avatarId : body.avatarId,
        updatedAt: NOW_ISO,
      };

      return buildProfile();
    }),
  ),
];
