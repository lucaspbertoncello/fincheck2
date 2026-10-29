import { ApplicationError } from '#/shared/errors/application.error.ts';

// A business rule was broken (HTTP 422).
export abstract class DomainError extends ApplicationError {}
