/** A transaction offered as the Pix of a payment ("Pix para Rafa, R$ 150,00 · já feito, só falta ligar"). */
export type PaymentCandidateOption = {
  transactionId: string;
  description: string;
  /** `dd/mm`. */
  dateText: string;
  /** Always positive: the direction is the form's. */
  amountCents: number;
  /** Where it came from, when the bank says ("Rafael Moura"). */
  counterparty: string | null;
};
