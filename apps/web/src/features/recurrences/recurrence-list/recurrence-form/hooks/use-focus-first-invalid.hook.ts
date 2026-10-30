import { useEffect } from 'react';

/**
 * After a failed submit (`attempt` goes up), moves the focus to the first invalid field of the open
 * form modal, in reading order. The errors are already in the DOM when the effect runs.
 */
export function useFocusFirstInvalid(attempt: number) {
  useEffect(() => {
    if (attempt === 0) return;
    document
      .querySelector<HTMLElement>(
        '[role="dialog"] input[data-invalid], [role="dialog"] input[aria-invalid="true"]',
      )
      ?.focus();
  }, [attempt]);
}
