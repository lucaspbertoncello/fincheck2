import { DomainError } from '#/shared/errors/domain.error.ts';

export class BillOriginNotAllowedError extends DomainError {
  readonly code = 'BILL_ORIGIN_NOT_ALLOWED';

  constructor() {
    super('A origem só vale em dívida a receber de amigo.');
  }
}
