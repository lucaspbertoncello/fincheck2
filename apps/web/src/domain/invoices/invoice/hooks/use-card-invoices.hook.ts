import type { listInvoicesQuerySchema } from '@fincheck/shared/invoices/invoice/invoice.schema.ts';
import { useQuery } from '@tanstack/react-query';

import { invoiceQueries } from '#/domain/invoices/invoice/queries/invoice.query.ts';
import type { ApiRequest } from '#/shared/api/api-request.type.ts';

export function useCardInvoices(
  accountId: string,
  query: ApiRequest.QueryInput<typeof listInvoicesQuerySchema> = {},
  options: ApiRequest.ReadOptions = {},
) {
  return useQuery({ ...invoiceQueries.list(accountId, query), ...options });
}
