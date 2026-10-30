import { useEffect, useRef } from 'react';

/**
 * Moves the focus to the first invalid field inside the returned ref's element each time `token`
 * changes (the form bumps it after a failed submit, once the errors are on the screen).
 */
export function useFocusFirstInvalid(token: number) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (token === 0) return;
    // A field marks itself invalid with `aria-invalid`; a message that stands in for a field (the
    // rule sentence has no input) carries `data-invalid-field` and `tabindex="-1"`.
    containerRef.current
      ?.querySelector<HTMLElement>('[aria-invalid="true"], [data-invalid-field]')
      ?.focus();
  }, [token]);

  return containerRef;
}
