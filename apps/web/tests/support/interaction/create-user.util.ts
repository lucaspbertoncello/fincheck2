import { fireEvent } from '@testing-library/react';

// `@testing-library/user-event` is not a dependency of the repository, and a new one is not allowed
// here. These three gestures cover the forms and buttons of the screens, through the DOM events.
export function createUser() {
  return {
    click(element: Element): Promise<void> {
      fireEvent.click(element);
      return Promise.resolve();
    },
    clear(element: Element): Promise<void> {
      fireEvent.change(element, { target: { value: '' } });
      return Promise.resolve();
    },
    type(element: Element, text: string): Promise<void> {
      const field = element as HTMLInputElement;
      fireEvent.change(field, { target: { value: field.value + text } });
      return Promise.resolve();
    },
  };
}
