import { Icon, PageHeader } from '@fincheck/ui';
import type { ReactNode } from 'react';
import { Link } from 'react-aria-components';

import { useIsDesktop } from '#/shared/hooks/use-is-desktop.hook.ts';
import { ApplicationSummaryPanel } from '#/shared/layouts/application/summary/application-summary-panel.component.tsx';

type CategoryPageFrameProps = {
  /** The category name; "Categoria" while it loads. */
  title: string;
  /** The line under the title: "Categoria de despesa". */
  description: string;
  /** Where "Categorias" leads back to. */
  backHref: string;
  /** The period picker, on the title line. */
  picker?: ReactNode;
  children: ReactNode;
};

/**
 * What the category page shares with the other screens: the page header (title with the card dot,
 * the line under it, the picker), the compact balance panel between the header and the content on
 * the phone (on the desktop the layout shows it in the left column) and, above the title, the way
 * back to Categorias, on every width (as in the pages of Configurações on the phone).
 */
export function CategoryPageFrame({
  title,
  description,
  backHref,
  picker,
  children,
}: CategoryPageFrameProps) {
  const isDesktop = useIsDesktop();

  return (
    <div className="flex min-w-0 flex-col gap-s16 lg:gap-s24">
      <div className="flex flex-col gap-s8">
        <Link
          href={backHref}
          aria-label="Voltar para Categorias"
          className="focus-ring -ml-s4 inline-flex min-h-ctl-sm cursor-pointer items-center gap-s4 self-start rounded-capsule px-s4 text-label whitespace-nowrap text-fg-secondary no-underline data-[hovered]:text-fg-primary"
        >
          <Icon name="chevron-left" size="sm" />
          Categorias
        </Link>
        <PageHeader
          title={title}
          date={<p className="text-meta text-fg-secondary lg:text-label">{description}</p>}
          actions={picker}
        />
      </div>
      {!isDesktop ? <ApplicationSummaryPanel variant="compact" /> : null}
      {children}
    </div>
  );
}
