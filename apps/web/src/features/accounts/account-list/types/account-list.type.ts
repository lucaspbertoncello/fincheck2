import type {
  BankThemeKey,
  ChartPoint,
  InvoiceInstallment,
  InvoiceStatus,
  OverflowMenuItem,
} from '@fincheck/ui';

/** The sync line of an account card: how fresh the data is, or what failed. */
export type AccountSyncLine = {
  /** "manual" has no bank behind it; "stale" is old data; "failed" is a connection error. */
  tone: 'ok' | 'stale' | 'failed' | 'manual';
  label: string;
  /** Short reason of a failure ("login com erro"). */
  reason?: string;
};

/** One account card (checking, savings, wallet), ready to draw. */
export type AccountTileData = {
  id: string;
  theme: BankThemeKey | 'wallet';
  name: string;
  subtitle: string;
  /** "Pluggy" or "Manual". */
  badge: string;
  /** Null until the bank reports a balance. */
  balanceCents: number | null;
  curve: readonly ChartPoint[];
  curveLabel: string;
  sync: AccountSyncLine;
  /** "Ajustar saldo" / "Atualizar saldo"; only a manual account has it. */
  actionLabel?: string;
  menuItems: OverflowMenuItem[];
};

/** The invoice under a card. */
export type InvoiceBlockData = {
  month: string;
  status: InvoiceStatus;
  totalCents: number;
  dueLine: string;
  /** From 0 to 1 for an open cycle; absent when there is no cycle to show. */
  cycleProgress?: number;
  isEditable: boolean;
};

/** One credit card with its invoice, ready to draw. */
export type CardBlockData = {
  id: string;
  theme: BankThemeKey;
  nickname: string;
  last4: string;
  dueLabel: string;
  bankName?: string;
  invoice: InvoiceBlockData | null;
  installments: readonly InvoiceInstallment[];
  menuItems: OverflowMenuItem[];
};

/** The first-sync progress strip of a bank being connected. */
export type HistoryProgressData = {
  connectionId: string;
  title: string;
  detail: string;
};

/** The error strip of a connection that failed. */
export type ConnectionFailureData = {
  connectionId: string;
  institution: string;
  detail: string;
  retrying: boolean;
};
