import '#/shared/layouts/application/transition/tab-transition.css';

import { Outlet, useRouter } from '@tanstack/react-router';
import { useState } from 'react';
import { RouterProvider as AriaRouterProvider } from 'react-aria-components';

import { useIsDesktop } from '#/shared/hooks/use-is-desktop.hook.ts';
import { ApplicationBottomNav } from '#/shared/layouts/application/navigation/application-bottom-nav.component.tsx';
import { navigateToHref } from '#/shared/layouts/application/navigation/navigate-to-href.util.ts';
import { useActiveScreen } from '#/shared/layouts/application/navigation/use-active-screen.hook.ts';
import { ApplicationRail } from '#/shared/layouts/application/rail/application-rail.component.tsx';
import { PanelSlotContext } from '#/shared/layouts/application/panel/panel-slot.context.ts';
import { useSplash } from '#/shared/layouts/application/splash/use-splash.hook.ts';
import { ApplicationSummaryPanel } from '#/shared/layouts/application/summary/application-summary-panel.component.tsx';
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
 * top bar, the page and the bottom bar, unchanged. Links are React Aria links that navigate
 * through the TanStack router.
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

  const [panelSlot, setPanelSlot] = useState<HTMLElement | null>(null);

  return (
    <AriaRouterProvider navigate={(href) => navigateToHref(router, href)}>
      <div
        className={
          isDesktop
            ? 'relative mx-auto min-h-dvh w-full max-w-[84rem] overflow-y-clip p-s24 xl:p-s32'
            : 'relative flex min-h-dvh w-full min-w-0 flex-col overflow-y-clip pb-bottom-nav'
        }
      >
        {isDesktop ? null : <ApplicationTopBar screen={screen} monthParam={monthParam} />}
        <div className={isDesktop ? 'flex gap-s32' : 'grid w-full gap-s24 px-gutter-mobile pt-s8'}>
          {isDesktop ? (
            <div className="sticky top-s24 flex shrink-0 gap-s8 self-start xl:top-s32">
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
            <main className="tab-content min-w-0 flex-1">
              <Outlet />
            </main>
          </PanelSlotContext>
        </div>
        <ApplicationBottomNav activeTab={screen.tab} monthParam={monthParam} />
      </div>
    </AriaRouterProvider>
  );
}
