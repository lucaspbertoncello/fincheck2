import { NotFoundError } from '#/shared/errors/not-found.error.ts';

export class BillPaymentNotFoundError extends NotFoundError {
  readonly code = 'BILL_PAYMENT_NOT_FOUND';

  constructor() {
    super('Pagamento não encontrado.');
  }
}
