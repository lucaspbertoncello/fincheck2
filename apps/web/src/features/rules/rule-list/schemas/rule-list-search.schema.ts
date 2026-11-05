import { z } from 'zod';

/**
 * What the Regras screen keeps in the URL: the "Nova regra" modal (`?new=rule`, which the "+"
 * opens), the rule being edited (`?edit=<id>`) and, for "Criar regra" in a transaction row, the
 * transaction the new rule starts from (`?new=rule&from=<id>`: a Pix brings its sender).
 */
export const ruleListSearchSchema = z.object({
  new: z.literal('rule').optional().catch(undefined),
  edit: z.string().min(1).optional().catch(undefined),
  from: z.string().min(1).optional().catch(undefined),
});
