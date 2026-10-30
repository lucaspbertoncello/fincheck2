import { createContext, useContext } from 'react';

/** True when the eye is on: every money value renders as "R$ ••••". The app provides it. */
export const MoneyVisibilityContext = createContext(false);

export function useMoneyHidden(): boolean {
  return useContext(MoneyVisibilityContext);
}
