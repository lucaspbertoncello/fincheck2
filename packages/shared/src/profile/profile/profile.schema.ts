import { z } from 'zod';

import { businessDateSchema, instantSchema, monthSchema } from '../../common/date/date.schema.ts';
import { idSchema } from '../../common/id/id.schema.ts';
import { nonNegativeCentsSchema, positiveCentsSchema } from '../../common/money/money.schema.ts';
import {
  amountModeSchema,
  dateRuleSchema,
  employmentRegimeSchema,
} from '../../recurrences/recurrence/recurrence.schema.ts';
import {
  PROFILE_AVATAR_IDS,
  PROFILE_INITIALS_LIMITS,
  PROFILE_NAME_LIMITS,
} from './profile.constant.ts';

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

export const profileAvatarIdSchema = z.enum(PROFILE_AVATAR_IDS);

export const profileDtoSchema = z.object({
  name: z.string().min(PROFILE_NAME_LIMITS.min).max(PROFILE_NAME_LIMITS.max),
  initials: z.string().min(PROFILE_INITIALS_LIMITS.min).max(PROFILE_INITIALS_LIMITS.max),
  // The illustrated avatar chosen (BR-PRF-001); null shows the initials.
  avatarId: profileAvatarIdSchema.nullable(),
  income: z.object({
    // Sum of the expected amount of the active income recurrences (not paused, not archived).
    monthlyExpectedCents: nonNegativeCentsSchema,
    // Biggest amount first, then by name.
    sources: z.array(profileIncomeSourceSchema),
  }),
  updatedAt: instantSchema,
});

// `initials` can be left out: the API derives them from the name (`deriveInitials`). `avatarId` left
// out keeps the current one; null goes back to the initials.
export const updateProfileRequestSchema = z.object({
  name: z.string().trim().min(PROFILE_NAME_LIMITS.min).max(PROFILE_NAME_LIMITS.max),
  initials: z
    .string()
    .trim()
    .min(PROFILE_INITIALS_LIMITS.min)
    .max(PROFILE_INITIALS_LIMITS.max)
    .regex(/^\p{L}+$/u)
    .optional(),
  avatarId: profileAvatarIdSchema.nullable().optional(),
});

// The biggest Pix in one direction (BR-PRF-005). `counterparty` is the name the bank printed on the
// statement and can be missing; the amount has no sign.
export const profilePixHighlightSchema = z.object({
  amountCents: positiveCentsSchema,
  counterparty: z.string().min(1).max(120).nullable(),
  occurredOn: businessDateSchema,
  transactionId: idSchema,
});

// The six curiosities of the profile (BR-PRF-005). Each one is null when there is no data for it.
// Spending is by competence (BR-DSH-001), the last 12 months; the two Pix cover the whole history.
export const profileHighlightsDtoSchema = z.object({
  largestPixSent: profilePixHighlightSchema.nullable(),
  largestPixReceived: profilePixHighlightSchema.nullable(),
  topCategory: z
    .object({
      categoryId: idSchema,
      totalCents: positiveCentsSchema,
      // 0 to 100, one decimal place.
      sharePercent: z.number().min(0).max(100),
    })
    .nullable(),
  costliestMonth: z.object({ month: monthSchema, totalCents: positiveCentsSchema }).nullable(),
  costliestWeekday: z
    .object({
      // 0 is Sunday. `averageCents` is per occurrence of that weekday in the 12 months.
      weekday: z.int().min(0).max(6),
      averageCents: positiveCentsSchema,
    })
    .nullable(),
  longestNoSpendStreak: z
    .object({ days: z.int().min(1), from: businessDateSchema, to: businessDateSchema })
    .nullable(),
});
