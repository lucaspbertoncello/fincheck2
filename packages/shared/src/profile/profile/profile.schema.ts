import { z } from 'zod';

import { businessDateSchema, instantSchema } from '../../common/date/date.schema.ts';
import { idSchema } from '../../common/id/id.schema.ts';
import { nonNegativeCentsSchema, positiveCentsSchema } from '../../common/money/money.schema.ts';
import {
  amountModeSchema,
  dateRuleSchema,
  employmentRegimeSchema,
} from '../../recurrences/recurrence/recurrence.schema.ts';
import { PROFILE_INITIALS_LIMITS, PROFILE_NAME_LIMITS } from './profile.constant.ts';

// A source of income IS an income recurrence (BR-PRF-002): this is a reading of it, with the fields
// the profile shows. Creating and editing go through `/recurrences`.
export const profileIncomeSourceSchema = z.object({
  recurrenceId: idSchema,
  name: z.string().min(1).max(80),
  counterparty: z.string().max(120).nullable(),
  employmentRegime: employmentRegimeSchema.nullable(),
  expectedAmountCents: positiveCentsSchema,
  amountMode: amountModeSchema,
  dateRule: dateRuleSchema,
  accountId: idSchema.nullable(),
  // The next day the money is expected (today or later); null when the rule has no fixed day.
  nextExpectedOn: businessDateSchema.nullable(),
});

export const profileDtoSchema = z.object({
  name: z.string().min(PROFILE_NAME_LIMITS.min).max(PROFILE_NAME_LIMITS.max),
  initials: z.string().min(PROFILE_INITIALS_LIMITS.min).max(PROFILE_INITIALS_LIMITS.max),
  income: z.object({
    // Sum of the expected amount of the active income recurrences (not paused, not archived).
    monthlyExpectedCents: nonNegativeCentsSchema,
    // Biggest amount first, then by name.
    sources: z.array(profileIncomeSourceSchema),
  }),
  updatedAt: instantSchema,
});

// `initials` can be left out: the API derives them from the name (`deriveInitials`).
export const updateProfileRequestSchema = z.object({
  name: z.string().trim().min(PROFILE_NAME_LIMITS.min).max(PROFILE_NAME_LIMITS.max),
  initials: z
    .string()
    .trim()
    .min(PROFILE_INITIALS_LIMITS.min)
    .max(PROFILE_INITIALS_LIMITS.max)
    .regex(/^\p{L}+$/u)
    .optional(),
});
