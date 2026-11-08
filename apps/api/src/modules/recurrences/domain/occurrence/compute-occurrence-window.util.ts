import { clampDayToMonth } from '#/modules/recurrences/domain/occurrence/clamp-day-to-month.util.ts';
import type { DateRule } from '#/modules/recurrences/domain/recurrence/date-rule.value-object.ts';
import type { BusinessCalendar } from '#/shared/calendar/business-calendar.service.ts';
import type { BusinessDate } from '#/shared/date/business-date.value-object.ts';
import type { Month } from '#/shared/date/month.value-object.ts';

// The 3 days of slack a Pix may take around a fixed or business day (decided: Q5).
const PIX_SLACK_DAYS = 3;

// The day an occurrence is expected in a month and the window in which a transaction may match it
// (`recurrences.md`, "Janela e dia esperado"). The expected day and the window are real dates and
// may fall in a neighbour month (a fixed day moved to the next business day, a tolerance that
// crosses the end of the month). Pure: the same rule and month always give the same answer.
export function computeOccurrenceWindow(
  rule: DateRule,
  month: Month,
  calendar: BusinessCalendar,
): OccurrenceWindow {
  switch (rule.type) {
    case 'fixed_day': {
      const day = clampDayToMonth(month, rule.day ?? 1);
      const expectedOn =
        rule.nonBusinessDayShift === 'before'
          ? calendar.previousBusinessDay(day)
          : rule.nonBusinessDayShift === 'after'
            ? calendar.nextBusinessDay(day)
            : day;

      return {
        expectedOn,
        windowStartOn: expectedOn.addDays(-PIX_SLACK_DAYS),
        windowEndOn: expectedOn.addDays(PIX_SLACK_DAYS),
      };
    }
    case 'business_day': {
      const expectedOn = calendar.nthBusinessDay(month, rule.businessDayNumber ?? 1);

      return {
        expectedOn,
        windowStartOn: month.firstDay(),
        windowEndOn: expectedOn.addDays(PIX_SLACK_DAYS),
      };
    }
    case 'around_day': {
      const expectedOn = clampDayToMonth(month, rule.day ?? 1);
      const tolerance = rule.toleranceDays ?? 0;

      return {
        expectedOn,
        windowStartOn: expectedOn.addDays(-tolerance),
        windowEndOn: expectedOn.addDays(tolerance),
      };
    }
    case 'any_day':
      return {
        expectedOn: rule.day === null ? null : clampDayToMonth(month, rule.day),
        windowStartOn: month.firstDay(),
        windowEndOn: month.lastDay(),
      };
  }
}

export type OccurrenceWindow = {
  expectedOn: BusinessDate | null;
  windowStartOn: BusinessDate;
  windowEndOn: BusinessDate;
};
