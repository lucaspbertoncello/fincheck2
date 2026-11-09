import {
  acceptSubscriptionSuggestionRequestSchema,
  acceptSubscriptionSuggestionResponseSchema,
  dismissSubscriptionSuggestionRequestSchema,
  listSubscriptionsQuerySchema,
  listSubscriptionsResponseSchema,
} from '@fincheck/shared/recurrences/subscription/subscription.schema.ts';
import { http } from 'msw';

import { acceptSubscriptionSuggestion } from '#mocks/recurrences/subscription/accept-subscription-suggestion.util.ts';
import { computeSubscriptionSummary } from '#mocks/recurrences/subscription/compute-subscription-summary.util.ts';
import { listSubscriptionItems } from '#mocks/recurrences/subscription/list-subscription-items.util.ts';
import { listSubscriptionSuggestions } from '#mocks/recurrences/subscription/list-subscription-suggestions.util.ts';
import { db } from '#mocks/state/mock-database.store.ts';
import { CURRENT_MONTH } from '#mocks/support/dates/mock-clock.store.ts';
import { fail } from '#mocks/support/http/fail.util.ts';
import { handleRoute } from '#mocks/support/http/handle-route.util.ts';

export const subscriptionMock = [
  http.get(
    '/api/subscriptions',
    handleRoute(
      { query: listSubscriptionsQuerySchema, response: listSubscriptionsResponseSchema },
      ({ query }) => {
        const items = listSubscriptionItems(db, query.month ?? CURRENT_MONTH);

        return {
          summary: computeSubscriptionSummary(items),
          items,
          suggestions: listSubscriptionSuggestions(db).map((candidate) => candidate.suggestion),
        };
      },
    ),
  ),

  http.post(
    '/api/subscriptions/suggestions/accept',
    handleRoute(
      {
        body: acceptSubscriptionSuggestionRequestSchema,
        response: acceptSubscriptionSuggestionResponseSchema,
        status: 201,
      },
      ({ body }) => acceptSubscriptionSuggestion(db, body),
    ),
  ),

  http.post(
    '/api/subscriptions/suggestions/dismiss',
    handleRoute({ body: dismissSubscriptionSuggestionRequestSchema }, ({ body }) => {
      // Answering twice records once.
      if (db.subscriptionDismissals.includes(body.key)) return;
      const exists = listSubscriptionSuggestions(db).some(
        (candidate) => candidate.suggestion.key === body.key,
      );
      if (!exists) fail(404, 'SUBSCRIPTION_SUGGESTION_NOT_FOUND', 'Essa sugestão não existe mais');
      db.subscriptionDismissals.push(body.key);
    }),
  ),
];
