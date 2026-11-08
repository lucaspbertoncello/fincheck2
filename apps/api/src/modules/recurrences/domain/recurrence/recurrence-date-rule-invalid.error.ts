import { ValidationError } from '#/shared/errors/validation.error.ts';

// The rule lacks a field its type asks for, or carries one it does not use. The body schema
// already refuses that; this is the guard of the domain when a rule is built outside the schema.
export class RecurrenceDateRuleInvalidError extends ValidationError {
  readonly code = 'RECURRENCE_DATE_RULE_INVALID';

  constructor(problem: string) {
    super('A regra de data está incompleta ou tem campo que não usa.', { problem });
  }
}
