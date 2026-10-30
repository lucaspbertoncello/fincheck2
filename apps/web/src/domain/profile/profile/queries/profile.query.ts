import { profileDtoSchema } from '@fincheck/shared/profile/profile/profile.schema.ts';
import { queryOptions } from '@tanstack/react-query';

import { profileKeys } from '#/domain/profile/cache/constants/profile-keys.constant.ts';
import { apiRequest } from '#/shared/api/api-request.service.ts';

export const profileQueries = {
  current: () =>
    queryOptions({
      queryKey: profileKeys.current(),
      queryFn: ({ signal }) =>
        apiRequest({
          method: 'GET',
          path: '/profile',
          responseSchema: profileDtoSchema,
          signal,
        }),
    }),
};
