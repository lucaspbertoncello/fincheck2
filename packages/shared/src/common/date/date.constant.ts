// National holidays of Brazil that fall on the same day every year. `since` is the first year the
// holiday exists (Consciência Negra became national in 2024).
export const FIXED_NATIONAL_HOLIDAYS = [
  { month: 1, day: 1 },
  { month: 4, day: 21 },
  { month: 5, day: 1 },
  { month: 9, day: 7 },
  { month: 10, day: 12 },
  { month: 11, day: 2 },
  { month: 11, day: 15 },
  { month: 11, day: 20, since: 2024 },
  { month: 12, day: 25 },
] as const;

// Days from Easter Sunday: Carnival Monday and Tuesday, Good Friday and Corpus Christi. Banks do
// not open on any of them, so they are not business days (domain model, `BusinessCalendar`).
export const EASTER_BASED_HOLIDAY_OFFSETS = [-48, -47, -2, 60] as const;
