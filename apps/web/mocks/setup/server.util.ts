import { setupServer } from 'msw/node';

import { handlers } from '#mocks/setup/handlers.constant.ts';

export const server = setupServer(...handlers);
