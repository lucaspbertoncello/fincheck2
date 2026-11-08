import {
  acceptSubscriptionSuggestionRequestSchema,
  dismissSubscriptionSuggestionRequestSchema,
  listSubscriptionsQuerySchema,
} from '@fincheck/shared/recurrences/subscription/subscription.schema.ts';
import { Hono } from 'hono';

import type { AcceptSubscriptionSuggestionController } from '#/modules/recurrences/http/subscription/accept-subscription-suggestion.controller.ts';
import type { DismissSubscriptionSuggestionController } from '#/modules/recurrences/http/subscription/dismiss-subscription-suggestion.controller.ts';
import type { ListSubscriptionsController } from '#/modules/recurrences/http/subscription/list-subscriptions.controller.ts';
import { validateRequest } from '#/shared/http/validate-request.util.ts';

// The tab Assinaturas: the list with the state of the month and the suggestions, and the two
// answers to a suggestion ("Acompanhar" and "Agora não").
export function createSubscriptionRoute(controllers: {
  listSubscriptions: ListSubscriptionsController;
  acceptSubscriptionSuggestion: AcceptSubscriptionSuggestionController;
  dismissSubscriptionSuggestion: DismissSubscriptionSuggestionController;
}) {
  return new Hono()
    .get('/subscriptions', validateRequest('query', listSubscriptionsQuerySchema), async (c) =>
      c.json(await controllers.listSubscriptions.handle({ query: c.req.valid('query') }), 200),
    )
    .post(
      '/subscriptions/suggestions/accept',
      validateRequest('json', acceptSubscriptionSuggestionRequestSchema),
      async (c) =>
        c.json(
          await controllers.acceptSubscriptionSuggestion.handle({ body: c.req.valid('json') }),
          201,
        ),
    )
    .post(
      '/subscriptions/suggestions/dismiss',
      validateRequest('json', dismissSubscriptionSuggestionRequestSchema),
      async (c) => {
        await controllers.dismissSubscriptionSuggestion.handle({ body: c.req.valid('json') });

        return c.body(null, 204);
      },
    );
}
