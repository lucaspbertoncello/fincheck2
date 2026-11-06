import {
  createCategoryRequestSchema,
  listCategoriesQuerySchema,
  updateCategoryRequestSchema,
} from '@fincheck/shared/categories/category/category.schema.ts';
import { idParamSchema } from '@fincheck/shared/common/id/id-param.schema.ts';
import { Hono } from 'hono';

import type { ArchiveCategoryController } from '#/modules/categories/http/category/archive-category.controller.ts';
import type { CreateCategoryController } from '#/modules/categories/http/category/create-category.controller.ts';
import type { ListCategoriesController } from '#/modules/categories/http/category/list-categories.controller.ts';
import type { UnarchiveCategoryController } from '#/modules/categories/http/category/unarchive-category.controller.ts';
import type { UpdateCategoryController } from '#/modules/categories/http/category/update-category.controller.ts';
import { validateRequest } from '#/shared/http/validate-request.util.ts';

// The categories (RF-CAT-001, RF-CAT-002). There is no delete route on purpose: a category is
// archived, never deleted (BR-CAT-002).
export function createCategoryRoute(controllers: {
  listCategories: ListCategoriesController;
  createCategory: CreateCategoryController;
  updateCategory: UpdateCategoryController;
  archiveCategory: ArchiveCategoryController;
  unarchiveCategory: UnarchiveCategoryController;
}) {
  return new Hono()
    .get('/categories', validateRequest('query', listCategoriesQuerySchema), async (c) =>
      c.json(await controllers.listCategories.handle({ query: c.req.valid('query') }), 200),
    )
    .post('/categories', validateRequest('json', createCategoryRequestSchema), async (c) =>
      c.json(await controllers.createCategory.handle({ body: c.req.valid('json') }), 201),
    )
    .patch(
      '/categories/:id',
      validateRequest('param', idParamSchema),
      validateRequest('json', updateCategoryRequestSchema),
      async (c) =>
        c.json(
          await controllers.updateCategory.handle({
            params: c.req.valid('param'),
            body: c.req.valid('json'),
          }),
          200,
        ),
    )
    .post('/categories/:id/archive', validateRequest('param', idParamSchema), async (c) =>
      c.json(await controllers.archiveCategory.handle({ params: c.req.valid('param') }), 200),
    )
    .post('/categories/:id/unarchive', validateRequest('param', idParamSchema), async (c) =>
      c.json(await controllers.unarchiveCategory.handle({ params: c.req.valid('param') }), 200),
    );
}
