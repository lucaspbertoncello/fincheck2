import type { z } from 'zod';

import type {
  acceptSubscriptionSuggestionRequestSchema,
  acceptSubscriptionSuggestionResponseSchema,
  dismissSubscriptionSuggestionRequestSchema,
  listSubscriptionsQuerySchema,
  listSubscriptionsResponseSchema,
  subscriptionAlertSchema,
  subscriptionItemSchema,
  subscriptionStatusSchema,
  subscriptionSuggestionSchema,
  subscriptionSummarySchema,
} from './subscription.schema.ts';

export namespace Subscription {
  export type Status = z.infer<typeof subscriptionStatusSchema>;
  export type Alert = z.infer<typeof subscriptionAlertSchema>;
  export type AlertKind = Alert['kind'];
  export type Item = z.infer<typeof subscriptionItemSchema>;
  export type Summary = z.infer<typeof subscriptionSummarySchema>;
  export type Suggestion = z.infer<typeof subscriptionSuggestionSchema>;
  export type ListQuery = z.infer<typeof listSubscriptionsQuerySchema>;
  export type ListResponse = z.infer<typeof listSubscriptionsResponseSchema>;
  export type AcceptRequest = z.infer<typeof acceptSubscriptionSuggestionRequestSchema>;
  export type AcceptResponse = z.infer<typeof acceptSubscriptionSuggestionResponseSchema>;
  export type DismissRequest = z.infer<typeof dismissSubscriptionSuggestionRequestSchema>;
}
