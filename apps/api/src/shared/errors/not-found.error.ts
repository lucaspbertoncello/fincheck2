import { ApplicationError } from '#/shared/errors/application.error.ts';

// The resource asked for does not exist (HTTP 404).
export abstract class NotFoundError extends ApplicationError {}
