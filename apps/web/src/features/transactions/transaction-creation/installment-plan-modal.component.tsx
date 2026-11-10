import type { InstallmentPlan } from '@fincheck/shared/transactions/installment-plan/installment-plan.type.ts';

import { InstallmentCreateViewModel } from '#/features/transactions/transaction-creation/installment-create/installment-create.viewmodel.tsx';

type InstallmentPlanModalProps = {
  onClose: () => void;
  /** Launches the purchase on this card: the card is text, not a choice. */
  cardId?: string;
  /** Edits this plan: the form opens filled. */
  plan?: InstallmentPlan.Dto;
};

/**
 * The "Compra parcelada" form for the screens that are not driven by `?new=installment`: the page of
 * a card launches a purchase with the card fixed (`cardId`) and edits a plan (`plan`). The entry of
 * the Transações feature to the same form that `TransactionCreationModals` opens.
 */
export function InstallmentPlanModal(props: InstallmentPlanModalProps) {
  return <InstallmentCreateViewModel {...props} />;
}
