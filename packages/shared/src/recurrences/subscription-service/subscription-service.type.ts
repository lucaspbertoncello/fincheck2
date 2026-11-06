import type { z } from 'zod';

import type { subscriptionServiceSlugSchema } from './subscription-service.schema.ts';

export namespace SubscriptionService {
  export type Slug = z.infer<typeof subscriptionServiceSlugSchema>;
}
