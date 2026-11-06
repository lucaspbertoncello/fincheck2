import { DomainError } from '#/shared/errors/domain.error.ts';

export class InstallmentPlanNotManualError extends DomainError {
  readonly code = 'INSTALLMENT_PLAN_NOT_MANUAL';

  constructor() {
    super('O plano do banco não se apaga.');
  }
}
