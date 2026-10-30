import { z } from 'zod';

/**
 * What the Regras screen keeps in the URL: the "Nova regra" modal (`?new=rule`, which the "+"
 * opens) and the rule being edited (`?edit=<id>`).
 */
export const ruleListSearchSchema = z.object({
  new: z.literal('rule').optional().catch(undefined),
  edit: z.string().min(1).optional().catch(undefined),
});

export type RuleListSearch = z.infer<typeof ruleListSearchSchema>;
