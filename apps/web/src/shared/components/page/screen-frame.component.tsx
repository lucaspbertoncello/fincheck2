import type { ReactNode } from 'react';

import { ScreenHeader } from '#/shared/components/page/screen-header.component.tsx';
import { ScreenSubNav } from '#/shared/components/page/screen-sub-nav.component.tsx';
import { useIsDesktop } from '#/shared/hooks/use-is-desktop.hook.ts';
import { ApplicationSummaryPanel } from '#/shared/layouts/application/summary/application-summary-panel.component.tsx';
import type { ScreenDefinition } from '#/shared/types/screen.type.ts';

type ScreenFrameProps = {
  screen: ScreenDefinition;
  children: ReactNode;
};

/**
 * What every page shares: the header, the sub-tabs and, on mobile only, the summary panel between
 * the header and the content (on desktop the layout shows it in the left column). On the mobile
 * Visão geral the panel is the full card; on the other screens it is the compact "mini Livre".
 */
export function ScreenFrame({ screen, children }: ScreenFrameProps) {
  const isDesktop = useIsDesktop();

  return (
    <div className="flex flex-col gap-s16 lg:gap-s24">
      <ScreenHeader screen={screen} />
      {!isDesktop && screen.showsPanel ? (
        <ApplicationSummaryPanel variant={screen.key === 'overview' ? 'full' : 'compact'} />
      ) : null}
      {screen.subNav ? <ScreenSubNav group={screen.subNav} /> : null}
      {children}
    </div>
  );
}
