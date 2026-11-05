import { useState } from 'react';

type KeptItem<T> = {
  item: T;
  /** Still in the data. False while it folds away after it left. */
  present: boolean;
  /** Arrived after the first load: it opens instead of simply being there. */
  isNew: boolean;
};

/**
 * The items of a list that animates when they come and go: the ones in the data, plus the ones
 * that just left (kept, closed, so their `Reveal` can fold instead of vanishing in one frame).
 * `ready` is true once the first data arrived; what is there at that moment is not "new".
 */
export function useKeptItems<T>(
  items: readonly T[],
  getKey: (item: T) => string,
  ready: boolean,
): KeptItem<T>[] {
  const [kept, setKept] = useState<readonly T[]>(items);
  const [initialKeys, setInitialKeys] = useState<ReadonlySet<string> | null>(null);

  const keys = new Set(items.map(getKey));
  const left = kept.filter((item) => !keys.has(getKey(item)));
  const all = [...items, ...left];
  if (all.length !== kept.length || all.some((item, index) => item !== kept[index])) setKept(all);
  if (ready && initialKeys === null) setInitialKeys(new Set(keys));

  return all.map((item) => ({
    item,
    present: keys.has(getKey(item)),
    isNew: initialKeys !== null && !initialKeys.has(getKey(item)),
  }));
}
