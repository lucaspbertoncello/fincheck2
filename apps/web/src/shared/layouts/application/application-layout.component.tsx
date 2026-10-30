import '#/shared/layouts/application/transition/tab-transition.css';

import { Outlet, useRouter } from '@tanstack/react-router';
import { RouterProvider as AriaRouterProvider } from 'react-aria-components';

import { useIsDesktop } from '#/shared/hooks/use-is-desktop.hook.ts';
import { ApplicationBottomNav } from '#/shared/layouts/application/navigation/application-bottom-nav.component.tsx';
import { navigateToHref } from '#/shared/layouts/application/navigation/navigate-to-href.util.ts';
import { useActiveScreen } from '#/shared/layouts/application/navigation/use-active-screen.hook.ts';
import { useSplash } from '#/shared/layouts/application/splash/use-splash.hook.ts';
import { ApplicationSummaryPanel } from '#/shared/layouts/application/summary/application-summary-panel.component.tsx';
import { ApplicationTopBar } from '#/shared/layouts/application/top-bar/application-top-bar.component.tsx';

/**
 * Shell of the app: top bar, the summary panel on the left (desktop, every screen but
 * Configurações), the page on the right inside the animated `tab-content` container, and the
 * bottom bar on mobile. Links are React Aria links that navigate through the TanStack router.
 */
export function ApplicationLayout() {
  const router = useRouter();
  const isDesktop = useIsDesktop();
  const { screen, monthParam } = useActiveScreen();
  useSplash();

  const showsSidePanel = isDesktop && screen.showsPanel;

  return (
    <AriaRouterProvider navigate={(href) => navigateToHref(router, href)}>
      <div className="mx-auto flex min-h-dvh w-full max-w-7xl flex-col pb-bottom-nav lg:pb-s32">
        <ApplicationTopBar screen={screen} monthParam={monthParam} />
        <div
          className={`grid gap-s24 px-gutter-mobile pt-s8 lg:px-gutter lg:pt-s4 ${
            showsSidePanel ? 'lg:grid-cols-[var(--spacing-panel)_minmax(0,1fr)]' : ''
          }`}
        >
          {showsSidePanel ? (
            <aside className="sticky top-s16 self-start">
              <ApplicationSummaryPanel variant="full" />
            </aside>
          ) : null}
          <main className="tab-content min-w-0">
            <Outlet />
          </main>
        </div>
        <ApplicationBottomNav activeTab={screen.tab} monthParam={monthParam} />
      </div>
    </AriaRouterProvider>
  );
}
