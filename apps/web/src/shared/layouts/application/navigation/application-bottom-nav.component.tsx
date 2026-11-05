import { BottomNav } from '@fincheck/ui';

import { buildBottomNavigationItems } from '#/shared/layouts/application/navigation/build-bottom-navigation-items.util.ts';
import type { TabKey } from '#/shared/types/screen.type.ts';

type ApplicationBottomNavProps = {
  activeTab: TabKey | null;
  monthParam: string | undefined;
};

/** Mobile bottom bar with the five tabs; on desktop the top tabs do this job. */
export function ApplicationBottomNav({ activeTab, monthParam }: ApplicationBottomNavProps) {
  return (
    <BottomNav
      items={buildBottomNavigationItems(monthParam)}
      activeKey={activeTab}
      label="Principal"
    />
  );
}
