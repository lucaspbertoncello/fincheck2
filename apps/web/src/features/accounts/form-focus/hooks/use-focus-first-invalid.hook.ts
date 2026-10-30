import { useEffect, type RefObject } from 'react';

/**
 * Moves the focus to the first invalid field of a form when a submit fails. `attempt` counts the
 * failed submits, so the same error twice still pulls the focus back.
 */
export function useFocusFirstInvalid(container: RefObject<HTMLElement | null>, attempt: number) {
  useEffect(() => {
    if (attempt === 0) return;
    container.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  }, [container, attempt]);
}
