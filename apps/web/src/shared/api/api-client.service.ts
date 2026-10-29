import type { AppType } from '@fincheck/api/main/http/app.type.ts';
import { hc } from 'hono/client';

// Absolute URL so it also works under jsdom/Node fetch; Vite proxies `/api` to the API.
export const apiClient = hc<AppType>(`${globalThis.location.origin}/api`);
