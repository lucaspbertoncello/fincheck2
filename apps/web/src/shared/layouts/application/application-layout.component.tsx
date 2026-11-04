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
 * Shell of the app. Desktop (1024 px and up): the side rail on the left (it opens over the page),
 * in one centered group with the content (rail, panel and page are 24 px apart at any width),
 * then the summary panel (on Configurações an empty slot the screen fills with its section menu,
 * so the column starts in the same place) and the page in the animated `tab-content` container;
 * there is no top bar, so both start at the top of the screen. Phone: top bar, the page and the
 * bottom bar. Links are React Aria links that navigate through the TanStack router.
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
            ? 'mx-auto flex min-h-dvh w-full max-w-[84rem] gap-s24 px-s16 xl:px-s24'
            : 'flex min-h-dvh w-full'
        }
      >
        {isDesktop ? <ApplicationRail screen={screen} monthParam={monthParam} /> : null}
        <div className="relative flex min-h-dvh min-w-0 flex-1 flex-col overflow-y-clip pb-bottom-nav lg:pb-s32">
          {isDesktop ? null : <ApplicationTopBar screen={screen} monthParam={monthParam} />}
          <div
            className={`grid w-full gap-s24 ${
              isDesktop
                ? 'grid-cols-[var(--spacing-panel)_minmax(0,1fr)] pt-s16'
                : 'px-gutter-mobile pt-s8'
            }`}
          >
            {isDesktop ? (
              screen.showsPanel ? (
                <aside className="sticky top-s16 self-start">
                  <ApplicationSummaryPanel variant="full" />
                </aside>
              ) : (
                <aside ref={setPanelSlot} className="sticky top-s16 self-start" />
              )
            ) : null}
            <PanelSlotContext value={panelSlot}>
              <main className="tab-content min-w-0">
                <Outlet />
              </main>
            </PanelSlotContext>
          </div>
          <ApplicationBottomNav activeTab={screen.tab} monthParam={monthParam} />
        </div>
      </div>
    </AriaRouterProvider>
  );
}
