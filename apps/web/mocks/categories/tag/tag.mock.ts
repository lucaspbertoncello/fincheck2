import {
  createTagRequestSchema,
  listTagsQuerySchema,
  tagDtoSchema,
  updateTagRequestSchema,
} from '@fincheck/shared/categories/tag/tag.schema.ts';
import type { Tag } from '@fincheck/shared/categories/tag/tag.type.ts';
import { listResponseSchema } from '@fincheck/shared/common/list/list.schema.ts';
import { normalizeText } from '@fincheck/shared/common/text/normalize-text.util.ts';
import { http } from 'msw';

import { findTag } from '#mocks/categories/tag/find-tag.util.ts';
import { db } from '#mocks/state/mock-database.store.ts';
import { newId } from '#mocks/state/mock-id.store.ts';
import type { MockState } from '#mocks/state/mock-state.type.ts';
import { NOW_ISO } from '#mocks/support/dates/mock-clock.store.ts';
import { fail } from '#mocks/support/http/fail.util.ts';
import { handleRoute } from '#mocks/support/http/handle-route.util.ts';

function presentTag(record: MockState.TagRecord): Tag.Dto {
  return {
    ...record,
    transactionCount: db.transactions.filter((tx) => tx.tagIds.includes(record.id)).length,
  };
}

function assertNameFree(name: string, exceptId?: string) {
  if (
    db.tags.some((tag) => tag.id !== exceptId && normalizeText(tag.name) === normalizeText(name))
  ) {
    fail(409, 'TAG_NAME_TAKEN', 'Já existe tag com esse nome');
  }
}

export const tagMock = [
  http.get(
    '/api/tags',
    handleRoute(
      { query: listTagsQuerySchema, response: listResponseSchema(tagDtoSchema) },
      ({ query }) => ({
        items: db.tags
          .filter((tag) => query.includeArchived || !tag.archivedAt)
          .map(presentTag)
          .sort(
            (a, b) =>
              a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' }) ||
              a.id.localeCompare(b.id),
          ),
      }),
    ),
  ),

  http.post(
    '/api/tags',
    handleRoute(
      { body: createTagRequestSchema, response: tagDtoSchema, status: 201 },
      ({ body }) => {
        assertNameFree(body.name);
        const record = { id: newId(), name: body.name, archivedAt: null };
        db.tags.push(record);

        return presentTag(record);
      },
    ),
  ),

  http.patch(
    '/api/tags/:id',
    handleRoute({ body: updateTagRequestSchema, response: tagDtoSchema }, ({ params, body }) => {
      const tag = findTag(db, params['id'] ?? '');
      assertNameFree(body.name, tag.id);
      tag.name = body.name;

      return presentTag(tag);
    }),
  ),

  http.post(
    '/api/tags/:id/archive',
    handleRoute({ response: tagDtoSchema }, ({ params }) => {
      const tag = findTag(db, params['id'] ?? '');
      if (tag.archivedAt) fail(409, 'TAG_ALREADY_ARCHIVED', 'Já está arquivada');
      tag.archivedAt = NOW_ISO;

      return presentTag(tag);
    }),
  ),

  http.post(
    '/api/tags/:id/unarchive',
    handleRoute({ response: tagDtoSchema }, ({ params }) => {
      const tag = findTag(db, params['id'] ?? '');
      if (!tag.archivedAt) fail(409, 'TAG_NOT_ARCHIVED', 'Não está arquivada');
      tag.archivedAt = null;

      return presentTag(tag);
    }),
  ),
];
