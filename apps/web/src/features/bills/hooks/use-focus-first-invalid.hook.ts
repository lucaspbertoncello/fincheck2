import { useEffect } from 'react';

/**
 * After a failed submit (the `attempt` counter grows), moves the focus to the first invalid field
 * of the open modal. React Aria marks an invalid input with `aria-invalid` and a date field with
 * `data-invalid` on its group. The modal frame is portaled, so the search starts at the dialog.
 */
export function useFocusFirstInvalid(attempt: number) {
  useEffect(() => {
    if (attempt === 0) return;
    const dialog = document.querySelector<HTMLElement>('[role="dialog"]');
    const target = dialog?.querySelector<HTMLElement>(
      '[aria-invalid="true"], [data-invalid] [role="spinbutton"]',
    );
    target?.focus();
  }, [attempt]);
}
