/** Moves the focus to the first invalid field of the open modal (after the errors render). */
export function focusFirstInvalid(): void {
  requestAnimationFrame(() => {
    const dialogs = document.querySelectorAll('[role="dialog"]');
    const dialog = dialogs[dialogs.length - 1];
    dialog?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  });
}
