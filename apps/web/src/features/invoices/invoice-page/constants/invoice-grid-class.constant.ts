/**
 * The one grid of the invoice page. Every row that has two boxes uses it: the card and the summary
 * on top, "Destaques" and "Para onde foi" below. From the xl width the first column is the card's
 * (24 rem) and the second takes the rest; below it everything is one column. The same classes on
 * the same width give the same columns and the same gap, so the boxes of a row line up with the
 * ones above; the cells stretch, so the two boxes of a row have the same height.
 */
export const INVOICE_GRID_CLASS =
  'grid grid-cols-1 items-stretch gap-s16 lg:gap-s24 xl:grid-cols-[minmax(0,24rem)_minmax(0,1fr)]';
