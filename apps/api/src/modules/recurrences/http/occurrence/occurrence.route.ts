import {
  decideOccurrenceDifferenceRequestSchema,
  listOccurrencesQuerySchema,
  occurrenceParamsSchema,
  updateOccurrenceRequestSchema,
} from '@fincheck/shared/recurrences/occurrence/occurrence.schema.ts';
import { Hono } from 'hono';

import type { DecideOccurrenceDifferenceController } from '#/modules/recurrences/http/occurrence/decide-occurrence-difference.controller.ts';
import type { ListOccurrenceCandidatesController } from '#/modules/recurrences/http/occurrence/list-occurrence-candidates.controller.ts';
import type { ListOccurrencesController } from '#/modules/recurrences/http/occurrence/list-occurrences.controller.ts';
import type { SettleOccurrenceController } from '#/modules/recurrences/http/occurrence/settle-occurrence.controller.ts';
import type { SkipOccurrenceController } from '#/modules/recurrences/http/occurrence/skip-occurrence.controller.ts';
import type { UnsettleOccurrenceController } from '#/modules/recurrences/http/occurrence/unsettle-occurrence.controller.ts';
import type { UnskipOccurrenceController } from '#/modules/recurrences/http/occurrence/unskip-occurrence.controller.ts';
import type { UpdateOccurrenceController } from '#/modules/recurrences/http/occurrence/update-occurrence.controller.ts';
import { validateRequest } from '#/shared/http/validate-request.util.ts';

// The occurrences (the turn of a recurrence in a month): the day-by-day list, the candidates of the
// payment, the expected amount of the month, the two manual marks and the answer to a difference.
export function createOccurrenceRoute(controllers: {
  listOccurrences: ListOccurrencesController;
  listOccurrenceCandidates: ListOccurrenceCandidatesController;
  updateOccurrence: UpdateOccurrenceController;
  settleOccurrence: SettleOccurrenceController;
  unsettleOccurrence: UnsettleOccurrenceController;
  skipOccurrence: SkipOccurrenceController;
  unskipOccurrence: UnskipOccurrenceController;
  decideOccurrenceDifference: DecideOccurrenceDifferenceController;
}) {
  return new Hono()
    .get('/occurrences', validateRequest('query', listOccurrencesQuerySchema), async (c) =>
      c.json(await controllers.listOccurrences.handle({ query: c.req.valid('query') }), 200),
    )
    .get(
      '/occurrences/:id/candidates',
      validateRequest('param', occurrenceParamsSchema),
      async (c) =>
        c.json(
          await controllers.listOccurrenceCandidates.handle({ params: c.req.valid('param') }),
          200,
        ),
    )
    .patch(
      '/occurrences/:id',
      validateRequest('param', occurrenceParamsSchema),
      validateRequest('json', updateOccurrenceRequestSchema),
      async (c) =>
        c.json(
          await controllers.updateOccurrence.handle({
            params: c.req.valid('param'),
            body: c.req.valid('json'),
          }),
          200,
        ),
    )
    .post('/occurrences/:id/settle', validateRequest('param', occurrenceParamsSchema), async (c) =>
      c.json(await controllers.settleOccurrence.handle({ params: c.req.valid('param') }), 200),
    )
    .post(
      '/occurrences/:id/unsettle',
      validateRequest('param', occurrenceParamsSchema),
      async (c) =>
        c.json(await controllers.unsettleOccurrence.handle({ params: c.req.valid('param') }), 200),
    )
    .post('/occurrences/:id/skip', validateRequest('param', occurrenceParamsSchema), async (c) =>
      c.json(await controllers.skipOccurrence.handle({ params: c.req.valid('param') }), 200),
    )
    .post('/occurrences/:id/unskip', validateRequest('param', occurrenceParamsSchema), async (c) =>
      c.json(await controllers.unskipOccurrence.handle({ params: c.req.valid('param') }), 200),
    )
    .post(
      '/occurrences/:id/difference',
      validateRequest('param', occurrenceParamsSchema),
      validateRequest('json', decideOccurrenceDifferenceRequestSchema),
      async (c) =>
        c.json(
          await controllers.decideOccurrenceDifference.handle({
            params: c.req.valid('param'),
            body: c.req.valid('json'),
          }),
          200,
        ),
    );
}
