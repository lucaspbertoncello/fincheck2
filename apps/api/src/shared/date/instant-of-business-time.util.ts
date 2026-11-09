import { businessTimeOfInstant } from '#/shared/date/business-time-of-instant.util.ts';

// The instant (ISO 8601 in UTC) of a wall clock time in America/Sao_Paulo. It does not assume the
// offset: it starts from the time read as UTC and corrects it by what the zone shows for it, so it
// stays right if the zone ever has summer time again.
export function instantOfBusinessTime(time: {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}): string {
  const wanted = Date.UTC(time.year, time.month - 1, time.day, time.hour, time.minute, time.second);
  let guess = wanted;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const shown = businessTimeOfInstant(guess);
    const shownAsUtc = Date.UTC(
      shown.year,
      shown.month - 1,
      shown.day,
      shown.hour,
      shown.minute,
      shown.second,
    );
    if (shownAsUtc === wanted) break;
    guess -= shownAsUtc - wanted;
  }

  return new Date(guess).toISOString();
}
