import type { ChipTone } from '#/components/chips/index.ts';
import type { IconName } from '#/components/icons/index.ts';

/** A label beside the due date: "Recorrente", "Dívida", "Fatura", "Você pagou". */
export type BillBadge = {
  label: string;
  tone?: ChipTone;
  icon?: IconName;
};

/**
 * Where the bill stands: open, late, partial (some paid), settled ("Quitadas") or paid but not
 * yet linked to a transaction (R1: it already left the total).
 */
export type BillStatus = 'open' | 'late' | 'partial' | 'settled' | 'paid-unlinked';
