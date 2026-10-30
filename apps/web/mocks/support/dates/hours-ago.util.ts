import { NOW } from '#mocks/support/dates/clock.constant.ts';

// The instant `hours` before the mock's "now".
export function hoursAgo(hours: number): string {
  return new Date(NOW.getTime() - hours * 3_600_000).toISOString();
}
