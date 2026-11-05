import type { Profile } from '@fincheck/shared/profile/profile/profile.type.ts';

import { findCostliestMonth } from '#mocks/profile/highlights/find-costliest-month.util.ts';
import { findCostliestWeekday } from '#mocks/profile/highlights/find-costliest-weekday.util.ts';
import { findLargestPix } from '#mocks/profile/highlights/find-largest-pix.util.ts';
import { findLongestNoSpendStreak } from '#mocks/profile/highlights/find-longest-no-spend-streak.util.ts';
import { findTopCategory } from '#mocks/profile/highlights/find-top-category.util.ts';
import { listSpendWindow } from '#mocks/profile/highlights/list-spend-window.util.ts';
import type { MockState } from '#mocks/state/mock-state.type.ts';

// The six curiosities (BR-PRF-005), read from the same transactions as everything else. With no
// spending in the 12 months the four window ones are null (a streak of the whole year says nothing).
export function buildProfileHighlights(database: MockState.Database): Profile.Highlights {
  const window = listSpendWindow(database);
  const hasSpending = [...window.spentByDay.values()].some((spent) => spent > 0);

  return {
    largestPixSent: findLargestPix(database, 'sent'),
    largestPixReceived: findLargestPix(database, 'received'),
    topCategory: hasSpending ? findTopCategory(window) : null,
    costliestMonth: hasSpending ? findCostliestMonth(window) : null,
    costliestWeekday: hasSpending ? findCostliestWeekday(window) : null,
    longestNoSpendStreak: hasSpending ? findLongestNoSpendStreak(window) : null,
  };
}
