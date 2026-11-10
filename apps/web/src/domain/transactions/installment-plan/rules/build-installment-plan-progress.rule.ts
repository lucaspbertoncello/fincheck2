import type { InstallmentPlan } from '@fincheck/shared/transactions/installment-plan/installment-plan.type.ts';

type InstallmentPlanProgress =
  | {
      isSettled: false;
      /** The installment that comes next (the "current" one), from 1. */
      currentNumber: number;
      /** "Parcela 3 de 10". */
      partLabel: string;
    }
  | { isSettled: true; currentNumber: null; partLabel: 'Quitada' };

/**
 * Where a plan stands: the current installment is the next one the card will charge; with none left
 * (or nothing left to pay) the plan is settled ("Quitada").
 */
export function buildInstallmentPlanProgress(
  plan: Pick<InstallmentPlan.Dto, 'installmentCount' | 'nextInstallment' | 'remainingCents'>,
): InstallmentPlanProgress {
  const next = plan.nextInstallment;
  if (!next || plan.remainingCents === 0) {
    return { isSettled: true, currentNumber: null, partLabel: 'Quitada' };
  }

  return {
    isSettled: false,
    currentNumber: next.number,
    partLabel: `Parcela ${next.number} de ${plan.installmentCount}`,
  };
}
