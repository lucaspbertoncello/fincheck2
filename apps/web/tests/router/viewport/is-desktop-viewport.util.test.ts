import { afterEach, describe, expect, it } from 'vitest';

import { isDesktopViewport } from '#/router/viewport/is-desktop-viewport.util.ts';
import { stubMatchMedia } from '#tests/support/viewport/stub-match-media.util.ts';

let media: ReturnType<typeof stubMatchMedia> | undefined;

afterEach(() => {
  media?.restore();
  media = undefined;
});

describe('isDesktopViewport', () => {
  it('is true from 1024 px up and false below it', () => {
    media = stubMatchMedia({ desktop: true });
    expect(isDesktopViewport()).toBe(true);
    media.restore();
    media = stubMatchMedia({ desktop: false });
    expect(isDesktopViewport()).toBe(false);
  });

  it('is false where there is no matchMedia', () => {
    const original: unknown = Reflect.get(window, 'matchMedia');
    Reflect.deleteProperty(window, 'matchMedia');
    try {
      expect(isDesktopViewport()).toBe(false);
    } finally {
      Reflect.set(window, 'matchMedia', original);
    }
  });
});
