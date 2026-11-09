import { healthDtoSchema } from '@fincheck/shared/health/health/health.schema.ts';

import { apiRequest } from '#/shared/api/api-request.service.ts';

type WaitForHealthyOptions = {
  intervalMs?: number;
  timeoutMs?: number;
};

async function isHealthy(): Promise<boolean> {
  try {
    // Any failure (connection refused while the API swaps the database, 5xx, a body off the
    // contract) throws an `ApiError`: not healthy yet.
    const health = await apiRequest({
      method: 'GET',
      path: '/health',
      responseSchema: healthDtoSchema,
    });
    return health.status === 'ok' && health.database === 'ok';
  } catch {
    return false;
  }
}

/**
 * Waits for `/health` to answer `ok` (the API reopens by itself after a backup restore).
 * Resolves `true` as soon as it does, `false` when `timeoutMs` passes first.
 */
export async function waitForHealthy({
  intervalMs = 1000,
  timeoutMs = 60_000,
}: WaitForHealthyOptions = {}): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await isHealthy()) return true;
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  return false;
}
