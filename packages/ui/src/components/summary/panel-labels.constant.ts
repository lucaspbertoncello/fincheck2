/** Texts of the panel that change with the business rule (BR-DSH-002/003); the layout never reads them. */
export const PANEL_LABELS = {
  /** Name of the box, its `aria-label`, skeleton and error. */
  panel: 'Saldo em contas',
  /** Label of the closing line of the equation: the old "Livre". */
  leftover: 'Sobra no fim do mês',
} as const;

/** Surface of the panel: near-solid like the other cards, 1 px border, soft shadow, a hint of the brand on top. */
export const PANEL_SURFACE =
  'rounded-card border border-line bg-modal bg-[linear-gradient(180deg,color-mix(in_oklch,var(--color-accent-default)_6%,transparent),transparent_160px)] shadow-[0_1px_2px_oklch(0_0_0/0.05),0_12px_28px_-14px_oklch(0.2_0.03_180/0.22)]';
