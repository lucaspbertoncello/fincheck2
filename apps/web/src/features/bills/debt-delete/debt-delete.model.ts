/** The debt the "Excluir" is about: the id to delete and the person it is with (for the words). */
export type DebtDeleteTarget = {
  billId: string;
  /** Null when the debt has no person (a general bill never reaches the dialog, but the words cover it). */
  person: string | null;
  /** What the delete gives back to the transactions the debt was tied to. */
  effects: DebtDeleteEffects;
};

/** The transactions a debt touched, which the API gives back when it is deleted. */
export type DebtDeleteEffects = {
  /** The debt came from a transaction (the origin): it goes back to a whole expense. */
  hasOrigin: boolean;
  /** Some payment is tied to a transaction: it goes back to an ordinary one. */
  hasLinkedPayments: boolean;
};

export type DebtDeleteViewProps = {
  isOpen: boolean;
  description: string;
  isDeleting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};
