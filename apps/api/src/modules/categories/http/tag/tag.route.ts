import {
  createTagRequestSchema,
  listTagsQuerySchema,
  updateTagRequestSchema,
} from '@fincheck/shared/categories/tag/tag.schema.ts';
import { idParamSchema } from '@fincheck/shared/common/id/id-param.schema.ts';
import { Hono } from 'hono';

import type { ArchiveTagController } from '#/modules/categories/http/tag/archive-tag.controller.ts';
import type { CreateTagController } from '#/modules/categories/http/tag/create-tag.controller.ts';
import type { ListTagsController } from '#/modules/categories/http/tag/list-tags.controller.ts';
import type { UnarchiveTagController } from '#/modules/categories/http/tag/unarchive-tag.controller.ts';
import type { UpdateTagController } from '#/modules/categories/http/tag/update-tag.controller.ts';
import { validateRequest } from '#/shared/http/validate-request.util.ts';

// The tags (RF-CAT-003): free, several per transaction, archived and never deleted.
export function createTagRoute(controllers: {
  listTags: ListTagsController;
  createTag: CreateTagController;
  updateTag: UpdateTagController;
  archiveTag: ArchiveTagController;
  unarchiveTag: UnarchiveTagController;
}) {
  return new Hono()
    .get('/tags', validateRequest('query', listTagsQuerySchema), async (c) =>
      c.json(await controllers.listTags.handle({ query: c.req.valid('query') }), 200),
    )
    .post('/tags', validateRequest('json', createTagRequestSchema), async (c) =>
      c.json(await controllers.createTag.handle({ body: c.req.valid('json') }), 201),
    )
    .patch(
      '/tags/:id',
      validateRequest('param', idParamSchema),
      validateRequest('json', updateTagRequestSchema),
      async (c) =>
        c.json(
          await controllers.updateTag.handle({
            params: c.req.valid('param'),
            body: c.req.valid('json'),
          }),
          200,
        ),
    )
    .post('/tags/:id/archive', validateRequest('param', idParamSchema), async (c) =>
      c.json(await controllers.archiveTag.handle({ params: c.req.valid('param') }), 200),
    )
    .post('/tags/:id/unarchive', validateRequest('param', idParamSchema), async (c) =>
      c.json(await controllers.unarchiveTag.handle({ params: c.req.valid('param') }), 200),
    );
}
