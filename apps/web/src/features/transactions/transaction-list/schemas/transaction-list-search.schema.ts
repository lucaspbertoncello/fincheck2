import { idSchema } from '@fincheck/shared/common/id/id.schema.ts';
import { z } from 'zod';

// The URL parser turns "123" into a number; ids and search text must stay text.
const textSchema = z
  .union([z.string(), z.number()])
  .transform(String)
  .pipe(z.string().min(1).max(100))
  .optional()
  .catch(undefined);

/** Everything the Transações screen keeps in the URL besides the month. */
export const transactionListSearchSchema = z.object({
  view: z.enum(['list', 'category']).default('list').catch('list'),
  type: z.enum(['all', 'expense', 'income']).default('all').catch('all'),
  q: textSchema,
  account: textSchema,
  category: textSchema,
  tag: textSchema,
  // "Ver transações" of a rule: only what that rule categorized.
  ruleId: idSchema.optional().catch(undefined),
  uncategorized: z.boolean().optional().catch(undefined),
  // The open panel: edit or split of one transaction.
  edit: textSchema,
  split: textSchema,
  // Creation modals this screen owns; the "+" and other screens open them through it.
  new: z.enum(['transaction', 'installment']).optional().catch(undefined),
});

export type TransactionListSearch = z.infer<typeof transactionListSearchSchema>;
