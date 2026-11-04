import type { BrowserContext } from 'playwright';

/**
 * Moves `Date` in every page of the context to `now` (it keeps ticking, so timers still work) and
 * saves the theme where the app reads it, before any script of the page runs.
 */
export async function prepareBrowserContext(
  context: BrowserContext,
  now: string,
  theme: 'light' | 'dark',
): Promise<void> {
  await context.addInitScript(
    ({ nowIso, savedTheme }) => {
      const RealDate = Date;
      const offset = new RealDate(nowIso).getTime() - RealDate.now();
      class ShiftedDate extends RealDate {
        constructor(...args: unknown[]) {
          if (args.length === 0) super(RealDate.now() + offset);
          else super(...(args as [string]));
        }
        static override now(): number {
          return RealDate.now() + offset;
        }
      }
      window.Date = ShiftedDate as DateConstructor;
      try {
        window.localStorage.setItem('fincheck:theme', savedTheme);
      } catch {
        // Blocked storage: the app falls back to the system theme.
      }
    },
    { nowIso: now, savedTheme: theme },
  );
}
