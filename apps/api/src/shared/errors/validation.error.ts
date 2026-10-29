import { ApplicationError } from '#/shared/errors/application.error.ts';

// The input broke its schema at the edge (HTTP 400).
export abstract class ValidationError extends ApplicationError {}
