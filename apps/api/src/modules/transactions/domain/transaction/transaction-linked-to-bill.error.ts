import { DomainError } from '#/shared/errors/domain.error.ts';

// The transaction pays a bill and counts there as an income or an expense, or it is the whole
// origin of a debt (`lent`): its nature (and, for the origin, its value) cannot change while the
// link stands (undo the payment or the debt first).
export class TransactionLinkedToBillError extends DomainError {
  readonly code = 'TRANSACTION_LINKED_TO_BILL';

  constructor() {
    super(
      'A transação está ligada a uma conta: desfaça o vínculo antes de mudar a natureza ou o valor.',
    );
  }
}
