/** What marks the category that is chosen in a field: a pressed chip or a checked radio. */
const CHOSEN_SELECTOR = '[aria-pressed="true"], input[type="radio"]:checked';

/**
 * Gives the focus back to the field after it created a category: the search the person typed in
 * folded away with the choice, so the focus goes to the chip of the new category, which the
 * field lists now. Looks from the search up to the dialog, the closest field first. Returns
 * whether it found one.
 */
export function focusChosenCategory(from: HTMLElement): boolean {
  const limit = from.closest('[role="dialog"], [role="alertdialog"]');
  for (let node = from.parentElement; node && node !== limit; node = node.parentElement) {
    const chosen = [...node.querySelectorAll<HTMLElement>(CHOSEN_SELECTOR)].find(
      (item) => !item.closest('[inert]'),
    );
    if (chosen) {
      chosen.focus();
      return true;
    }
  }
  return false;
}
