/** What a queued undo toast carries (components.md 13.1). */
export type UndoToastContent = {
  message: string;
  /** Label of the action button. */
  actionLabel: string;
  /** Runs when the action is pressed; the toast closes right after. */
  onAction: () => void;
  /** Shows the check icon before the message. */
  withIcon: boolean;
};

export type ShowUndoToastOptions = {
  /** "Transação ignorada. Ela sai das contas do mês." */
  message: string;
  /** Runs when "Desfazer" is pressed. */
  onUndo: () => void;
  /** Defaults to "Desfazer". */
  actionLabel?: string;
  /** Check icon before the message. Defaults to false. */
  withIcon?: boolean;
  /** Milliseconds on screen; it pauses while hovered or focused. Defaults to 6000. */
  timeout?: number;
};

export type ToastApi = {
  /** Queues an undo toast and returns its key. */
  showUndoToast: (options: ShowUndoToastOptions) => string;
  closeToast: (key: string) => void;
};
