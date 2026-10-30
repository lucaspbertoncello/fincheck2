import type { z } from 'zod';

import type {
  acceptRuleSuggestionRequestSchema,
  dismissRuleSuggestionRequestSchema,
  listRuleSuggestionsQuerySchema,
  ruleSuggestionDtoSchema,
} from './rule-suggestion.schema.ts';

export namespace RuleSuggestion {
  export type Dto = z.infer<typeof ruleSuggestionDtoSchema>;
  export type ListQuery = z.infer<typeof listRuleSuggestionsQuerySchema>;
  export type AcceptRequest = z.infer<typeof acceptRuleSuggestionRequestSchema>;
  export type DismissRequest = z.infer<typeof dismissRuleSuggestionRequestSchema>;
}
