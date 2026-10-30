import { z } from 'zod';

import { idSchema } from '../../common/id/id.schema.ts';
import { categoryKindSchema } from '../category/category.schema.ts';
import { ruleExampleSchema } from '../rule/rule.schema.ts';

export const ruleSuggestionDtoSchema = z.object({
  pattern: z.string(),
  categoryId: idSchema,
  kind: categoryKindSchema,
  recategorizedCount: z.int().min(3),
  matchCount: z.int().nonnegative(),
  willChangeCount: z.int().nonnegative(),
  examples: z.array(ruleExampleSchema).max(3),
});

// Ids separated by commas, 1 to 500.
export const listRuleSuggestionsQuerySchema = z.object({
  transactionIds: z
    .string()
    .refine(
      (text) => {
        const ids = text.split(',').filter(Boolean);
        return ids.length >= 1 && ids.length <= 500;
      },
      { message: 'Between 1 and 500 ids' },
    )
    .optional(),
});

export const acceptRuleSuggestionRequestSchema = z.object({
  pattern: z.string().min(1),
  categoryId: idSchema,
  tagIds: z.array(idSchema).max(10).optional(),
  applyToHistory: z.boolean(),
});

export const dismissRuleSuggestionRequestSchema = z.object({
  pattern: z.string().min(1),
  categoryId: idSchema,
});
