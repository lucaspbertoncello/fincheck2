import { useEffect } from 'react';

/**
 * After a failed submit (`attempt` goes up), moves the focus to the first invalid field of the
 * form with this id. The errors are already in the DOM when the effect runs.
 */
export function useFocusFirstInvalid(formId: string, attempt: number) {
  useEffect(() => {
    if (attempt === 0) return;
    document
      .getElementById(formId)
      ?.querySelector<HTMLElement>('input[data-invalid], input[aria-invalid="true"]')
      ?.focus();
  }, [formId, attempt]);
}
