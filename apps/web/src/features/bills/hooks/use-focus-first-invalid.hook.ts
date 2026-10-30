import { type RefObject, useEffect } from 'react';

/**
 * After a failed submit (the `attempt` counter grows), moves the focus to the first invalid field
 * inside the form. React Aria marks an invalid input with `aria-invalid` and a date field with
 * `data-invalid` on its group.
 */
export function useFocusFirstInvalid(formRef: RefObject<HTMLElement | null>, attempt: number) {
  useEffect(() => {
    if (attempt === 0) return;
    const form = formRef.current;
    if (!form) return;
    const target = form.querySelector<HTMLElement>(
      '[aria-invalid="true"], [data-invalid] [role="spinbutton"]',
    );
    target?.focus();
  }, [attempt, formRef]);
}
