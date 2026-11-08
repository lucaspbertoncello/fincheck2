import type { Recurrence as RecurrenceContract } from '@fincheck/shared/recurrences/recurrence/recurrence.type.ts';

import { computeOccurrenceWindow } from '#/modules/recurrences/domain/occurrence/compute-occurrence-window.util.ts';
import { DateRule } from '#/modules/recurrences/domain/recurrence/date-rule.value-object.ts';
import type { BusinessCalendar } from '#/shared/calendar/business-calendar.service.ts';
import type { Clock } from '#/shared/clock/clock.interface.ts';
import { assertSupportedMonth } from '#/shared/date/assert-supported-month.util.ts';
import { Month } from '#/shared/date/month.value-object.ts';

const PREVIEW_SIZE = 3;
// A window always ends within a month of its own, so a few months are enough to find the next 3;
// the bound only keeps a bug from looping forever.
const MAX_MONTHS_LOOKED_AT = 24;

// "Próximas: por volta de 25/11, 25/12 e 25/01" (RF-REC-001): the next 3 occurrences a rule gives,
// as the modal changes it. It reads no table. They are the first 3 months from the later of the
// first month asked and the current one whose window has not ended yet (today still counts).
export class PreviewRecurrenceQuery {
  private readonly calendar: BusinessCalendar;
  private readonly clock: Clock;

  constructor(calendar: BusinessCalendar, clock: Clock) {
    this.calendar = calendar;
    this.clock = clock;
  }

  execute(input: PreviewRecurrenceQuery.Input): PreviewRecurrenceQuery.Output {
    const rule = DateRule.create(input.dateRule);
    const today = this.clock.today();
    const current = Month.containing(today);
    let month = current;
    if (input.startsMonth !== undefined) {
      const startsMonth = Month.of(input.startsMonth);
      assertSupportedMonth(startsMonth, 'startsMonth');
      if (startsMonth.value > current.value) month = startsMonth;
    }

    const occurrences: PreviewRecurrenceQuery.Output['occurrences'] = [];
    for (
      let looked = 0;
      looked < MAX_MONTHS_LOOKED_AT && occurrences.length < PREVIEW_SIZE;
      looked++
    ) {
      const window = computeOccurrenceWindow(rule, month, this.calendar);
      if (window.windowEndOn.value >= today.value) {
        occurrences.push({
          month: month.value,
          expectedOn: window.expectedOn?.value ?? null,
          windowStartOn: window.windowStartOn.value,
          windowEndOn: window.windowEndOn.value,
        });
      }
      month = month.next();
    }

    return { occurrences };
  }
}

export namespace PreviewRecurrenceQuery {
  export type Input = RecurrenceContract.PreviewRequest;
  export type Output = RecurrenceContract.PreviewResponse;
}
