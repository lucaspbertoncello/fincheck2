export type InvoiceLinkViewProps = {
  isOpen: boolean;
  onClose: () => void;
  /** "Fatura Bradesco". */
  invoiceName: string;
  /** Where the payment was found: "Bradesco". Empty when the account is not known. */
  accountName: string;
  /** The found payment, without the sign. */
  amountCents: number;
  /** `dd/mm`. */
  dateText: string;
  submitError: string | null;
  isSaving: boolean;
  /** "Vincular". */
  onLink: () => void;
  /** "Não é este". */
  onDismiss: () => void;
};
