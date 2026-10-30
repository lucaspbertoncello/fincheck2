import { useQuery } from '@tanstack/react-query';

import { agendaQueries } from '#/domain/dashboard/agenda/queries/agenda.query.ts';
import type { ApiRequest } from '#/shared/api/api-request.type.ts';

export function useAgenda(month: string, options: ApiRequest.ReadOptions = {}) {
  return useQuery({ ...agendaQueries.byMonth(month), ...options });
}
