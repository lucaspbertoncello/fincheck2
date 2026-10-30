import { healthDtoSchema } from '@fincheck/shared/health/health/health.schema.ts';

import { apiClient } from '#/shared/api/api-client.service.ts';

type WaitForHealthyOptions = {
  intervalMs?: number;
  timeoutMs?: number;
};

async function isHealthy(): Promise<boolean> {
  try {
    const response = await apiClient.health.$get();
    if (!response.ok) return false;
    const health = healthDtoSchema.parse(await response.json());
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
