import { afterEach, describe, expect, it } from 'vitest';

import { settingsIndexRoute } from '#/router/routes/settings-index.route.tsx';
import { stubMatchMedia } from '#tests/support/viewport/stub-match-media.util.ts';

let media: ReturnType<typeof stubMatchMedia> | undefined;

afterEach(() => {
  media?.restore();
  media = undefined;
});

function beforeLoadAt(hash: string) {
  const beforeLoad = settingsIndexRoute.options.beforeLoad as (context: unknown) => void;
  return () => beforeLoad({ location: { hash } });
}

/** What a `throw redirect(...)` carries: the target of the redirect. */
function redirectTarget(run: () => void): string | undefined {
  try {
    run();
  } catch (thrown) {
    return (thrown as { options?: { to?: string } }).options?.to;
  }
  return undefined;
}

describe('settingsIndexRoute', () => {
  it('sends /settings to Conexões on the desktop before anything is committed', () => {
    media = stubMatchMedia({ desktop: true });
    expect(redirectTarget(beforeLoadAt(''))).toBe('/settings/connections');
  });

  it('keeps /settings as the list on the phone', () => {
    media = stubMatchMedia({ desktop: false });
    expect(redirectTarget(beforeLoadAt(''))).toBeUndefined();
  });

  it('still sends the old anchors to their page and #profile to Perfil', () => {
    media = stubMatchMedia({ desktop: true });
    expect(redirectTarget(beforeLoadAt('backup'))).toBe('/settings/backup');
    expect(redirectTarget(beforeLoadAt('#profile'))).toBe('/profile');
  });
});
