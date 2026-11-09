import { NotFoundError } from '#/shared/errors/not-found.error.ts';

export class BillNotFoundError extends NotFoundError {
  readonly code = 'BILL_NOT_FOUND';

  constructor() {
    super('Conta não encontrada.');
  }
}
