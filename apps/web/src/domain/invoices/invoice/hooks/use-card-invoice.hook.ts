import { useQuery } from '@tanstack/react-query';

import { invoiceQueries } from '#/domain/invoices/invoice/queries/invoice.query.ts';
import type { ApiRequest } from '#/shared/api/api-request.type.ts';

export function useCardInvoice(
  accountId: string,
  month: string,
  options: ApiRequest.ReadOptions = {},
) {
  return useQuery({ ...invoiceQueries.detail(accountId, month), ...options });
}
