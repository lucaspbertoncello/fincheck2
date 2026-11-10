import { DomainError } from '#/shared/errors/domain.error.ts';

// A split parcel keeps its value (the parts add up to it) and its category (the parts own them).
export class InstallmentParcelSplitError extends DomainError {
  readonly code = 'INSTALLMENT_PARCEL_SPLIT';

  constructor(number: number) {
    super(
      `A parcela ${String(number)} está dividida: desfaça a divisão antes de mudar o valor, a quantidade, a categoria ou as etiquetas do plano.`,
      { number },
    );
  }
}
