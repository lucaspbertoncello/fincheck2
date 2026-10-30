import { z } from 'zod';

function isRealDate(value: string): boolean {
  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(5, 7));
  const day = Number(value.slice(8, 10));
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
}

// Business date: `YYYY-MM-DD`, the day in America/Sao_Paulo. Field names end with `On`.
export const businessDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(isRealDate, { message: 'Not a real calendar date' });

// Month: `YYYY-MM`. Field names are `month` or end with `Month`.
export const monthSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);

// Instant: ISO 8601 in UTC with `Z`. Field names end with `At`.
export const instantSchema = z.iso.datetime();

// The query of every read that is filtered by the month selector.
export const monthQuerySchema = z.object({ month: monthSchema });
