import { z } from 'zod';

const countSchema = z.int().nonnegative();

export const deletionImpactDtoSchema = z.object({
  transactionCount: countSchema,
  installmentPlanCount: countSchema,
  invoiceCount: countSchema,
  ruleCount: countSchema,
  isPluggy: z.boolean(),
  returnsOnNextSync: z.boolean(),
});
