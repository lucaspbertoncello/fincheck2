import { z } from 'zod';

import { SUBSCRIPTION_SERVICE_SLUGS } from './subscription-service.constant.ts';

export const subscriptionServiceSlugSchema = z.enum(SUBSCRIPTION_SERVICE_SLUGS);
