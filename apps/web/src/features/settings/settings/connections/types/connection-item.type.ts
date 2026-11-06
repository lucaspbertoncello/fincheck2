import type { BankThemeKey, IconName } from '@fincheck/ui';

type PendingMatchChoice = {
  /** The account the person can pick: its id, and the line that describes it. */
  accountId: string;
  label: string;
};

export type PendingMatchItem = {
  pluggyAccountId: string;
  /** "Conta corrente final 1234". */
  title: string;
  choices: PendingMatchChoice[];
};

/** An account or card the bank brings, ready to draw as a chip. */
type ConnectionAccountItem = {
  id: string;
  name: string;
  /** "Conta corrente", "Poupança", "Cartão de crédito". */
  kindLabel: string;
  icon: IconName;
};

/** One bank of the "Conexões" list, ready to draw. */
export type ConnectionItem = {
  id: string;
  name: string;
  bankTheme: BankThemeKey;
  status: 'active' | 'error';
  /** "Atualizado pelo banco há 12 min" (active connections). */
  updateLine: string | null;
  /** The reason after "Conexão com erro" (connections in error). */
  errorReason: string | null;
  isStale: boolean;
  /** "Buscando o histórico (120 transações)" while the first fetch runs. */
  historyLine: string | null;
  accounts: ConnectionAccountItem[];
  pendingMatches: PendingMatchItem[];
};
