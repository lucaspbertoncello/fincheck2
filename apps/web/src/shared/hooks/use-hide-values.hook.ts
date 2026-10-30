import { useSyncExternalStore } from 'react';

import { hideValuesStore } from '#/shared/stores/hide-values.store.ts';

/** The "hide values" preference and a toggle for the eye. */
export function useHideValues() {
  const isHidden = useSyncExternalStore(hideValuesStore.subscribe, hideValuesStore.getSnapshot);
  return { isHidden, toggle: () => hideValuesStore.set(!isHidden) };
}
