import { MoneyVisibilityContext } from '@fincheck/ui';
import type { ReactNode } from 'react';

import { useHideValues } from '#/shared/hooks/use-hide-values.hook.ts';

/** Feeds the eye preference to every `Money` in the app. */
export function MoneyVisibilityProvider({ children }: { children: ReactNode }) {
  const { isHidden } = useHideValues();
  return <MoneyVisibilityContext value={isHidden}>{children}</MoneyVisibilityContext>;
}
