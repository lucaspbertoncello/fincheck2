import '#/shared/layouts/application/transition/side-resize.css';
import '#/shared/layouts/application/transition/tab-transition.css';

import { Outlet, useRouter } from '@tanstack/react-router';
import { useRef, useState } from 'react';
import { RouterProvider as AriaRouterProvider } from 'react-aria-components';

import { useIsDesktop } from '#/shared/hooks/use-is-desktop.hook.ts';
import { ApplicationBottomNav } from '#/shared/layouts/application/navigation/application-bottom-nav.component.tsx';
import { navigateToHref } from '#/shared/layouts/application/navigation/navigate-to-href.util.ts';
import { useActiveScreen } from '#/shared/layouts/application/navigation/use-active-screen.hook.ts';
import { ApplicationRail } from '#/shared/layouts/application/rail/application-rail.component.tsx';
import { PanelSlotContext } from '#/shared/layouts/application/panel/panel-slot.context.ts';
import { useSideResize } from '#/shared/layouts/application/transition/use-side-resize.hook.ts';
import { useSplash } from '#/shared/layouts/application/splash/use-splash.hook.ts';
import { ApplicationSummaryPanel } from '#/shared/layouts/application/summary/application-summary-panel.component.tsx';
import { ScreenPlus } from '#/shared/layouts/application/top-bar/screen-plus.component.tsx';
import { ApplicationTopBar } from '#/shared/layouts/application/top-bar/application-top-bar.component.tsx';

/**
 * Shell of the app. Desktop (1024 px and up): ONE frame centered at 84 rem, with the page margin
 * on all four sides (s24 up to 1279 px, s32 from 1280 px; the same on every screen). Inside it a
 * row of two: the PAIR on the left and the page (`main`, in the animated `tab-content`
 * container) on the right, s32 apart. The pair is the icon rail (56 px) and the left box (the
 * summary panel, or on Configurações an empty slot the screen fills with its section menu), s8
 * apart, `sticky` at the page margin and stretched to one height: the panel decides it, the rail
 * follows with its icons centered (never a fixed number). Rail, panel and the top of the page
 * title start on the same line, the top of the row. There is no top bar on the desktop. Phone:
 * top bar, the page and the bottom bar. Links are React Aria links that navigate
 * through the TanStack router.
 *
 * When the left box changes kind (summary panel to the Configurações menu and back) the pair
 * animates its height (`useSideResize`, motion.md 1.4) instead of jumping.
 *
 * The "+" of the screen is ONE fixed button at the bottom right of the window, outside the rail
 * and the top bar: s24 from the right and bottom edges up to 1279 px, s32 from 1280 px (the same
 * as the page margin); on the phone s16 from the right edge and s16 above the bottom bar (plus
 * the safe area). It is 56 px (`size-14`) and sits under the modals (`--z-modal` is above
 * `--z-menu`). While the selection bar of Transações is open the "+" hides (CSS `:has`, no state),
 * and the undo toasts keep clear of it (see `ToastProvider`). So that it never covers content, `main` ends with room for it: the button
 * (3.5 rem) plus the gap, once here for every screen (on the desktop the frame padding adds the
 * margin below that).
 *
 * The frame is `relative` with `overflow-y: clip` so nothing inside can stretch the page past
 * its own bottom. The Visão geral used to scroll into a blank band: the `sr-only` data table of
 * each chart is absolutely positioned and a `<table>` ignores the 1 px height of `sr-only`, so
 * its ~30 rows pushed the document down. Clipping at the frame keeps the scroll height equal to
 * the content for every screen, now and for any future hidden table.
 */
export function ApplicationLayout() {
  const router = useRouter();
  const isDesktop = useIsDesktop();
  const { screen, monthParam } = useActiveScreen();
  useSplash();
  const pairRef = useRef<HTMLDivElement>(null);
  useSideResize(pairRef, screen.showsPanel);

  const [panelSlot, setPanelSlot] = useState<HTMLElement | null>(null);

  return (
    <AriaRouterProvider navigate={(href) => navigateToHref(router, href)}>
      <div
        className={
          isDesktop
            ? 'group/shell relative mx-auto min-h-dvh w-full max-w-[84rem] overflow-y-clip p-s24 xl:p-s32'
            : 'group/shell relative flex min-h-dvh w-full min-w-0 flex-col overflow-y-clip pb-[calc(var(--spacing-bottom-nav)+env(safe-area-inset-bottom))]'
        }
      >
        {isDesktop ? null : <ApplicationTopBar screen={screen} monthParam={monthParam} />}
        <div className={isDesktop ? 'flex gap-s32' : 'grid w-full gap-s24 px-gutter-mobile pt-s8'}>
          {isDesktop ? (
            <div
              ref={pairRef}
              className="side-pair sticky top-s24 flex shrink-0 gap-s8 self-start xl:top-s32"
            >
              <ApplicationRail screen={screen} monthParam={monthParam} />
              {screen.showsPanel ? (
                <aside className="w-panel">
                  <ApplicationSummaryPanel variant="full" />
                </aside>
              ) : (
                <aside ref={setPanelSlot} className="flex w-panel flex-col [&>*]:flex-1" />
              )}
            </div>
          ) : null}
          <PanelSlotContext value={panelSlot}>
            <main className="tab-content min-w-0 flex-1 pb-[calc(3.5rem+var(--space-16)*2)] lg:pb-[calc(3.5rem+var(--space-24))] xl:pb-[calc(3.5rem+var(--space-32))]">
              <Outlet />
            </main>
          </PanelSlotContext>
        </div>
        <div
          data-floating-plus
          className="fixed right-gutter-mobile transition-opacity duration-(--duration-fast) group-has-[[data-selection-bar]]/shell:pointer-events-none group-has-[[data-selection-bar]]/shell:invisible group-has-[[data-selection-bar]]/shell:opacity-0 bottom-[calc(var(--spacing-bottom-nav)+env(safe-area-inset-bottom)+var(--space-16))] z-(--z-menu) lg:right-s24 lg:bottom-s24 xl:right-s32 xl:bottom-s32"
        >
          <ScreenPlus screen={screen} monthParam={monthParam} />
        </div>
        <ApplicationBottomNav activeTab={screen.tab} monthParam={monthParam} />
      </div>
    </AriaRouterProvider>
  );
}
