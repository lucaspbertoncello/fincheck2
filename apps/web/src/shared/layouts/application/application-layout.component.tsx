import '#/shared/layouts/application/transition/tab-transition.css';

import { Outlet, useRouter } from '@tanstack/react-router';
import { useState } from 'react';
import { RouterProvider as AriaRouterProvider } from 'react-aria-components';

import { useIsDesktop } from '#/shared/hooks/use-is-desktop.hook.ts';
import { ApplicationBottomNav } from '#/shared/layouts/application/navigation/application-bottom-nav.component.tsx';
import { navigateToHref } from '#/shared/layouts/application/navigation/navigate-to-href.util.ts';
import { useActiveScreen } from '#/shared/layouts/application/navigation/use-active-screen.hook.ts';
import { PanelSlotContext } from '#/shared/layouts/application/panel/panel-slot.context.ts';
import { useSplash } from '#/shared/layouts/application/splash/use-splash.hook.ts';
import { ApplicationSummaryPanel } from '#/shared/layouts/application/summary/application-summary-panel.component.tsx';
import { ApplicationTopBar } from '#/shared/layouts/application/top-bar/application-top-bar.component.tsx';

/**
 * Shell of the app: top bar, the summary panel on the left (desktop; on Configurações an empty
 * slot the screen fills with its section menu, so the column starts in the same place), the page on the right inside the animated `tab-content` container, and the
 * bottom bar on mobile. Links are React Aria links that navigate through the TanStack router.
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
      <div className="relative mx-auto flex min-h-dvh w-full max-w-7xl flex-col overflow-y-clip pb-bottom-nav lg:pb-s32">
        <ApplicationTopBar screen={screen} monthParam={monthParam} />
        <div
          className={`grid gap-s24 px-gutter-mobile pt-s8 lg:px-gutter lg:pt-s4 ${
            isDesktop ? 'lg:grid-cols-[var(--spacing-panel)_minmax(0,1fr)]' : ''
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
    </AriaRouterProvider>
  );
}
