// "Now" for the whole mock server. Every seed date is relative to it, so the current month always
// has a past and a future. It starts at the real time when the mock loads; `setMockClock` moves it
// (the tests do, to try the first and the last day of a month) and the seed must be rebuilt after.
export let NOW = new Date();

export let NOW_ISO = NOW.toISOString();

// Today as a business date (America/Sao_Paulo).
export let TODAY = businessDateOf(NOW);

export let CURRENT_MONTH = TODAY.slice(0, 7);

export function setMockClock(now: Date): void {
  NOW = now;
  NOW_ISO = now.toISOString();
  TODAY = businessDateOf(now);
  CURRENT_MONTH = TODAY.slice(0, 7);
}

function businessDateOf(instant: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(instant);
}
