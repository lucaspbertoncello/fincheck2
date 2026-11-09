import { ConflictError } from '#/shared/errors/conflict.error.ts';

export class BillTransactionAlreadyLinkedError extends ConflictError {
  readonly code = 'BILL_TRANSACTION_ALREADY_LINKED';

  constructor() {
    super('A transação já está ligada a outra conta, fatura ou ocorrência.');
  }
}
