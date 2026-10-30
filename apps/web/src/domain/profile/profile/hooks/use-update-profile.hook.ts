import {
  profileDtoSchema,
  updateProfileRequestSchema,
} from '@fincheck/shared/profile/profile/profile.schema.ts';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { profileKeys } from '#/domain/profile/cache/constants/profile-keys.constant.ts';
import { apiRequest } from '#/shared/api/api-request.service.ts';
import type { ApiRequest } from '#/shared/api/api-request.type.ts';

export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: ApiRequest.BodyInput<typeof updateProfileRequestSchema>) =>
      apiRequest({
        method: 'PUT',
        path: '/profile',
        bodySchema: updateProfileRequestSchema,
        body,
        responseSchema: profileDtoSchema,
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: profileKeys.all }),
  });
}
