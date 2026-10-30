import { connectTokenDtoSchema } from '@fincheck/shared/sync/connect-token/connect-token.schema.ts';
import { useMutation } from '@tanstack/react-query';

import { apiRequest } from '#/shared/api/api-request.service.ts';

export function useCreateConnectToken() {
  return useMutation({
    mutationFn: () =>
      apiRequest({
        method: 'POST',
        path: '/sync/connect-token',
        responseSchema: connectTokenDtoSchema,
      }),
  });
}
