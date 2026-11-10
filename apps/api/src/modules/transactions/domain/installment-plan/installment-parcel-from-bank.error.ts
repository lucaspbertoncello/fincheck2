import { DomainError } from '#/shared/errors/domain.error.ts';

// The parcel came from the bank: the bank is the truth of its value, its date and its invoice, so
// editing the plan never changes them nor takes the parcel out of the plan.
export class InstallmentParcelFromBankError extends DomainError {
  readonly code = 'INSTALLMENT_PARCEL_FROM_BANK';

  constructor(number: number) {
    super(
      `A parcela ${String(number)} veio do banco e não pode mudar de valor, de fatura nem sair.`,
      {
        number,
      },
    );
  }
}
