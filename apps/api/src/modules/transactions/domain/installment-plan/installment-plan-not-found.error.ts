import { NotFoundError } from '#/shared/errors/not-found.error.ts';

export class InstallmentPlanNotFoundError extends NotFoundError {
  readonly code = 'INSTALLMENT_PLAN_NOT_FOUND';

  constructor() {
    super('O plano de parcelas não existe.');
  }
}
