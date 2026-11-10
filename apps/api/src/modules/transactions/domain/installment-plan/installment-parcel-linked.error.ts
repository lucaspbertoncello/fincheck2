import { DomainError } from '#/shared/errors/domain.error.ts';

// The parcel pays a bill or settles an occurrence of a recurrence: changing its value (or taking it
// out of the plan) would leave the link without meaning. Undo the link first.
export class InstallmentParcelLinkedError extends DomainError {
  readonly code = 'INSTALLMENT_PARCEL_LINKED';

  constructor(number: number) {
    super(
      `A parcela ${String(number)} está ligada a uma conta ou a uma recorrência: desfaça o vínculo antes de mudar o valor ou a quantidade de parcelas.`,
      { number },
    );
  }
}
