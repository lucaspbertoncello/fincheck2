import { normalizeText } from '@fincheck/shared/common/text/normalize-text.util.ts';
import { useState } from 'react';

type OpenState = {
  open: ReadonlySet<string>;
  /** The `?person=` already applied, so closing the person does not open it again. */
  applied: string | null;
};

/**
 * Which people are open on the Amigos tab. All start folded; the person in the address
 * (`?person=`) opens once its row exists (the list may still be loading), and is the one to bring
 * into view. A name that matches nobody is ignored.
 */
export function useOpenFriends(personParam: string | undefined, personKeys: readonly string[]) {
  const [state, setState] = useState<OpenState>({ open: new Set(), applied: null });

  const wanted = personParam ? normalizeText(personParam) : null;
  if (wanted && wanted !== state.applied && personKeys.includes(wanted)) {
    setState({ open: new Set([...state.open, wanted]), applied: wanted });
  }

  function toggle(key: string) {
    setState((current) => {
      const open = new Set(current.open);
      if (open.has(key)) open.delete(key);
      else open.add(key);

      return { ...current, open };
    });
  }

  return {
    isOpen: (key: string) => state.open.has(key),
    toggle,
    scrollKey: state.applied,
  };
}
