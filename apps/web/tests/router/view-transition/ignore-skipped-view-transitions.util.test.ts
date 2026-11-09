import { describe, expect, it, vi } from 'vitest';

import { ignoreSkippedViewTransitions } from '#/router/view-transition/ignore-skipped-view-transitions.util.ts';

function skippedTransition() {
  const skipped = () => Promise.reject(new DOMException('Transition was skipped', 'AbortError'));

  return { ready: skipped(), finished: skipped(), updateCallbackDone: Promise.resolve() };
}

describe('ignoreSkippedViewTransitions', () => {
  it('keeps the transition and swallows the AbortError of a skipped one', async () => {
    const unhandled = vi.fn();
    process.on('unhandledRejection', unhandled);
    const original = vi.fn(skippedTransition);
    const target = { startViewTransition: original } as unknown as Document;

    ignoreSkippedViewTransitions(target);
    const transition = target.startViewTransition(() => undefined);
    await new Promise((resolve) => setTimeout(resolve, 10));
    process.off('unhandledRejection', unhandled);

    expect(original).toHaveBeenCalledTimes(1);
    expect(transition.ready).toBeInstanceOf(Promise);
    expect(unhandled).not.toHaveBeenCalled();
  });

  it('does nothing in a browser without view transitions', () => {
    const target = {} as Document;

    expect(() => ignoreSkippedViewTransitions(target)).not.toThrow();
    expect('startViewTransition' in target).toBe(false);
  });
});
