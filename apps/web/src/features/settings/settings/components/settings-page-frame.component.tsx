import { Icon, PageHeader } from '@fincheck/ui';
import type { ReactNode } from 'react';
import { Link } from 'react-aria-components';

import { SETTINGS_PATH } from '#/shared/constants/settings/settings-sections.constant.ts';
import { buildHref } from '#/shared/layouts/application/navigation/build-href.util.ts';
import { useActiveScreen } from '#/shared/layouts/application/navigation/use-active-screen.hook.ts';

type SettingsPageFrameProps = {
  title: string;
  /** The line under the title: what this page is for. */
  description: string;
  /** On the phone, "Configurações" above the title leads back to the list of pages. */
  showBack?: boolean;
  children: ReactNode;
};

/**
 * What every page of Configurações shares: the title with the card dot, one line of description
 * (where the other screens have the date) and, on the phone, the way back to the list. The groups
 * of the page come as children, each one a `Section`.
 */
export function SettingsPageFrame({
  title,
  description,
  showBack = true,
  children,
}: SettingsPageFrameProps) {
  const { monthParam } = useActiveScreen();

  return (
    <div className="flex min-w-0 flex-col gap-s16 lg:gap-s24">
      <div className="flex flex-col gap-s8">
        {showBack ? (
          <Link
            href={buildHref(SETTINGS_PATH, monthParam)}
            className="focus-ring -ml-s4 inline-flex min-h-ctl-sm cursor-pointer items-center gap-s4 self-start rounded-capsule px-s4 text-label text-fg-secondary no-underline data-[hovered]:text-fg-primary lg:hidden"
          >
            <Icon name="chevron-left" size="sm" />
            Configurações
          </Link>
        ) : null}
        <PageHeader
          title={title}
          date={<p className="text-meta text-fg-secondary lg:text-label">{description}</p>}
        />
      </div>
      {children}
    </div>
  );
}
