import { DomainError } from '#/shared/errors/domain.error.ts';

export class InstallmentPlanNotManualError extends DomainError {
  readonly code = 'INSTALLMENT_PLAN_NOT_MANUAL';

  constructor() {
    super('Só o plano lançado à mão se edita ou se apaga: o do banco vem da sincronização.');
  }
}
