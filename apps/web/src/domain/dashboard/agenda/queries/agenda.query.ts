import {
  agendaDtoSchema,
  getAgendaQuerySchema,
} from '@fincheck/shared/dashboard/agenda/agenda.schema.ts';
import { queryOptions } from '@tanstack/react-query';

import { dashboardKeys } from '#/domain/dashboard/cache/constants/dashboard-keys.constant.ts';
import { apiRequest } from '#/shared/api/api-request.service.ts';

export const agendaQueries = {
  byMonth: (month: string) =>
    queryOptions({
      queryKey: dashboardKeys.agenda(month),
      queryFn: ({ signal }) =>
        apiRequest({
          method: 'GET',
          path: '/agenda',
          querySchema: getAgendaQuerySchema,
          query: { month },
          responseSchema: agendaDtoSchema,
          signal,
        }),
    }),
};
