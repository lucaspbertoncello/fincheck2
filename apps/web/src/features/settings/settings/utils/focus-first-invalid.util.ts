/** Moves the focus to the first field marked invalid, after the screen drew the errors. */
export function focusFirstInvalid(container: ParentNode = document): void {
  container.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
}
