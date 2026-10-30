import { freeBalanceDtoSchema } from '@fincheck/shared/dashboard/free-balance/free-balance.schema.ts';
import { http } from 'msw';

import { computeFreeBalance } from '#mocks/dashboard/free-balance/compute-free-balance.util.ts';
import { db } from '#mocks/state/mock-database.store.ts';
import { handleRoute } from '#mocks/support/http/handle-route.util.ts';

export const freeBalanceMock = [
  http.get(
    '/api/dashboard/free-balance',
    handleRoute({ response: freeBalanceDtoSchema }, () => computeFreeBalance(db)),
  ),
];
