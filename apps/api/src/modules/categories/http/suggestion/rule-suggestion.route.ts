import {
  acceptRuleSuggestionRequestSchema,
  dismissRuleSuggestionRequestSchema,
  listRuleSuggestionsQuerySchema,
} from '@fincheck/shared/categories/rule-suggestion/rule-suggestion.schema.ts';
import { Hono } from 'hono';

import type { AcceptRuleSuggestionController } from '#/modules/categories/http/suggestion/accept-rule-suggestion.controller.ts';
import type { DismissRuleSuggestionController } from '#/modules/categories/http/suggestion/dismiss-rule-suggestion.controller.ts';
import type { ListRuleSuggestionsController } from '#/modules/categories/http/suggestion/list-rule-suggestions.controller.ts';
import { validateRequest } from '#/shared/http/validate-request.util.ts';

// The suggested rules (RF-CAT-005): worked out when asked; only the answer is stored.
export function createRuleSuggestionRoute(controllers: {
  listRuleSuggestions: ListRuleSuggestionsController;
  acceptRuleSuggestion: AcceptRuleSuggestionController;
  dismissRuleSuggestion: DismissRuleSuggestionController;
}) {
  return new Hono()
    .get('/rule-suggestions', validateRequest('query', listRuleSuggestionsQuerySchema), async (c) =>
      c.json(await controllers.listRuleSuggestions.handle({ query: c.req.valid('query') }), 200),
    )
    .post(
      '/rule-suggestions/accept',
      validateRequest('json', acceptRuleSuggestionRequestSchema),
      async (c) =>
        c.json(await controllers.acceptRuleSuggestion.handle({ body: c.req.valid('json') }), 201),
    )
    .post(
      '/rule-suggestions/dismiss',
      validateRequest('json', dismissRuleSuggestionRequestSchema),
      async (c) => {
        await controllers.dismissRuleSuggestion.handle({ body: c.req.valid('json') });

        return c.body(null, 204);
      },
    );
}
