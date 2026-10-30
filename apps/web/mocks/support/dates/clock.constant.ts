// "Now" for the whole mock server, taken once when the mock loads. Every seed date is relative to it,
// so the current month always has a past and a future.
export const NOW = new Date();

export const NOW_ISO = NOW.toISOString();

// Today as a business date (America/Sao_Paulo).
export const TODAY = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Sao_Paulo',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
}).format(NOW);

export const CURRENT_MONTH = TODAY.slice(0, 7);
