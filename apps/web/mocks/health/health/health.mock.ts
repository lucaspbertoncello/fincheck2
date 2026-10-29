import { healthDtoSchema } from '@fincheck/shared/health/health/health.schema.ts';
import type { Health } from '@fincheck/shared/health/health/health.type.ts';
import { http, HttpResponse } from 'msw';

export const healthFixture: Health.Dto = healthDtoSchema.parse({
  status: 'ok',
  database: 'ok',
});

export const healthMock = http.get('/api/health', () => HttpResponse.json(healthFixture));
