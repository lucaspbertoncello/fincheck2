import type { IconName } from '#/components/icons/index.ts';

export type ReviewKind = 'expense' | 'income';

/** The transaction being reviewed, as the card header draws it. */
export type ReviewTransaction = {
  /** The bank's description: "MOCOTO RESTAURANTE". */
  name: string;
  /** "Bradesco, crédito, 19/10". */
  detail: string;
  /** Signed integer cents. */
  amountCents: number;
  kind: ReviewKind;
  /** Icon of the selected or suggested category; a neutral one while there is none. */
  icon: IconName;
};

/** A suggested category (or an option of an ambiguous case). */
export type ReviewChoice = {
  id: string;
  label: string;
  icon: IconName;
};

/** "Sempre que a descrição tiver MOCOTO, usar esta categoria": the rule the save would create. */
export type ReviewRule = {
  /** The word the rule looks for: "MOCOTO". */
  keyword: string;
  /** How many more transactions of the history it catches. */
  matchCount: number;
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
};

/** An item of "Na fila". */
export type ReviewQueueItemData = {
  id: string;
  name: string;
  /** "Nubank, Pix, 21/10". */
  detail: string;
  amountCents: number;
  kind: ReviewKind;
  icon: IconName;
  /** Only for the ambiguous case: "Mesada ou VR? O valor não bate com nenhum". */
  ambiguity?: {
    message: string;
    options: readonly ReviewChoice[];
    /** "Outra receita". */
    otherLabel: string;
  };
};
