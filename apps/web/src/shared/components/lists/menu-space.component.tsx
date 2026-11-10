/**
 * An empty box the size of the "…" button (`OverflowMenu`), for the rows of a list that have no
 * menu while others do (or sit above rows that have one): it keeps their value in the same column
 * as the rest.
 */
export function MenuSpace() {
  return <span aria-hidden="true" className="block size-ctl-touch lg:size-ctl-tab" />;
}
