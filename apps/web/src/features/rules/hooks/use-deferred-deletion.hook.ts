import { useEffect, useRef, useState } from 'react';

type Scheduled = {
  timer: ReturnType<typeof setTimeout>;
  commit: () => Promise<unknown>;
};

/**
 * Deletes after a delay, so "Excluir" can offer "Desfazer" even though the contract has no undo for
 * it: the item is hidden at once (`pendingIds`), `cancel` brings it back before the delay ends, and
 * leaving the screen runs what is still waiting. `cancel` returns false when it was too late.
 */
export function useDeferredDeletion(delayMs: number) {
  const [pendingIds, setPendingIds] = useState<string[]>([]);
  const scheduled = useRef(new Map<string, Scheduled>());

  function release(id: string) {
    setPendingIds((ids) => ids.filter((current) => current !== id));
  }

  function schedule(id: string, commit: () => Promise<unknown>, onFailure: () => void) {
    const timer = setTimeout(() => {
      scheduled.current.delete(id);
      commit()
        .catch(onFailure)
        .finally(() => release(id));
    }, delayMs);

    scheduled.current.set(id, { timer, commit });
    setPendingIds((ids) => [...ids, id]);
  }

  function cancel(id: string): boolean {
    const entry = scheduled.current.get(id);
    if (!entry) return false;

    clearTimeout(entry.timer);
    scheduled.current.delete(id);
    release(id);
    return true;
  }

  useEffect(() => {
    const waiting = scheduled.current;
    return () => {
      waiting.forEach(({ timer, commit }) => {
        clearTimeout(timer);
        commit().catch(() => undefined);
      });
      waiting.clear();
    };
  }, []);

  return { pendingIds, schedule, cancel };
}
