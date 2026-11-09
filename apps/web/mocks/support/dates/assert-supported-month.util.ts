import { fail } from '#mocks/support/http/fail.util.ts';

// The years the API accepts in a month: 2000 to 2100. Outside it, a request is a 400.
export function assertSupportedMonth(month: string, path: string): void {
  const year = Number(month.slice(0, 4));
  if (year < 2000 || year > 2100) {
    fail(400, 'VALIDATION_FAILED', `${path}: o ano precisa estar entre 2000 e 2100.`);
  }
}
