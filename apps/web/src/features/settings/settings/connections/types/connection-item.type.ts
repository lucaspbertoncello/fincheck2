import type { BankThemeKey } from '@fincheck/ui';

export type PendingMatchChoice = {
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
  pendingMatches: PendingMatchItem[];
};
