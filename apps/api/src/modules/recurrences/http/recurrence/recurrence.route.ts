import {
  createRecurrenceRequestSchema,
  listRecurrencesQuerySchema,
  previewRecurrenceRequestSchema,
  recurrenceParamsSchema,
  summaryRecurrencesQuerySchema,
  updateRecurrenceRequestSchema,
} from '@fincheck/shared/recurrences/recurrence/recurrence.schema.ts';
import { Hono } from 'hono';

import type { CreateRecurrenceController } from '#/modules/recurrences/http/recurrence/create-recurrence.controller.ts';
import type { DeleteRecurrenceController } from '#/modules/recurrences/http/recurrence/delete-recurrence.controller.ts';
import type { GetRecurrenceController } from '#/modules/recurrences/http/recurrence/get-recurrence.controller.ts';
import type { GetRecurrenceSummaryController } from '#/modules/recurrences/http/recurrence/get-recurrence-summary.controller.ts';
import type { ListRecurrencesController } from '#/modules/recurrences/http/recurrence/list-recurrences.controller.ts';
import type { PauseRecurrenceController } from '#/modules/recurrences/http/recurrence/pause-recurrence.controller.ts';
import type { PreviewRecurrenceController } from '#/modules/recurrences/http/recurrence/preview-recurrence.controller.ts';
import type { ResumeRecurrenceController } from '#/modules/recurrences/http/recurrence/resume-recurrence.controller.ts';
import type { UpdateRecurrenceController } from '#/modules/recurrences/http/recurrence/update-recurrence.controller.ts';
import { validateRequest } from '#/shared/http/validate-request.util.ts';

// The recurrences (the rule). The fixed paths (`/recurrences/summary`, `/recurrences/preview`) are
// registered before `/recurrences/:id`, so `:id` never swallows them.
export function createRecurrenceRoute(controllers: {
  listRecurrences: ListRecurrencesController;
  getRecurrenceSummary: GetRecurrenceSummaryController;
  previewRecurrence: PreviewRecurrenceController;
  createRecurrence: CreateRecurrenceController;
  getRecurrence: GetRecurrenceController;
  updateRecurrence: UpdateRecurrenceController;
  pauseRecurrence: PauseRecurrenceController;
  resumeRecurrence: ResumeRecurrenceController;
  deleteRecurrence: DeleteRecurrenceController;
}) {
  return new Hono()
    .get('/recurrences', validateRequest('query', listRecurrencesQuerySchema), async (c) =>
      c.json(await controllers.listRecurrences.handle({ query: c.req.valid('query') }), 200),
    )
    .get(
      '/recurrences/summary',
      validateRequest('query', summaryRecurrencesQuerySchema),
      async (c) =>
        c.json(await controllers.getRecurrenceSummary.handle({ query: c.req.valid('query') }), 200),
    )
    .post('/recurrences/preview', validateRequest('json', previewRecurrenceRequestSchema), (c) =>
      c.json(controllers.previewRecurrence.handle({ body: c.req.valid('json') }), 200),
    )
    .post('/recurrences', validateRequest('json', createRecurrenceRequestSchema), async (c) =>
      c.json(await controllers.createRecurrence.handle({ body: c.req.valid('json') }), 201),
    )
    .get('/recurrences/:id', validateRequest('param', recurrenceParamsSchema), async (c) =>
      c.json(await controllers.getRecurrence.handle({ params: c.req.valid('param') }), 200),
    )
    .patch(
      '/recurrences/:id',
      validateRequest('param', recurrenceParamsSchema),
      validateRequest('json', updateRecurrenceRequestSchema),
      async (c) =>
        c.json(
          await controllers.updateRecurrence.handle({
            params: c.req.valid('param'),
            body: c.req.valid('json'),
          }),
          200,
        ),
    )
    .post('/recurrences/:id/pause', validateRequest('param', recurrenceParamsSchema), async (c) =>
      c.json(await controllers.pauseRecurrence.handle({ params: c.req.valid('param') }), 200),
    )
    .post('/recurrences/:id/resume', validateRequest('param', recurrenceParamsSchema), async (c) =>
      c.json(await controllers.resumeRecurrence.handle({ params: c.req.valid('param') }), 200),
    )
    .delete('/recurrences/:id', validateRequest('param', recurrenceParamsSchema), async (c) => {
      await controllers.deleteRecurrence.handle({ params: c.req.valid('param') });

      return c.body(null, 204);
    });
}
