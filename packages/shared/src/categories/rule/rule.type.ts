import type { z } from 'zod';

import type {
  applyRuleResultSchema,
  createRuleRequestSchema,
  createRuleResultSchema,
  previewRuleRequestSchema,
  rulePreviewSchema,
  ruleDtoSchema,
  ruleExampleSchema,
  updateRuleRequestSchema,
} from './rule.schema.ts';

export namespace Rule {
  export type Dto = z.infer<typeof ruleDtoSchema>;
  export type PreviewRequest = z.infer<typeof previewRuleRequestSchema>;
  export type Preview = z.infer<typeof rulePreviewSchema>;
  export type Example = z.infer<typeof ruleExampleSchema>;
  export type CreateRequest = z.infer<typeof createRuleRequestSchema>;
  export type CreateResult = z.infer<typeof createRuleResultSchema>;
  export type UpdateRequest = z.infer<typeof updateRuleRequestSchema>;
  export type ApplyResult = z.infer<typeof applyRuleResultSchema>;
}
