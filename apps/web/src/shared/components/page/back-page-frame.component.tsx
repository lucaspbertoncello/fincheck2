import { Icon, PageHeader } from '@fincheck/ui';
import type { ReactNode } from 'react';
import { Link } from 'react-aria-components';

import { useIsDesktop } from '#/shared/hooks/use-is-desktop.hook.ts';
import { ApplicationSummaryPanel } from '#/shared/layouts/application/summary/application-summary-panel.component.tsx';

type BackPageFrameProps = {
  /** The page title; a short fixed word while it loads. */
  title: string;
  /** The line under the title. */
  description: string;
  /** Where the way back leads. */
  backHref: string;
  /** The name of where it leads ("Categorias"): the link text, and "Voltar para ..." for the screen reader. */
  backLabel: string;
  /** What goes on the title line, at the right: the period picker, the arrows between invoices. */
  actions?: ReactNode;
  children: ReactNode;
};

/**
 * What the pages that have a way back share (the category page, the invoice page): the way back
 * above the title (to where the person came from, on every width, as in the pages of
 * Configurações on the phone), the header with the card dot and the line under it, the actions
 * on the title line and, on the phone, the compact balance panel (on the desktop the layout shows
 * it in the left column).
 */
export function BackPageFrame({
  title,
  description,
  backHref,
  backLabel,
  actions,
  children,
}: BackPageFrameProps) {
  const isDesktop = useIsDesktop();

  return (
    <div className="flex min-w-0 flex-col gap-s16 lg:gap-s24">
      <div className="flex flex-col gap-s8">
        <Link
          href={backHref}
          aria-label={`Voltar para ${backLabel}`}
          className="focus-ring -ml-s4 inline-flex min-h-ctl-sm cursor-pointer items-center gap-s4 self-start rounded-capsule px-s4 text-label whitespace-nowrap text-fg-secondary no-underline data-[hovered]:text-fg-primary"
        >
          <Icon name="chevron-left" size="sm" />
          {backLabel}
        </Link>
        <PageHeader
          title={title}
          date={<p className="text-meta text-fg-secondary lg:text-label">{description}</p>}
          actions={actions}
        />
      </div>
      {!isDesktop ? <ApplicationSummaryPanel variant="compact" /> : null}
      {children}
    </div>
  );
}
