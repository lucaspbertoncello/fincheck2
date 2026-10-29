import type { createApp } from '#/main/http/create-app.util.ts';

// The web app builds its typed client (`hono/client`) from this type.
export type AppType = ReturnType<typeof createApp>;
