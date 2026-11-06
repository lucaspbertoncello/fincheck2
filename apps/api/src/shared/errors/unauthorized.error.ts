import { ApplicationError } from '#/shared/errors/application.error.ts';

// The caller did not show the credential the API asks for (HTTP 401).
export abstract class UnauthorizedError extends ApplicationError {}
