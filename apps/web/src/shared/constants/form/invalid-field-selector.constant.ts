/** An input React Aria (or the form) marked invalid. */
export const INVALID_FIELD_SELECTOR = '[aria-invalid="true"]';

/** An invalid input, or a message that stands in for a field (it has no input of its own). */
export const INVALID_FIELD_OR_STAND_IN_SELECTOR = '[aria-invalid="true"], [data-invalid-field]';

/** An invalid input, or the first segment of a date field, which React Aria marks on its group. */
export const INVALID_FIELD_OR_DATE_SEGMENT_SELECTOR =
  '[aria-invalid="true"], [data-invalid] [role="spinbutton"]';

/** An invalid input of the open modal, wherever the modal frame is portaled. */
export const DIALOG_INVALID_INPUT_SELECTOR =
  '[role="dialog"] input[data-invalid], [role="dialog"] input[aria-invalid="true"]';
