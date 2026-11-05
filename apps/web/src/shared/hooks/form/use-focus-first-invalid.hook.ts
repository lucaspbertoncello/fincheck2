import { useEffect, type RefObject } from 'react';

/**
 * Where the search for the invalid field starts: an element (by ref), the open modal (the first
 * `[role="dialog"]`, for a frame that is portaled) or the whole document.
 */
type FocusFirstInvalidScope = RefObject<HTMLElement | null> | 'dialog' | 'document';

type FocusFirstInvalidOptions = {
  /** Counts the failed submits (or bumps after one), so the same error twice still pulls the focus. */
  attempt: number;
  /** The CSS selector of the invalid field; the first match in the scope gets the focus. */
  selector: string;
  scope: FocusFirstInvalidScope;
};

function resolveScope(scope: FocusFirstInvalidScope): ParentNode | null | undefined {
  if (scope === 'document') return document;
  if (scope === 'dialog') return document.querySelector<HTMLElement>('[role="dialog"]');
  return scope.current;
}

/** Moves the focus to the first invalid field of a form when a submit fails (`attempt` above 0). */
export function useFocusFirstInvalid({ attempt, selector, scope }: FocusFirstInvalidOptions) {
  useEffect(() => {
    if (attempt === 0) return;
    resolveScope(scope)?.querySelector<HTMLElement>(selector)?.focus();
  }, [attempt, selector, scope]);
}
