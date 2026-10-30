import { useState } from 'react';

/** The selection mode of the list: on or off, and the ids ticked. Turning it off clears the ticks. */
export function useTransactionSelection() {
  const [active, setActive] = useState(false);
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(new Set());

  function toggleMode() {
    setActive((current) => !current);
    setSelectedIds(new Set());
  }

  function setSelected(id: string, selected: boolean) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (selected) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function finish() {
    setActive(false);
    setSelectedIds(new Set());
  }

  return { active, selectedIds, toggleMode, setSelected, finish };
}
