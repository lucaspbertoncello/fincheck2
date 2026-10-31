import {
  categoryDtoSchema,
  createCategoryRequestSchema,
  listCategoriesQuerySchema,
  updateCategoryRequestSchema,
} from '@fincheck/shared/categories/category/category.schema.ts';
import { listResponseSchema } from '@fincheck/shared/common/list/list.schema.ts';
import { normalizeText } from '@fincheck/shared/common/text/normalize-text.util.ts';
import { http } from 'msw';

import { findCategory } from '#mocks/categories/category/find-category.util.ts';
import { presentCategory } from '#mocks/categories/category/present-category.util.ts';
import { db } from '#mocks/state/mock-database.store.ts';
import { newId } from '#mocks/state/mock-id.store.ts';
import { NOW_ISO } from '#mocks/support/dates/mock-clock.store.ts';
import { fail } from '#mocks/support/http/fail.util.ts';
import { handleRoute } from '#mocks/support/http/handle-route.util.ts';

function assertNameFree(kind: string, name: string, exceptId?: string) {
  const taken = db.categories.some(
    (category) =>
      category.id !== exceptId &&
      category.kind === kind &&
      normalizeText(category.name) === normalizeText(name),
  );
  if (taken) fail(409, 'CATEGORY_NAME_TAKEN', 'Já existe categoria com esse nome');
}

export const categoryMock = [
  http.get(
    '/api/categories',
    handleRoute(
      { query: listCategoriesQuerySchema, response: listResponseSchema(categoryDtoSchema) },
      ({ query }) => ({
        items: db.categories
          .filter((category) => !query.kind || category.kind === query.kind)
          .filter(
            (category) =>
              query.status === 'all' ||
              (query.status === 'archived') === (category.archivedAt !== null),
          )
          .map((category) => presentCategory(db, category))
          .sort(
            (a, b) =>
              a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' }) ||
              a.id.localeCompare(b.id),
          ),
      }),
    ),
  ),

  http.post(
    '/api/categories',
    handleRoute(
      { body: createCategoryRequestSchema, response: categoryDtoSchema, status: 201 },
      ({ body }) => {
        assertNameFree(body.kind, body.name);
        const record = {
          id: newId(),
          kind: body.kind,
          name: body.name,
          icon: body.icon,
          isDefault: false,
          archivedAt: null,
        };
        db.categories.push(record);

        return presentCategory(db, record);
      },
    ),
  ),

  http.patch(
    '/api/categories/:id',
    handleRoute(
      { body: updateCategoryRequestSchema, response: categoryDtoSchema },
      ({ params, body }) => {
        const category = findCategory(db, params['id'] ?? '');
        if (body.name !== undefined) {
          assertNameFree(category.kind, body.name, category.id);
          category.name = body.name;
        }
        if (body.icon !== undefined) category.icon = body.icon;

        return presentCategory(db, category);
      },
    ),
  ),

  http.post(
    '/api/categories/:id/archive',
    handleRoute({ response: categoryDtoSchema }, ({ params }) => {
      const category = findCategory(db, params['id'] ?? '');
      if (category.archivedAt) fail(409, 'CATEGORY_ALREADY_ARCHIVED', 'Já está arquivada');
      category.archivedAt = NOW_ISO;

      return presentCategory(db, category);
    }),
  ),

  http.post(
    '/api/categories/:id/unarchive',
    handleRoute({ response: categoryDtoSchema }, ({ params }) => {
      const category = findCategory(db, params['id'] ?? '');
      if (!category.archivedAt) fail(409, 'CATEGORY_NOT_ARCHIVED', 'Não está arquivada');
      category.archivedAt = null;

      return presentCategory(db, category);
    }),
  ),
];
