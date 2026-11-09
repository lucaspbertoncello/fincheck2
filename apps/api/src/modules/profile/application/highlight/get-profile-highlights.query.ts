import type { Profile } from '@fincheck/shared/profile/profile/profile.type.ts';

import { computeCostliestMonth } from '#/modules/profile/application/highlight/compute-costliest-month.util.ts';
import { computeCostliestWeekday } from '#/modules/profile/application/highlight/compute-costliest-weekday.util.ts';
import { computeHighlightWindow } from '#/modules/profile/application/highlight/compute-highlight-window.util.ts';
import { computeLongestNoSpendStreak } from '#/modules/profile/application/highlight/compute-longest-no-spend-streak.util.ts';
import { computeTopCategory } from '#/modules/profile/application/highlight/compute-top-category.util.ts';
import type { ProfilePixReader } from '#/modules/profile/application/highlight/profile-pix-reader.interface.ts';
import type { ProfileSpendingReader } from '#/modules/profile/application/highlight/profile-spending-reader.interface.ts';
import type { Clock } from '#/shared/clock/clock.interface.ts';

// "Curiosidades" (BR-PRF-005): six numbers for fun, each null without data. The two Pix cover the
// whole history; the other four, the last 12 closed months plus the current one, by competence
// (BR-DSH-001). The sums are in the `compute*` functions, which have no database.
export class GetProfileHighlightsQuery {
  private readonly spending: ProfileSpendingReader;
  private readonly pix: ProfilePixReader;
  private readonly clock: Clock;

  constructor(spending: ProfileSpendingReader, pix: ProfilePixReader, clock: Clock) {
    this.spending = spending;
    this.pix = pix;
    this.clock = clock;
  }

  async execute(): Promise<GetProfileHighlightsQuery.Output> {
    const window = computeHighlightWindow(this.clock.today());
    const [lines, largestPixSent, largestPixReceived] = await Promise.all([
      this.spending.listSpendingLines({ from: window.from.value, to: window.to.value }),
      this.pix.findLargestPix('sent'),
      this.pix.findLargestPix('received'),
    ]);

    return {
      largestPixSent,
      largestPixReceived,
      topCategory: computeTopCategory(lines),
      costliestMonth: computeCostliestMonth(lines),
      costliestWeekday: computeCostliestWeekday(lines, window),
      longestNoSpendStreak: computeLongestNoSpendStreak(lines, window.to),
    };
  }
}

export namespace GetProfileHighlightsQuery {
  export type Output = Profile.Highlights;
}
