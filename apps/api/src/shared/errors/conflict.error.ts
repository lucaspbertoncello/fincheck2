import { ApplicationError } from '#/shared/errors/application.error.ts';

// The change clashes with the current state, like a duplicate (HTTP 409).
export abstract class ConflictError extends ApplicationError {}
