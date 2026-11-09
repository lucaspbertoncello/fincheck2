const IGNORED_NAME = 'AbortError';

function ignoreAbort(promise: Promise<unknown>): void {
  promise.catch((error: unknown) => {
    if (error instanceof DOMException && error.name === IGNORED_NAME) return;
    // Anything else keeps being reported, as it would be without the wrapper.
    throw error;
  });
}

/**
 * The browser rejects the promises of a view transition with `AbortError: Transition was skipped`
 * when a new navigation starts before the old transition ends. The router does not handle them, so
 * every quick route change dirtied the console. This wraps `document.startViewTransition` once to
 * ignore only that error; the transition itself runs as before.
 */
export function ignoreSkippedViewTransitions(target: Document = document): void {
  if (typeof target.startViewTransition !== 'function') return;

  const start = target.startViewTransition.bind(target);
  target.startViewTransition = ((...args: Parameters<Document['startViewTransition']>) => {
    const transition = start(...args);
    ignoreAbort(transition.ready);
    ignoreAbort(transition.finished);
    ignoreAbort(transition.updateCallbackDone);

    return transition;
  }) as Document['startViewTransition'];
}
