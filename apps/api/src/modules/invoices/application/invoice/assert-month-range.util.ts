import type { Month } from '#/shared/date/month.value-object.ts';
import { RequestValidationError } from '#/shared/errors/request-validation.error.ts';

const MAX_MONTHS_APART = 24;

// The range of the list of invoices, after the missing side took its default: `from` not after
// `to`, and at most 24 months apart (the schema only checks it when the two come in the request).
export function assertMonthRange(from: Month, to: Month): void {
  const distance = (to.year - from.year) * 12 + (to.monthNumber - from.monthNumber);

  if (distance < 0) {
    throw new RequestValidationError([{ path: 'from', message: 'from must not be after to' }]);
  }
  if (distance > MAX_MONTHS_APART) {
    throw new RequestValidationError([{ path: 'to', message: 'At most 24 months apart' }]);
  }
}
