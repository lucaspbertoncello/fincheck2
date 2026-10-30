/** Moves the focus to the first invalid field of the form with this accessible name (after the errors render). */
export function focusFirstInvalid(formLabel: string): void {
  requestAnimationFrame(() => {
    const form = document.querySelector(`form[aria-label="${formLabel}"]`);
    form?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  });
}
