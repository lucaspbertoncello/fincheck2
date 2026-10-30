import {
  invoiceDetailDtoSchema,
  invoiceDtoSchema,
  listInvoicesQuerySchema,
  openInvoiceItemSchema,
} from '@fincheck/shared/invoices/invoice/invoice.schema.ts';
import { listResponseSchema } from '@fincheck/shared/common/list/list.schema.ts';
import { queryOptions } from '@tanstack/react-query';

import { invoicesKeys } from '#/domain/invoices/cache/constants/invoices-keys.constant.ts';
import { apiPath } from '#/shared/api/api-path.util.ts';
import { apiRequest } from '#/shared/api/api-request.service.ts';
import type { ApiRequest } from '#/shared/api/api-request.type.ts';

export const invoiceQueries = {
  open: () =>
    queryOptions({
      queryKey: invoicesKeys.open(),
      queryFn: ({ signal }) =>
        apiRequest({
          method: 'GET',
          path: '/invoices/open',
          responseSchema: listResponseSchema(openInvoiceItemSchema),
          signal,
        }),
    }),
  list: (accountId: string, query: ApiRequest.QueryInput<typeof listInvoicesQuerySchema> = {}) =>
    queryOptions({
      queryKey: invoicesKeys.list(accountId, query),
      queryFn: ({ signal }) =>
        apiRequest({
          method: 'GET',
          path: apiPath`/cards/${accountId}/invoices`,
          querySchema: listInvoicesQuerySchema,
          query,
          responseSchema: listResponseSchema(invoiceDtoSchema),
          signal,
        }),
    }),
  detail: (accountId: string, month: string) =>
    queryOptions({
      queryKey: invoicesKeys.detail(accountId, month),
      queryFn: ({ signal }) =>
        apiRequest({
          method: 'GET',
          path: apiPath`/cards/${accountId}/invoices/${month}`,
          responseSchema: invoiceDetailDtoSchema,
          signal,
        }),
    }),
};
