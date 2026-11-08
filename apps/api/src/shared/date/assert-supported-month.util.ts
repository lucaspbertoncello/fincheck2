import type { Month } from '#/shared/date/month.value-object.ts';
import { RequestValidationError } from '#/shared/errors/request-validation.error.ts';

// The years the API accepts in a month or a date it is asked to work with: far enough from both
// ends of what `YYYY-MM` can hold that the neighbour of any month (the one before and the one
// after, the parcels of a plan) still exists. Outside it, a request is a 400, never a 500.
export const SUPPORTED_YEARS = { first: 2000, last: 2100 } as const;

export function assertSupportedMonth(month: Month, path: string): void {
  if (month.year < SUPPORTED_YEARS.first || month.year > SUPPORTED_YEARS.last) {
    throw new RequestValidationError([
      {
        path,
        message: `O ano precisa estar entre ${String(SUPPORTED_YEARS.first)} e ${String(SUPPORTED_YEARS.last)}.`,
      },
    ]);
  }
}
