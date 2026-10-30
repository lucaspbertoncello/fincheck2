import type { ReactNode } from 'react';

/** One category of the donut, in the order the caller wants it listed. */
export type DonutSlice = {
  id: string;
  name: string;
  /** Spend of the category in integer cents. */
  cents: number;
  /** True for the grey "Outros" slice. */
  isOther?: boolean;
  /** The variation chip ("+7%"). A slot: the chip is its own component. */
  badge?: ReactNode;
};

/** A slice after the palette was assigned. */
export type PaintedSlice = DonutSlice & {
  /** CSS color of the slice and of its legend marker. */
  color: string;
  /** Share of the total, 0 to 1. */
  share: number;
};
