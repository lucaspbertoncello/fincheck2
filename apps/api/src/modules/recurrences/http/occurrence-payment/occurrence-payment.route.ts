import {
  linkOccurrencePaymentRequestSchema,
  occurrenceParamsSchema,
  occurrencePaymentParamsSchema,
} from '@fincheck/shared/recurrences/occurrence/occurrence.schema.ts';
import { Hono } from 'hono';

import type { LinkOccurrencePaymentController } from '#/modules/recurrences/http/occurrence-payment/link-occurrence-payment.controller.ts';
import type { UnlinkOccurrencePaymentController } from '#/modules/recurrences/http/occurrence-payment/unlink-occurrence-payment.controller.ts';
import { validateRequest } from '#/shared/http/validate-request.util.ts';

// The transactions that settle an occurrence, under the occurrence: "Vincular" and "Desvincular".
export function createOccurrencePaymentRoute(controllers: {
  linkOccurrencePayment: LinkOccurrencePaymentController;
  unlinkOccurrencePayment: UnlinkOccurrencePaymentController;
}) {
  return new Hono()
    .post(
      '/occurrences/:id/payments',
      validateRequest('param', occurrenceParamsSchema),
      validateRequest('json', linkOccurrencePaymentRequestSchema),
      async (c) =>
        c.json(
          await controllers.linkOccurrencePayment.handle({
            params: c.req.valid('param'),
            body: c.req.valid('json'),
          }),
          201,
        ),
    )
    .delete(
      '/occurrences/:id/payments/:paymentId',
      validateRequest('param', occurrencePaymentParamsSchema),
      async (c) => {
        await controllers.unlinkOccurrencePayment.handle({ params: c.req.valid('param') });

        return c.body(null, 204);
      },
    );
}
