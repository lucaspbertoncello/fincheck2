import { computeOccurrenceWindow } from '#/modules/recurrences/domain/occurrence/compute-occurrence-window.util.ts';
import { Occurrence } from '#/modules/recurrences/domain/occurrence/occurrence.entity.ts';
import type { DateRule } from '#/modules/recurrences/domain/recurrence/date-rule.value-object.ts';
import type { Recurrence } from '#/modules/recurrences/domain/recurrence/recurrence.entity.ts';
import type { BusinessCalendar } from '#/shared/calendar/business-calendar.service.ts';
import type { Month } from '#/shared/date/month.value-object.ts';
import type { Money } from '#/shared/money/money.value-object.ts';

// Opens the occurrence of a recurrence in a month, born expected (BR-REC-005): the amount of the
// recurrence (or the one given) and the day and window its rule gives that month.
export class OccurrenceOpener {
  private readonly calendar: BusinessCalendar;

  constructor(calendar: BusinessCalendar) {
    this.calendar = calendar;
  }

  open(
    recurrence: Recurrence,
    month: Month,
    now: string,
    expectedAmount: Money = recurrence.expectedAmount,
  ): Occurrence {
    return Occurrence.open(
      {
        recurrenceId: recurrence.id,
        month,
        expectedAmount,
        window: this.windowOf(recurrence, month),
      },
      now,
    );
  }

  // The day and the window of the month, with the rule the recurrence has now.
  windowOf(recurrence: Recurrence, month: Month) {
    return this.windowOfRule(recurrence.dateRule, month);
  }

  // The same for a rule that is not a recurrence yet.
  windowOfRule(rule: DateRule, month: Month) {
    return computeOccurrenceWindow(rule, month, this.calendar);
  }
}
