import { DomainError } from '#/shared/errors/domain.error.ts';

// The invoice is a projection (its month has not opened yet): there is no total to correct.
export class InvoiceNotEditableError extends DomainError {
  readonly code = 'INVOICE_NOT_EDITABLE';

  constructor() {
    super(
      'A fatura ainda não abriu: só é possível corrigir o valor de uma fatura aberta ou fechada.',
    );
  }
}
